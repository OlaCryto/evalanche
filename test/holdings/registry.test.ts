import { describe, expect, it } from 'vitest';
import { createUniversalHoldingsRegistry } from '../../src/holdings/registry';

describe('UniversalHoldingsRegistry', () => {
  it('loads the checked-in universal seed', () => {
    const registry = createUniversalHoldingsRegistry();
    const status = registry.status();
    expect(status.protocols).toBeGreaterThan(5);
    expect(status.assets).toBeGreaterThan(5);
    expect(status.positionSources).toBeGreaterThan(5);
  });

  it('resolves local canonical records ahead of external sources', () => {
    const registry = createUniversalHoldingsRegistry();
    const resolved = registry.resolveAddress('0x0000000F2Eb9f69274678c76222B35eEC7588A65');
    expect(resolved?.protocol).toBe('yoUSD Vault');
    expect(resolved?.network).toBe('base');
    expect(resolved?.source).toBe('local_registry');
  });

  it('exposes AvaPilot-backed Avalanche aliases for routing', () => {
    const registry = createUniversalHoldingsRegistry();
    const resolved = registry.resolveAlias('yieldyak');
    expect(resolved?.protocol).toBe('Yield Yak');
    expect(resolved?.network).toBe('avalanche');
    expect(resolved?.source).toBe('avapilot_registry');
  });

  it('can search protocols, assets, and sources together', () => {
    const registry = createUniversalHoldingsRegistry();
    const result = registry.search('avantis', { chain: 'base' });
    expect(result.protocols.some((protocol) => protocol.protocolId === 'avantis')).toBe(true);
    expect(result.assets.some((asset) => asset.symbol === 'AVNT')).toBe(true);
    expect(result.sources.some((source) => source.protocolId === 'avantis')).toBe(true);
  });
});
