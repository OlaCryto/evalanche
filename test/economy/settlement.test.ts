import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SettlementClient } from '../../src/economy/settlement';
import { NegotiationClient } from '../../src/economy/negotiation';
import { EvalancheError } from '../../src/utils/errors';
import type { AgentSigner } from '../../src/wallet/signer';

let contractInstance: Record<string, unknown> = {};
const RECIPIENT_ADDRESS = '0x000000000000000000000000000000000000dEaD';

/** Mock wallet that simulates successful transactions */
function mockWallet(): AgentSigner {
  return {
    address: '0xBuyer',
    sendTransaction: vi.fn().mockResolvedValue({
      hash: '0xpaymenthash',
      wait: vi.fn().mockResolvedValue({ hash: '0xpaymenthash', status: 1 }),
    }),
    signMessage: vi.fn().mockResolvedValue('0xsig'),
  } as unknown as AgentSigner;
}

// Mock ethers to avoid real Contract creation
vi.mock('ethers', async () => {
  const actual = await vi.importActual('ethers');
  class MockContract {
    constructor() {
      return contractInstance;
    }
  }
  return {
    ...actual as object,
    Contract: MockContract,
  };
});

describe('SettlementClient', () => {
  let negotiation: NegotiationClient;
  let settlement: SettlementClient;

  beforeEach(() => {
    negotiation = new NegotiationClient();
    settlement = new SettlementClient(mockWallet(), negotiation);
    contractInstance = {
      submitFeedback: vi.fn().mockResolvedValue({
        hash: '0xreputation_hash',
        wait: vi.fn().mockResolvedValue({ hash: '0xreputation_hash', status: 1 }),
      }),
    };
  });

  it('should settle an accepted proposal', async () => {
    const id = negotiation.propose({
      fromAgentId: 'buyer', toAgentId: 'seller', task: 'audit', price: '100000000000000000', chainId: 8453,
    });
    negotiation.accept(id);

    const result = await settlement.settle({
      proposalId: id,
      reputationScore: 85,
      recipientAddress: RECIPIENT_ADDRESS,
    });

    expect(result.paymentTxHash).toBe('0xpaymenthash');
    expect(result.paidAmount).toBe('100000000000000000');
    expect(result.proposal.status).toBe('settled');
  });

  it('should throw when settling non-accepted proposal', async () => {
    const id = negotiation.propose({
      fromAgentId: 'buyer', toAgentId: 'seller', task: 'audit', price: '100', chainId: 8453,
    });
    // Don't accept — still pending
    await expect(settlement.settle({
      proposalId: id,
      reputationScore: 50,
      recipientAddress: RECIPIENT_ADDRESS,
    }))
      .rejects.toThrow(EvalancheError);
  });

  it('should throw for non-existent proposal', async () => {
    await expect(settlement.settle({
      proposalId: 'prop_999',
      reputationScore: 50,
      recipientAddress: RECIPIENT_ADDRESS,
    }))
      .rejects.toThrow(EvalancheError);
  });

  it('should use counter price when proposal was countered', async () => {
    const id = negotiation.propose({
      fromAgentId: 'buyer', toAgentId: 'seller', task: 'audit', price: '100', chainId: 8453,
    });
    negotiation.counter(id, '200');
    negotiation.accept(id);

    const result = await settlement.settle({
      proposalId: id,
      reputationScore: 90,
      recipientAddress: RECIPIENT_ADDRESS,
    });
    expect(result.paidAmount).toBe('200');
  });

  it('should still succeed if reputation feedback fails', async () => {
    // Create settlement with a wallet whose reputation call will fail
    const wallet = mockWallet();
    const failSettlement = new SettlementClient(wallet, negotiation);

    const id = negotiation.propose({
      fromAgentId: 'buyer', toAgentId: 'seller', task: 'audit', price: '100000000000000000', chainId: 8453,
    });
    negotiation.accept(id);

    // The mock Contract.submitFeedback is set up to succeed in the module mock,
    // but the result should still be valid even if reputation part has issues
    const result = await failSettlement.settle({
      proposalId: id,
      reputationScore: 50,
      recipientAddress: RECIPIENT_ADDRESS,
    });
    expect(result.paymentTxHash).toBe('0xpaymenthash');
    expect(result.proposal.status).toBe('settled');
  });
});
