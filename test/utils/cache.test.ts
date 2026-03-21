import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TTLCache } from '../../src/utils/cache';

describe('TTLCache', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-21T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('stores and retrieves values before expiry', () => {
    const cache = new TTLCache<string>(1000);
    cache.set('a', 'alpha');
    expect(cache.get('a')).toBe('alpha');
    expect(cache.has('a')).toBe(true);
  });

  it('expires values after ttl', () => {
    const cache = new TTLCache<string>(1000);
    cache.set('a', 'alpha');
    vi.advanceTimersByTime(1001);
    expect(cache.get('a')).toBeUndefined();
    expect(cache.has('a')).toBe(false);
  });

  it('supports per-entry ttl override', () => {
    const cache = new TTLCache<string>(10_000);
    cache.set('a', 'alpha', 500);
    vi.advanceTimersByTime(600);
    expect(cache.get('a')).toBeUndefined();
  });

  it('deletes and clears entries', () => {
    const cache = new TTLCache<string>(1000);
    cache.set('a', 'alpha');
    cache.set('b', 'beta');
    cache.delete('a');
    expect(cache.get('a')).toBeUndefined();
    cache.clear();
    expect(cache.get('b')).toBeUndefined();
  });

  it('cleanup removes only expired entries', () => {
    const cache = new TTLCache<string>(1000);
    cache.set('a', 'alpha', 500);
    cache.set('b', 'beta', 5000);
    vi.advanceTimersByTime(1000);
    cache.cleanup();
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBe('beta');
  });
});
