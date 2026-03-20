import { describe, it, expect } from 'vitest';
import { PolymarketClient, POLYMARKET_CLOB_HOST, PolymarketSide } from '../../src/polymarket';

describe('PolymarketClient', () => {
  it('should export POLYMARKET_CLOB_HOST', () => {
    expect(POLYMARKET_CLOB_HOST).toBeTruthy();
    expect(typeof POLYMARKET_CLOB_HOST).toBe('string');
  });

  it('should export PolymarketSide values', () => {
    expect(PolymarketSide.BUY).toBeDefined();
    expect(PolymarketSide.SELL).toBeDefined();
  });

  it('should construct without error', () => {
    const { Wallet } = require('ethers');
    const wallet = Wallet.createRandom();
    const client = new PolymarketClient(wallet);
    expect(client).toBeDefined();
  });

  it('searchMarkets filters question and description text', async () => {
    const { Wallet } = require('ethers');
    const wallet = Wallet.createRandom();
    const client = new PolymarketClient(wallet);
    client.getMarkets = async () => [
      { conditionId: '1', question: 'Will AVAX hit $100?', description: 'Avalanche price target', tokens: [] },
      { conditionId: '2', question: 'Will ETH outperform BTC?', description: 'Layer 1 rotation', tokens: [] },
      { conditionId: '3', question: 'Macro slowdown', description: 'Polygon activity growth', tokens: [] },
    ];

    await expect(client.searchMarkets('avax', 10)).resolves.toEqual([
      { conditionId: '1', question: 'Will AVAX hit $100?', description: 'Avalanche price target', tokens: [] },
    ]);
    await expect(client.searchMarkets('polygon', 10)).resolves.toEqual([
      { conditionId: '3', question: 'Macro slowdown', description: 'Polygon activity growth', tokens: [] },
    ]);
  });

  it('getOrderbook aliases getOrderBook', async () => {
    const { Wallet } = require('ethers');
    const wallet = Wallet.createRandom();
    const client = new PolymarketClient(wallet);
    const expected = { bids: [{ price: 0.4, size: 10, orderID: 'b1' }], asks: [] };
    client.getOrderBook = async () => expected;

    await expect(client.getOrderbook('123')).resolves.toEqual(expected);
  });
});
