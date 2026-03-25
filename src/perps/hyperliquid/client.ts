import { EvalancheError, EvalancheErrorCode } from '../../utils/errors';
import { safeFetch } from '../../utils/safe-fetch';
import type { AgentSigner } from '../../wallet/signer';
import type { PerpVenue } from '../index';
import type {
  LimitOrderParams,
  MarketOrderParams,
  PerpMarket,
  PerpPosition,
} from '../types';
import type {
  HyperliquidAccountState,
  HyperliquidMarket,
  HyperliquidMarketMetadata,
  HyperliquidPosition,
} from './types';

const HYPERLIQUID_INFO_API = 'https://api.hyperliquid.xyz/info';

interface HyperliquidClientOptions {
  signer?: AgentSigner;
  address: string;
  infoUrl?: string;
}

export class HyperliquidClient implements PerpVenue {
  readonly name = 'hyperliquid' as const;

  private readonly signer?: AgentSigner;
  private readonly address: string;
  private readonly infoUrl: string;

  constructor(options: HyperliquidClientOptions) {
    this.signer = options.signer;
    this.address = options.address;
    this.infoUrl = options.infoUrl ?? HYPERLIQUID_INFO_API;
  }

  async connect(): Promise<void> {
    return;
  }

  async getMarkets(): Promise<HyperliquidMarket[]> {
    const [meta, assetContexts] = await this.fetchInfo<[
      { universe?: Array<Record<string, unknown>> },
      Array<Record<string, unknown>>,
    ]>({ type: 'metaAndAssetCtxs' });

    const universe = Array.isArray(meta?.universe) ? meta.universe : [];

    return universe
      .map((entry, index) => this.mapMarket(entry, assetContexts[index], index))
      .filter((market): market is HyperliquidMarket => Boolean(market));
  }

  async hasMarket(ticker: string): Promise<boolean> {
    const normalized = ticker.toUpperCase();
    const markets = await this.getMarkets();
    return markets.some((market) => market.ticker.toUpperCase() === normalized);
  }

  async getPositions(): Promise<HyperliquidPosition[]> {
    const state = await this.getAccountState();
    return state.positions;
  }

  async getBalance(): Promise<string> {
    const state = await this.getAccountState();
    return state.accountValue;
  }

  async getAccountState(): Promise<HyperliquidAccountState> {
    const data = await this.fetchInfo<Record<string, unknown>>({
      type: 'clearinghouseState',
      user: this.address,
    });
    const crossMarginSummary = this.asRecord(data.crossMarginSummary);

    const rawPositions = Array.isArray(data.assetPositions) ? data.assetPositions : [];
    const positions = rawPositions
      .map((item) => this.mapPosition(item))
      .filter((position): position is HyperliquidPosition => Boolean(position));

    return {
      address: this.address,
      accountValue: this.pickString(crossMarginSummary, ['accountValue'], '0'),
      withdrawable: this.pickString(data, ['withdrawable'], '0'),
      marginSummary: this.pickRecordStrings(crossMarginSummary),
      positions,
    };
  }

  async placeMarketOrder(_params: MarketOrderParams): Promise<string> {
    this.ensureTradingSigner();
    throw new EvalancheError(
      'Hyperliquid trading adapter is not implemented yet. Market discovery and account reads are available; order placement needs nonce/signing support.',
      EvalancheErrorCode.PERPS_ERROR,
    );
  }

  async placeLimitOrder(_params: LimitOrderParams): Promise<string> {
    this.ensureTradingSigner();
    throw new EvalancheError(
      'Hyperliquid trading adapter is not implemented yet. Limit order placement needs nonce/signing support.',
      EvalancheErrorCode.PERPS_ERROR,
    );
  }

  async cancelOrder(_orderId: string): Promise<void> {
    this.ensureTradingSigner();
    throw new EvalancheError(
      'Hyperliquid trading adapter is not implemented yet. Order cancellation needs nonce/signing support.',
      EvalancheErrorCode.PERPS_ERROR,
    );
  }

  async closePosition(_market: string): Promise<string> {
    this.ensureTradingSigner();
    throw new EvalancheError(
      'Hyperliquid trading adapter is not implemented yet. Position close needs nonce/signing support.',
      EvalancheErrorCode.PERPS_ERROR,
    );
  }

  private ensureTradingSigner(): void {
    if (!this.signer) {
      throw new EvalancheError(
        'Hyperliquid trading requires a signer. Construct the client from an Evalanche agent wallet to enable trading once implemented.',
        EvalancheErrorCode.INVALID_CONFIG,
      );
    }
  }

