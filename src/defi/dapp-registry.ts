import type { ChainName } from '../utils/networks';
import {
  EvalancheError,
  EvalancheErrorCode,
} from '../utils/errors';
import {
  createUniversalHoldingsRegistry,
  parseRegistryInteroperableAddress,
  type UniversalHoldingsRegistry,
  type UniversalResolvedDappRecord,
} from '../holdings/registry';

export type DappResolutionSource =
  | 'interop_address'
  | 'explicit_network'
  | 'local_registry'
  | 'avapilot_registry'
  | 'defillama_registry'
  | 'current_network';

export interface ParsedInteropAddress {
  address: string;
  network?: ChainName;
}

export interface DappRecord {
  address: string;
  network: ChainName;
  protocol: string;
  source: 'local_registry' | 'avapilot_registry' | 'defillama_registry';
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

function normalizeNetworkName(network?: string): ChainName | undefined {
  if (!network) return undefined;
  const value = network.trim().toLowerCase();
  return value as ChainName;
}

function toDappRecord(resolved: UniversalResolvedDappRecord | null): DappRecord | null {
  if (!resolved) return null;
  return {
    address: resolved.address,
    network: resolved.network,
    protocol: resolved.protocol,
    aliases: resolved.aliases,
    category: resolved.category,
    source: resolved.source,
  };
}

export class LocalCanonicalDappRegistryProvider implements DappRegistryProvider {
  private readonly registry: UniversalHoldingsRegistry;

  constructor(registry = createUniversalHoldingsRegistry()) {
    this.registry = registry;
  }

  resolveByAddress(address: string): DappRecord | null {
    const resolved = this.registry.resolveAddress(address);
    return resolved?.source === 'local_registry' ? toDappRecord(resolved) : null;
  }

  resolveByAlias(alias: string): DappRecord | null {
    const resolved = this.registry.resolveAlias(alias);
    return resolved?.source === 'local_registry' ? toDappRecord(resolved) : null;
  }
}

export class AvaPilotRegistryProvider implements DappRegistryProvider {
  private readonly registry: UniversalHoldingsRegistry;

  constructor(registry = createUniversalHoldingsRegistry()) {
    this.registry = registry;
  }

  resolveByAddress(address: string): DappRecord | null {
    const resolved = this.registry.resolveAddress(address);
    return resolved?.source === 'avapilot_registry' ? toDappRecord(resolved) : null;
  }

  resolveByAlias(alias: string): DappRecord | null {
    const resolved = this.registry.resolveAlias(alias);
    return resolved?.source === 'avapilot_registry' ? toDappRecord(resolved) : null;
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
  const registry = createUniversalHoldingsRegistry();
  return new CompositeDappRegistry([
    new LocalCanonicalDappRegistryProvider(registry),
    new AvaPilotRegistryProvider(registry),
    {
      resolveByAddress: (address: string) => {
        const resolved = registry.resolveAddress(address);
        return resolved?.source === 'defillama_registry' ? toDappRecord(resolved) : null;
      },
      resolveByAlias: (alias: string) => {
        const resolved = registry.resolveAlias(alias);
        return resolved?.source === 'defillama_registry' ? toDappRecord(resolved) : null;
      },
    },
  ]);
}

export function parseInteroperableAddress(target: string): ParsedInteropAddress {
  return parseRegistryInteroperableAddress(target);
}

function tryParseInteroperableAddress(target: string): ParsedInteropAddress | null {
  try {
    return parseInteroperableAddress(target);
  } catch {
    return null;
  }
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
