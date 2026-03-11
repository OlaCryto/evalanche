/**
 * Agent Marketplace REST API Server.
 *
 * A standalone HTTP server that serves as the "front door" to the agent economy.
 * No framework dependency — built on Node's built-in `http` module.
 *
 * Endpoints:
 *   POST   /agents/register       — Register a new agent, get API key
 *   GET    /agents/:id/profile     — Get agent profile + services
 *   POST   /agents/services        — List a service (auth required)
 *   DELETE /agents/services/:id    — Remove a service (auth required)
 *   GET    /services/search        — Search services by capability/price/chain/trust
 *   POST   /services/:id/hire      — Hire an agent for a task (auth required)
 *   GET    /jobs/:id               — Get job status (auth required)
 *   PATCH  /jobs/:id               — Update job status/result (auth required)
 *   GET    /marketplace/stats      — Global marketplace statistics
 *   GET    /health                 — Health check
 */
import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'http';
import { MarketplaceDB } from './db';
import { authenticate, type AuthenticatedRequest } from './auth';
import type {
  RegisterAgentInput,
  ListServiceInput,
  HireInput,
  MarketplaceSearchQuery,
  ApiResponse,
} from './types';

// ── Rate Limiter ──

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

class RateLimiter {
  private buckets = new Map<string, RateLimitEntry>();
  private readonly max: number;
  private readonly windowMs = 60_000; // 1 minute

  constructor(maxPerMinute: number) {
    this.max = maxPerMinute;
  }

  /** Returns true if the request is allowed */
  allow(ip: string): boolean {
    const now = Date.now();
    const entry = this.buckets.get(ip);

    if (!entry || now >= entry.resetAt) {
      this.buckets.set(ip, { count: 1, resetAt: now + this.windowMs });
      return true;
    }

    entry.count++;
    return entry.count <= this.max;
  }

  /** Prune expired entries (call periodically) */
  prune(): void {
    const now = Date.now();
    for (const [ip, entry] of this.buckets) {
      if (now >= entry.resetAt) this.buckets.delete(ip);
    }
  }
}

// ── Helpers ──

/** Parse JSON body from an incoming request */
function parseBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf-8');
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

/** Send a JSON response */
function jsonResponse<T>(res: ServerResponse, status: number, body: ApiResponse<T>, corsOrigin: string): void {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  res.end(JSON.stringify(body));
}

/** Parse URL path segments: "/agents/0x123/profile" → ["agents","0x123","profile"] */
function parsePath(url: string): { segments: string[]; query: Record<string, string> } {
  const [pathname, search] = url.split('?');
  const segments = pathname.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);
  const query: Record<string, string> = {};
  if (search) {
    for (const pair of search.split('&')) {
      const [k, v] = pair.split('=');
      if (k) query[decodeURIComponent(k)] = decodeURIComponent(v ?? '');
    }
  }
  return { segments, query };
}

/** Get client IP from request */
function getClientIp(req: IncomingMessage): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.socket.remoteAddress ?? 'unknown';
}

// ── Route Handlers ──

async function handleRegister(req: IncomingMessage, res: ServerResponse, db: MarketplaceDB, cors: string): Promise<void> {
  const body = await parseBody(req) as unknown as RegisterAgentInput;

  if (!body.name || !body.walletAddress) {
    return jsonResponse(res, 400, { success: false, error: 'name and walletAddress are required' }, cors);
  }

  try {
    const { agentId, apiKey } = db.registerAgent({
      name: body.name,
      description: body.description ?? '',
      walletAddress: body.walletAddress,
    });

    jsonResponse(res, 201, {
      success: true,
      data: {
        agentId,
        apiKey,
        message: 'Agent registered successfully. Store your API key — it cannot be retrieved later.',
      },
    }, cors);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('UNIQUE constraint')) {
      return jsonResponse(res, 409, { success: false, error: 'Agent with this wallet address is already registered' }, cors);
    }
    jsonResponse(res, 500, { success: false, error: msg }, cors);
  }
}

function handleProfile(_req: IncomingMessage, res: ServerResponse, db: MarketplaceDB, agentId: string, cors: string): void {
  const agent = db.getAgent(agentId);
  if (!agent) {
    return jsonResponse(res, 404, { success: false, error: 'Agent not found' }, cors);
  }

  // Never expose the API key hash publicly
  const { apiKeyHash: _, ...publicAgent } = agent;
  const services = db.getAgentServices(agentId);

  jsonResponse(res, 200, { success: true, data: { ...publicAgent, services } }, cors);
}

