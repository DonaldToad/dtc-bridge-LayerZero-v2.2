"use client";

import { ReactNode, useMemo } from "react";
import { PrivyProvider, type PrivyClientConfig } from "@privy-io/react-auth";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "@privy-io/wagmi";

import { wagmiConfig } from "@/lib/wagmi";

export default function Providers({ children }: { children: ReactNode }) {
  const queryClient = useMemo(() => new QueryClient(), []);

  const privyConfig: PrivyClientConfig = {
    // This enables Privy embedded wallets (created for users without wallets)
    embeddedWallets: {
      createOnLogin: "users-without-wallets",
      showWalletUIs: true,
    },
    // You can enable/disable these later in the Privy dashboard too
    loginMethods: ["wallet", "email", "sms"],
    appearance: {
      theme: "dark",
      showWalletLoginFirst: true,
    },
  };

  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

  if (!appId) {
    // Hard fail early so you notice immediately in dev
    throw new Error("Missing NEXT_PUBLIC_PRIVY_APP_ID in environment variables.");
  }

  return (
    <PrivyProvider appId={appId} config={privyConfig}>
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>{children}</WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}
