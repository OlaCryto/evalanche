/**
 * Standalone CLI to start the Agent Marketplace server.
 *
 * Usage:
 *   npx evalanche-marketplace                      # defaults: port 3141, ./marketplace.db
 *   npx evalanche-marketplace --port 8080           # custom port
 *   npx evalanche-marketplace --db /data/market.db   # custom db path
 *
 * Environment:
 *   MARKETPLACE_PORT         — Port (default 3141)
 *   MARKETPLACE_DB_PATH      — Database file path (default ./marketplace.db)
 *   MARKETPLACE_CORS_ORIGIN  — CORS origin (default '*')
 *   MARKETPLACE_RATE_LIMIT   — Max requests/IP/minute (default 60)
 *   NODE_ENV                 — Set to 'production' for production mode
 */
import { MarketplaceServer } from './api';
import { loadConfig } from './config';

const args = process.argv.slice(2);

function getArg(name: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 ? args[idx + 1] : undefined;
}

const config = loadConfig({
  port: getArg('port') ? Number(getArg('port')) : undefined,
  dbPath: getArg('db') ?? undefined,
});

const server = new MarketplaceServer({
  port: config.port,
  dbPath: config.dbPath,
  corsOrigin: config.corsOrigin,
  rateLimit: config.rateLimit,
});

server.start().then(() => {
  console.log(`  Database:   ${config.dbPath}`);
  console.log(`  Port:       ${config.port}`);
  console.log(`  CORS:       ${config.corsOrigin}`);
  console.log(`  Rate limit: ${config.rateLimit} req/IP/min`);
  console.log(`  Mode:       ${config.isProduction ? 'production' : 'development'}`);
  console.log('');
  console.log('Endpoints:');
  console.log('  POST   /agents/register       Register a new agent');
  console.log('  GET    /agents/:id/profile     Get agent profile');
  console.log('  POST   /agents/services        List a service (auth)');
  console.log('  DELETE /agents/services/:id    Remove a service (auth)');
  console.log('  GET    /services/search        Search services');
  console.log('  POST   /services/:id/hire      Hire an agent (auth)');
  console.log('  GET    /jobs/:id               Get job status (auth)');
  console.log('  PATCH  /jobs/:id               Update job (auth)');
  console.log('  GET    /marketplace/stats      Global stats');
  console.log('  GET    /health                 Health check');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down...');
  await server.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await server.stop();
  process.exit(0);
});
