import { EvalancheError, EvalancheErrorCode } from '../../utils/errors';
import { safeFetch } from '../../utils/safe-fetch';
import type { AgentSigner } from '../../wallet/signer';
import type { PerpVenue } from '../index';
import type {
  LimitOrderParams,
  MarketOrderParams,
} from '../types';
import {
  nextHyperliquidNonce,
  signHyperliquidL1Action,
} from './signing';
import type {
  HyperliquidAccountState,
  HyperliquidExecutionResult,
  HyperliquidMarket,
  HyperliquidMarketMetadata,
  HyperliquidOpenOrder,
  HyperliquidOrderStatus,
  HyperliquidPosition,
  HyperliquidTrade,
} from './types';

const HYPERLIQUID_INFO_API = 'https://api.hyperliquid.xyz/info';
const HYPERLIQUID_EXCHANGE_API = 'https://api.hyperliquid.xyz/exchange';

interface HyperliquidClientOptions {
  signer?: AgentSigner;
  address: string;
  infoUrl?: string;
  exchangeUrl?: string;
  isTestnet?: boolean;
}

interface HyperliquidOrderBook {
  coin: string;
  time: number;
  levels: [{ px: string; sz: string; n: number }[], { px: string; sz: string; n: number }[]];
}

export class HyperliquidClient implements PerpVenue {
  readonly name = 'hyperliquid' as const;

  private readonly signer?: AgentSigner;
  private readonly address: string;
  private readonly infoUrl: string;
  private readonly exchangeUrl: string;
  private readonly isTestnet: boolean;
  private marketCache: HyperliquidMarket[] | null = null;

  constructor(options: HyperliquidClientOptions) {
    this.signer = options.signer;
    this.address = options.address;
    this.infoUrl = options.infoUrl ?? HYPERLIQUID_INFO_API;
    this.exchangeUrl = options.exchangeUrl ?? HYPERLIQUID_EXCHANGE_API;
    this.isTestnet = options.isTestnet ?? false;
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
    const markets = universe
      .map((entry, index) => this.mapMarket(entry, assetContexts[index], index))
      .filter((market): market is HyperliquidMarket => Boolean(market));

    this.marketCache = markets;
    return markets;
  }

