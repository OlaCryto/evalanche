import { describe, it, expect } from 'vitest';
import { Wallet, JsonRpcProvider } from 'ethers';
import { X402Facilitator } from '../../src/x402/facilitator';

const TEST_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

describe('X402Facilitator extended', () => {
  it('creates a base64 payment proof with signed payload', async () => {
    const wallet = new Wallet(TEST_PRIVATE_KEY, new JsonRpcProvider('http://localhost:8545'));
    const facilitator = new X402Facilitator(wallet);
    const proof = await facilitator.createPaymentProof({
      facilitator: '0xfacilitator',
      paymentAddress: '0xpayee',
      amount: '0.005',
      currency: 'AVAX',
      chainId: 43114,
    });
    const decoded = JSON.parse(Buffer.from(proof, 'base64').toString('utf8'));
    expect(decoded.payload.payer).toBe(wallet.address);
    expect(decoded.payload.amount).toBe('0.005');
    expect(decoded.signature).toMatch(/^0x[0-9a-f]+$/i);
  });
});
