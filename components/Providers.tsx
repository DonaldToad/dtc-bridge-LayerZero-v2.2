"use client";

import * as React from "react";
import { ThemeProvider } from "next-themes";

import { PrivyProvider } from "@privy-io/react-auth";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { wagmiConfig } from "@/lib/wagmi";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(() => new QueryClient());

  // IMPORTANT: This is a public client-side env var, used by Privy in the browser.
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

  // Safe fallback: if Privy is unavailable/misconfigured, still render the app
  // (wallet fallback via wagmi remains usable).
  if (!appId) {
    return (
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <WagmiProvider config={wagmiConfig}>
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        </WagmiProvider>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <PrivyProvider
        appId={appId}
        config={{
          loginMethods: ["wallet", "email", "sms"],

          // FIX: createOnLogin must be namespaced (ethereum/solana) in this Privy version
          embeddedWallets: {
            ethereum: {
              createOnLogin: "users-without-wallets",
            },
            showWalletUIs: true,
          },

          appearance: {
            theme: "dark",
            showWalletLoginFirst: true,
          },
        }}
      >
        <WagmiProvider config={wagmiConfig}>
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        </WagmiProvider>
      </PrivyProvider>
    </ThemeProvider>
  );
}
