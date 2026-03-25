export type {
  MarketOrderParams,
  LimitOrderParams,
  PerpPosition,
  PerpMarket,
} from '../types';

export interface DydxSubaccount {
  address: string;
  subaccountNumber: number;
  equity: string;
  freeCollateral: string;
  positions: import('../types').PerpPosition[];
}
