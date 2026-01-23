"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAccount, useChainId, useConfig, useSwitchChain } from "wagmi";
import { linea, base } from "wagmi/chains";
import Header from "@/components/Header";

import {
  readContract,
  writeContract,
  waitForTransactionReceipt,
  getBalance,
} from "@wagmi/core";
import { formatEther, isAddress, parseUnits } from "viem";

import { BRIDGE_CONFIG } from "@/lib/bridgeConfig";
import { ERC20_ABI, OFT_ABI, ROUTER_ABI } from "@/lib/abi";
import { addressToBytes32, formatToken } from "@/lib/formatting";
import { buildLzReceiveOptions } from "@/lib/lzOptions";
import { loadHistory, saveHistory, type BridgeHistoryItem } from "@/lib/storage";

export default function Home() {
  // NOTE: Do not early-return before hooks that may be added later
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const wagmiConfig = useConfig();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { address, isConnected } = useAccount();

  const onLinea = chainId === linea.id;
  const onBase = chainId === base.id;
  const unsupported = !onLinea && !onBase;

  // Direction derived from network
  const direction = useMemo(() => {
    if (onLinea) return "LINEA_TO_BASE";
    if (onBase) return "BASE_TO_LINEA";
    return "UNSUPPORTED";
  }, [onLinea, onBase]);

  const directionLabel =
    direction === "LINEA_TO_BASE"
      ? "Linea → Base"
      : direction === "BASE_TO_LINEA"
      ? "Base → Linea"
      : "Unsupported network";

  const directionHint =
    direction === "LINEA_TO_BASE"
      ? "You are on Linea. This bridge will send DTC to Base."
      : direction === "BASE_TO_LINEA"
      ? "You are on Base. This bridge will send DTC back to Linea."
      : "Switch to Linea or Base to continue.";

  // ---------- State machine ----------
  type BridgeState =
    | "CONNECT_WALLET"
    | "WRONG_NETWORK"
    | "READY"
    | "FETCHING_BALANCE"
    | "QUOTING_FEE"
    | "NEED_APPROVAL"
    | "APPROVING"
    | "DEPOSITING"
    | "SENDING"
    | "CONFIRMED"
    | "ERROR";

  const [bridgeState, setBridgeState] = useState<BridgeState>("CONNECT_WALLET");
  const [statusMessage, setStatusMessage] = useState<string>("Waiting for wallet connection.");

  const [amount, setAmount] = useState<string>("");
  const [recipient, setRecipient] = useState<string>("");

  const [feeWei, setFeeWei] = useState<bigint | undefined>(undefined);
  const [logs, setLogs] = useState<Array<{ t: number; m: string }>>([]);
  const [history, setHistory] = useState<BridgeHistoryItem[]>([]);

  const [tokenDecimals, setTokenDecimals] = useState<number>(18);
  const [userBal, setUserBal] = useState<bigint>(0n);

  // Base router params (caps + gas)
  const [baseCapPerTx, setBaseCapPerTx] = useState<bigint | null>(null);
  const [baseLzReceiveGas, setBaseLzReceiveGas] = useState<bigint | null>(null);

  const quoteTimer = useRef<number | null>(null);

  const log = (m: string) => {
    setLogs((prev) => [...prev, { t: Date.now(), m }].slice(-200));
  };

  // Load history once on mount
  useEffect(() => {
    if (!mounted) return;
    setHistory(loadHistory());
    log("App loaded");
    log("Direction auto-selected from network");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  // Effective recipient: valid input or fallback to connected address
  const effectiveRecipient = useMemo(() => {
    const r = recipient.trim();
    if (r && isAddress(r)) return r as `0x${string}`;
    if (address && isAddress(address)) return address as `0x${string}`;
    return undefined;
  }, [recipient, address]);

  // Parse amount to token decimals
  const parsedAmountLD = useMemo(() => {
    const a = amount.trim();
    if (!a) return undefined;
    try {
      const x = parseUnits(a, tokenDecimals);
      return x > 0n ? x : undefined;
    } catch {
      return undefined;
    }
  }, [amount, tokenDecimals]);

  // Amount safety: do not allow sending over user balance.
  const amountExceedsBalance = useMemo(() => {
    if (!parsedAmountLD) return false;
    return parsedAmountLD > userBal;
  }, [parsedAmountLD, userBal]);

  // Base cap safety too (router caps apply to bridgeToLinea)
  const amountExceedsBaseCap = useMemo(() => {
    if (!onBase) return false;
    if (!parsedAmountLD) return false;
    if (baseCapPerTx == null) return false;
    return parsedAmountLD > baseCapPerTx;
  }, [onBase, parsedAmountLD, baseCapPerTx]);

  // Unified max allowed for Max button
  const maxAllowed = useMemo(() => {
    let max = userBal;
    if (onBase && baseCapPerTx != null && baseCapPerTx < max) max = baseCapPerTx;
    return max;
  }, [userBal, onBase, baseCapPerTx]);

  // Fetch decimals + balance when connected / chain changes
  useEffect(() => {
    if (!mounted) return;

    (async () => {
      setFeeWei(undefined);

      if (!isConnected || !address || unsupported) {
        setUserBal(0n);
        setTokenDecimals(18);
        return;
      }

      try {
        setBridgeState("FETCHING_BALANCE");
        setStatusMessage("FETCHING BALANCE…");

        const tokenAddress = onLinea
          ? (BRIDGE_CONFIG.contracts.dtcLinea as `0x${string}`)
          : (BRIDGE_CONFIG.contracts.baseOft as `0x${string}`);

        const dec = (await readContract(wagmiConfig, {
          chainId,
          address: tokenAddress,
          abi: ERC20_ABI,
          functionName: "decimals",
        })) as number;

        const bal = (await readContract(wagmiConfig, {
          chainId,
          address: tokenAddress,
          abi: ERC20_ABI,
          functionName: "balanceOf",
          args: [address],
        })) as bigint;

        setTokenDecimals(dec);
        setUserBal(bal);

        if (onBase) {
          try {
            const cap = (await readContract(wagmiConfig, {
              chainId: base.id,
              address: BRIDGE_CONFIG.contracts.baseRouter,
              abi: ROUTER_ABI,
              functionName: "capPerTx",
            })) as bigint;

            const gas = (await readContract(wagmiConfig, {
              chainId: base.id,
              address: BRIDGE_CONFIG.contracts.baseRouter,
              abi: ROUTER_ABI,
              functionName: "lzReceiveGas",
            })) as bigint;

            setBaseCapPerTx(cap);
            setBaseLzReceiveGas(gas);
            log("Loaded Base router params (lzReceiveGas, capPerTx).");
          } catch {
            // non-fatal
          }
        }

        setBridgeState("READY");
        setStatusMessage("READY — waiting for input.");
      } catch (e: any) {
        setBridgeState("ERROR");
        setStatusMessage("ERROR — failed to fetch balance.");
        log(`Error (balance): ${e?.shortMessage ?? e?.message ?? "unknown"}`);
      }
    })();
  }, [mounted, isConnected, address, unsupported, onLinea, onBase, chainId, wagmiConfig]);

  // Keep status aligned
  useEffect(() => {
    if (!mounted) return;

    if (!isConnected) {
      setBridgeState("CONNECT_WALLET");
      setStatusMessage("CONNECT WALLET — required to bridge.");
      return;
    }

    if (unsupported) {
      setBridgeState("WRONG_NETWORK");
      setStatusMessage("WRONG NETWORK — switch required.");
      return;
    }

    if (amountExceedsBalance) {
      setBridgeState("ERROR");
      setStatusMessage("ERROR — amount exceeds your DTC balance.");
      return;
    }

    if (amountExceedsBaseCap) {
      setBridgeState("ERROR");
      setStatusMessage("ERROR — amount exceeds Base cap per tx.");
      return;
    }

    if (bridgeState === "ERROR") {
      // allow it to recover to READY when inputs are corrected
      setBridgeState("READY");
      setStatusMessage("READY — waiting for input.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, isConnected, unsupported, amountExceedsBalance, amountExceedsBaseCap]);

  // Debounced fee quote when amount/recipient changes
  useEffect(() => {
    if (!mounted) return;

    if (!isConnected || unsupported || !parsedAmountLD || !effectiveRecipient) {
      setFeeWei(undefined);
      return;
    }

    if (amountExceedsBalance || amountExceedsBaseCap) {
      setFeeWei(undefined);
      return;
    }

    if (quoteTimer.current) window.clearTimeout(quoteTimer.current);

    quoteTimer.current = window.setTimeout(() => {
      (async () => {
        try {
          setBridgeState("QUOTING_FEE");
          setStatusMessage("QUOTING FEE…");

          const toBytes32 = addressToBytes32(effectiveRecipient);

          // MUST supply valid Type-3 options (lzReceive gas) on BOTH paths
          const gas =
            onBase
              ? (baseLzReceiveGas ?? BigInt(BRIDGE_CONFIG.lz.lzReceiveGasDefault))
              : BigInt(BRIDGE_CONFIG.lz.lzReceiveGasDefault);

          const options = buildLzReceiveOptions(gas, 0n);

          if (onLinea) {
            log(`Quote: Linea → Base amount=${amount} recipient=${effectiveRecipient}`);

            const sendParam = {
              dstEid: BRIDGE_CONFIG.lz.eidBase,
              to: toBytes32,
              amountLD: parsedAmountLD,
              minAmountLD: parsedAmountLD,
              extraOptions: options,
              composeMsg: "0x",
              oftCmd: "0x",
            } as const;

            const fee = (await readContract(wagmiConfig, {
              chainId: linea.id,
              address: BRIDGE_CONFIG.contracts.lineaAdapter,
              abi: OFT_ABI,
              functionName: "quoteSend",
              args: [sendParam, false],
            })) as { nativeFee: bigint; lzTokenFee: bigint };

            setFeeWei(fee.nativeFee);
            log(`Native fee: ${formatEther(fee.nativeFee)} ETH`);
          } else if (onBase) {
            log(`Quote: Base → Linea amount=${amount} recipient=${effectiveRecipient}`);

            const sendParam = {
              dstEid: BRIDGE_CONFIG.lz.eidLinea,
              to: toBytes32,
              amountLD: parsedAmountLD,
              minAmountLD: parsedAmountLD,
              extraOptions: options,
              composeMsg: "0x",
              oftCmd: "0x",
            } as const;

            const fee = (await readContract(wagmiConfig, {
              chainId: base.id,
              address: BRIDGE_CONFIG.contracts.baseOft,
              abi: OFT_ABI,
              functionName: "quoteSend",
              args: [sendParam, false],
            })) as { nativeFee: bigint; lzTokenFee: bigint };

            setFeeWei(fee.nativeFee);
            log(`Native fee: ${formatEther(fee.nativeFee)} ETH`);
          }

          setBridgeState("READY");
          setStatusMessage("READY — fee quoted.");
        } catch (e: any) {
          setFeeWei(undefined);
          setBridgeState("ERROR");
          setStatusMessage("ERROR — fee quote failed.");
          log(`Error (quote): ${e?.shortMessage ?? e?.message ?? "unknown"}`);
        }
      })();
    }, 350);

    return () => {
      if (quoteTimer.current) window.clearTimeout(quoteTimer.current);
    };
  }, [
    mounted,
    isConnected,
    unsupported,
    parsedAmountLD,
    effectiveRecipient,
    onLinea,
    onBase,
    wagmiConfig,
    amount,
    baseLzReceiveGas,
    amountExceedsBalance,
    amountExceedsBaseCap,
  ]);

  async function handleMax() {
    try {
      if (!mounted) return;
      if (!isConnected) return;

      const max = maxAllowed;
      const maxStr = formatToken(max, tokenDecimals, 6);
      setAmount(maxStr);
      log("Max set from wallet balance (and cap where applicable).");
    } catch {
      log("Max failed (non-fatal).");
    }
  }

  async function hasEnoughNativeForFee(nativeFee: bigint) {
    if (!address) return false;

    // Conservative buffers to avoid "insufficient funds" mid-flow.
    // Base has 2 tx (deposit + bridge), Linea may have approve + send.
    const buffer = onBase ? parseUnits("0.00015", 18) : parseUnits("0.00008", 18);

    try {
      const bal = await getBalance(wagmiConfig, {
        chainId,
        address,
      });

      const needed = nativeFee + buffer;

      if (bal.value < needed) {
        log(
          `Insufficient native balance. Have ${formatEther(bal.value)} ETH, need ~${formatEther(
            needed
          )} ETH (fee + buffer).`
        );
        return false;
      }

      return true;
    } catch (e: any) {
      log(`Warning: could not read native balance (pre-check skipped). ${e?.message ?? ""}`);
      // If we cannot read balance, do not block.
      return true;
    }
  }

  async function handleSend() {
    try {
      if (!isConnected || !address) {
        setBridgeState("CONNECT_WALLET");
        setStatusMessage("CONNECT WALLET — required to bridge.");
        log("Send blocked: wallet not connected.");
        return;
      }

      if (unsupported) {
        setBridgeState("WRONG_NETWORK");
        setStatusMessage("WRONG NETWORK — switch required.");
        log("Send blocked: unsupported network.");
        return;
      }

      if (!parsedAmountLD) {
        setBridgeState("ERROR");
        setStatusMessage("ERROR — enter a valid amount > 0.");
        log("Send blocked: invalid amount.");
        return;
      }

      if (amountExceedsBalance) {
        setBridgeState("ERROR");
        setStatusMessage("ERROR — amount exceeds your DTC balance.");
        log("Send blocked: exceeds balance.");
        return;
      }

      if (amountExceedsBaseCap) {
        setBridgeState("ERROR");
        setStatusMessage("ERROR — amount exceeds Base cap per tx.");
        log("Send blocked: exceeds Base cap.");
        return;
      }

      if (!effectiveRecipient) {
        setBridgeState("ERROR");
        setStatusMessage("ERROR — enter a valid recipient address.");
        log("Send blocked: invalid recipient.");
        return;
      }

      // Quote fee (authoritative)
      setBridgeState("QUOTING_FEE");
      setStatusMessage("QUOTING FEE…");

      const toBytes32 = addressToBytes32(effectiveRecipient);

      const gas =
        onBase
          ? (baseLzReceiveGas ?? BigInt(BRIDGE_CONFIG.lz.lzReceiveGasDefault))
          : BigInt(BRIDGE_CONFIG.lz.lzReceiveGasDefault);

      const options = buildLzReceiveOptions(gas, 0n);

      // LINEA -> BASE
      if (onLinea) {
        log(`Send: Linea → Base amount=${amount} recipient=${effectiveRecipient}`);

        const sendParam = {
          dstEid: BRIDGE_CONFIG.lz.eidBase,
          to: toBytes32,
          amountLD: parsedAmountLD,
          minAmountLD: parsedAmountLD,
          extraOptions: options,
          composeMsg: "0x",
          oftCmd: "0x",
        } as const;

        const fee = (await readContract(wagmiConfig, {
          chainId: linea.id,
          address: BRIDGE_CONFIG.contracts.lineaAdapter,
          abi: OFT_ABI,
          functionName: "quoteSend",
          args: [sendParam, false],
        })) as { nativeFee: bigint; lzTokenFee: bigint };

        const nativeFee = fee.nativeFee;
        setFeeWei(nativeFee);
        log(`Native fee: ${formatEther(nativeFee)} ETH`);

        // NEW: native balance pre-check
        const okNative = await hasEnoughNativeForFee(nativeFee);
        if (!okNative) {
          setBridgeState("ERROR");
          setStatusMessage("ERROR — insufficient native ETH for fee + gas.");
          return;
        }

        // Approve DTC_LINEA to adapter if needed
        const allowance = (await readContract(wagmiConfig, {
          chainId: linea.id,
          address: BRIDGE_CONFIG.contracts.dtcLinea,
          abi: ERC20_ABI,
          functionName: "allowance",
          args: [address, BRIDGE_CONFIG.contracts.lineaAdapter],
        })) as bigint;

        if (allowance < parsedAmountLD) {
          setBridgeState("NEED_APPROVAL");
          setStatusMessage("NEED APPROVAL — approving DTC…");
          log(`Allowance low. Approving ${amount} DTC…`);

          setBridgeState("APPROVING");
          setStatusMessage("APPROVING…");

          const approveHash = await writeContract(wagmiConfig, {
            chainId: linea.id,
            address: BRIDGE_CONFIG.contracts.dtcLinea,
            abi: ERC20_ABI,
            functionName: "approve",
            args: [BRIDGE_CONFIG.contracts.lineaAdapter, parsedAmountLD],
          });

          log(`Approve tx sent: ${approveHash}`);
          await waitForTransactionReceipt(wagmiConfig, { chainId: linea.id, hash: approveHash });
          log("Approve confirmed.");
        }

        setBridgeState("SENDING");
        setStatusMessage("SENDING…");

        const sendHash = await writeContract(wagmiConfig, {
          chainId: linea.id,
          address: BRIDGE_CONFIG.contracts.lineaAdapter,
          abi: OFT_ABI,
          functionName: "send",
          args: [sendParam, { nativeFee, lzTokenFee: 0n }, address],
          value: nativeFee,
        });

        log(`Send tx sent: ${sendHash}`);

        const item: BridgeHistoryItem = {
          time: Date.now(),
          direction: "LINEA_TO_BASE",
          amount: amount.trim(),
          recipient: effectiveRecipient,
          chainId: linea.id,
          txHash: sendHash,
          status: "PENDING",
        };

        const next = [item, ...history].slice(0, BRIDGE_CONFIG.history.maxItems);
        setHistory(next);
        saveHistory(next);

        await waitForTransactionReceipt(wagmiConfig, { chainId: linea.id, hash: sendHash });

        const confirmed = next.map((x) =>
          x.txHash === sendHash ? { ...x, status: "CONFIRMED" as const } : x
        );
        setHistory(confirmed);
        saveHistory(confirmed);

        setBridgeState("CONFIRMED");
        setStatusMessage("CONFIRMED — transaction mined.");
        log("Confirmed.");

        // Refresh balance after send
        try {
          const tokenAddress = BRIDGE_CONFIG.contracts.dtcLinea as `0x${string}`;
          const bal = (await readContract(wagmiConfig, {
            chainId: linea.id,
            address: tokenAddress,
            abi: ERC20_ABI,
            functionName: "balanceOf",
            args: [address],
          })) as bigint;
          setUserBal(bal);
        } catch {}

        return;
      }

      // BASE -> LINEA (ENFORCED USER DEPOSIT STEP)
      if (onBase) {
        log(`Send: Base → Linea amount=${amount} recipient=${effectiveRecipient}`);

        const sendParam = {
          dstEid: BRIDGE_CONFIG.lz.eidLinea,
          to: toBytes32,
          amountLD: parsedAmountLD,
          minAmountLD: parsedAmountLD,
          extraOptions: options,
          composeMsg: "0x",
          oftCmd: "0x",
        } as const;

        const fee = (await readContract(wagmiConfig, {
          chainId: base.id,
          address: BRIDGE_CONFIG.contracts.baseOft,
          abi: OFT_ABI,
          functionName: "quoteSend",
          args: [sendParam, false],
        })) as { nativeFee: bigint; lzTokenFee: bigint };

        const nativeFee = fee.nativeFee;
        setFeeWei(nativeFee);
        log(`Native fee: ${formatEther(nativeFee)} ETH`);

        // NEW: native balance pre-check (Base has 2 tx)
        const okNative = await hasEnoughNativeForFee(nativeFee);
        if (!okNative) {
          setBridgeState("ERROR");
          setStatusMessage("ERROR — insufficient native ETH for fee + gas.");
          return;
        }

        // STEP 1: Transfer user's Base DTC (OFT token) into the router first
        setBridgeState("DEPOSITING");
        setStatusMessage("DEPOSITING — transferring DTC to router…");
        log("Depositing: transferring user DTC to router first (required).");

        const depositHash = await writeContract(wagmiConfig, {
          chainId: base.id,
          address: BRIDGE_CONFIG.contracts.baseOft,
          abi: ERC20_ABI,
          functionName: "transfer",
          args: [BRIDGE_CONFIG.contracts.baseRouter, parsedAmountLD],
        });

        log(`Deposit tx sent: ${depositHash}`);
        await waitForTransactionReceipt(wagmiConfig, { chainId: base.id, hash: depositHash });
        log("Deposit confirmed.");

        // STEP 2: Call router bridgeToLinea
        setBridgeState("SENDING");
        setStatusMessage("SENDING…");

        const sendHash = await writeContract(wagmiConfig, {
          chainId: base.id,
          address: BRIDGE_CONFIG.contracts.baseRouter,
          abi: ROUTER_ABI,
          functionName: "bridgeToLinea",
          args: [effectiveRecipient, parsedAmountLD],
          value: nativeFee,
        });

        log(`Bridge tx sent: ${sendHash}`);

        const item: BridgeHistoryItem = {
          time: Date.now(),
          direction: "BASE_TO_LINEA",
          amount: amount.trim(),
          recipient: effectiveRecipient,
          chainId: base.id,
          txHash: sendHash,
          status: "PENDING",
        };

        const next = [item, ...history].slice(0, BRIDGE_CONFIG.history.maxItems);
        setHistory(next);
        saveHistory(next);

        await waitForTransactionReceipt(wagmiConfig, { chainId: base.id, hash: sendHash });

        const confirmed = next.map((x) =>
          x.txHash === sendHash ? { ...x, status: "CONFIRMED" as const } : x
        );
        setHistory(confirmed);
        saveHistory(confirmed);

        setBridgeState("CONFIRMED");
        setStatusMessage("CONFIRMED — transaction mined.");
        log("Confirmed.");

        // Refresh Base balance after deposit+send
        try {
          const tokenAddress = BRIDGE_CONFIG.contracts.baseOft as `0x${string}`;
          const bal = (await readContract(wagmiConfig, {
            chainId: base.id,
            address: tokenAddress,
            abi: ERC20_ABI,
            functionName: "balanceOf",
            args: [address],
          })) as bigint;
          setUserBal(bal);
        } catch {}

        return;
      }
    } catch (e: any) {
      setBridgeState("ERROR");
      setStatusMessage("ERROR — transaction failed.");
      log(`Error (send): ${e?.shortMessage ?? e?.message ?? "unknown"}`);

      const item: BridgeHistoryItem = {
        time: Date.now(),
        direction: direction === "BASE_TO_LINEA" ? "BASE_TO_LINEA" : "LINEA_TO_BASE",
        amount: amount.trim() || "—",
        recipient: (effectiveRecipient ?? recipient.trim()) || "—",
        chainId: chainId ?? 0,
        status: "ERROR",
      };

      const next = [item, ...history].slice(0, BRIDGE_CONFIG.history.maxItems);
      setHistory(next);
      saveHistory(next);
    }
  }

  // Hydration-safe render gate at the end (hooks already executed)
  if (!mounted) return null;

  const explorerBase =
    chainId === linea.id
      ? BRIDGE_CONFIG.chains.linea.explorerBaseUrl
      : chainId === base.id
      ? BRIDGE_CONFIG.chains.base.explorerBaseUrl
      : "";

  const balanceLabel = isConnected ? `${formatToken(userBal, tokenDecimals, 6)} DTC` : "—";

  const sendDisabled =
    unsupported ||
    !isConnected ||
    !parsedAmountLD ||
    !effectiveRecipient ||
    amountExceedsBalance ||
    amountExceedsBaseCap ||
    bridgeState === "FETCHING_BALANCE" ||
    bridgeState === "QUOTING_FEE" ||
    bridgeState === "NEED_APPROVAL" ||
    bridgeState === "APPROVING" ||
    bridgeState === "DEPOSITING" ||
    bridgeState === "SENDING";

  return (
    <main className="mx-auto max-w-7xl px-4 pb-14">
      <Header />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1fr_320px]">
        {/* Left: Bridge card */}
        <section className="rounded-3xl border border-black/10 bg-white/60 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm text-black/60 dark:text-white/70">Bridge</div>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">{directionLabel}</h1>
              <p className="mt-1 text-sm text-black/60 dark:text-white/60">{directionHint}</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4">
            {/* Direction display (no toggle; derived from chain) */}
            <div className="rounded-2xl border border-black/10 bg-white/50 p-4 dark:border-white/10 dark:bg-white/5">
              <div className="text-xs text-black/60 dark:text-white/60">Direction (auto)</div>

              <div className="mt-2 flex items-center gap-1 rounded-2xl border border-black/10 bg-white/60 p-1 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
                {/* Linea -> Base */}
                <button
                  disabled
                  className={[
                    "flex w-full items-center justify-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold transition",
                    onLinea
                      ? "bg-black text-white dark:bg-white dark:text-black"
                      : "bg-white/50 text-black/35 dark:bg-white/5 dark:text-white/30",
                  ].join(" ")}
                  title="Direction is determined by your current network"
                >
                  <Image src="/brands/linea/icon.png" alt="Linea" width={18} height={18} />
                  <span>Linea → Base</span>
                </button>

                {/* Base -> Linea */}
                <button
                  disabled
                  className={[
                    "flex w-full items-center justify-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold transition",
                    onBase
                      ? "bg-black text-white dark:bg-white dark:text-black"
                      : "bg-white/50 text-black/35 dark:bg-white/5 dark:text-white/30",
                  ].join(" ")}
                  title="Direction is determined by your current network"
                >
                  <Image src="/brands/base/icon.jpeg" alt="Base" width={18} height={18} />
                  <span>Base → Linea</span>
                </button>
              </div>

              {unsupported ? (
                <div className="mt-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-300">
                  Unsupported network. Please switch to <b>Linea</b> or <b>Base</b>.
                </div>
              ) : null}
            </div>

            <div className="rounded-2xl border border-black/10 bg-white/50 p-4 dark:border-white/10 dark:bg-white/5">
              <div className="text-xs text-black/60 dark:text-white/60">Amount</div>
              <div className="mt-2 flex gap-2">
                <input
                  className="w-full rounded-2xl border border-black/10 bg-white/70 px-3 py-2 text-sm outline-none placeholder:text-black/40 focus:ring-2 focus:ring-cyan-400/40 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-white/40"
                  placeholder="0.0"
                  disabled={unsupported}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <button
                  className="rounded-2xl border border-black/10 bg-white/70 px-4 py-2 text-sm font-medium hover:bg-white disabled:opacity-50 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
                  disabled={unsupported || !isConnected}
                  onClick={handleMax}
                >
                  Max
                </button>
              </div>

              {/* Minimal addition: balance line (inside same card, no layout move) */}
              <div className="mt-2 text-xs text-black/60 dark:text-white/60">
                Balance:{" "}
                <span className="font-semibold text-black/70 dark:text-white/70">{balanceLabel}</span>
                {onBase && baseCapPerTx != null ? (
                  <>
                    {" "}
                    • Cap/tx:{" "}
                    <span className="font-semibold text-black/70 dark:text-white/70">
                      {formatToken(baseCapPerTx, tokenDecimals, 6)} DTC
                    </span>
                  </>
                ) : null}
              </div>

              {amountExceedsBalance ? (
                <div className="mt-2 text-xs font-semibold text-red-600 dark:text-red-300">
                  Amount exceeds your balance.
                </div>
              ) : null}

              {amountExceedsBaseCap ? (
                <div className="mt-2 text-xs font-semibold text-red-600 dark:text-red-300">
                  Amount exceeds Base cap per tx.
                </div>
              ) : null}
            </div>

            <div className="rounded-2xl border border-black/10 bg-white/50 p-4 dark:border-white/10 dark:bg-white/5">
              <div className="text-xs text-black/60 dark:text-white/60">Recipient</div>
              <input
                className="mt-2 w-full rounded-2xl border border-black/10 bg-white/70 px-3 py-2 text-sm outline-none placeholder:text-black/40 focus:ring-2 focus:ring-cyan-400/40 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-white/40"
                placeholder="0x… (default = your wallet)"
                disabled={unsupported}
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
              />
            </div>

            <div className="rounded-2xl border border-black/10 bg-white/50 p-4 dark:border-white/10 dark:bg-white/5">
              <div className="text-xs text-black/60 dark:text-white/60">Estimated fee</div>
              <div className="mt-1 text-sm text-black/80 dark:text-white/80">
                {feeWei != null ? `${formatEther(feeWei)} ETH` : "—"}
              </div>
            </div>

            <button
              className="rounded-3xl bg-black px-5 py-3 text-base font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-50 dark:bg-white dark:text-black"
              disabled={sendDisabled}
              onClick={handleSend}
            >
              SEND IT! 🚀
            </button>
          </div>
        </section>

        {/* Middle: Status / Console / History */}
        <section className="grid gap-6">
          <div className="rounded-3xl border border-black/10 bg-white/60 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
            <div className="text-sm font-semibold">Bridge Status</div>

            <div className="mt-3 rounded-2xl border border-black/10 bg-white/50 p-4 text-sm dark:border-white/10 dark:bg-white/5">
              {unsupported ? (
                <>
                  <div className="font-semibold text-red-600 dark:text-red-300">
                    WRONG NETWORK — switch required
                  </div>
                  <div className="mt-2 text-xs text-black/60 dark:text-white/60">
                    This app only supports Linea and Base. Use the buttons below.
                  </div>

                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => switchChain({ chainId: linea.id })}
                      className="flex items-center gap-2 rounded-2xl bg-black px-3 py-2 text-sm font-semibold text-white hover:opacity-90 dark:bg-white dark:text-black"
                    >
                      <Image src="/brands/linea/icon.png" alt="Linea" width={18} height={18} />
                      Switch to Linea
                    </button>
                    <button
                      onClick={() => switchChain({ chainId: base.id })}
                      className="flex items-center gap-2 rounded-2xl border border-black/10 bg-white/70 px-3 py-2 text-sm font-semibold text-black hover:bg-white dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
                    >
                      <Image src="/brands/base/icon.jpeg" alt="Base" width={18} height={18} />
                      Switch to Base
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="font-medium">
                    {bridgeState} — {statusMessage}
                  </div>

                  {onBase ? (
                    <div className="mt-2 text-xs text-black/60 dark:text-white/60">
                      Base → Linea requires a deposit step: the UI first transfers your Base DTC into the router,
                      then calls <b>bridgeToLinea</b>.
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-black/10 bg-white/60 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
            <div className="text-sm font-semibold">Console Log</div>
            <div className="mt-3 h-64 overflow-auto rounded-2xl border border-black/10 bg-white/50 p-4 text-xs leading-relaxed dark:border-white/10 dark:bg-white/5 dark:text-white">
              {logs.length === 0 ? (
                <>
                  • App loaded
                  <br />• Waiting for wallet connection
                  <br />• Direction auto-selected from network
                </>
              ) : (
                logs.map((x, i) => (
                  <div key={i}>
                    • {new Date(x.t).toLocaleTimeString()} — {x.m}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-black/10 bg-white/60 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
            <div className="text-sm font-semibold">History</div>
            <div className="mt-3 rounded-2xl border border-black/10 bg-white/50 p-4 text-sm text-black/60 dark:border-white/10 dark:bg-white/5 dark:text-white/60">
              {history.length === 0 ? (
                <>No local history yet (we’ll store it in your browser).</>
              ) : (
                <div className="grid gap-2">
                  {history.map((h, idx) => {
                    return (
                      <div
                        key={idx}
                        className="flex items-start justify-between gap-3 rounded-2xl border border-black/10 bg-white/60 p-3 text-sm text-black/70 dark:border-white/10 dark:bg-white/5 dark:text-white/70"
                      >
                        <div className="min-w-0">
                          <div className="font-semibold">
                            {h.direction === "LINEA_TO_BASE" ? "Linea → Base" : "Base → Linea"} •{" "}
                            {h.amount} DTC
                          </div>
                          <div className="mt-1 text-xs text-black/60 dark:text-white/60">
                            To: {h.recipient}
                          </div>
                          <div className="mt-1 text-xs text-black/50 dark:text-white/50">
                            {new Date(h.time).toLocaleString()} • {h.status}
                          </div>
                        </div>

                        <div className="shrink-0">
                          {h.txHash && explorerBase ? (
                            <a
                              href={`${explorerBase}/tx/${h.txHash}`}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-2xl border border-black/10 bg-white/70 px-3 py-2 text-xs font-semibold text-black hover:bg-white dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
                            >
                              View
                            </a>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Right: Ecosystem rail */}
        <aside className="hidden lg:block">
          <div className="sticky top-6 grid gap-4">
            <div className="rounded-3xl border border-black/10 bg-white/60 p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
              <div className="text-xs font-semibold tracking-wide text-black/60 dark:text-white/60">
                Ecosystem
              </div>

              <div className="mt-4 grid gap-3">
                <a
                  href="https://donaldtoad.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white/50 p-3 hover:bg-white/80 dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/20"
                >
                  <Image src="/brands/dtc/dtc.png" alt="DTC" width={28} height={28} />
                  <div>
                    <div className="text-sm font-medium">Donald Toad Coin</div>
                    <div className="text-xs text-black/60 dark:text-white/60">donaldtoad.com</div>
                  </div>
                </a>

                <a
                  href="https://linea.build"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white/50 p-3 hover:bg-white/80 dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/20"
                >
                  <Image src="/brands/linea/icon.png" alt="Linea" width={28} height={28} />
                  <div>
                    <div className="text-sm font-medium">Linea</div>
                    <div className="text-xs text-black/60 dark:text-white/60">linea.build</div>
                  </div>
                </a>

                <a
                  href="https://base.org"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white/50 p-3 hover:bg-white/80 dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/20"
                >
                  <Image src="/brands/base/icon.jpeg" alt="Base" width={28} height={28} />
                  <div>
                    <div className="text-sm font-medium">Base</div>
                    <div className="text-xs text-black/60 dark:text-white/60">base.org</div>
                  </div>
                </a>

                <a
                  href="https://layerzero.network"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white/50 p-3 hover:bg-white/80 dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/20"
                >
                  <Image
                    src="/brands/layerzero/LayerZero_emblem.svg"
                    alt="LayerZero"
                    width={20}
                    height={20}
                  />
                  <div>
                    <div className="text-sm font-medium">LayerZero</div>
                    <div className="text-xs text-black/60 dark:text-white/60">layerzero.network</div>
                  </div>
                </a>
              </div>

              <div className="mt-4 text-xs text-black/50 dark:text-white/40">
                Tip: the bridge direction is automatic. Switch network to change direction.
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
