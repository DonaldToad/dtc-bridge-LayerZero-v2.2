"use client";

import * as React from "react";
import { PrivyProvider } from "@privy-io/react-auth";

export default function Providers({ children }: { children: React.ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

  if (!appId) {
    throw new Error("Missing NEXT_PUBLIC_PRIVY_APP_ID in environment variables.");
  }

  return (
    <PrivyProvider
      appId={appId}
      config={{
        // Let users pick: wallet or email/phone
        loginMethods: ["wallet", "email", "sms"],

        // Embedded wallet config must be namespaced by chain in some Privy versions
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
      {children}
    </PrivyProvider>
  );
}
