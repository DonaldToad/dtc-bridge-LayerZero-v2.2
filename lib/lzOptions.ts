import { concatHex, toHex, type Hex } from "viem";

/**
 * LayerZero OptionsBuilder (Type 3) encoding:
 * options = [uint16 type=3] +
 *           [uint8 workerId=1] +
 *           [uint16 optionSize = len(option)+1] +
 *           [uint8 optionType=1 (lzReceive)] +
 *           [option bytes = uint128 gas (+ uint128 value if nonzero)]
 */
export function buildLzReceiveOptions(gas: bigint, value: bigint = 0n): Hex {
  const TYPE_3 = toHex(3, { size: 2 }); // uint16
  const WORKER_ID = toHex(1, { size: 1 }); // uint8
  const OPTION_TYPE_LZRECEIVE = toHex(1, { size: 1 }); // uint8

  const gasBytes = toHex(gas, { size: 16 }); // uint128
  const valueBytes = value === 0n ? ("0x" as Hex) : toHex(value, { size: 16 });

  const option = value === 0n ? gasBytes : concatHex([gasBytes, valueBytes]);
  const optionLen = (option.length - 2) / 2; // bytes length
  const optionSize = toHex(optionLen + 1, { size: 2 }); // +1 for optionType

  return concatHex([TYPE_3, WORKER_ID, optionSize, OPTION_TYPE_LZRECEIVE, option]);
}
