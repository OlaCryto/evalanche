/**
 * Marketplace types — the data model for the Agent Marketplace.
 *
 * These types represent what gets stored in the database and what
 * gets returned by the REST API.
 */

// ---------------------------------------------------------------------------
// Agent Registration
// ---------------------------------------------------------------------------

/** A registered agent in the marketplace */
export interface MarketplaceAgent {
  /** Unique agent ID (wallet address or ERC-8004 ID) */
  agentId: string;
  /** Human-readable display name */
  name: string;
  /** Short description of what this agent does */
  description: string;
  /** Wallet address for receiving payments */
  walletAddress: string;
  /** API key hash (never expose the raw key) */
  apiKeyHash: string;
  /** Trust score computed from transaction history (0-100) */
  trustScore: number;
  /** Total number of completed jobs */
  completedJobs: number;
  /** Total volume transacted in wei */
  totalVolume: string;
  /** Whether this agent is currently online/available */
  isOnline: boolean;
  /** Unix timestamp (ms) when registered */
  registeredAt: number;
  /** Unix timestamp (ms) of last activity */
  lastSeenAt: number;
}

/** Input for registering a new agent */
export interface RegisterAgentInput {
  /** Human-readable display name */
  name: string;
  /** Short description */
  description: string;
  /** Wallet address for receiving payments */
  walletAddress: string;
}

/** Result of registering an agent */
export interface RegisterAgentResult {
  /** The assigned agent ID */
  agentId: string;
  /** The API key (only returned once, at registration time) */
  apiKey: string;
  /** Message */
  message: string;
}

// ---------------------------------------------------------------------------
// Services
// ---------------------------------------------------------------------------

/** A service listing in the marketplace */
export interface MarketplaceService {
  /** Auto-generated service ID */
  id: string;
  /** Agent ID that offers this service */
  agentId: string;
  /** Capability name (e.g. "code-audit", "price-feed") */
  capability: string;
  /** Description of what this service does */
  description: string;
  /** Endpoint URL where the service is available */
  endpoint: string;
  /** Price per call in wei */
  pricePerCall: string;
  /** Chain ID where payments are accepted */
  chainId: number;
  /** Searchable tags */
  tags: string[];
  /** Whether this service is currently active */
  isActive: boolean;
  /** Unix timestamp (ms) when listed */
  listedAt: number;
}

/** Input for listing a service */
export interface ListServiceInput {
  capability: string;
  description: string;
  endpoint: string;
  pricePerCall: string;
  chainId: number;
  tags?: string[];
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

/** Search query parameters */
export interface MarketplaceSearchQuery {
  /** Search by capability (substring match) */
  capability?: string;
  /** Minimum trust score (0-100) */
  minTrust?: number;
  /** Maximum price per call in wei */
  maxPrice?: string;
  /** Only services on these chains */
  chainIds?: number[];
  /** Required tags (all must match) */
  tags?: string[];
  /** Sort by: "price", "trust", "jobs" */
  sortBy?: 'price' | 'trust' | 'jobs';
  /** Sort direction */
  sortOrder?: 'asc' | 'desc';
  /** Page number (1-indexed) */
  page?: number;
  /** Results per page (default 20, max 100) */
  limit?: number;
}

/** Search result with pagination */
export interface MarketplaceSearchResult {
  services: (MarketplaceService & { agent: Pick<MarketplaceAgent, 'name' | 'trustScore' | 'completedJobs' | 'isOnline'> })[];
  total: number;
  page: number;
  totalPages: number;
}

// ---------------------------------------------------------------------------
// Hire Flow
// ---------------------------------------------------------------------------

/** Input for hiring an agent */
export interface HireInput {
  /** The service ID to hire */
  serviceId: string;
  /** Task description / input for the agent */
  taskInput: string;
  /** Maximum price willing to pay in wei */
  maxPrice: string;
  /** Chain ID for payment */
  chainId: number;
}

/** Job status */
export type JobStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'disputed';

/** A job record — tracks a hire-to-completion lifecycle */
export interface Job {
  /** Unique job ID */
  id: string;
  /** Service that was hired */
  serviceId: string;
  /** Agent performing the work */
  agentId: string;
  /** Client who hired (wallet address or agent ID) */
  clientId: string;
  /** Task input */
  taskInput: string;
  /** Agreed price in wei */
  agreedPrice: string;
  /** Chain ID for payment */
  chainId: number;
  /** Current status */
  status: JobStatus;
  /** Result/output from the agent (once completed) */
  result?: string;
  /** Payment transaction hash */
  paymentTxHash?: string;
  /** Escrow deposit transaction hash */
  escrowTxHash?: string;
  /** Escrow contract address */
  escrowAddress?: string;
  /** Reputation score given by client (0-100) */
  reputationScore?: number;
  /** Unix timestamp (ms) when created */
  createdAt: number;
  /** Unix timestamp (ms) when completed/failed */
  completedAt?: number;
}

// ---------------------------------------------------------------------------
// Marketplace Stats
// ---------------------------------------------------------------------------

/** Global marketplace statistics */
export interface MarketplaceStats {
  /** Total registered agents */
  totalAgents: number;
  /** Total active services */
  totalServices: number;
  /** Total completed jobs */
  totalJobs: number;
  /** Total volume transacted in wei */
  totalVolume: string;
  /** Top capabilities by job count */
  topCapabilities: { capability: string; jobCount: number }[];
  /** Number of agents currently online */
  onlineAgents: number;
}

// ---------------------------------------------------------------------------
// API Response wrapper
// ---------------------------------------------------------------------------

/** Standard API response envelope */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    page?: number;
    totalPages?: number;
    total?: number;
  };
}
