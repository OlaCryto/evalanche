import type {
  PerpMarket,
  PerpMarketClass,
  PerpPosition,
} from '../types';

export interface HyperliquidMarketMetadata {
  assetId: string;
  dexId?: string;
  deployer?: string;
  isHip3: boolean;
  marketClass: PerpMarketClass;
  marginTableId?: number;
  sizeDecimals?: number;
}

export interface HyperliquidMarket extends PerpMarket {
  venue: 'hyperliquid';
  metadata: HyperliquidMarketMetadata;
}

export interface HyperliquidPosition extends PerpPosition {
  venue: 'hyperliquid';
  metadata?: HyperliquidMarketMetadata;
}

export interface HyperliquidAccountState {
  address: string;
  accountValue: string;
  withdrawable: string;
  marginSummary?: Record<string, string>;
  positions: HyperliquidPosition[];
}

