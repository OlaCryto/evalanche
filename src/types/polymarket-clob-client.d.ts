declare module '@polymarket/clob-client' {
  export class ClobClient {
    constructor(host: string, chainId: number, signer?: unknown, apiCreds?: unknown);
    getMarkets(options?: unknown): Promise<any>;
    getMarket(conditionId: string): Promise<any>;
    getOrderBook(tokenId: string): Promise<any>;
    createAndPostOrder(order: unknown, options?: unknown): Promise<any>;
    cancelOrder(orderId: string): Promise<any>;
    getOrder(orderId: string): Promise<any>;
    getOpenOrders(tokenId?: string): Promise<any[]>;
    getPositions(): Promise<any[]>;
    getBalances(): Promise<any>;
    getTrades(tokenId?: string): Promise<any[]>;
  }

  export const Side: {
    BUY: string;
    SELL: string;
  };
}
