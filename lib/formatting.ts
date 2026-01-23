import { formatUnits, toHex, type Hex } from "viem";

export function shortenAddress(addr?: string) {
  if (!addr) return "";
  if (addr.length < 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function addressToBytes32(addr: `0x${string}`): Hex {
  // bytes32(uint256(uint160(addr)))
  return toHex(BigInt(addr), { size: 32 });
}

export function formatToken(balance: bigint, decimals: number, maxFrac = 6) {
  const s = formatUnits(balance, decimals);
  const [i, f = ""] = s.split(".");
  if (!f) return i;
  const trimmed = f.slice(0, maxFrac).replace(/0+$/, "");
  return trimmed ? `${i}.${trimmed}` : i;
}