async function handleListService(req: AuthenticatedRequest, res: ServerResponse, db: MarketplaceDB, cors: string): Promise<void> {
  const body = await parseBody(req) as unknown as ListServiceInput;

  if (!body.capability || !body.endpoint || !body.pricePerCall || !body.chainId) {
    return jsonResponse(res, 400, { success: false, error: 'capability, endpoint, pricePerCall, and chainId are required' }, cors);
  }

  const serviceId = db.listService(req.agentId!, {
    capability: body.capability,
    description: body.description ?? '',
    endpoint: body.endpoint,
    pricePerCall: body.pricePerCall,
    chainId: body.chainId,
    tags: body.tags,
  });

  jsonResponse(res, 201, { success: true, data: { serviceId, message: 'Service listed successfully' } }, cors);
}

function handleRemoveService(req: AuthenticatedRequest, res: ServerResponse, db: MarketplaceDB, serviceId: string, cors: string): void {
  const removed = db.removeService(req.agentId!, serviceId);
  if (!removed) {
    return jsonResponse(res, 404, { success: false, error: 'Service not found or not owned by you' }, cors);
  }
  jsonResponse(res, 200, { success: true, data: { message: 'Service removed' } }, cors);
}

function handleSearch(_req: IncomingMessage, res: ServerResponse, db: MarketplaceDB, query: Record<string, string>, cors: string): void {
  const searchQuery: MarketplaceSearchQuery = {};

  if (query.capability) searchQuery.capability = query.capability;
  if (query.minTrust) searchQuery.minTrust = Number(query.minTrust);
  if (query.maxPrice) searchQuery.maxPrice = query.maxPrice;
  if (query.chainIds) searchQuery.chainIds = query.chainIds.split(',').map(Number);
  if (query.tags) searchQuery.tags = query.tags.split(',');
  if (query.sortBy) searchQuery.sortBy = query.sortBy as 'price' | 'trust' | 'jobs';
  if (query.sortOrder) searchQuery.sortOrder = query.sortOrder as 'asc' | 'desc';
  if (query.page) searchQuery.page = Number(query.page);
  if (query.limit) searchQuery.limit = Number(query.limit);

  const result = db.search(searchQuery);

  jsonResponse(res, 200, {
    success: true,
    data: result.services,
    meta: { page: result.page, totalPages: result.totalPages, total: result.total },
  }, cors);
}

async function handleHire(req: AuthenticatedRequest, res: ServerResponse, db: MarketplaceDB, serviceId: string, cors: string): Promise<void> {
  const body = await parseBody(req) as unknown as HireInput;

  if (!body.taskInput || !body.maxPrice || !body.chainId) {
    return jsonResponse(res, 400, { success: false, error: 'taskInput, maxPrice, and chainId are required' }, cors);
  }

  const service = db.getService(serviceId);
  if (!service) {
    return jsonResponse(res, 404, { success: false, error: 'Service not found' }, cors);
  }

  // Check price: service price must be <= maxPrice
  const servicePrice = BigInt(service.pricePerCall);
  const maxPrice = BigInt(body.maxPrice);
  if (servicePrice > maxPrice) {
    return jsonResponse(res, 400, {
      success: false,
      error: `Service price (${service.pricePerCall}) exceeds your maxPrice (${body.maxPrice})`,
    }, cors);
  }

  const jobId = db.createJob({
    serviceId,
    agentId: service.agentId,
    clientId: req.agentId!,
    taskInput: body.taskInput,
    agreedPrice: service.pricePerCall,
    chainId: body.chainId,
  });

  jsonResponse(res, 201, {
    success: true,
    data: {
      jobId,
      agreedPrice: service.pricePerCall,
      agentId: service.agentId,
      message: 'Job created. The agent will pick it up shortly.',
    },
  }, cors);
}

