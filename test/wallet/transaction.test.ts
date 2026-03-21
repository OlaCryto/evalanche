import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TransactionBuilder } from '../../src/wallet/transaction';

const mockContractMethod = vi.fn();

vi.mock('ethers', async () => {
  const actual = await vi.importActual<any>('ethers');
  class MockContract {
    [key: string]: any;
    constructor() {
      this.transfer = mockContractMethod;
      this.submit = mockContractMethod;
    }
  }
  return {
    ...actual,
    Contract: MockContract,
  };
});

describe('TransactionBuilder', () => {
  const receipt = { status: 1, hash: '0xreceipt' } as any;
  const tx = { hash: '0xtx', wait: vi.fn().mockResolvedValue(receipt) };
  const wallet = { sendTransaction: vi.fn(), address: '0xabc' } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends plain transactions', async () => {
    wallet.sendTransaction.mockResolvedValueOnce(tx);
    const builder = new TransactionBuilder(wallet);
    const result = await builder.send({ to: '0x123', value: '1.0', data: '0x' });
    expect(result.hash).toBe('0xtx');
    expect(wallet.sendTransaction).toHaveBeenCalledOnce();
  });

  it('wraps send failures', async () => {
    wallet.sendTransaction.mockRejectedValueOnce(new Error('send failed'));
    const builder = new TransactionBuilder(wallet);
    await expect(builder.send({ to: '0x123', value: '1.0' })).rejects.toThrow(/Transaction failed/);
  });

  it('calls contract methods', async () => {
    mockContractMethod.mockResolvedValueOnce(tx);
    const builder = new TransactionBuilder(wallet);
    const result = await builder.call({ contract: '0xcontract', abi: [], method: 'transfer', args: ['0x456', 1n] });
    expect(result.hash).toBe('0xtx');
    expect(mockContractMethod).toHaveBeenCalled();
  });

  it('wraps contract call failures', async () => {
    mockContractMethod.mockRejectedValueOnce(new Error('call failed'));
    const builder = new TransactionBuilder(wallet);
    await expect(builder.call({ contract: '0xcontract', abi: [], method: 'submit' })).rejects.toThrow(/Contract call failed/);
  });
});
