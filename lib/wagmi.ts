import { createConfig, http } from "wagmi";
import { linea, base } from "wagmi/chains";
import { injected, coinbaseWallet } from "wagmi/connectors";

const LINEA_RPC =
  process.env.NEXT_PUBLIC_LINEA_RPC_URL ||
  "https://rpc.linea.build";

const BASE_RPC =
  process.env.NEXT_PUBLIC_BASE_RPC_URL ||
  "https://mainnet.base.org";

export const wagmiConfig = createConfig({
  chains: [linea, base],
  connectors: [
    // MetaMask / Rabby / most browser wallets
    injected(),
    // Coinbase Wallet (works even when not injected in some contexts)
    coinbaseWallet({
      appName: "DTC Multichain Bridge",
    }),
  ],
  transports: {
    [linea.id]: http(LINEA_RPC),
    [base.id]: http(BASE_RPC),
  },
  ssr: true,
});
