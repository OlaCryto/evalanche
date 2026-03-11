/**
 * Agent Marketplace — barrel exports.
 *
 * ```ts
 * import { MarketplaceServer, MarketplaceDB } from 'evalanche/marketplace';
 * ```
 */

export { MarketplaceServer } from './api';
export type { MarketplaceServerOptions } from './api';

export { MarketplaceDB } from './db';

export { loadConfig } from './config';
export type { MarketplaceConfig } from './config';

export type {
  MarketplaceAgent,
  RegisterAgentInput,
  RegisterAgentResult,
  MarketplaceService,
  ListServiceInput,
  MarketplaceSearchQuery,
  MarketplaceSearchResult,
  HireInput,
  JobStatus,
  Job,
  MarketplaceStats,
  ApiResponse,
} from './types';