  private async fetchInfo<T>(body: Record<string, unknown>): Promise<T> {
    const res = await safeFetch(this.infoUrl, {
      timeoutMs: 15_000,
      maxBytes: 2_000_000,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const message = await res.text().catch(() => 'Unknown error');
      throw new EvalancheError(
        `Hyperliquid info request failed (${res.status}): ${message}`,
        EvalancheErrorCode.PERPS_ERROR,
      );
    }

    return await res.json() as T;
  }

  private mapMarket(
    item: Record<string, unknown>,
    assetContext: Record<string, unknown> | undefined,
    index: number,
  ): HyperliquidMarket | null {
    const ticker = this.pickString(item, ['name'], '');
    if (!ticker) return null;

    const maxLeverageRaw = this.pickString(item, ['maxLeverage'], '0');
    const maxLeverage = Number(maxLeverageRaw);
    const initialMarginFraction = maxLeverage > 0 ? String(Number((1 / maxLeverage).toFixed(8))) : '0';
    const metadata = this.buildMarketMetadata(item, index);

    return {
      venue: 'hyperliquid',
      ticker,
      marketId: metadata.assetId,
      marketClass: metadata.marketClass,
      status: 'ACTIVE',
      oraclePrice: this.pickString(assetContext, ['oraclePx', 'markPx', 'midPx'], '0'),
      volume24H: this.pickString(assetContext, ['dayNtlVlm', 'dayBaseVlm'], '0'),
      openInterest: this.pickString(assetContext, ['openInterest'], '0'),
      initialMarginFraction,
      maxLeverage: Number.isFinite(maxLeverage) ? maxLeverage : 0,
      metadata,
    };
  }

  private buildMarketMetadata(item: Record<string, unknown>, index: number): HyperliquidMarketMetadata {
    const rawName = this.pickString(item, ['name'], '');
    const dexId = this.pickString(item, ['dex', 'dexId'], undefined);
    const deployer = this.pickString(item, ['deployer'], undefined);
    const explicitHip3 = this.pickBoolean(item, ['isHip3']);
    const inferredHip3 = explicitHip3 ?? (Boolean(dexId) || rawName.startsWith('@'));

    return {
      assetId: this.pickString(item, ['asset', 'assetId'], String(index)),
      dexId,
      deployer,
      isHip3: inferredHip3,
      marketClass: inferredHip3 ? 'hip3' : 'validator',
      marginTableId: this.pickNumber(item, ['marginTableId']),
      sizeDecimals: this.pickNumber(item, ['szDecimals']),
    };
  }

  private mapPosition(item: unknown): HyperliquidPosition | null {
    const position = this.unwrapPosition(item);
    const market = this.pickString(position, ['coin'], '');
    const size = this.pickString(position, ['szi', 'size'], '0');
    if (!market || size === '0') return null;

    const side = Number(size) >= 0 ? 'LONG' : 'SHORT';
    const metadata = this.buildMarketMetadata({ name: market }, 0);

    return {
      venue: 'hyperliquid',
      market,
      marketId: metadata.assetId,
      marketClass: metadata.marketClass,
      side,
      size: String(Math.abs(Number(size))),
      entryPrice: this.pickString(position, ['entryPx'], '0'),
      unrealizedPnl: this.pickString(position, ['unrealizedPnl'], '0'),
      liquidationPrice: this.pickString(position, ['liquidationPx'], undefined),
      metadata,
    };
  }

  private unwrapPosition(item: unknown): Record<string, unknown> {
    if (!item || typeof item !== 'object') return {};
    const candidate = item as Record<string, unknown>;
    const nested = candidate.position;
    return nested && typeof nested === 'object' ? nested as Record<string, unknown> : candidate;
  }

  private pickString(
    value: Record<string, unknown> | undefined,
    keys: string[],
    fallback?: string,
  ): string {
    if (!value) return fallback ?? '';
    for (const key of keys) {
      const candidate = value[key];
      if (typeof candidate === 'string' && candidate.length > 0) return candidate;
      if (typeof candidate === 'number' && Number.isFinite(candidate)) return String(candidate);
    }
    return fallback ?? '';
  }

  private pickBoolean(value: Record<string, unknown>, keys: string[]): boolean | undefined {
    for (const key of keys) {
      const candidate = value[key];
      if (typeof candidate === 'boolean') return candidate;
    }
    return undefined;
  }

  private pickNumber(value: Record<string, unknown>, keys: string[]): number | undefined {
    for (const key of keys) {
      const candidate = value[key];
      if (typeof candidate === 'number' && Number.isFinite(candidate)) return candidate;
      if (typeof candidate === 'string' && candidate.length > 0) {
        const parsed = Number(candidate);
        if (Number.isFinite(parsed)) return parsed;
      }
    }
    return undefined;
  }

  private pickRecordStrings(value: unknown): Record<string, string> | undefined {
    if (!value || typeof value !== 'object') return undefined;
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entry]) => typeof entry === 'string' || typeof entry === 'number')
        .map(([key, entry]) => [key, String(entry)]),
    );
  }

  private asRecord(value: unknown): Record<string, unknown> | undefined {
    return value && typeof value === 'object' ? value as Record<string, unknown> : undefined;
  }
}
