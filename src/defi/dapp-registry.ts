import { getAddress } from 'ethers';
import { SAVAX_CONTRACT } from './liquid-staking';
import { YOUSD_VAULT } from './vaults';
import { getChainByAlias, getChainById, CHAIN_ALIASES } from '../utils/chains';
import type { ChainName } from '../utils/networks';
import { EvalancheError, EvalancheErrorCode } from '../utils/errors';

export type DappResolutionSource =
  | 'interop_address'
  | 'explicit_network'
  | 'local_registry'
  | 'avapilot_registry'
  | 'current_network';

export interface ParsedInteropAddress {
  address: string;
  network?: ChainName;
}

export interface DappRecord {
  address: string;
  network: ChainName;
  protocol: string;
  source: 'local_registry' | 'avapilot_registry';
  aliases?: string[];
  category?: string;
}

export interface ResolvedDappTarget {
  address: string;
  network: ChainName;
  protocol?: string;
  source: DappResolutionSource;
}

export interface ResolveDappTargetInput {
  target: string;
  explicitNetwork?: string;
  currentNetwork: ChainName;
}

export interface DappRegistryProvider {
  resolveByAddress(address: string): DappRecord | null;
  resolveByAlias?(alias: string): DappRecord | null;
}

const LOCAL_DAPP_RECORDS: DappRecord[] = [
  {
    address: normalizeAddress(YOUSD_VAULT),
    network: 'base',
    protocol: 'yoUSD Vault',
    source: 'local_registry',
    aliases: ['yousd', 'yousd-vault'],
    category: 'vault',
  },
  {
    address: getAddress(SAVAX_CONTRACT),
    network: 'avalanche',
    protocol: 'sAVAX',
    source: 'local_registry',
    aliases: ['savax', 'benqi-savax', 'benqi'],
    category: 'staking',
  },
];

export class LocalCanonicalDappRegistryProvider implements DappRegistryProvider {
  private readonly recordsByAddress = new Map<string, DappRecord>();
  private readonly recordsByAlias = new Map<string, DappRecord>();

  constructor(records: DappRecord[] = LOCAL_DAPP_RECORDS) {
    for (const record of records) {
      const normalized = { ...record, address: normalizeAddress(record.address) };
      this.recordsByAddress.set(normalized.address.toLowerCase(), normalized);
      this.recordsByAlias.set(normalized.protocol.toLowerCase(), normalized);
      for (const alias of normalized.aliases ?? []) {
        this.recordsByAlias.set(alias.toLowerCase(), normalized);
      }
    }
  }

  resolveByAddress(address: string): DappRecord | null {
    return this.recordsByAddress.get(normalizeAddress(address).toLowerCase()) ?? null;
  }

  resolveByAlias(alias: string): DappRecord | null {
    return this.recordsByAlias.get(alias.trim().toLowerCase()) ?? null;
  }
}

export class CompositeDappRegistry {
  constructor(private readonly providers: DappRegistryProvider[]) {}

  resolveByAddress(address: string): DappRecord | null {
    for (const provider of this.providers) {
      const match = provider.resolveByAddress(address);
      if (match) return match;
    }
    return null;
  }

  resolveByAlias(alias: string): DappRecord | null {
    for (const provider of this.providers) {
      const match = provider.resolveByAlias?.(alias);
      if (match) return match;
    }
    return null;
  }
}

export function createDefaultDappRegistry(): CompositeDappRegistry {
  return new CompositeDappRegistry([
    new LocalCanonicalDappRegistryProvider(),
  ]);
}