  async hasMarket(ticker: string): Promise<boolean> {
    const market = await this.findMarket(ticker);
    return Boolean(market);
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

  async getOpenOrders(): Promise<HyperliquidOpenOrder[]> {
    const orders = await this.fetchInfo<Array<Record<string, unknown>>>({
      type: 'openOrders',
      user: this.address,
    });

    return orders.map((order) => this.mapOpenOrder(order));
  }

  async getTrades(): Promise<HyperliquidTrade[]> {
    const fills = await this.fetchInfo<Array<Record<string, unknown>>>({
      type: 'userFills',
      user: this.address,
      aggregateByTime: true,
    });

    return fills.map((fill) => this.mapTrade(fill));
  }

  async getOrder(orderId: string): Promise<HyperliquidOrderStatus> {
    const numericId = Number(orderId);
    if (!Number.isFinite(numericId) || numericId < 0) {
      throw new EvalancheError(
        `Invalid Hyperliquid order ID: ${orderId}`,
        EvalancheErrorCode.INVALID_PARAMS,
      );
    }

    const status = await this.fetchInfo<Record<string, unknown>>({
      type: 'orderStatus',
      user: this.address,
      oid: numericId,
    });

    const tag = this.pickString(status, ['status'], 'unknown');
    const orderRecord = this.asRecord(status.order);
    const frontendOrder = this.asRecord(orderRecord?.order);

    return {
      status: tag === 'order' ? this.pickString(orderRecord, ['status'], 'order') : tag,
      statusTimestamp: this.pickNumber(orderRecord ?? status, ['statusTimestamp']),
      order: frontendOrder ? this.mapOpenOrder(frontendOrder) : undefined,
      raw: status,
    };
  }

  async placeMarketOrder(params: MarketOrderParams): Promise<string> {
    this.ensureTradingSigner();
    const market = await this.requireMarket(params.market);
    const book = await this.getOrderBook(market.ticker);
    const bestLevel = params.side === 'BUY' ? book.levels[1]?.[0] : book.levels[0]?.[0];
    const referencePrice = Number(bestLevel?.px ?? market.oraclePrice);
    if (!Number.isFinite(referencePrice) || referencePrice <= 0) {
      throw new EvalancheError(
        `Hyperliquid market order failed: no valid price reference for ${market.ticker}`,
        EvalancheErrorCode.PERPS_ERROR,
      );
    }

    const aggressivePrice = params.side === 'BUY'
      ? referencePrice * 1.03
      : referencePrice * 0.97;

    const execution = await this.submitOrder({
      market,
      side: params.side,
      size: params.size,
      price: aggressivePrice.toFixed(8),
      reduceOnly: params.reduceOnly ?? false,
      tif: 'FrontendMarket',
    });

    if (!execution.orderId) {
      throw new EvalancheError(
        `Hyperliquid market order returned no order ID for ${market.ticker}`,
        EvalancheErrorCode.PERPS_ERROR,
      );
    }
    return execution.orderId;
  }

  async placeLimitOrder(params: LimitOrderParams): Promise<string> {
    this.ensureTradingSigner();
    const market = await this.requireMarket(params.market);
    const tif = this.resolveLimitTif(params);
    const execution = await this.submitOrder({
      market,
      side: params.side,
      size: params.size,
      price: params.price,
      reduceOnly: params.reduceOnly ?? false,
      tif,
    });

    if (!execution.orderId) {
      throw new EvalancheError(
        `Hyperliquid limit order returned no order ID for ${market.ticker}`,
        EvalancheErrorCode.PERPS_ERROR,
      );
    }
    return execution.orderId;
  }

  async cancelOrder(orderId: string): Promise<void> {
    this.ensureTradingSigner();
    const status = await this.getOrder(orderId);
    const order = status.order;
    if (!order) {
      throw new EvalancheError(
        `Hyperliquid order ${orderId} was not found`,
        EvalancheErrorCode.PERPS_ERROR,
      );
    }

    const market = await this.requireMarket(order.market);
    const response = await this.executeL1Action({
      type: 'cancel',
      cancels: [
        {
          a: Number(market.marketId),
          o: Number(orderId),
        },
      ],
    });

    const statuses = this.readStatuses(response);
    const first = statuses[0];
    if (first && typeof first === 'object' && 'error' in first) {
      throw new EvalancheError(
        `Hyperliquid cancel failed: ${String(first.error)}`,
        EvalancheErrorCode.PERPS_ERROR,
      );
    }
  }

  async closePosition(marketName: string): Promise<string> {
    const positions = await this.getPositions();
    const position = positions.find((entry) => entry.market.toUpperCase() === marketName.toUpperCase());
    if (!position) {
      throw new EvalancheError(
        `No open Hyperliquid position found for ${marketName}`,
        EvalancheErrorCode.PERPS_ERROR,
      );
    }

    const side = position.side === 'LONG' ? 'SELL' : 'BUY';
    return this.placeMarketOrder({
      market: position.market,
      side,
      size: position.size,
      reduceOnly: true,
    });
  }

  async placeMarketOrderDetailed(params: MarketOrderParams): Promise<HyperliquidExecutionResult> {
    this.ensureTradingSigner();
    const market = await this.requireMarket(params.market);
    const book = await this.getOrderBook(market.ticker);
    const bestLevel = params.side === 'BUY' ? book.levels[1]?.[0] : book.levels[0]?.[0];
    const referencePrice = Number(bestLevel?.px ?? market.oraclePrice);
    return this.submitOrder({
      market,
      side: params.side,
      size: params.size,
      price: (params.side === 'BUY' ? referencePrice * 1.03 : referencePrice * 0.97).toFixed(8),
      reduceOnly: params.reduceOnly ?? false,
      tif: 'FrontendMarket',
    });
  }

  async placeLimitOrderDetailed(params: LimitOrderParams): Promise<HyperliquidExecutionResult> {
    this.ensureTradingSigner();
    const market = await this.requireMarket(params.market);
    return this.submitOrder({
      market,
      side: params.side,
      size: params.size,
      price: params.price,
      reduceOnly: params.reduceOnly ?? false,
      tif: this.resolveLimitTif(params),
    });
  }

  private async submitOrder(args: {
    market: HyperliquidMarket;
    side: 'BUY' | 'SELL';
    size: string;
    price: string;
    reduceOnly: boolean;
    tif: 'Gtc' | 'Ioc' | 'Alo' | 'FrontendMarket';
  }): Promise<HyperliquidExecutionResult> {
    this.ensureTradingSigner();

    const response = await this.executeL1Action({
      type: 'order',
      orders: [
        {
          a: Number(args.market.marketId),
          b: args.side === 'BUY',
          p: this.normalizeDecimal(args.price),
          s: this.normalizeDecimal(args.size),
          r: args.reduceOnly,
          t: { limit: { tif: args.tif } },
        },
      ],
      grouping: 'na',
    });

    const statuses = this.readStatuses(response);
    const first = statuses[0];

    if (!first) {
      return { status: 'submitted', raw: response };
    }
    if (first === 'waitingForFill' || first === 'waitingForTrigger') {
      return { status: 'waiting', raw: response };
    }
    if (typeof first === 'object' && 'error' in first) {
      throw new EvalancheError(
        `Hyperliquid order failed: ${String(first.error)}`,
        EvalancheErrorCode.PERPS_ERROR,
      );
    }
    if (typeof first === 'object' && 'resting' in first) {
      return {
        orderId: String(first.resting.oid),
        status: 'resting',
        raw: response,
      };
    }
    if (typeof first === 'object' && 'filled' in first) {
      return {
        orderId: String(first.filled.oid),
        status: 'filled',
        filledSize: String(first.filled.totalSz),
        averageFillPrice: String(first.filled.avgPx),
        raw: response,
      };
    }

    return { status: 'submitted', raw: response };
  }

  private async requireMarket(ticker: string): Promise<HyperliquidMarket> {
    const market = await this.findMarket(ticker);
    if (!market) {
      throw new EvalancheError(
        `Hyperliquid market not found: ${ticker}`,
        EvalancheErrorCode.PERPS_ERROR,
      );
    }
    return market;
  }

  private async findMarket(ticker: string): Promise<HyperliquidMarket | undefined> {
    const markets = this.marketCache ?? await this.getMarkets();
    return markets.find((market) => market.ticker.toUpperCase() === ticker.toUpperCase());
  }

  private resolveLimitTif(params: LimitOrderParams): 'Gtc' | 'Ioc' | 'Alo' {
    if (params.postOnly) return 'Alo';
    if (params.timeInForce === 'FOK' || params.timeInForce === 'IOC') return 'Ioc';
    return 'Gtc';
  }

  private normalizeDecimal(value: string): string {
    const normalized = String(Number(value));
    if (!Number.isFinite(Number(normalized)) || Number(normalized) <= 0) {
      throw new EvalancheError(
        `Invalid Hyperliquid decimal value: ${value}`,
        EvalancheErrorCode.INVALID_PARAMS,
      );
    }
    return normalized;
  }

  private ensureTradingSigner(): AgentSigner {
    if (!this.signer) {
      throw new EvalancheError(
        'Hyperliquid trading requires a signer.',
        EvalancheErrorCode.INVALID_CONFIG,
      );
    }
    return this.signer;
  }

  private async executeL1Action(action: Record<string, unknown>): Promise<Record<string, unknown>> {
    const signer = this.ensureTradingSigner();
    const nonce = nextHyperliquidNonce();
    const signature = await signHyperliquidL1Action({
      signer,
      action,
      nonce,
      isTestnet: this.isTestnet,
    });

    const res = await safeFetch(this.exchangeUrl, {
      timeoutMs: 15_000,
      maxBytes: 2_000_000,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        nonce,
        signature,
      }),
    });

