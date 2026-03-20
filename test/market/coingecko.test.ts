import { describe, it, expect } from 'vitest';
import { CoinGeckoClient } from '../../src/market/coingecko';

describe('CoinGeckoClient', () => {
  it('should construct with default base URL', () => {
    const client = new CoinGeckoClient();
    expect(client).toBeDefined();
  });

  it('should construct with custom base URL', () => {
    const client = new CoinGeckoClient('https://pro-api.coingecko.com/api/v3');
    expect(client).toBeDefined();
  });

  it('status should return ok', async () => {
    const client = new CoinGeckoClient();
    const status = await client.status() as any;
    expect(status.ok).toBe(true);
    expect(status.provider).toBe('coingecko');
  });
});
