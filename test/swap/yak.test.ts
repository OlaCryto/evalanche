import { describe, it, expect, vi, beforeEach } from 'vitest';
import { YieldYakClient, getYakRouter, YAK_ROUTER_AVALANCHE } from '../../src/swap/yak';

const findBestPathWithGas = vi.fn();
const swapNoSplit = vi.fn();
const swap = vi.fn();
const allowance = vi.fn();
const approve = vi.fn();
const decimals = vi.fn();

vi.mock('ethers', async () => {
  const actual = await vi.importActual<any>('ethers');
  class MockContract {
    target: string;
    constructor(address: string) {
      this.target = address;
      this.findBestPathWithGas = findBestPathWithGas;
      this.swapNoSplit = swapNoSplit;
      this.swap = swap;
      this.allowance = allowance;
      this.approve = approve;
      this.decimals = decimals;
    }
  }
  return { ...actual, Contract: MockContract };
});

describe('YieldYakClient', () => {
  const signer = { address: '0xabc' } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    decimals.mockResolvedValue(6);
  });

  it('returns router by chain', () => {
    expect(getYakRouter('avalanche')).toBe(YAK_ROUTER_AVALANCHE);
  });

  it('quotes best path with formatted output', async () => {
    findBestPathWithGas.mockResolvedValueOnce({
      amounts: [1000000n, 1200000n],
      adapters: ['0xadapter'],
      path: ['0xtokenIn', '0xtokenOut'],
      gasEstimate: 100000n,
    });
    const client = new YieldYakClient(signer);
    const quote = await client.quote(1000000n, '0xtokenIn', '0xtokenOut');
    expect(quote.amountOutFormatted).toBe('1.2');
    expect(quote.offer.adapters).toEqual(['0xadapter']);
  });

  it('ensures allowance then swaps', async () => {
    allowance.mockResolvedValueOnce(0n);
    approve.mockResolvedValueOnce({ wait: vi.fn().mockResolvedValue({ status: 1 }) });
    swapNoSplit.mockResolvedValueOnce({ hash: '0xtx', wait: vi.fn().mockResolvedValue({ status: 1 }) });
    const client = new YieldYakClient(signer);
    const result = await client.swap(1000n, {
      amounts: [1000n, 900n],
      adapters: ['0xadapter'],
      path: ['0xtokenIn', '0xtokenOut'],
      gasEstimate: 1n,
    }, 0.01);
    expect(result.success).toBe(true);
    expect(approve).toHaveBeenCalled();
    expect(swapNoSplit).toHaveBeenCalled();
  });

  it('skips approve when allowance is sufficient', async () => {
    allowance.mockResolvedValueOnce(5000n);
    swap.mockResolvedValueOnce({ hash: '0xtx', wait: vi.fn().mockResolvedValue({ status: 1 }) });
    const client = YieldYakClient.withRouter(signer, '0xrouter');
    const result = await client.swapSingle(1000n, 900n, ['0xtokenIn', '0xtokenOut'], ['0xadapter']);
    expect(result.success).toBe(true);
    expect(approve).not.toHaveBeenCalled();
  });
});
