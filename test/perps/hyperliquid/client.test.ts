import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HyperliquidClient } from '../../../src/perps/hyperliquid/client';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const mockSigner = {
  address: '0x1234567890abcdef1234567890abcdef12345678',
  signTypedData: vi.fn().mockResolvedValue(`0x${'1'.repeat(128)}1b`),
} as any;

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

    const client = new HyperliquidClient({ address: mockSigner.address });
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

    const client = new HyperliquidClient({ address: mockSigner.address });
    const state = await client.getAccountState();

    expect(state.accountValue).toBe('1500');
    expect(state.withdrawable).toBe('1200');
    expect(state.positions).toHaveLength(1);
    expect(state.positions[0].venue).toBe('hyperliquid');
    expect(state.positions[0].side).toBe('SHORT');
    expect(state.positions[0].market).toBe('ETH');
  });

  it('maps open orders and fills', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ([
          {
            coin: 'BTC',
            side: 'B',
            limitPx: '100000',
            sz: '0.1',
            oid: 123,
            timestamp: 1000,
            origSz: '0.2',
            reduceOnly: true,
            tif: 'Gtc',
          },
        ]),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ([
          {
            coin: 'BTC',
            side: 'A',
            px: '99900',
            sz: '0.1',
            oid: 123,
            time: 1100,
            startPosition: '0.2',
            closedPnl: '10',
            fee: '0.1',
            feeToken: 'USDC',
            crossed: true,
            hash: '0xabc',
          },
        ]),
      });

    const client = new HyperliquidClient({ address: mockSigner.address });
    const orders = await client.getOpenOrders();
    const trades = await client.getTrades();

    expect(orders[0].side).toBe('BUY');
    expect(orders[0].reduceOnly).toBe(true);
    expect(trades[0].side).toBe('SELL');
    expect(trades[0].hash).toBe('0xabc');
  });

  it('places a resting limit order and reads back order status', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ([
          {
            universe: [
              { name: 'BTC', asset: 0, maxLeverage: 50, marginTableId: 1, szDecimals: 5 },
            ],
          },
          [{ oraclePx: '100000', dayNtlVlm: '1000000', openInterest: '100' }],
        ]),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'ok',
          response: {
            type: 'order',
            data: {
              statuses: [{ resting: { oid: 555 } }],
            },
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'order',
          order: {
            order: {
              coin: 'BTC',
              side: 'B',
              limitPx: '99000',
              sz: '0.1',
              oid: 555,
              timestamp: 2000,
              origSz: '0.1',
              tif: 'Gtc',
            },
            status: 'open',
            statusTimestamp: 2001,
          },
        }),
      });

    const client = new HyperliquidClient({ address: mockSigner.address, signer: mockSigner });
    const execution = await client.placeLimitOrderDetailed({
      market: 'BTC',
      side: 'BUY',
      size: '0.1',
      price: '99000',
      postOnly: true,
    });
    const status = await client.getOrder(execution.orderId!);

    expect(execution.orderId).toBe('555');
    expect(execution.status).toBe('resting');
    expect(status.status).toBe('open');
    expect(mockSigner.signTypedData).toHaveBeenCalledOnce();
  });

  it('places a market order using the L2 book reference price', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ([
          {
            universe: [{ name: 'BTC', asset: 0, maxLeverage: 50, marginTableId: 1, szDecimals: 5 }],
          },
          [{ oraclePx: '100000', dayNtlVlm: '1000000', openInterest: '100' }],
        ]),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          coin: 'BTC',
          time: 1000,
          levels: [
            [{ px: '99900', sz: '1', n: 1 }],
            [{ px: '100100', sz: '1', n: 1 }],
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'ok',
          response: {
            type: 'order',
            data: {
              statuses: [{ filled: { oid: 777, totalSz: '0.1', avgPx: '100200' } }],
            },
          },
        }),
      });

    const client = new HyperliquidClient({ address: mockSigner.address, signer: mockSigner });
    const execution = await client.placeMarketOrderDetailed({
      market: 'BTC',
      side: 'BUY',
      size: '0.1',
    });

    expect(execution.orderId).toBe('777');
    expect(execution.status).toBe('filled');
    expect(execution.averageFillPrice).toBe('100200');
  });

  it('rounds market-order prices to Hyperliquid precision rules for low-priced markets', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ([
          {
            universe: [{ name: 'ATOM', asset: 2, maxLeverage: 5, marginTableId: 5, szDecimals: 2 }],
          },
          [{ oraclePx: '1.6855', dayNtlVlm: '1000000', openInterest: '100' }],
        ]),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          coin: 'ATOM',
          time: 1000,
          levels: [
            [{ px: '1.68', sz: '100', n: 1 }],
            [{ px: '1.6855', sz: '100', n: 1 }],
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'ok',
          response: {
            type: 'order',
            data: {
              statuses: [{ filled: { oid: 778, totalSz: '1.00', avgPx: '1.7361' } }],
            },
          },
        }),
      });

    const client = new HyperliquidClient({ address: mockSigner.address, signer: mockSigner });
    const execution = await client.placeMarketOrderDetailed({
      market: 'ATOM',
      side: 'BUY',
      size: '1',
    });

    expect(execution.orderId).toBe('778');
    const exchangeCall = mockFetch.mock.calls[2];
    const body = JSON.parse(String(exchangeCall?.[1]?.body ?? '{}'));
    expect(body.action.orders[0].p).toBe('1.7361');
    expect(body.action.orders[0].s).toBe('1');
  });

  it('cancels an order using its market asset id', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'order',
          order: {
            order: {
              coin: 'BTC',
              side: 'B',
              limitPx: '99000',
              sz: '0.1',
              oid: 555,
              timestamp: 2000,
              origSz: '0.1',
              tif: 'Gtc',
            },
            status: 'open',
            statusTimestamp: 2001,
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ([
          {
            universe: [{ name: 'BTC', asset: 0, maxLeverage: 50, marginTableId: 1, szDecimals: 5 }],
          },
          [{ oraclePx: '100000', dayNtlVlm: '1000000', openInterest: '100' }],
        ]),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'ok',
          response: {
            type: 'cancel',
            data: { statuses: ['success'] },
          },
        }),
      });

    const client = new HyperliquidClient({ address: mockSigner.address, signer: mockSigner });
    await expect(client.cancelOrder('555')).resolves.toBeUndefined();
  });

  it('closes a position with a reduce-only market order', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          crossMarginSummary: { accountValue: '1500' },
          withdrawable: '1200',
          assetPositions: [
            {
              position: {
                coin: 'ETH',
                szi: '0.25',
                entryPx: '3200',
                unrealizedPnl: '12.5',
                liquidationPx: '2200',
              },
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ([
          {
            universe: [{ name: 'ETH', asset: 1, maxLeverage: 25, marginTableId: 1, szDecimals: 4 }],
          },
          [{ oraclePx: '3200', dayNtlVlm: '100000', openInterest: '50' }],
        ]),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          coin: 'ETH',
          time: 1000,
          levels: [
            [{ px: '3190', sz: '2', n: 1 }],
            [{ px: '3210', sz: '2', n: 1 }],
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'ok',
          response: {
            type: 'order',
            data: {
              statuses: [{ filled: { oid: 888, totalSz: '0.25', avgPx: '3190' } }],
            },
          },
        }),
      });

    const client = new HyperliquidClient({ address: mockSigner.address, signer: mockSigner });
    const orderId = await client.closePosition('ETH');

    expect(orderId).toBe('888');
  });

  it('fails clearly when trying to trade without a signer', async () => {
    const client = new HyperliquidClient({ address: mockSigner.address });

    await expect(client.placeMarketOrder({
      market: 'BTC',
      side: 'BUY',
      size: '0.1',
    })).rejects.toThrow('Hyperliquid trading requires a signer');
  });
});
