import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MarketplaceDB } from '../../src/marketplace/db';

describe('MarketplaceDB', () => {
  let db: MarketplaceDB;

  beforeEach(() => {
    db = new MarketplaceDB(':memory:');
  });

  afterEach(() => {
    db.close();
  });

  // ── Agent Registration ──

  describe('registerAgent()', () => {
    it('should register an agent and return agentId + apiKey', () => {
      const result = db.registerAgent({
        name: 'Alice',
        description: 'Code auditor',
        walletAddress: '0xAlice',
      });

      expect(result.agentId).toBe('0xalice'); // lowercased
      expect(result.apiKey).toMatch(/^mk_/);
      expect(result.apiKey.length).toBeGreaterThan(20);
    });

    it('should reject duplicate wallet addresses', () => {
      db.registerAgent({ name: 'Alice', description: '', walletAddress: '0xAlice' });
      expect(() =>
        db.registerAgent({ name: 'Alice2', description: '', walletAddress: '0xAlice' }),
      ).toThrow();
    });

    it('should set default trust score of 50', () => {
      db.registerAgent({ name: 'Alice', description: '', walletAddress: '0xAlice' });
      const agent = db.getAgent('0xAlice');
      expect(agent?.trustScore).toBe(50);
    });
  });

  describe('getAgent()', () => {
    it('should return null for unknown agent', () => {
      expect(db.getAgent('nonexistent')).toBeNull();
    });

    it('should return agent data', () => {
      db.registerAgent({ name: 'Bob', description: 'Oracle', walletAddress: '0xBob' });
      const agent = db.getAgent('0xBob');
      expect(agent).not.toBeNull();
      expect(agent!.name).toBe('Bob');
      expect(agent!.isOnline).toBe(true);
    });
  });

  describe('validateApiKey()', () => {
    it('should validate a correct API key', () => {
      const { apiKey, agentId } = db.registerAgent({ name: 'A', description: '', walletAddress: '0xA' });
      const result = db.validateApiKey(apiKey);
      expect(result).toBe(agentId);
    });

    it('should reject an invalid API key', () => {
      expect(db.validateApiKey('mk_invalid')).toBeNull();
    });

    it('should update lastSeenAt on validation', () => {
      const { apiKey } = db.registerAgent({ name: 'A', description: '', walletAddress: '0xA' });
      const before = db.getAgent('0xA')!.lastSeenAt;
      db.validateApiKey(apiKey);
      const after = db.getAgent('0xA')!.lastSeenAt;
      expect(after).toBeGreaterThanOrEqual(before);
    });
  });

  // ── Services ──

  describe('listService()', () => {
    it('should list a service', () => {
      db.registerAgent({ name: 'A', description: '', walletAddress: '0xA' });
      const serviceId = db.listService('0xa', {
        capability: 'code-audit',
        description: 'Audit smart contracts',
        endpoint: 'https://a.example.com/audit',
        pricePerCall: '1000000000000000',
        chainId: 8453,
        tags: ['security', 'solidity'],
      });

      expect(serviceId).toMatch(/^svc_/);
    });

    it('should upsert on same agent + capability', () => {
      db.registerAgent({ name: 'A', description: '', walletAddress: '0xA' });
      db.listService('0xa', {
        capability: 'code-audit',
        description: 'v1',
        endpoint: 'https://a.example.com/v1',
        pricePerCall: '1000',
        chainId: 8453,
      });
      db.listService('0xa', {
        capability: 'code-audit',
        description: 'v2',
        endpoint: 'https://a.example.com/v2',
        pricePerCall: '2000',
        chainId: 8453,
      });

      const services = db.getAgentServices('0xa');
      expect(services).toHaveLength(1);
      expect(services[0].description).toBe('v2');
      expect(services[0].pricePerCall).toBe('2000');
    });
  });

  describe('removeService()', () => {
    it('should soft-delete a service', () => {
      db.registerAgent({ name: 'A', description: '', walletAddress: '0xA' });
      const svcId = db.listService('0xa', {
        capability: 'audit',
        description: '',
        endpoint: 'https://a.example.com',
        pricePerCall: '1000',
        chainId: 8453,
      });

      expect(db.removeService('0xa', svcId)).toBe(true);
      expect(db.getService(svcId)).toBeNull(); // not visible
      expect(db.getAgentServices('0xa')).toHaveLength(0);
    });

    it('should return false for non-owned service', () => {
      db.registerAgent({ name: 'A', description: '', walletAddress: '0xA' });
      db.registerAgent({ name: 'B', description: '', walletAddress: '0xB' });
      const svcId = db.listService('0xa', {
        capability: 'audit',
        description: '',
        endpoint: 'https://a.example.com',
        pricePerCall: '1000',
        chainId: 8453,
      });

      expect(db.removeService('0xb', svcId)).toBe(false);
    });
  });

  // ── Search ──

  describe('search()', () => {
    beforeEach(() => {
      db.registerAgent({ name: 'Alice', description: '', walletAddress: '0xAlice' });
      db.registerAgent({ name: 'Bob', description: '', walletAddress: '0xBob' });
      db.listService('0xalice', {
        capability: 'code-audit',
        description: 'Audits',
        endpoint: 'https://alice.example.com',
        pricePerCall: '1000',
        chainId: 8453,
        tags: ['security'],
      });
      db.listService('0xbob', {
        capability: 'price-feed',
        description: 'Oracle',
        endpoint: 'https://bob.example.com',
        pricePerCall: '500',
        chainId: 1,
        tags: ['data', 'oracle'],
      });
    });

    it('should return all active services', () => {
      const result = db.search({});
      expect(result.total).toBe(2);
      expect(result.services).toHaveLength(2);
    });

    it('should filter by capability', () => {
      const result = db.search({ capability: 'audit' });
      expect(result.total).toBe(1);
      expect(result.services[0].capability).toBe('code-audit');
    });

    it('should filter by chain', () => {
      const result = db.search({ chainIds: [1] });
      expect(result.total).toBe(1);
      expect(result.services[0].agentId).toBe('0xbob');
    });

    it('should filter by tags', () => {
      const result = db.search({ tags: ['oracle'] });
      expect(result.total).toBe(1);
    });

    it('should sort by price ascending', () => {
      const result = db.search({ sortBy: 'price', sortOrder: 'asc' });
      expect(result.services[0].pricePerCall).toBe('500');
      expect(result.services[1].pricePerCall).toBe('1000');
    });

    it('should paginate results', () => {
      const page1 = db.search({ limit: 1, page: 1 });
      const page2 = db.search({ limit: 1, page: 2 });
      expect(page1.services).toHaveLength(1);
      expect(page2.services).toHaveLength(1);
      expect(page1.totalPages).toBe(2);
    });

    it('should include agent info in results', () => {
      const result = db.search({});
      expect(result.services[0].agent).toBeDefined();
      expect(result.services[0].agent.name).toBeTruthy();
      expect(typeof result.services[0].agent.trustScore).toBe('number');
    });
  });

  // ── Jobs ──

  describe('createJob() + getJob()', () => {
    let serviceId: string;

    beforeEach(() => {
      db.registerAgent({ name: 'Agent', description: '', walletAddress: '0xAgent' });
      db.registerAgent({ name: 'Client', description: '', walletAddress: '0xClient' });
      serviceId = db.listService('0xagent', {
        capability: 'audit',
        description: '',
        endpoint: 'https://agent.example.com',
        pricePerCall: '1000',
        chainId: 8453,
      });
    });

    it('should create a job with pending status', () => {
      const jobId = db.createJob({
        serviceId,
        agentId: '0xagent',
        clientId: '0xclient',
        taskInput: 'Audit this contract',
        agreedPrice: '1000',
        chainId: 8453,
      });

      expect(jobId).toMatch(/^job_/);
      const job = db.getJob(jobId);
      expect(job).not.toBeNull();
      expect(job!.status).toBe('pending');
      expect(job!.taskInput).toBe('Audit this contract');
    });

    it('should update job status to completed', () => {
      const jobId = db.createJob({
        serviceId,
        agentId: '0xagent',
        clientId: '0xclient',
        taskInput: 'Task',
        agreedPrice: '1000',
        chainId: 8453,
      });

      db.updateJob(jobId, { status: 'completed', result: 'All good' });
      const job = db.getJob(jobId);
      expect(job!.status).toBe('completed');
      expect(job!.result).toBe('All good');
      expect(job!.completedAt).toBeDefined();
    });

    it('should update agent stats on job completion', () => {
      const jobId = db.createJob({
        serviceId,
        agentId: '0xagent',
        clientId: '0xclient',
        taskInput: 'Task',
        agreedPrice: '1000',
        chainId: 8453,
      });

      db.updateJob(jobId, { status: 'completed' });
      const agent = db.getAgent('0xagent');
      expect(agent!.completedJobs).toBe(1);
    });

    it('should track payment tx hash', () => {
      const jobId = db.createJob({
        serviceId,
        agentId: '0xagent',
        clientId: '0xclient',
        taskInput: 'Task',
        agreedPrice: '1000',
        chainId: 8453,
      });

      db.updateJob(jobId, { paymentTxHash: '0xabc123' });
      const job = db.getJob(jobId);
      expect(job!.paymentTxHash).toBe('0xabc123');
    });

    it('should accept reputation scores', () => {
      const jobId = db.createJob({
        serviceId,
        agentId: '0xagent',
        clientId: '0xclient',
        taskInput: 'Task',
        agreedPrice: '1000',
        chainId: 8453,
      });

      db.updateJob(jobId, { reputationScore: 85 });
      const job = db.getJob(jobId);
      expect(job!.reputationScore).toBe(85);
    });
  });

  // ── Stats ──

  describe('getStats()', () => {
    it('should return marketplace statistics', () => {
      db.registerAgent({ name: 'A', description: '', walletAddress: '0xA' });
      db.listService('0xa', {
        capability: 'audit',
        description: '',
        endpoint: 'https://a.example.com',
        pricePerCall: '1000',
        chainId: 8453,
      });

      const stats = db.getStats();
      expect(stats.totalAgents).toBe(1);
      expect(stats.totalServices).toBe(1);
      expect(stats.totalJobs).toBe(0);
      expect(stats.onlineAgents).toBe(1);
    });
  });

  // ── Trust Score ──

  describe('updateTrustScore()', () => {
    it('should compute trust score from job history', () => {
      db.registerAgent({ name: 'A', description: '', walletAddress: '0xA' });
      db.registerAgent({ name: 'C', description: '', walletAddress: '0xC' });
      const svcId = db.listService('0xa', {
        capability: 'audit',
        description: '',
        endpoint: 'https://a.example.com',
        pricePerCall: '1000',
        chainId: 8453,
      });

      // Create 3 completed jobs with high reputation
      for (let i = 0; i < 3; i++) {
        const jobId = db.createJob({
          serviceId: svcId,
          agentId: '0xa',
          clientId: '0xc',
          taskInput: `task ${i}`,
          agreedPrice: '1000',
          chainId: 8453,
        });
        db.updateJob(jobId, { status: 'completed', reputationScore: 90 });
      }

      const agent = db.getAgent('0xa');
      expect(agent!.trustScore).toBeGreaterThan(50);
    });
  });
});
