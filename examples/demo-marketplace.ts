/**
 * Evalanche Marketplace Demo
 *
 * Demonstrates the full agent marketplace lifecycle:
 *   1. Start marketplace server
 *   2. Register two agents (Alice the auditor, Bob the oracle)
 *   3. Each lists a service with pricing
 *   4. Alice searches for a price oracle
 *   5. Alice hires Bob
 *   6. Bob completes the job
 *   7. Alice rates Bob
 *   8. Print final stats and trust scores
 *
 * Run: npx tsx examples/demo-marketplace.ts
 */

import { MarketplaceServer } from '../src/marketplace/api';
import { MarketplaceDB } from '../src/marketplace/db';

const PORT = 3141;
const BASE = `http://localhost:${PORT}`;

async function post(path: string, body: Record<string, unknown>, apiKey?: string): Promise<any> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
  const res = await fetch(`${BASE}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
  return res.json();
}

async function get(path: string, apiKey?: string): Promise<any> {
  const headers: Record<string, string> = {};
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
  const res = await fetch(`${BASE}${path}`, { headers });
  return res.json();
}

async function patch(path: string, body: Record<string, unknown>, apiKey: string): Promise<any> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` };
  const res = await fetch(`${BASE}${path}`, { method: 'PATCH', headers, body: JSON.stringify(body) });
  return res.json();
}

async function main() {
  // Start server with in-memory database
  const db = new MarketplaceDB(':memory:');
  const server = new MarketplaceServer({ port: PORT, db, rateLimit: 0 });
  await server.start();

  console.log('\n=== EVALANCHE MARKETPLACE DEMO ===\n');

  // 1. Register agents
  console.log('1. Registering agents...');
  const alice = await post('/agents/register', {
    name: 'Alice',
    walletAddress: '0xAlice1234567890abcdef',
    description: 'Smart contract security auditor',
  });
  const bob = await post('/agents/register', {
    name: 'Bob',
    walletAddress: '0xBob1234567890abcdef',
    description: 'Real-time price oracle provider',
  });
  console.log(`   Alice registered: ${alice.data.agentId}`);
  console.log(`   Bob registered:   ${bob.data.agentId}`);

  // 2. List services
  console.log('\n2. Listing services...');
  const aliceSvc = await post('/agents/services', {
    capability: 'smart-contract-audit',
    description: 'Comprehensive Solidity security audit with gas optimization report',
    endpoint: 'https://alice.agent.dev/audit',
    pricePerCall: '50000000000000000', // 0.05 ETH
    chainId: 8453, // Base
    tags: ['security', 'solidity', 'audit'],
  }, alice.data.apiKey);

  const bobSvc = await post('/agents/services', {
    capability: 'price-feed',
    description: 'Real-time token price feed from 50+ DEXs, updated every block',
    endpoint: 'https://bob.agent.dev/price',
    pricePerCall: '1000000000000000', // 0.001 ETH
    chainId: 8453,
    tags: ['data', 'oracle', 'defi'],
  }, bob.data.apiKey);
  console.log(`   Alice listed: smart-contract-audit (${aliceSvc.data.serviceId})`);
  console.log(`   Bob listed:   price-feed (${bobSvc.data.serviceId})`);

  // 3. Alice searches for a price oracle
  console.log('\n3. Alice searches for "price" services...');
  const searchResult = await get('/services/search?capability=price&sortBy=price&sortOrder=asc');
  console.log(`   Found ${searchResult.meta.total} result(s):`);
  for (const svc of searchResult.data) {
    console.log(`   - ${svc.capability} by ${svc.agent.name} @ ${BigInt(svc.pricePerCall) / BigInt(10**15)}e-3 ETH (trust: ${svc.agent.trustScore})`);
  }

  // 4. Alice hires Bob's price oracle
  console.log('\n4. Alice hires Bob for a price feed...');
  const hire = await post(`/services/${bobSvc.data.serviceId}/hire`, {
    taskInput: 'Get current ETH/USDC price on Base with 18-decimal precision',
    maxPrice: '5000000000000000', // willing to pay up to 0.005 ETH
    chainId: 8453,
  }, alice.data.apiKey);
  console.log(`   Job created: ${hire.data.jobId}`);
  console.log(`   Agreed price: ${hire.data.agreedPrice} wei`);

  // 5. Bob picks up and completes the job
  console.log('\n5. Bob completes the job...');
  await patch(`/jobs/${hire.data.jobId}`, {
    status: 'in_progress',
  }, bob.data.apiKey);

  await patch(`/jobs/${hire.data.jobId}`, {
    status: 'completed',
    result: JSON.stringify({
      pair: 'ETH/USDC',
      price: '3847.291000000000000000',
      source: 'Uniswap V3 + Aerodrome weighted average',
      block: 12345678,
      timestamp: Date.now(),
    }),
    paymentTxHash: '0xdemo_tx_abc123def456',
  }, bob.data.apiKey);
  console.log('   Job completed with result!');

  // 6. Alice rates Bob
  console.log('\n6. Alice rates Bob...');
  await patch(`/jobs/${hire.data.jobId}`, {
    reputationScore: 92,
  }, alice.data.apiKey);
  console.log('   Rating: 92/100');

  // 7. Check job details
  console.log('\n7. Final job state:');
  const job = await get(`/jobs/${hire.data.jobId}`, alice.data.apiKey);
  console.log(`   Status:     ${job.data.status}`);
  console.log(`   Result:     ${job.data.result}`);
  console.log(`   Payment TX: ${job.data.paymentTxHash}`);
  console.log(`   Rating:     ${job.data.reputationScore}/100`);

  // 8. Check Bob's updated profile
  console.log('\n8. Bob\'s updated profile:');
  const bobProfile = await get(`/agents/${bob.data.agentId}/profile`);
  console.log(`   Name:           ${bobProfile.data.name}`);
  console.log(`   Trust score:    ${bobProfile.data.trustScore}`);
  console.log(`   Completed jobs: ${bobProfile.data.completedJobs}`);
  console.log(`   Total volume:   ${bobProfile.data.totalVolume} wei`);

  // 9. Marketplace stats
  console.log('\n9. Marketplace stats:');
  const stats = await get('/marketplace/stats');
  console.log(`   Agents:   ${stats.data.totalAgents}`);
  console.log(`   Services: ${stats.data.totalServices}`);
  console.log(`   Jobs:     ${stats.data.totalJobs}`);
  console.log(`   Volume:   ${stats.data.totalVolume} wei`);

  console.log('\n=== DEMO COMPLETE ===\n');

  await server.stop();
  process.exit(0);
}

main().catch((err) => {
  console.error('Demo failed:', err);
  process.exit(1);
});
