"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAccount, useChainId, useDisconnect, useSwitchChain, useConnect } from "wagmi";
import type { Connector } from "wagmi";
import { linea, base } from "wagmi/chains";
import { useTheme } from "next-themes";
import ThemeToggle from "@/components/ThemeToggle";
import { shortenAddress } from "@/lib/formatting";

// Privy
import { usePrivy } from "@privy-io/react-auth";

export default function Header() {
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { theme } = useTheme();

  const { address, isConnected } = useAccount();
  const { disconnectAsync } = useDisconnect();

  // wagmi connect (fallback path)
  const { connectAsync, connectors, isPending: connectPending } = useConnect();

  // Privy
  const { login, logout, authenticated } = usePrivy();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [menuOpen, setMenuOpen] = useState(false);
  const [privyError, setPrivyError] = useState<string | null>(null);
  const [walletError, setWalletError] = useState<string | null>(null);

  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;

    const onClick = (e: MouseEvent) => {
      const el = menuRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) setMenuOpen(false);
    };

    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

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
    if (authenticated) return "Connected";
    return "Connect Wallet";
  }, [isConnected, address, authenticated]);

  const preferredWalletConnectors = useMemo(() => {
    // We filter to the common connectors users expect.
    // Names and ids can vary slightly across wagmi versions/connectors, so we match flexibly.
    const byPriority: Array<(c: Connector) => boolean> = [
      (c) => (c.id || "").toLowerCase().includes("metamask") || (c.name || "").toLowerCase().includes("metamask"),
      (c) => (c.id || "").toLowerCase().includes("coinbase") || (c.name || "").toLowerCase().includes("coinbase"),
      (c) => (c.id || "").toLowerCase().includes("injected") || (c.name || "").toLowerCase().includes("injected"),
    ];

    const picked: Connector[] = [];
    for (const test of byPriority) {
      const found = connectors.find((c) => test(c));
      if (found && !picked.some((p) => p.id === found.id)) picked.push(found);
    }

    // If we somehow picked none, fall back to all connectors so user is not blocked.
    return picked.length > 0 ? picked : connectors;
  }, [connectors]);

  async function handlePrivyLogin() {
    setPrivyError(null);
    setWalletError(null);

    try {
      await login();
      setMenuOpen(false);
    } catch (e: any) {
      // This is where rate-limits / billing / blocked flows will surface.
      // We do NOT block the user; we show fallback wallet options.
      const msg =
        e?.message?.toString?.() ||
        e?.shortMessage?.toString?.() ||
        "Privy login failed. Please use a browser wallet below.";
      setPrivyError(msg);
      setMenuOpen(true);
    }
  }

  async function handleWalletConnect(connector: Connector) {
    setWalletError(null);
    setPrivyError(null);

    try {
      await connectAsync({ connector });
      setMenuOpen(false);
    } catch (e: any) {
      const msg =
        e?.message?.toString?.() ||
        e?.shortMessage?.toString?.() ||
        "Wallet connect failed. Try another wallet.";
      setWalletError(msg);
    }
  }

  async function handleDisconnectAll() {
    setPrivyError(null);
    setWalletError(null);

    try {
      // If user is logged in via Privy, logout ends the Privy session.
      if (authenticated) {
        await logout();
      }
    } catch {
      // ignore
    }

    try {
      if (isConnected) {
        await disconnectAsync();
      }
    } catch {
      // ignore
    }

    setMenuOpen(false);
  }

  function onMainButtonClick() {
    // Behavior:
    // - If connected/authenticated => open menu with Disconnect option
    // - If not => open menu so user can choose Privy or browser wallet
    setPrivyError(null);
    setWalletError(null);
    setMenuOpen((v) => !v);
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

          <div className="dtc-brand-subtitle mt-1 flex items-center gap-2 text-sm">
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
            <Image src="/brands/linea/icon.png" alt="Linea" width={18} height={18} className="h-4 w-4" />
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

      {/* Right: Wallet + theme toggle */}
      <div className="relative flex items-center gap-3" ref={menuRef}>
        <button
          onClick={onMainButtonClick}
          className="rounded-2xl border border-black/10 bg-white/70 px-4 py-2 text-sm font-semibold text-black hover:bg-white dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
        >
          {connectLabel}
        </button>

        {/* Dropdown menu */}
        {menuOpen && (
          <div className="absolute right-0 top-[52px] z-50 w-[320px] rounded-3xl border border-black/10 bg-white p-3 shadow-lg dark:border-white/10 dark:bg-[#0B1220]">
            <div className="px-2 pb-2 text-xs font-semibold text-black/60 dark:text-white/60">
              Wallet options
            </div>

            {/* If already connected/authenticated: show Disconnect */}
            {(authenticated || isConnected) && (
              <div className="px-2 pb-2">
                <button
                  onClick={handleDisconnectAll}
                  className="w-full rounded-2xl bg-black px-4 py-2 text-sm font-semibold text-white hover:opacity-90 dark:bg-white dark:text-black"
                >
                  Disconnect
                </button>
              </div>
            )}

            {/* Privy primary */}
            <div className="px-2 pt-1">
              <button
                onClick={handlePrivyLogin}
                className="w-full rounded-2xl border border-black/10 bg-white/70 px-4 py-2 text-sm font-semibold text-black hover:bg-white dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
              >
                Continue with Privy (email / phone / wallet)
              </button>

              {privyError && (
                <div className="mt-2 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-700 dark:text-red-300">
                  {privyError}
                </div>
              )}
            </div>

            {/* Browser wallet fallback */}
            <div className="mt-3 px-2">
              <div className="mb-2 text-xs font-semibold text-black/60 dark:text-white/60">
                Browser wallets (fallback)
              </div>

              <div className="grid gap-2">
                {preferredWalletConnectors.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleWalletConnect(c)}
                    disabled={connectPending}
                    className="w-full rounded-2xl border border-black/10 bg-white/60 px-4 py-2 text-sm font-semibold text-black hover:bg-white disabled:opacity-50 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
                  >
                    Connect: {c.name}
                  </button>
                ))}
              </div>

              {walletError && (
                <div className="mt-2 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-700 dark:text-red-300">
                  {walletError}
                </div>
              )}
            </div>

            <div className="mt-3 px-2 text-[11px] leading-relaxed text-black/50 dark:text-white/50">
              If Privy is unavailable (limits/billing/outage), use the browser-wallet fallback above.
            </div>
          </div>
        )}

        <ThemeToggle />
      </div>
    </div>
  );
}
