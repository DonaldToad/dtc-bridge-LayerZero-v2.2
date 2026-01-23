export const BRIDGE_CONFIG = {
  chains: {
    linea: {
      chainId: 59144,
      eid: 30183,
      explorerBaseUrl: "https://lineascan.build",
    },
    base: {
      chainId: 8453,
      eid: 30184,
      explorerBaseUrl: "https://basescan.org",
    },
  },

  // Deployed contracts (your values)
  contracts: {
    baseOft: "0xFbA669C72b588439B29F050b93500D8b645F9354",
    baseRouter: "0x480C0d523511dd96A65A38f36aaEF69aC2BaA82a",
    lineaAdapter: "0x54B4E88E9775647614440Acc8B13A079277fa2A6",
    dtcLinea: "0xEb1fD1dBB8aDDA4fa2b5A5C4bcE34F6F20d125D2",
  },

  lz: {
    eidLinea: 30183,
    eidBase: 30184,
    // your router uses a fixed lzReceiveGas; we read it from router when on Base,
    // but we also keep a safe default
    lzReceiveGasDefault: 200_000,
  },

  history: {
    storageKey: "dtc_bridge_history_v1",
    maxItems: 25,
  },
} as const;
