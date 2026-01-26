"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  useAccount,
  useChainId,
  useDisconnect,
  useSwitchChain,
  useConnect,
} from "wagmi";
import type { Connector } from "wagmi";
import { linea, base } from "wagmi/chains";
import { useTheme } from "next-themes";
import ThemeToggle from "@/components/ThemeToggle";
import { shortenAddress } from "@/lib/formatting";

export default function Header() {
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { theme } = useTheme();

  const { address, isConnected } = useAccount();
  const { disconnectAsync } = useDisconnect();

  // wagmi connect
  const { connectAsync, connectors, isPending: connectPending } = useConnect();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const onLinea = chainId === linea.id;
  const onBase = chainId === base.id;
  const unsupported = !onLinea && !onBase;

  const layerZeroLogo = useMemo(() => {
    return theme === "dark"
      ? "/brands/layerzero/logo-white.svg"
      : "/brands/layerzero/logo-black.svg";
  }, [theme]);

  const connectLabel = useMemo(() => {
    if (isConnected && address) return shortenAddress(address);
    return connectPending ? "Connecting…" : "Connect Wallet";
  }, [isConnected, address, connectPending]);

  const bestConnector = useMemo(() => {
    // Prefer common browser wallets. Do NOT require `ready` (wagmi v2 differs across connectors).
    const list = connectors ?? [];
    const pick = (fn: (c: Connector) => boolean) => list.find(fn);

    return (
      pick(
        (c) =>
          (c.id || "").toLowerCase().includes("metamask") ||
          (c.name || "").toLowerCase().includes("metamask")
      ) ||
      pick(
        (c) =>
          (c.id || "").toLowerCase().includes("rabby") ||
          (c.name || "").toLowerCase().includes("rabby")
      ) ||
      pick(
        (c) =>
          (c.id || "").toLowerCase().includes("injected") ||
          (c.name || "").toLowerCase().includes("injected")
      ) ||
      pick(
        (c) =>
          (c.id || "").toLowerCase().includes("coinbase") ||
          (c.name || "").toLowerCase().includes("coinbase")
      ) ||
      list[0]
    );
  }, [connectors]);

  async function handleMainConnectClick() {
    // One-click behavior:
    // - If connected: disconnect
    // - Else: connect using the best available connector
    try {
      if (isConnected) {
        await disconnectAsync();
        return;
      }

      if (!bestConnector) return;

      await connectAsync({ connector: bestConnector });
    } catch {
      // Intentionally silent: wallet extensions often throw user-rejection errors
      // and we do not want to break UI.
    }
  }

  if (!mounted) return null;

  return (
    <div className="flex items-center justify-between gap-4 py-6">
      {/* Left brand */}
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 overflow-hidden rounded-3xl ring-1 ring-black/10 dark:ring-black/10">
          <Image
            src="/brands/dtc/bridge-logo.jpg"
            alt="DTC Multichain Bridge"
            width={64}
            height={64}
            className="h-full w-full object-cover"
            priority
          />
        </div>

        <div className="leading-tight">
          <div className="dtc-brand-title text-xl font-semibold tracking-tight">
            DTC Multichain Bridge
          </div>

          {/* FIX: Powered by white in dark + correct wordmark by theme + no dot + no duplicate text */}
          <div className="dtc-brand-subtitle mt-1 flex items-center gap-2 text-sm text-black/60 dark:text-white/70">
            <span>Powered by</span>
            <Image
              src={layerZeroLogo}
              alt="LayerZero"
              width={90}
              height={18}
              className="h-[18px] w-auto"
              priority
            />
          </div>
        </div>
      </div>

      {/* Center: Network switch */}
      <div className="hidden md:flex items-center gap-2">
        <div className="flex items-center gap-1 rounded-2xl border border-black/10 bg-white/60 p-1 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
          <button
            onClick={() => switchChain({ chainId: linea.id })}
            className={[
              "flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold transition",
              onLinea
                ? "bg-black text-white dark:bg-white dark:text-black"
                : "bg-white/50 text-black/60 hover:bg-white dark:bg-white/5 dark:text-white/60 dark:hover:bg-white/10",
            ].join(" ")}
          >
            <Image
              src="/brands/linea/icon.png"
              alt="Linea"
              width={18}
              height={18}
              className="h-4 w-4"
            />
            <span>Linea</span>
          </button>

          <button
            onClick={() => switchChain({ chainId: base.id })}
            className={[
              "flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold transition",
              onBase
                ? "bg-black text-white dark:bg-white dark:text-black"
                : "bg-white/50 text-black/60 hover:bg-white dark:bg-white/5 dark:text-white/60 dark:hover:bg-white/10",
            ].join(" ")}
          >
            <Image
              src="/brands/base/icon.jpeg"
              alt="Base"
              width={18}
              height={18}
              className="h-4 w-4 rounded-[4px]"
            />
            <span>Base</span>
          </button>
        </div>

        {unsupported && (
          <span className="rounded-2xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-600 dark:text-red-300">
            Unsupported network
          </span>
        )}
      </div>

      {/* Right: One-click wallet + theme toggle */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleMainConnectClick}
          className="rounded-2xl border border-black/10 bg-white/70 px-4 py-2 text-sm font-semibold text-black hover:bg-white disabled:opacity-50 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
          disabled={!isConnected && !bestConnector}
          title={
            !isConnected && !bestConnector
              ? "No wallet connector available"
              : undefined
          }
        >
          {connectLabel}
        </button>

        <ThemeToggle />
      </div>
    </div>
  );
}
