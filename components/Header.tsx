"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useChainId, useSwitchChain, useAccount, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { linea, base } from "wagmi/chains";
import { useTheme } from "next-themes";
import ThemeToggle from "@/components/ThemeToggle";
import { shortenAddress } from "@/lib/formatting";

export default function Header() {
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { theme } = useTheme();

  const { address, isConnected } = useAccount();
  const { connect, isPending: isConnecting } = useConnect();
  const { disconnect, isPending: isDisconnecting } = useDisconnect();

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
    if (!isConnected) return isConnecting ? "Connecting…" : "Connect Wallet";
    return isDisconnecting ? "Disconnecting…" : shortenAddress(address);
  }, [isConnected, isConnecting, isDisconnecting, address]);

  const onConnectClick = async () => {
    if (!isConnected) {
      connect({ connector: injected() });
      return;
    }
    disconnect();
  };

  // Hydration-safe: do not render until mounted, but hooks already declared
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
          {/* Forced white in dark mode via globals.css */}
          <div className="dtc-brand-title text-xl font-semibold tracking-tight">
            DTC Multichain Bridge
          </div>

          <div className="dtc-brand-subtitle mt-1 flex items-center gap-2 text-sm">
            <span>Powered by</span>

            {/* LayerZero WORDMARK – black/light, white/dark */}
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
      <div className="flex items-center gap-3">
        <button
          onClick={onConnectClick}
          className="rounded-2xl border border-black/10 bg-white/70 px-4 py-2 text-sm font-semibold text-black hover:bg-white dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
        >
          {connectLabel}
        </button>

        <ThemeToggle />
      </div>
    </div>
  );
}
