/** x402 payment requirements parsed from a 402 response */
export interface PaymentRequirements {
  facilitator: string;
  paymentAddress: string;
  amount: string;
  currency: string;
  chainId: number;
  resource?: string;
  nonce?: string;
  issuedAt?: number;
  expiresAt?: number;
  bodyHash?: string;
  extra?: Record<string, unknown>;
}

export interface PaymentProofPayload {
  facilitator: string;
  paymentAddress: string;
  amount: string;
  currency: string;
  chainId: number;
  payer: string;
  resource?: string;
  nonce?: string;
  issuedAt?: number;
  expiresAt?: number;
  bodyHash?: string;
  timestamp: number;
}

/** Options for an x402 pay-and-fetch request */
export interface PayAndFetchOptions {
  maxPayment: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

/** Result of an x402 pay-and-fetch request */
export interface PayAndFetchResult {
  status: number;
  headers: Record<string, string>;
  body: string;
  paymentHash?: string;
}