    if (!res.ok) {
      const message = await res.text().catch(() => 'Unknown error');
      throw new EvalancheError(
        `Hyperliquid exchange request failed (${res.status}): ${message}`,
        EvalancheErrorCode.PERPS_ERROR,
      );
    }

    return await res.json() as Record<string, unknown>;
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

  private async getOrderBook(coin: string): Promise<HyperliquidOrderBook> {
    const book = await this.fetchInfo<HyperliquidOrderBook | null>({
      type: 'l2Book',
      coin,
    });
    if (!book) {
      throw new EvalancheError(
        `Hyperliquid order book not available for ${coin}`,
        EvalancheErrorCode.PERPS_ERROR,
      );
    }
    return book;
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
      status: this.pickBoolean(item, ['isDelisted']) ? 'DELISTED' : 'ACTIVE',
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

  private mapOpenOrder(order: Record<string, unknown>): HyperliquidOpenOrder {
    return {
      orderId: this.pickString(order, ['oid'], '0'),
      market: this.pickString(order, ['coin'], ''),
      side: this.pickString(order, ['side'], 'B') === 'A' ? 'SELL' : 'BUY',
      price: this.pickString(order, ['limitPx'], '0'),
      size: this.pickString(order, ['sz'], '0'),
      originalSize: this.pickString(order, ['origSz', 'sz'], '0'),
      reduceOnly: Boolean(order.reduceOnly ?? false),
      timeInForce: this.pickString(order, ['tif'], null),
      timestamp: this.pickNumber(order, ['timestamp']) ?? 0,
      raw: order,
    };
  }

  private mapTrade(fill: Record<string, unknown>): HyperliquidTrade {
    return {
      orderId: this.pickString(fill, ['oid'], '0'),
      market: this.pickString(fill, ['coin'], ''),
      side: this.pickString(fill, ['side'], 'B') === 'A' ? 'SELL' : 'BUY',
      price: this.pickString(fill, ['px'], '0'),
      size: this.pickString(fill, ['sz'], '0'),
      startPosition: this.pickString(fill, ['startPosition'], '0'),
      closedPnl: this.pickString(fill, ['closedPnl'], '0'),
      fee: this.pickString(fill, ['fee'], '0'),
      feeToken: this.pickString(fill, ['feeToken'], ''),
      crossed: Boolean(fill.crossed ?? false),
      hash: this.pickString(fill, ['hash'], ''),
      timestamp: this.pickNumber(fill, ['time']) ?? 0,
      raw: fill,
    };
  }

  private unwrapPosition(item: unknown): Record<string, unknown> {
    if (!item || typeof item !== 'object') return {};
    const candidate = item as Record<string, unknown>;
    const nested = candidate.position;
    return nested && typeof nested === 'object' ? nested as Record<string, unknown> : candidate;
  }

  private readStatuses(value: Record<string, unknown>): any[] {
    const response = this.asRecord(value.response);
    const data = this.asRecord(response?.data);
    return Array.isArray(data?.statuses) ? data.statuses : [];
  }

  private pickString(
    value: Record<string, unknown> | undefined,
    keys: string[],
    fallback?: string | null,
  ): string {
    if (!value) return fallback == null ? '' : fallback;
    for (const key of keys) {
      const candidate = value[key];
      if (typeof candidate === 'string' && candidate.length > 0) return candidate;
      if (typeof candidate === 'number' && Number.isFinite(candidate)) return String(candidate);
    }
    return fallback == null ? '' : fallback;
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
