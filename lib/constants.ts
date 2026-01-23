export const CHAINS = {
  linea: {
    chainId: 59144,
    name: "Linea",
    eid: 30183,
    explorer: "https://lineascan.build",
    icon: "/brands/linea/icon.png",
  },
  base: {
    chainId: 8453,
    name: "Base",
    eid: 30184,
    explorer: "https://basescan.org",
    icon: "/brands/base/icon.jpeg",
  },
} as const;

export const LINKS = {
  dtc: "https://donaldtoad.com/",
  linea: "https://linea.build",
  base: "https://base.org",
  layerzero: "https://layerzero.network",
} as const;

// Contracts (from your technical summary)
export const CONTRACTS = {
  lineaDtc: "0xEb1fD1dBB8aDDA4fa2b5A5C4bcE34F6F20d125D2",
  lineaAdapter: "0x54B4E88E9775647614440Acc8B13A079277fa2A6",
  baseOft: "0xFbA669C72b588439B29F050b93500D8b645F9354",
  baseRouter: "0x480C0d523511dd96A65A38f36aaEF69aC2BaA82a",
  lzEndpointV2: "0x1a44076050125825900e736c501f859c50fE728c",
} as const;

export const UI = {
  primaryCta: "SEND IT! 🚀",
} as const;
