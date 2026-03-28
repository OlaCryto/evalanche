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

export interface HyperliquidOpenOrder {
  orderId: string;
  market: string;
  side: 'BUY' | 'SELL';
  price: string;
  size: string;
  originalSize: string;
  reduceOnly: boolean;
  timeInForce?: string | null;
  timestamp: number;
  raw?: unknown;
}

export interface HyperliquidTrade {
  orderId: string;
  market: string;
  side: 'BUY' | 'SELL';
  price: string;
  size: string;
  startPosition: string;
  closedPnl: string;
  fee: string;
  feeToken: string;
  crossed: boolean;
  hash: string;
  timestamp: number;
  raw?: unknown;
}

export interface HyperliquidOrderStatus {
  status: string;
  statusTimestamp?: number;
  order?: HyperliquidOpenOrder;
  raw?: unknown;
}

export interface HyperliquidExecutionResult {
  orderId?: string;
  status: 'resting' | 'filled' | 'waiting' | 'submitted' | 'canceled';
  filledSize?: string;
  averageFillPrice?: string;
  raw: unknown;
}