function handleGetJob(req: AuthenticatedRequest, res: ServerResponse, db: MarketplaceDB, jobId: string, cors: string): void {
  const job = db.getJob(jobId);
  if (!job) {
    return jsonResponse(res, 404, { success: false, error: 'Job not found' }, cors);
  }

  // Only the client or the agent can view the job
  if (job.clientId !== req.agentId && job.agentId !== req.agentId) {
    return jsonResponse(res, 403, { success: false, error: 'Not authorized to view this job' }, cors);
  }

  jsonResponse(res, 200, { success: true, data: job }, cors);
}

async function handleUpdateJob(req: AuthenticatedRequest, res: ServerResponse, db: MarketplaceDB, jobId: string, cors: string): Promise<void> {
  const job = db.getJob(jobId);
  if (!job) {
    return jsonResponse(res, 404, { success: false, error: 'Job not found' }, cors);
  }

  // Agent can update status/result; client can submit reputation
  const isAgent = job.agentId === req.agentId;
  const isClient = job.clientId === req.agentId;

  if (!isAgent && !isClient) {
    return jsonResponse(res, 403, { success: false, error: 'Not authorized to update this job' }, cors);
  }

  const body = await parseBody(req);
  const updates: Record<string, unknown> = {};

  if (isAgent) {
    if (body.status) updates.status = body.status;
    if (body.result !== undefined) updates.result = body.result;
    if (body.paymentTxHash) updates.paymentTxHash = body.paymentTxHash;
  }

  if (isClient) {
    if (body.reputationScore !== undefined) {
      const score = Number(body.reputationScore);
      if (score < 0 || score > 100) {
        return jsonResponse(res, 400, { success: false, error: 'reputationScore must be between 0 and 100' }, cors);
      }
      updates.reputationScore = score;
    }
  }

  if (Object.keys(updates).length === 0) {
    return jsonResponse(res, 400, { success: false, error: 'No valid updates provided' }, cors);
  }

  db.updateJob(jobId, updates as any);
  const updated = db.getJob(jobId);
  jsonResponse(res, 200, { success: true, data: updated }, cors);
}

function handleStats(_req: IncomingMessage, res: ServerResponse, db: MarketplaceDB, cors: string): void {
  jsonResponse(res, 200, { success: true, data: db.getStats() }, cors);
}

// ── Server ──

export interface MarketplaceServerOptions {
  /** Port to listen on (default 3141) */
  port?: number;
  /** Path to SQLite database file (default ./marketplace.db) */
  dbPath?: string;
  /** Existing MarketplaceDB instance (takes precedence over dbPath) */
  db?: MarketplaceDB;
  /** CORS allowed origin (default '*') */
  corsOrigin?: string;
  /** Max requests per IP per minute (default 60, 0 = disabled) */
  rateLimit?: number;
}

export class MarketplaceServer {
  readonly db: MarketplaceDB;
  private server: Server | null = null;
  private port: number;
  private corsOrigin: string;
  private rateLimiter: RateLimiter | null;
  private pruneInterval: ReturnType<typeof setInterval> | null = null;
  private startedAt: number = 0;

  constructor(options: MarketplaceServerOptions = {}) {
    this.port = options.port ?? 3141;
    this.db = options.db ?? new MarketplaceDB(options.dbPath);
    this.corsOrigin = options.corsOrigin ?? '*';
    const limit = options.rateLimit ?? 60;
    this.rateLimiter = limit > 0 ? new RateLimiter(limit) : null;
  }

  /** Start listening */
  start(): Promise<Server> {
    return new Promise((resolve) => {
      this.startedAt = Date.now();
      this.server = createServer((req, res) => this._handle(req as AuthenticatedRequest, res));
      this.server.listen(this.port, () => {
        console.log(`Agent Marketplace running on http://localhost:${this.port}`);
        resolve(this.server!);
      });

      // Prune expired rate limit entries every 5 minutes
      if (this.rateLimiter) {
        this.pruneInterval = setInterval(() => this.rateLimiter?.prune(), 300_000);
        this.pruneInterval.unref();
      }
    });
  }

