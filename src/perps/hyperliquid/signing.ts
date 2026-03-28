import { Signature, TypedDataDomain, keccak256 } from 'ethers';
import type { AgentSigner } from '../../wallet/signer';
import { encodeMsgPack } from './msgpack';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const HYPERLIQUID_DOMAIN: TypedDataDomain = {
  name: 'Exchange',
  version: '1',
  chainId: 1337,
  verifyingContract: ZERO_ADDRESS,
};

function removeUndefined(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(removeUndefined);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      if (entry !== undefined) out[key] = removeUndefined(entry);
    }
    return out;
  }
  return value;
}

function toUint64Bytes(value: bigint | number): Uint8Array {
  const bytes = new Uint8Array(8);
  new DataView(bytes.buffer).setBigUint64(0, BigInt(value));
  return bytes;
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

export function createL1ActionHash(args: {
  action: Record<string, unknown>;
  nonce: number;
  vaultAddress?: `0x${string}`;
  expiresAfter?: number;
}): `0x${string}` {
  const actionBytes = encodeMsgPack(removeUndefined(args.action) as any);
  const nonceBytes = toUint64Bytes(args.nonce);
  const vaultMarker = args.vaultAddress ? new Uint8Array([1]) : new Uint8Array([0]);
  const vaultBytes = args.vaultAddress
    ? Uint8Array.from(Buffer.from(args.vaultAddress.slice(2), 'hex'))
    : new Uint8Array();
  const expiresMarker = args.expiresAfter !== undefined ? new Uint8Array([0]) : new Uint8Array();
  const expiresBytes = args.expiresAfter !== undefined ? toUint64Bytes(args.expiresAfter) : new Uint8Array();
  const hash = keccak256(concatBytes([actionBytes, nonceBytes, vaultMarker, vaultBytes, expiresMarker, expiresBytes]));
  return hash as `0x${string}`;
}

export async function signHyperliquidL1Action(args: {
  signer: AgentSigner;
  action: Record<string, unknown>;
  nonce: number;
  isTestnet?: boolean;
  vaultAddress?: `0x${string}`;
  expiresAfter?: number;
}): Promise<{ r: `0x${string}`; s: `0x${string}`; v: 27 | 28 }> {
  const message = {
    source: args.isTestnet ? 'b' : 'a',
    connectionId: createL1ActionHash({
      action: args.action,
      nonce: args.nonce,
      vaultAddress: args.vaultAddress,
      expiresAfter: args.expiresAfter,
    }),
  };

  const signature = await args.signer.signTypedData(
    HYPERLIQUID_DOMAIN,
    {
      Agent: [
        { name: 'source', type: 'string' },
        { name: 'connectionId', type: 'bytes32' },
      ],
    },
    message,
  );
  const split = Signature.from(signature);
  const v = split.yParity === 0 ? 27 : 28;
  return { r: split.r as `0x${string}`, s: split.s as `0x${string}`, v };
}

let lastNonce = 0;

export function nextHyperliquidNonce(): number {
  const now = Date.now();
  lastNonce = now > lastNonce ? now : lastNonce + 1;
  return lastNonce;
}
