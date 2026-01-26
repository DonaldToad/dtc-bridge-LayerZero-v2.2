import { http } from "wagmi";
import { createConfig } from "@privy-io/wagmi";
import { injected, metaMask, coinbaseWallet } from "wagmi/connectors";
import { base, linea } from "wagmi/chains";

const LINEA_RPC = process.env.NEXT_PUBLIC_LINEA_RPC_URL;
const BASE_RPC = process.env.NEXT_PUBLIC_BASE_RPC_URL;

export const wagmiConfig = createConfig({
  chains: [linea, base],
  connectors: [
    metaMask(),
    coinbaseWallet({ appName: "DTC Multichain Bridge" }),
    injected({ shimDisconnect: true }),
  ],
  transports: {
    [linea.id]: http(LINEA_RPC),
    [base.id]: http(BASE_RPC),
  },
});
