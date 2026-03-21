import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReputationReporter } from '../../src/reputation/reporter';
import { DOMAIN_SEPARATOR } from '../../src/identity/constants';

const submitFeedback = vi.fn();

vi.mock('ethers', async () => {
  const actual = await vi.importActual<any>('ethers');
  class MockContract {
    submitFeedback = submitFeedback;
  }
  return { ...actual, Contract: MockContract };
});

describe('ReputationReporter', () => {
  const wallet = { address: '0xabc' } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('computes deterministic interaction hashes', () => {
    const a = ReputationReporter.computeInteractionHash('task-1', { ok: true });
    const b = ReputationReporter.computeInteractionHash('task-1', { ok: true });
    const c = ReputationReporter.computeInteractionHash('task-1', { ok: false });
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).toMatch(/^0x[0-9a-f]{64}$/i);
    expect(DOMAIN_SEPARATOR.length).toBeGreaterThan(0);
  });

  it('submits on-chain feedback and returns tx hash', async () => {
    submitFeedback.mockResolvedValueOnce({ wait: vi.fn().mockResolvedValue({ hash: '0xhash' }) });
    const reporter = new ReputationReporter(wallet);
    const hash = await reporter.submitFeedback({
      targetAgentId: 'agent-1',
      taskRef: 'task-1',
      score: 90,
      metadata: { source: 'test' },
    });
    expect(hash).toBe('0xhash');
    expect(submitFeedback).toHaveBeenCalled();
  });

  it('wraps submission failures', async () => {
    submitFeedback.mockRejectedValueOnce(new Error('nope'));
    const reporter = new ReputationReporter(wallet);
    await expect(reporter.submitFeedback({ targetAgentId: 'a', taskRef: 't', score: 1 })).rejects.toThrow(/Failed to submit reputation feedback/);
  });
});
