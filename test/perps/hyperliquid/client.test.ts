import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HyperliquidClient } from '../../../src/perps/hyperliquid/client';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('HyperliquidClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps Hyperliquid markets with venue and HIP-3 metadata', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ([
        {
          universe: [
            { name: 'BTC', maxLeverage: 50, marginTableId: 1, szDecimals: 5 },
            { name: '@ARENA', maxLeverage: 20, marginTableId: 2, szDecimals: 2, dexId: 'arena', isHip3: true },
          ],
        },
        [
          { oraclePx: '100000', dayNtlVlm: '1000000', openInterest: '100' },
          { oraclePx: '2.5', dayNtlVlm: '25000', openInterest: '10' },
        ],
      ]),
    });

    const client = new HyperliquidClient({ address: '0x1234567890abcdef1234567890abcdef12345678' });
    const markets = await client.getMarkets();

    expect(markets).toHaveLength(2);
    expect(markets[0].venue).toBe('hyperliquid');
    expect(markets[0].marketClass).toBe('validator');
    expect(markets[0].marketId).toBe('0');
    expect(markets[1].marketClass).toBe('hip3');
    expect(markets[1].metadata.dexId).toBe('arena');
    expect(markets[1].metadata.isHip3).toBe(true);
  });

  it('maps account state and positions from clearinghouseState', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        crossMarginSummary: {
          accountValue: '1500',
        },
        withdrawable: '1200',
        assetPositions: [
          {
            position: {
              coin: 'ETH',
              szi: '-0.25',
              entryPx: '3200',
              unrealizedPnl: '12.5',
              liquidationPx: '4200',
            },
          },
        ],
      }),
    });

    const client = new HyperliquidClient({ address: '0x1234567890abcdef1234567890abcdef12345678' });
    const state = await client.getAccountState();

    expect(state.accountValue).toBe('1500');
    expect(state.withdrawable).toBe('1200');
    expect(state.positions).toHaveLength(1);
    expect(state.positions[0].venue).toBe('hyperliquid');
    expect(state.positions[0].side).toBe('SHORT');
    expect(state.positions[0].market).toBe('ETH');
  });

  it('throws honestly for trading methods until signing support is implemented', async () => {
    const client = new HyperliquidClient({ address: '0x1234567890abcdef1234567890abcdef12345678' });

    await expect(client.placeMarketOrder({
      market: 'BTC',
      side: 'BUY',
      size: '0.1',
    })).rejects.toThrow('Hyperliquid trading requires a signer');
  });
});

