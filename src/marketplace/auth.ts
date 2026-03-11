/**
 * Marketplace Auth Middleware — API key validation.
 *
 * Expects: `Authorization: Bearer mk_...`
 * Attaches `req.agentId` on success, returns 401 on failure.
 */
import type { IncomingMessage, ServerResponse } from 'http';
import type { MarketplaceDB } from './db';

/** Extended request with authenticated agent ID */
export interface AuthenticatedRequest extends IncomingMessage {
  agentId?: string;
}

/**
 * Validate the Authorization header and attach agentId to the request.
 * Returns true if auth passed, false if a 401 was already sent.
 */
export function authenticate(
  req: AuthenticatedRequest,
  res: ServerResponse,
  db: MarketplaceDB,
): boolean {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: 'Missing or invalid Authorization header. Use: Bearer mk_...' }));
    return false;
  }

  const apiKey = header.slice(7);
  const agentId = db.validateApiKey(apiKey);

  if (!agentId) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: 'Invalid API key' }));
    return false;
  }

  req.agentId = agentId;
  return true;
}