export function parseInteroperableAddress(target: string): ParsedInteropAddress {
  const value = target.trim();
  const atMatch = value.match(/^(0x[a-fA-F0-9]{40})@([a-z0-9-]+)$/);
  if (atMatch) {
    const [, address, network] = atMatch;
    const normalized = normalizeNetworkName(network);
    if (!normalized) {
      throw new EvalancheError(
        `Unsupported interoperable address network: ${network}`,
        EvalancheErrorCode.INTEROP_ADDRESS_ERROR,
      );
    }
    return { address: normalizeAddress(address), network: normalized };
  }

  const caipMatch = value.match(/^eip155:(\d+):(0x[a-fA-F0-9]{40})$/);
  if (caipMatch) {
    const [, chainIdRaw, address] = caipMatch;
    const chain = getChainById(Number(chainIdRaw));
    const normalized = chain
      ? normalizeNetworkName(chain.shortName) ?? normalizeNetworkName(chain.name)
      : undefined;
    if (!normalized) {
      throw new EvalancheError(
        `Unsupported CAIP-10 chain ID: ${chainIdRaw}`,
        EvalancheErrorCode.INTEROP_ADDRESS_ERROR,
      );
    }
    return { address: normalizeAddress(address), network: normalized };
  }

  if (/^0x[a-fA-F0-9]{40}$/.test(value)) {
    return { address: normalizeAddress(value) };
  }

  throw new EvalancheError(
    `Invalid interoperable address input: ${target}`,
    EvalancheErrorCode.INTEROP_ADDRESS_ERROR,
  );
}

export function resolveDappTarget(
  input: ResolveDappTargetInput,
  registry: CompositeDappRegistry,
): ResolvedDappTarget {
  const explicitNetwork = normalizeNetworkName(input.explicitNetwork);
  const currentNetwork = normalizeNetworkName(input.currentNetwork) ?? input.currentNetwork;
  const parsed = tryParseInteroperableAddress(input.target);
  const registryMatch = parsed
    ? registry.resolveByAddress(parsed.address)
    : registry.resolveByAlias(input.target);

  if (parsed?.network && explicitNetwork && parsed.network !== explicitNetwork) {
    throw new EvalancheError(
      `Interoperable address network ${parsed.network} conflicts with explicit network ${explicitNetwork}.`,
      EvalancheErrorCode.DAPP_RESOLUTION_ERROR,
    );
  }

  if (registryMatch && parsed?.network && registryMatch.network !== parsed.network) {
    throw new EvalancheError(
      `Resolved dapp ${registryMatch.protocol} is registered on ${registryMatch.network}, not ${parsed.network}.`,
      EvalancheErrorCode.DAPP_RESOLUTION_ERROR,
    );
  }

  if (registryMatch && explicitNetwork && registryMatch.network !== explicitNetwork) {
    throw new EvalancheError(
      `Resolved dapp ${registryMatch.protocol} is registered on ${registryMatch.network}, not ${explicitNetwork}.`,
      EvalancheErrorCode.DAPP_RESOLUTION_ERROR,
    );
  }

  if (parsed?.network) {
    return {
      address: parsed.address,
      network: parsed.network,
      protocol: registryMatch?.protocol,
      source: 'interop_address',
    };
  }

  if (explicitNetwork) {
    return {
      address: parsed?.address ?? registryMatch?.address ?? input.target,
      network: explicitNetwork,
      protocol: registryMatch?.protocol,
      source: registryMatch?.source ?? 'explicit_network',
    };
  }

  if (registryMatch) {
    return {
      address: registryMatch.address,
      network: registryMatch.network,
      protocol: registryMatch.protocol,
      source: registryMatch.source,
    };
  }

  if (parsed) {
    return {
      address: parsed.address,
      network: currentNetwork,
      source: 'current_network',
    };
  }

  return {
    address: input.target,
    network: currentNetwork,
    source: 'current_network',
  };
}

function normalizeNetworkName(network?: string): ChainName | undefined {
  if (!network) return undefined;
  const normalized = network.trim().toLowerCase();
  if (normalized in CHAIN_ALIASES) {
    return normalized as ChainName;
  }
  const chain = getChainByAlias(normalized);
  if (chain) {
    const alias = Object.entries(CHAIN_ALIASES).find(([, chainId]) => chainId === chain.id)?.[0];
    if (alias) return alias as ChainName;
  }
  const hyphenated = normalized.replace(/\s+/g, '-');
  if (hyphenated in CHAIN_ALIASES) {
    return hyphenated as ChainName;
  }
  return undefined;
}

function tryParseInteroperableAddress(target: string): ParsedInteropAddress | null {
  try {
    return parseInteroperableAddress(target);
  } catch {
    return null;
  }
}

function normalizeAddress(address: string): string {
  return getAddress(address.toLowerCase());
}
