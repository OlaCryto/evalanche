/**
 * DeFi module exports.
 */

export { LiquidStakingClient, SAVAX_CONTRACT } from './liquid-staking';
export { VaultClient, YOUSD_VAULT } from './vaults';
export {
  CompositeDappRegistry,
  LocalCanonicalDappRegistryProvider,
  createDefaultDappRegistry,
  parseInteroperableAddress,
  resolveDappTarget,
} from './dapp-registry';
export type {
  StakeQuote,
  UnstakeQuote,
  StakeConfig,
  VaultQuote,
  VaultInfo,
  VaultConfig,
} from './types';
