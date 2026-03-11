import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MarketplaceServer } from '../../src/marketplace/api';
import { MarketplaceDB } from '../../src/marketplace/db';

/** Fetch helper for the test server */
function api(port: number, path: string, options?: RequestInit): Promise<Response> {
  return fetch(`http://localhost:${port}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options?.headers as Record<string, string> ?? {}) },
    ...options,
  });
}

describe('MarketplaceServer API', () => {
  let server: MarketplaceServer;
  let port: number;

  beforeAll(async () => {
    port = 30000 + Math.floor(Math.random() * 10000);
    const db = new MarketplaceDB(':memory:');
    server = new MarketplaceServer({ port, db, rateLimit: 0 }); // disable rate limit in tests
    await server.start();
  });

  afterAll(async () => {
    await server.stop();
  });

  // ── Health ──

  it('GET /health should return ok with stats', async () => {
    const res = await api(port, '/health');
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('ok');
    expect(body.data.version).toBe('1.0.0');
    expect(typeof body.data.uptime).toBe('number');
  });

  // ── Agent Registration ──

  let aliceKey: string;
  let bobKey: string;

  it('POST /agents/register should register an agent', async () => {
    const res = await api(port, '/agents/register', {
      method: 'POST',
      body: JSON.stringify({ name: 'Alice', walletAddress: '0xAlice', description: 'Auditor' }),
    });
    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data.apiKey).toMatch(/^mk_/);
    aliceKey = body.data.apiKey;
  });

  it('POST /agents/register should register a second agent', async () => {
    const res = await api(port, '/agents/register', {
      method: 'POST',
      body: JSON.stringify({ name: 'Bob', walletAddress: '0xBob', description: 'Oracle' }),
    });
    const body = await res.json();
    expect(res.status).toBe(201);
    bobKey = body.data.apiKey;
  });

  it('POST /agents/register should reject missing fields', async () => {
    const res = await api(port, '/agents/register', {
      method: 'POST',
      body: JSON.stringify({ name: 'NoWallet' }),
    });
    expect(res.status).toBe(400);
  });

  it('POST /agents/register should reject duplicate wallets', async () => {
    const res = await api(port, '/agents/register', {
      method: 'POST',
      body: JSON.stringify({ name: 'Alice2', walletAddress: '0xAlice' }),
    });
    expect(res.status).toBe(409);
  });

  // ── Profiles ──

  it('GET /agents/:id/profile should return agent profile', async () => {
    const res = await api(port, '/agents/0xalice/profile');
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.name).toBe('Alice');
    expect(body.data.apiKeyHash).toBeUndefined(); // never exposed
  });

  it('GET /agents/:id/profile should 404 for unknown agents', async () => {
    const res = await api(port, '/agents/0xunknown/profile');
    expect(res.status).toBe(404);
  });

  // ── Services ──

  let aliceServiceId: string;

  it('POST /agents/services should list a service (auth)', async () => {
    const res = await api(port, '/agents/services', {
      method: 'POST',
      headers: { Authorization: `Bearer ${aliceKey}` },
      body: JSON.stringify({
        capability: 'code-audit',
        description: 'Smart contract audit',
        endpoint: 'https://alice.example.com/audit',
        pricePerCall: '1000000000000000',
        chainId: 8453,
        tags: ['security', 'solidity'],
      }),
    });
    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body.data.serviceId).toMatch(/^svc_/);
    aliceServiceId = body.data.serviceId;
  });

  it('POST /agents/services should reject unauthenticated', async () => {
    const res = await api(port, '/agents/services', {
      method: 'POST',
      body: JSON.stringify({ capability: 'x', endpoint: 'x', pricePerCall: '1', chainId: 1 }),
    });
    expect(res.status).toBe(401);
  });

  // ── Search ──

  it('GET /services/search should return all services', async () => {
    const res = await api(port, '/services/search');
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('GET /services/search should filter by capability', async () => {
    const res = await api(port, '/services/search?capability=audit');
    const body = await res.json();
    expect(body.data.length).toBe(1);
    expect(body.data[0].capability).toBe('code-audit');
  });

  // ── Hire ──

  let jobId: string;

  it('POST /services/:id/hire should create a job', async () => {
    const res = await api(port, `/services/${aliceServiceId}/hire`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${bobKey}` },
      body: JSON.stringify({
        taskInput: 'Audit my contract at 0x123',
        maxPrice: '1000000000000000',
        chainId: 8453,
      }),
    });
    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body.data.jobId).toMatch(/^job_/);
    jobId = body.data.jobId;
  });

  it('POST /services/:id/hire should reject if price too low', async () => {
    const res = await api(port, `/services/${aliceServiceId}/hire`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${bobKey}` },
      body: JSON.stringify({
        taskInput: 'Cheap audit',
        maxPrice: '1', // way below service price
        chainId: 8453,
      }),
    });
    expect(res.status).toBe(400);
  });

  // ── Jobs ──

  it('GET /jobs/:id should return the job (agent)', async () => {
    const res = await api(port, `/jobs/${jobId}`, {
      headers: { Authorization: `Bearer ${aliceKey}` },
    });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.status).toBe('pending');
    expect(body.data.taskInput).toBe('Audit my contract at 0x123');
  });

  it('PATCH /jobs/:id should update status (agent)', async () => {
    const res = await api(port, `/jobs/${jobId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${aliceKey}` },
      body: JSON.stringify({ status: 'completed', result: 'No issues found' }),
    });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.status).toBe('completed');
    expect(body.data.result).toBe('No issues found');
  });

  it('PATCH /jobs/:id should accept reputation (client)', async () => {
    const res = await api(port, `/jobs/${jobId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${bobKey}` },
      body: JSON.stringify({ reputationScore: 90 }),
    });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.reputationScore).toBe(90);
  });

  // ── Stats ──

  it('GET /marketplace/stats should return stats', async () => {
    const res = await api(port, '/marketplace/stats');
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.totalAgents).toBe(2);
    expect(body.data.totalServices).toBeGreaterThanOrEqual(1);
  });

  // ── 404 ──

  it('should return 404 for unknown routes', async () => {
    const res = await api(port, '/nonexistent');
    expect(res.status).toBe(404);
  });

  // ── CORS ──

  it('OPTIONS should return CORS headers', async () => {
    const res = await fetch(`http://localhost:${port}/health`, { method: 'OPTIONS' });
    expect(res.status).toBe(204);
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
  });
});
