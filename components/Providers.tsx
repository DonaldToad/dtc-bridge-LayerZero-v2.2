"use client";

import * as React from "react";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { PrivyProvider } from "@privy-io/react-auth";
import { WagmiProvider } from "@privy-io/wagmi";

import { wagmiConfig } from "@/lib/wagmi";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(() => new QueryClient());

  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

  if (!appId) {
    throw new Error("Missing NEXT_PUBLIC_PRIVY_APP_ID in .env.local / Cloudflare env vars.");
  }

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      <PrivyProvider
        appId={appId}
        config={{
          loginMethods: ["wallet", "email", "sms"],
          embeddedWallets: {
            createOnLogin: "users-without-wallets",
            showWalletUIs: true,
          },
          appearance: {
            theme: "dark",
            showWalletLoginFirst: true,
          },
        }}
      >
        {/* IMPORTANT: QueryClientProvider must wrap WagmiProvider */}
        <QueryClientProvider client={queryClient}>
          <WagmiProvider config={wagmiConfig}>{children}</WagmiProvider>
        </QueryClientProvider>
      </PrivyProvider>
    </ThemeProvider>
  );
}
