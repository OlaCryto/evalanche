import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JsonRpcProvider } from 'ethers';
import { InteropIdentityResolver } from '../../src/interop/identity';
import type { AgentRegistration } from '../../src/interop/schemas';

let contractInstance: { getFunction: ReturnType<typeof vi.fn> } = {
  getFunction: vi.fn().mockReturnValue(vi.fn().mockResolvedValue('https://example.com/agent.json')),
};

// Mock ethers Contract
vi.mock('ethers', async () => {
  const actual = await vi.importActual<typeof import('ethers')>('ethers');
  class MockContract {
    constructor() {
      return contractInstance;
    }
  }
  return {
    ...actual,
    Contract: MockContract,
  };
});

const mockRegistrationJson = JSON.stringify({
  agentId: '1',
  name: 'Test Agent',
  services: [
    { name: 'MCP', endpoint: 'https://example.com/mcp', protocol: 'MCP' },
  ],
});

// Mock safeFetch
vi.mock('../../src/utils/safe-fetch', () => ({
  safeFetch: vi.fn().mockResolvedValue({
    ok: true,
    text: async () => mockRegistrationJson,
    json: async () => JSON.parse(mockRegistrationJson),
  }),
}));

describe('InteropIdentityResolver', () => {
  let provider: JsonRpcProvider;
  let resolver: InteropIdentityResolver;

  beforeEach(() => {
    contractInstance = {
      getFunction: vi.fn().mockReturnValue(vi.fn().mockResolvedValue('https://example.com/agent.json')),
    };
    provider = new JsonRpcProvider('https://api.avax.network/ext/bc/C/rpc');
    resolver = new InteropIdentityResolver(provider);
  });

  it('should construct with provider', () => {
    expect(resolver).toBeDefined();
  });

  it('should construct with custom registry', () => {
    const customRegistry = '0x1234567890123456789012345678901234567890';
    const customResolver = new InteropIdentityResolver(provider, customRegistry);
    expect(customResolver).toBeDefined();
  });

  it('resolveAgent should return AgentRegistration', async () => {
    const registration = await resolver.resolveAgent(1);
    expect(registration).toBeDefined();
    expect(registration.services).toBeDefined();
    expect(Array.isArray(registration.services)).toBe(true);
  });

  it('getServiceEndpoints should return array', async () => {
    const endpoints = await resolver.getServiceEndpoints(1);
    expect(Array.isArray(endpoints)).toBe(true);
  });

  it('getPreferredTransport should return transport or null', async () => {
    const result = await resolver.getPreferredTransport(1);
    // Either null or an object with transport and endpoint
    if (result !== null) {
      expect(result.transport).toBeDefined();
      expect(result.endpoint).toBeDefined();
    }
  });

  it('verifyEndpointBinding should return verification result', async () => {
    const result = await resolver.verifyEndpointBinding('https://example.com/mcp', '1');
    expect(result).toBeDefined();
  });
});
