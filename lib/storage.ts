import { BRIDGE_CONFIG } from "@/lib/bridgeConfig";

export type BridgeHistoryItem = {
  time: number;
  direction: "LINEA_TO_BASE" | "BASE_TO_LINEA";
  amount: string;
  recipient: string;
  chainId: number;
  status: "PENDING" | "CONFIRMED" | "ERROR";
  txHash?: `0x${string}`;
};

export function loadHistory(): BridgeHistoryItem[] {
  try {
    const raw = localStorage.getItem(BRIDGE_CONFIG.history.storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, BRIDGE_CONFIG.history.maxItems);
  } catch {
    return [];
  }
}

export function saveHistory(items: BridgeHistoryItem[]) {
  try {
    localStorage.setItem(
      BRIDGE_CONFIG.history.storageKey,
      JSON.stringify(items.slice(0, BRIDGE_CONFIG.history.maxItems))
    );
  } catch {
    // ignore
  }
}
