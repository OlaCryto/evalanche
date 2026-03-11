/**
 * Marketplace environment configuration.
 *
 * All settings are driven by environment variables with sensible defaults.
 */

export interface MarketplaceConfig {
  port: number;
  dbPath: string;
  corsOrigin: string;
  /** Max requests per IP per minute */
  rateLimit: number;
  isProduction: boolean;
}

export function loadConfig(overrides?: Partial<MarketplaceConfig>): MarketplaceConfig {
  return {
    port: overrides?.port ?? (Number(process.env.MARKETPLACE_PORT) || 3141),
    dbPath: overrides?.dbPath ?? process.env.MARKETPLACE_DB_PATH ?? './marketplace.db',
    corsOrigin: overrides?.corsOrigin ?? process.env.MARKETPLACE_CORS_ORIGIN ?? '*',
    rateLimit: overrides?.rateLimit ?? (Number(process.env.MARKETPLACE_RATE_LIMIT) || 60),
    isProduction: (process.env.NODE_ENV ?? '').toLowerCase() === 'production',
  };
}
