import { describe, expect, it } from 'vitest';
import { EvalancheError } from '../../src/utils/errors';
import {
  CompositeDappRegistry,
  LocalCanonicalDappRegistryProvider,
  createDefaultDappRegistry,
  parseInteroperableAddress,
  resolveDappTarget,
  type DappRegistryProvider,
} from '../../src/defi/dapp-registry';

describe('DeFi dapp resolution', () => {
  it('parses address@network interoperable addresses', () => {
    const parsed = parseInteroperableAddress('0x0000000F2Eb9f69274678c76222B35eEC7588A65@base');
    expect(parsed.address).toBe('0x0000000f2eB9f69274678c76222B35eEc7588a65');
    expect(parsed.network).toBe('base');
  });

  it('parses CAIP-10 interoperable addresses', () => {
    const parsed = parseInteroperableAddress('eip155:8453:0x0000000F2Eb9f69274678c76222B35eEC7588A65');
    expect(parsed.address).toBe('0x0000000f2eB9f69274678c76222B35eEc7588a65');
    expect(parsed.network).toBe('base');
  });

  it('fails on explicit network mismatch', () => {
    const registry = createDefaultDappRegistry();
    expect(() => resolveDappTarget({
      target: '0x0000000F2Eb9f69274678c76222B35eEC7588A65@base',
      explicitNetwork: 'avalanche',
      currentNetwork: 'avalanche',
    }, registry)).toThrow(EvalancheError);
  });

  it('uses local canonical mapping precedence for known dapps', () => {
    const registry = createDefaultDappRegistry();
    const resolved = resolveDappTarget({
      target: '0x0000000F2Eb9f69274678c76222B35eEC7588A65',
      currentNetwork: 'avalanche',
    }, registry);
    expect(resolved.network).toBe('base');
    expect(resolved.source).toBe('local_registry');
    expect(resolved.protocol).toBe('yoUSD Vault');
  });

  it('falls back to current network for unknown addresses', () => {
    const registry = createDefaultDappRegistry();
    const resolved = resolveDappTarget({
      target: '0x1111111111111111111111111111111111111111',
      currentNetwork: 'avalanche',
    }, registry);
    expect(resolved.network).toBe('avalanche');
    expect(resolved.source).toBe('current_network');
  });

  it('keeps local canonical precedence over later providers', () => {
    const conflictingProvider: DappRegistryProvider = {
      resolveByAddress: () => ({
        address: '0x0000000F2Eb9f69274678c76222B35eEC7588A65',
        network: 'avalanche',
        protocol: 'Conflicting Vault',
        source: 'avapilot_registry',
      }),
    };
    const registry = new CompositeDappRegistry([
      new LocalCanonicalDappRegistryProvider(),
      conflictingProvider,
    ]);
    const resolved = resolveDappTarget({
      target: '0x0000000F2Eb9f69274678c76222B35eEC7588A65',
      currentNetwork: 'avalanche',
    }, registry);
    expect(resolved.network).toBe('base');
    expect(resolved.protocol).toBe('yoUSD Vault');
    expect(resolved.source).toBe('local_registry');
  });
});