  /** Stop the server */
  stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.pruneInterval) clearInterval(this.pruneInterval);
      if (!this.server) return resolve();
      this.server.close((err) => {
        this.db.close();
        err ? reject(err) : resolve();
      });
    });
  }

  private async _handle(req: AuthenticatedRequest, res: ServerResponse): Promise<void> {
    const start = Date.now();
    const method = req.method ?? 'GET';
    const url = req.url ?? '/';
    const ip = getClientIp(req);

    // CORS preflight
    if (method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': this.corsOrigin,
        'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      });
      res.end();
      return;
    }

    // Rate limiting
    if (this.rateLimiter && !this.rateLimiter.allow(ip)) {
      jsonResponse(res, 429, { success: false, error: 'Too many requests. Try again in a minute.' }, this.corsOrigin);
      this._log(method, url, 429, Date.now() - start);
      return;
    }

    let status = 200;
    try {
      const { segments, query } = parsePath(url);

      // ── Public routes ──

      // GET /health
      if (method === 'GET' && segments[0] === 'health') {
        const stats = this.db.getStats();
        jsonResponse(res, 200, {
          success: true,
          data: {
            status: 'ok',
            version: '1.0.0',
            uptime: Math.floor((Date.now() - this.startedAt) / 1000),
            agents: stats.totalAgents,
            services: stats.totalServices,
            jobs: stats.totalJobs,
          },
        }, this.corsOrigin);
        this._log(method, url, 200, Date.now() - start);
        return;
      }

      // GET /marketplace/stats
      if (method === 'GET' && segments[0] === 'marketplace' && segments[1] === 'stats') {
        handleStats(req, res, this.db, this.corsOrigin);
        this._log(method, url, 200, Date.now() - start);
        return;
      }

      // POST /agents/register
      if (method === 'POST' && segments[0] === 'agents' && segments[1] === 'register') {
        await handleRegister(req, res, this.db, this.corsOrigin);
        this._log(method, url, res.statusCode, Date.now() - start);
        return;
      }

      // GET /agents/:id/profile
      if (method === 'GET' && segments[0] === 'agents' && segments[2] === 'profile') {
        handleProfile(req, res, this.db, segments[1], this.corsOrigin);
        this._log(method, url, res.statusCode, Date.now() - start);
        return;
      }

      // GET /services/search
      if (method === 'GET' && segments[0] === 'services' && segments[1] === 'search') {
        handleSearch(req, res, this.db, query, this.corsOrigin);
        this._log(method, url, 200, Date.now() - start);
        return;
      }

      // ── Authenticated routes ──

      // POST /agents/services
      if (method === 'POST' && segments[0] === 'agents' && segments[1] === 'services') {
        if (!authenticate(req, res, this.db)) return;
        await handleListService(req, res, this.db, this.corsOrigin);
        this._log(method, url, res.statusCode, Date.now() - start);
        return;
      }

      // DELETE /agents/services/:id
      if (method === 'DELETE' && segments[0] === 'agents' && segments[1] === 'services' && segments[2]) {
        if (!authenticate(req, res, this.db)) return;
        handleRemoveService(req, res, this.db, segments[2], this.corsOrigin);
        this._log(method, url, res.statusCode, Date.now() - start);
        return;
      }

      // POST /services/:id/hire
      if (method === 'POST' && segments[0] === 'services' && segments[2] === 'hire') {
        if (!authenticate(req, res, this.db)) return;
        await handleHire(req, res, this.db, segments[1], this.corsOrigin);
        this._log(method, url, res.statusCode, Date.now() - start);
        return;
      }

      // GET /jobs/:id
      if (method === 'GET' && segments[0] === 'jobs' && segments[1]) {
        if (!authenticate(req, res, this.db)) return;
        handleGetJob(req, res, this.db, segments[1], this.corsOrigin);
        this._log(method, url, res.statusCode, Date.now() - start);
        return;
      }

      // PATCH /jobs/:id
      if (method === 'PATCH' && segments[0] === 'jobs' && segments[1]) {
        if (!authenticate(req, res, this.db)) return;
        await handleUpdateJob(req, res, this.db, segments[1], this.corsOrigin);
        this._log(method, url, res.statusCode, Date.now() - start);
        return;
      }

      // ── 404 ──
      status = 404;
      jsonResponse(res, 404, { success: false, error: `Not found: ${method} /${segments.join('/')}` }, this.corsOrigin);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      status = msg === 'Invalid JSON body' ? 400 : 500;
      jsonResponse(res, status, { success: false, error: msg }, this.corsOrigin);
    }

    this._log(method, url, status, Date.now() - start);
  }

  private _log(method: string, url: string, status: number, ms: number): void {
    const ts = new Date().toISOString();
    console.log(JSON.stringify({ ts, method, url, status, ms }));
  }
}
