# Evalanche

**Multi-EVM agent wallet SDK with onchain identity (ERC-8004), unified wallet holdings discovery, full agent identity resolution, payment rails (x402), cross-chain liquidity (Li.Fi bridging + DEX aggregation + DeFi Composer), gas funding (Gas.zip), market intelligence (CoinGecko), prediction markets (Polymarket CLOB), agent economy primitives, DeFi operations, and perpetual futures (dYdX v4 + Hyperliquid)**

Evalanche gives AI agents a **non-custodial** wallet on **any EVM chain** — Ethereum, Base, Arbitrum, Optimism, Polygon, BSC, Avalanche, and 15+ more — with built-in onchain identity, ERC-8004 full registration resolution, payment capabilities, unified holdings scanning, cross-chain bridging, same-chain DEX swaps (31+ aggregators), CoinGecko market data, Polymarket market discovery and execution, agent economy primitives (discovery, negotiation, settlement, escrow, memory), DeFi operations, and perpetual futures on dYdX + Hyperliquid. No browser, no popups, no human in the loop.

## Install

```bash
npm install evalanche
```

## Quick Start

### On any EVM chain

```typescript
import { Evalanche } from 'evalanche';

// Boot on Base
const { agent } = await Evalanche.boot({ network: 'base' });

// Boot on Ethereum
const { agent: ethAgent } = await Evalanche.boot({ network: 'ethereum' });

// Boot on Arbitrum
const { agent: arbAgent } = await Evalanche.boot({ network: 'arbitrum' });

// Boot on Avalanche (with identity)
const { agent: avaxAgent } = await Evalanche.boot({
  network: 'avalanche',
  identity: { agentId: '1599' },
});
```

### Non-custodial (recommended)

```typescript
// First run: generates wallet, encrypts to ~/.evalanche/keys/agent.json
// Every subsequent run: decrypts and loads the same wallet
const { agent, keystore } = await Evalanche.boot({ network: 'base' });

console.log(agent.address);         // 0x... (same every time)
console.log(keystore.isNew);        // true first run, false after

// Send tokens
await agent.send({ to: '0x...', value: '0.1' });

// Bridge tokens cross-chain
await agent.bridgeTokens({
  fromChainId: 8453,    // Base
  toChainId: 42161,     // Arbitrum
  fromToken: 'native',
  toToken: 'native',
  fromAmount: '0.1',
  fromAddress: agent.address,
});
```

### One-shot generation

```typescript
const { agent, wallet } = Evalanche.generate({ network: 'optimism' });
console.log(wallet.mnemonic);   // 12-word BIP-39
console.log(wallet.address);    // 0x...
```

### Existing keys

```typescript
const agent = new Evalanche({
  privateKey: process.env.AGENT_PRIVATE_KEY,
  network: 'polygon',
});
```

## Supported Networks

| Network | Chain ID | Alias | RPC Source | Explorer |
|---------|----------|-------|------------|----------|
| Ethereum | 1 | `ethereum` | Public | etherscan.io |
| Base | 8453 | `base` | Routescan | basescan.org |
| Arbitrum One | 42161 | `arbitrum` | Routescan | arbiscan.io |
| Optimism | 10 | `optimism` | Routescan | optimistic.etherscan.io |
| Polygon | 137 | `polygon` | Routescan | polygonscan.com |
| BNB Smart Chain | 56 | `bsc` | Routescan | bscscan.com |
| Avalanche C-Chain | 43114 | `avalanche` | Routescan | snowtrace.io |
| Fantom | 250 | `fantom` | Routescan | ftmscan.com |
| Gnosis | 100 | `gnosis` | Public | gnosisscan.io |
| zkSync Era | 324 | `zksync` | Public | explorer.zksync.io |
| Linea | 59144 | `linea` | Public | lineascan.build |
| Scroll | 534352 | `scroll` | Public | scrollscan.com |
| Blast | 81457 | `blast` | Public | blastscan.io |
| Mantle | 5000 | `mantle` | Public | explorer.mantle.xyz |
| Celo | 42220 | `celo` | Public | celoscan.io |
| Moonbeam | 1284 | `moonbeam` | Public | moonscan.io |
| Cronos | 25 | `cronos` | Routescan | cronoscan.com |
| Berachain | 80094 | `berachain` | Routescan | berascan.com |
| Avalanche Fuji | 43113 | `fuji` | Routescan | testnet.snowtrace.io |
| Sepolia | 11155111 | `sepolia` | Public | sepolia.etherscan.io |
| Base Sepolia | 84532 | `base-sepolia` | Public | sepolia.basescan.org |

Routescan RPCs are used as the primary RPC where available, with public fallback RPCs.

## Cross-Chain Bridging

### Li.Fi — Cross-Chain Liquidity (v0.8.0)

Full Li.Fi integration: bridging, same-chain DEX aggregation, DeFi Composer, token/chain discovery, gas pricing, and transfer status tracking.

```typescript
const agent = new Evalanche({ privateKey: '0x...', network: 'ethereum' });

// Bridge tokens cross-chain
const result = await agent.bridgeTokens({
  fromChainId: 1,       // Ethereum
  toChainId: 8453,      // Base
  fromToken: '0x0000000000000000000000000000000000000000',
  toToken: '0x0000000000000000000000000000000000000000',
  fromAmount: '0.1',
  fromAddress: agent.address,
});

// Track transfer status (poll until DONE or FAILED)
const status = await agent.checkBridgeStatus({
  txHash: result.txHash,
  fromChainId: 1,
  toChainId: 8453,
});
// → { status: 'DONE', substatus: 'COMPLETED', receiving: { txHash, amount, token, chainId } }

// Same-chain DEX swap (31+ DEX aggregators on any chain)
const swapResult = await agent.swap({
  fromChainId: 8453,    // Base
  toChainId: 8453,      // Same chain = DEX swap
  fromToken: '0x0000000000000000000000000000000000000000', // ETH
  toToken: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC on Base
  fromAmount: '0.05',
  fromAddress: agent.address,
});

// Token discovery — prices, decimals, symbols
const tokens = await agent.getTokens([8453, 42161]); // Base + Arbitrum tokens
const usdc = await agent.getToken(8453, '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913');
// → { symbol: 'USDC', decimals: 6, priceUSD: '1.00', ... }

// Chain and tool discovery
const chains = await agent.getLiFiChains(['EVM']);
const tools = await agent.getLiFiTools();
// → { bridges: ['across', 'stargate', ...], exchanges: ['1inch', 'paraswap', ...] }

// Gas prices across chains
const gas = await agent.getGasSuggestion(8453); // Base gas
// → { standard: '0.001', fast: '0.002', slow: '0.0005' }

// Connection discovery — what transfer paths exist
const connections = await agent.getLiFiConnections({
  fromChainId: 1,
  toChainId: 8453,
});

// Get multiple route options
const routes = await agent.getBridgeRoutes({
  fromChainId: 1, toChainId: 8453,
  fromToken: '0x0000000000000000000000000000000000000000',
  toToken: '0x0000000000000000000000000000000000000000',
  fromAmount: '0.1', fromAddress: agent.address,
});

// Bias route selection via LI.FI configuration
const fastestRoute = await agent.getBridgeQuote({
  fromChainId: 1,
  toChainId: 8453,
  fromToken: '0x0000000000000000000000000000000000000000',
  toToken: '0x0000000000000000000000000000000000000000',
  fromAmount: '0.1',
  fromAddress: agent.address,
  routeStrategy: 'fastest_route',
});

const lowSlippageRoute = await agent.getBridgeQuote({
  fromChainId: 1,
  toChainId: 8453,
  fromToken: '0x0000000000000000000000000000000000000000',
  toToken: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  fromAmount: '100',
  fromAddress: agent.address,
  routeStrategy: 'minimum_slippage',
  slippage: 0.003,
});

// Available route strategies:
// - recommended
// - minimum_slippage
// - minimum_execution_time
// - fastest_route
// - minimum_completion_time
```

#### DeFi Composer (Zaps)

One-transaction cross-chain DeFi operations. Bridge + deposit into a vault/staking/lending protocol in a single tx.

```typescript
// Bridge ETH from Ethereum → deposit into Morpho vault on Base
// Just set toToken to the vault token address!
const composerResult = await agent.bridgeTokens({
  fromChainId: 1,       // Ethereum
  toChainId: 8453,      // Base
  fromToken: '0x0000000000000000000000000000000000000000', // ETH
  toToken: '0x7BfA7C4f149E7415b73bdeDfe609237e29CBF34A',  // Morpho vault token
  fromAmount: '0.1',
  fromAddress: agent.address,
});

// Supported protocols: Morpho, Aave V3, Euler, Pendle, Lido wstETH,
// EtherFi, Ethena, Maple, Seamless, Felix, HyperLend, and more.
```

### Gas.zip — Destination Gas Funding

Fund gas on a destination chain cheaply via Gas.zip. As of `1.7.0`, Evalanche sources executable Gas.zip routes through LI.FI's live `gasZipBridge` integration so quotes and tx requests stay aligned with current vendor routing.

```typescript
// Send gas from Ethereum to Arbitrum
await agent.fundDestinationGas({
  fromChainId: 1,
  toChainId: 42161,
  toAddress: agent.address,
  destinationGasAmount: '0.01',
});
```

### Network Switching

```typescript
const agent = new Evalanche({ privateKey: '0x...', network: 'ethereum' });

// Switch to Base (returns new instance, same keys)
const baseAgent = agent.switchNetwork('base');
console.log(baseAgent.getChainInfo().name); // "Base"

// List all supported chains
const chains = Evalanche.getSupportedChains();
```

## API Reference

### `Evalanche.boot(options?): Promise<{ agent, keystore, secretsSource }>`

Non-custodial autonomous boot. Generates or loads an encrypted keystore.

| Option | Type | Description |
|--------|------|-------------|
| `network` | `ChainName \| { rpcUrl, chainId }` | Network (default: `'avalanche'`) |
| `identity` | `{ agentId, registry? }` | Optional ERC-8004 identity config |
| `multiVM` | `boolean` | Enable X/P-Chain (Avalanche only) |
| `rpcOverride` | `string` | Override the default RPC URL |
| `keystore.dir` | `string` | Keystore directory (default: `~/.evalanche/keys`) |

### `new Evalanche(config)`

Create an agent with existing keys.

| Option | Type | Description |
|--------|------|-------------|
| `privateKey` | `string` | Hex-encoded private key |
| `mnemonic` | `string` | BIP-39 mnemonic phrase |
| `network` | `ChainName \| { rpcUrl, chainId }` | Any EVM chain (default: `'avalanche'`) |
| `identity` | `{ agentId, registry? }` | Optional ERC-8004 identity config |
| `multiVM` | `boolean` | Enable X/P-Chain (Avalanche only) |
| `rpcOverride` | `string` | Override the default RPC URL |

### Core Methods

| Method | Description |
|--------|-------------|
| `agent.send(intent)` | Send value transfer |
| `agent.call(intent)` | Call contract method |
| `agent.signMessage(message)` | Sign arbitrary message |
| `agent.resolveIdentity()` | Resolve ERC-8004 identity (Avalanche) |
| `agent.payAndFetch(url, options)` | x402 payment-gated HTTP |
| `agent.submitFeedback(feedback)` | Submit reputation feedback |

#### x402 Notes

- `agent.payAndFetch()` now uses fresh challenge-bound proofs. Proofs are single-use and tied to the requested path/body, so clients should always answer the current `402` challenge instead of replaying cached proofs.
- `AgentServiceHost` rejects expired, reused, cross-path, and mismatched-body proofs.

#### Settlement Notes

- Economy settlement now requires a real recipient EVM address. Store it in the proposal via `toAddress` or pass `recipientAddress` when using `settle_payment`.

### Bridge & Cross-Chain (v0.4.0+)

| Method | Description |
|--------|-------------|
| `agent.getBridgeQuote(params)` | Get a bridge quote via Li.Fi |
| `agent.getBridgeRoutes(params)` | Get multiple bridge routes |
| `agent.bridgeTokens(params)` | Bridge tokens (quote + execute) |
| `agent.fundDestinationGas(params)` | Fund gas via Gas.zip |
| `agent.switchNetwork(network)` | Switch to different chain |
| `agent.getChainInfo()` | Get current chain info |
| `Evalanche.getSupportedChains()` | List all supported chains |

### Li.Fi Liquidity SDK (v0.8.0)

| Method | Description |
|--------|-------------|
| `agent.checkBridgeStatus(params)` | Poll cross-chain transfer status (PENDING/DONE/FAILED) |
| `agent.getSwapQuote(params)` | Get same-chain DEX swap quote |
| `agent.swap(params)` | Execute same-chain DEX swap (31+ aggregators) |
| `agent.getTokens(chainIds)` | List tokens with prices on specified chains |
| `agent.getToken(chainId, address)` | Get specific token info (symbol, decimals, price) |
| `agent.getLiFiChains(chainTypes?)` | List all Li.Fi supported chains |
| `agent.getLiFiTools()` | List available bridges and DEX aggregators |
| `agent.getGasPrices()` | Get gas prices across all chains |
| `agent.getGasSuggestion(chainId)` | Get gas price suggestion for a chain |
| `agent.getLiFiConnections(params)` | Discover possible transfer paths between chains |

`BridgeQuoteParams` also supports LI.FI route configuration via `routeStrategy`, `routeOrder`, `preset`, `maxPriceImpact`, `skipSimulation`, `swapStepTimingStrategies`, and `routeTimingStrategies`.

### Avalanche Multi-VM (X-Chain, P-Chain)

Multi-VM support requires a **mnemonic** and only works on Avalanche networks.

```typescript
const agent = new Evalanche({
  mnemonic: process.env.AGENT_MNEMONIC,
  network: 'avalanche',
  multiVM: true,
});

const balances = await agent.getMultiChainBalance();
const result = await agent.transfer({ from: 'C', to: 'P', amount: '25' });
await agent.delegate('NodeID-...', '25', 30);
```

> Avalanche dependencies (`@avalabs/core-wallets-sdk`) are lazy-loaded on first multi-VM call.

### DeFi — Liquid Staking & EIP-4626 Vaults (v1.2.0)

Known DeFi surfaces are now chain-aware:

- known vaults such as yoUSD auto-route to Base through Evalanche's canonical registry
- Avalanche-native protocols such as sAVAX auto-route to Avalanche
- address inputs can be passed as interoperable addresses like `0x...@base`
- Avalanche protocol resolution is enriched by a vendored AvaPilot-backed registry snapshot while local canonical mappings remain authoritative

```typescript
const agent = new Evalanche({ privateKey: '0x...', network: 'avalanche' });
const { staking, vaults } = agent.defi();

// sAVAX — stake AVAX via Benqi
const quote = await staking.sAvaxStakeQuote('10');
// → { shares: '9.87', expectedOutput: '9.87', rate: '1.013', minOutput: '9.77' }

await staking.sAvaxStake('10', 50); // 50bps slippage

// sAVAX — unstake (instant if pool has liquidity, delayed otherwise)
const uq = await staking.sAvaxUnstakeQuote('5');
// → { avaxOut: '5.06', isInstant: true, poolBalance: '12400', minOutput: '5.01' }

await staking.sAvaxUnstakeInstant('5');      // redeemInstant on Benqi
await staking.sAvaxUnstakeDelayed('5');      // requestRedeem (async, no pool needed)

// EIP-4626 vaults — works on any chain
const YOUSD = '0x0000000f2eb9f69274678c76222b35eec7588a65'; // Base

// Interoperable addresses are also accepted by DeFi MCP tools:
// vault_info { vaultAddress: '0x0000000f2eb9f69274678c76222b35eec7588a65@base' }

const baseAgent = new Evalanche({ privateKey: '0x...', network: 'base' });
const { vaults: baseVaults } = baseAgent.defi();

const info = await baseVaults.vaultInfo(YOUSD);
// → { name: 'yoUSD', asset: '0x833589f...', assetDecimals: 6, shareDecimals: 18, totalAssets: '4200000', eip4626: true }

const vq = await baseVaults.depositQuote(YOUSD, '1000');
// → { shares: '998.1', expectedAssets: '1000', assetDecimals: 6, shareDecimals: 18 }

await baseVaults.deposit(YOUSD, '1000'); // approve + deposit in one call
await baseVaults.withdraw(YOUSD, '998.1'); // redeem shares
```

### Unified Holdings (universal registry + scanner)

Evalanche now ships a universal in-repo holdings registry and a one-pass holdings scanner. The scanner combines:

- native balances across supported chains
- seeded ERC-20 balances
- DeFi positions such as ERC-4626 vaults and liquid staking receipts
- Polymarket positions
- perp venue positions on Hyperliquid and dYdX

```typescript
const agent = new Evalanche({ privateKey: '0x...', network: 'base' });

const portfolio = await agent.holdings().scan();

console.log(portfolio.summary);
// → { totalHoldings, byType, byChain, byProtocol }

const filtered = await agent.holdings().scan({
  chains: ['polygon', 'base', 'avalanche', 'hyperliquid'],
  include: ['native', 'token', 'defi', 'prediction', 'perp'],
  protocols: ['polymarket', 'avantis', 'yousd'],
});

console.log(filtered.holdings[0]);
// → {
//   holdingType: 'vault' | 'token' | 'prediction' | 'perp' | ...,
//   protocolId: 'yousd-vault',
//   protocolName: 'yoUSD Vault',
//   chain: 'base',
//   symbol: 'yoUSD',
//   displayBalance: '24.917987',
//   underlyingValue: '26.771162',
//   ...
// }
```

The universal registry is checked into the repo and shared by every agent. It is seeded with local canonical records, a vendored AvaPilot Avalanche snapshot, and DefiLlama import tooling. Runtime holdings truth still comes from live onchain reads and venue APIs.

### Prediction Markets: Polymarket (v1.5.0+)

Polymarket support is exposed in two ways:

- standalone SDK usage through `PolymarketClient`
- agent-native usage through MCP tools such as `pm_search`, `pm_preflight`, `pm_buy`, `pm_sell`, and `pm_reconcile`

```typescript
import { Evalanche, PolymarketClient, PolymarketSide } from 'evalanche';

const agent = new Evalanche({
  privateKey: process.env.AGENT_PRIVATE_KEY,
  network: 'polygon',
});

const pm = new PolymarketClient(agent.wallet, 137);

// Discover markets
const matches = await pm.searchMarkets('election', 5);
const market = await pm.getMarket(matches[0].conditionId);
const yesToken = market?.tokens.find((token) => token.outcome === 'YES');

// Inspect liquidity
const book = await pm.getOrderBook(yesToken!.tokenId);
const estBuyPrice = await pm.estimateFillPrice(yesToken!.tokenId, PolymarketSide.BUY, 25);
const estSellPrice = await pm.estimateFillPrice(yesToken!.tokenId, PolymarketSide.SELL, 25);

// Place a limit buy or sell directly through the SDK
await pm.placeOrder({
  tokenId: yesToken!.tokenId,
  price: 0.47,
  size: 25,
  side: PolymarketSide.BUY,
});

await pm.placeOrder({
  tokenId: yesToken!.tokenId,
  price: 0.58,
  size: 10,
  side: PolymarketSide.SELL,
});

// Market-sell helper: target a USDC proceeds amount using the current best bid
await pm.placeMarketSellOrder({
  conditionId: market!.conditionId,
  outcome: 'YES',
  amountUSDC: 20,
  maxSlippagePct: 1,
});

// Portfolio/account reads
const balances = await pm.getBalances();
const positions = await pm.getPositions();
const trades = await pm.getTradeHistory();
```

Supported Polymarket features today:

- market search and market details
- outcome token discovery
- order book reads and best-bid price lookup
- estimated fill price from current order book depth
- balances, positions, open orders, order lookup, trade history, and order cancellation
- deterministic preflight checks before writes
- venue-first reconciliation via `pm_order` and `pm_reconcile`
- venue-state summaries and mismatch warnings when conditional balances and position snapshots disagree
- direct buy and sell order placement through the SDK
- MCP `pm_buy` for market and limit buys
- MCP `pm_sell` for slippage-protected immediate sells
- MCP `pm_limit_sell` for resting limit sells
- MCP `pm_cancel_order` for explicit order cancellation

Current limitations:

- `pm_redeem` is not implemented yet.
- authenticated trading flows are Polygon-oriented. In practice, agents should hold USDC or outcome tokens on Polygon plus native gas.

### Perpetuals: dYdX + Hyperliquid (v0.7.0+)

```typescript
const agent = new Evalanche({ mnemonic: '...', network: 'avalanche' });

// Check if a market exists across all venues
const match = await agent.findPerpMarket('AKT-USD');
// → { venue: 'dydx', market: { ticker: 'AKT-USD', oraclePrice: '0.39', maxLeverage: 10, ... } }

// Get dYdX client directly
const dydx = await agent.dydx();

// List markets
const markets = await dydx.getMarkets();

// Place a market order
const orderId = await dydx.placeMarketOrder({
  market: 'AKT-USD',
  side: 'BUY',
  size: '100',
});

// Check positions
const positions = await dydx.getPositions();

// Close a position
await dydx.closePosition('AKT-USD');

// Check balance
const balance = await dydx.getBalance(); // USDC equity

// Hyperliquid account and market reads use the agent wallet address
const hyperliquid = await agent.hyperliquid();
const hlMarkets = await hyperliquid.getMarkets();
const hlState = await hyperliquid.getAccountState();
const hlOrders = await hyperliquid.getOpenOrders();
const hlFills = await hyperliquid.getTrades();

await hyperliquid.placeLimitOrder({
  market: 'BTC',
  side: 'BUY',
  size: '0.01',
  price: '95000',
  postOnly: true,
});

await hyperliquid.placeMarketOrder({
  market: 'ETH',
  side: 'SELL',
  size: '0.05',
  reduceOnly: true,
});
```

> **Note:** dYdX requires a mnemonic (not just a private key) because it derives Cosmos keys from BIP-39.
>
> **Hyperliquid note:** Hyperliquid is modeled as the second perp venue. HIP-3 markets are represented as Hyperliquid market metadata (`marketClass: 'hip3'`), not as a separate venue. The adapter now supports account reads, open orders, fills, market orders, limit orders, order cancellation, and reduce-only close flows.

### Platform CLI — Advanced P-Chain Ops (v0.6.0)

For subnet management, L1 validators, and BLS staking, Evalanche wraps [ava-labs/platform-cli](https://github.com/ava-labs/platform-cli) as an optional subprocess.

**Install the CLI:**
```bash
go install github.com/ava-labs/platform-cli@latest
```

**Usage:**
```typescript
const agent = new Evalanche({
  privateKey: process.env.AGENT_PRIVATE_KEY,
  network: 'avalanche',
});

// Get the platform CLI (auto-detects binary)
const cli = await agent.platformCLI();

// Check availability
const available = await cli.isAvailable(); // true if binary found

// Create a subnet
const subnet = await cli.createSubnet();

// Add a validator with BLS keys
await cli.addValidator({
  nodeId: 'NodeID-...',
  stakeAvax: 2000,
  blsPublicKey: '0x...',
  blsPop: '0x...',
});

// Convert subnet to L1
await cli.convertSubnetToL1({
  subnetId: subnet.subnetId,
  chainId: 'chain-id',
  validators: 'https://node1:9650,https://node2:9650',
});

// Get node info (NodeID + BLS keys)
const info = await cli.getNodeInfo('127.0.0.1:9650');
```

> The platform-cli binary is optional. All existing P-Chain functionality via AvalancheJS continues to work without it. The CLI adds subnet/L1/BLS capabilities that AvalancheJS doesn't support.

## ERC-8004 Integration

On-chain agent identity on Avalanche C-Chain. Requires `identity` config:

- Resolve agent `tokenURI` and metadata
- Query reputation scores (0-100)
- Trust levels: **high** (>=75), **medium** (>=40), **low** (<40)

> **Note:** ERC-8004 identity features only work on Avalanche C-Chain (chain ID 43114).

### Interop — Full ERC-8004 Identity Resolution (v1.1.0)

Resolve full agent registration files from on-chain `agentURI`, discover service endpoints, verify domain bindings, and reverse-resolve agents from wallet addresses.

```typescript
const agent = new Evalanche({ privateKey: '0x...', network: 'avalanche' });

// Resolve full agent registration (services, wallet, trust modes)
const resolver = agent.interop();
const registration = await resolver.resolveAgent(1599);
// → { name, description, agentWallet, services: [...], active, x402Support, supportedTrust }

// Get all service endpoints
const services = await resolver.getServiceEndpoints(1599);
// → [{ name: 'A2A', endpoint: 'https://...' }, { name: 'MCP', endpoint: '...' }]

// Get preferred transport (A2A > XMTP > MCP > web)
const preferred = await resolver.getPreferredTransport(1599);
// → { transport: 'A2A', endpoint: 'https://agent.example.com/a2a' }

// Get agent payment wallet
const wallet = await resolver.resolveAgentWallet(1599);

// Verify endpoint domain binding
const verification = await resolver.verifyEndpointBinding(1599, 'https://agent.example.com/api');
// → { verified: true }

// Reverse resolve: find agent ID from wallet address
const agentId = await resolver.resolveByWallet('0x...');
```

Supports `ipfs://`, `https://`, and `data:` URI schemes for agent registration files.

## MCP Server

Evalanche includes an MCP server for AI agent frameworks.

### Setup

```bash
# Stdio mode (Claude Desktop, Cursor, etc.)
AGENT_PRIVATE_KEY=0x... evalanche-mcp

# HTTP mode
AGENT_PRIVATE_KEY=0x... evalanche-mcp --http --port 3402
```

### Claude Desktop config

```json
{
  "mcpServers": {
    "evalanche": {
      "command": "npx",
      "args": ["evalanche-mcp"],
      "env": {
        "AGENT_PRIVATE_KEY": "0x...",
        "AVALANCHE_NETWORK": "base"
      }
    }
  }
}
```

### MCP Tools

| Tool | Description |
|------|-------------|
| `get_address` | Get agent wallet address |
| `get_balance` | Get native token balance |
| `get_holdings` | Unified wallet holdings scan across tokens, DeFi, predictions, and perps |
| `search_registry` | Search the universal in-repo holdings registry |
| `registry_status` | Get universal registry counts and detector coverage |
| `send_avax` | Send native tokens |
| `call_contract` | Call a contract method |
| `sign_message` | Sign a message |
| `resolve_identity` | Resolve ERC-8004 identity |
| `resolve_agent` | Look up any agent by ID |
| `pay_and_fetch` | x402 payment-gated HTTP |
| `submit_feedback` | Submit reputation feedback |
| `get_network` | Get current network config |
| `get_supported_chains` | List all supported chains |
| `get_chain_info` | Get chain details |
| `get_bridge_quote` | Get bridge quote |
| `get_bridge_routes` | Get all bridge routes |
| `bridge_tokens` | Bridge tokens cross-chain |
| `fund_destination_gas` | Fund gas via Gas.zip |
| `switch_network` | Switch EVM network |
| `platform_cli_available` | Check if platform-cli is installed |
| `subnet_create` | Create a new subnet |
| `subnet_convert_l1` | Convert subnet to L1 blockchain |
| `subnet_transfer_ownership` | Transfer subnet ownership |
| `add_validator` | Add validator with BLS keys |
| `l1_register_validator` | Register L1 validator |
| `l1_add_balance` | Add L1 validator balance |
| `l1_disable_validator` | Disable L1 validator |
| `node_info` | Get NodeID + BLS from running node |
| `pchain_send` | Send AVAX on P-Chain |
| `arena_buy` | Buy Arena community tokens |
| `arena_sell` | Sell Arena community tokens |
| `arena_token_info` | Get Arena token info |
| `arena_buy_cost` | Calculate Arena buy cost |
| `pm_search` | Search active Polymarket markets |
| `pm_market` | Get a Polymarket market by condition ID |
| `pm_positions` | Get Polymarket positions for a wallet |
| `pm_orderbook` | Get the order book for an outcome token |
| `pm_balances` | Get venue collateral and token balances |
| `pm_order` | Reconcile a Polymarket order against venue truth |
| `pm_cancel_order` | Cancel an open Polymarket order |
| `pm_open_orders` | List open Polymarket orders |
| `pm_trades` | List Polymarket venue trades |
| `pm_approve` | Approve Polymarket collateral spending on Polygon |
| `pm_preflight` | Run deterministic Polymarket execution preflight |
| `pm_buy` | Buy YES/NO shares with market or limit orders |
| `pm_sell` | Market-sell YES/NO shares toward a target USDC proceeds amount |
| `pm_limit_sell` | Post a resting Polymarket limit sell |
| `pm_reconcile` | Reconcile Polymarket positions/orders/trades |
| `pm_redeem` | Reserved for winning-share redemption; not implemented yet |
| `approve_and_call` | Approve ERC-20 and execute follow-up contract call |
| `upgrade_proxy` | Execute UUPS `upgradeToAndCall` proxy upgrade |
| `dydx_get_markets` | List dYdX perpetual markets |
| `dydx_has_market` | Check if perp market exists |
| `dydx_get_balance` | Get dYdX USDC balance |
| `dydx_get_positions` | Get open perp positions |
| `dydx_place_market_order` | Place dYdX market order |
| `dydx_place_limit_order` | Place dYdX limit order |
| `dydx_cancel_order` | Cancel dYdX order |
| `dydx_close_position` | Close perp position |
| `dydx_get_orders` | List dYdX orders |
| `hyperliquid_get_markets` | List Hyperliquid perp markets |
| `hyperliquid_get_account_state` | Get Hyperliquid account summary |
| `hyperliquid_get_positions` | Get open Hyperliquid positions |
| `hyperliquid_place_market_order` | Place Hyperliquid market order |
| `hyperliquid_place_limit_order` | Place Hyperliquid limit order |
| `hyperliquid_cancel_order` | Cancel Hyperliquid order |
| `hyperliquid_close_position` | Close Hyperliquid position |
| `hyperliquid_get_order` | Get Hyperliquid order status |
| `hyperliquid_get_orders` | List Hyperliquid open orders |
| `hyperliquid_get_trades` | List Hyperliquid fills |
| `find_perp_market` | Search perp markets across venues |
| `check_bridge_status` | Poll cross-chain transfer status |
| `lifi_swap_quote` | Get same-chain DEX swap quote |
| `lifi_swap` | Execute same-chain DEX swap |
| `lifi_get_tokens` | List tokens on specified chains |
| `lifi_get_token` | Get token info (symbol, price, decimals) |
| `lifi_get_chains` | List all Li.Fi supported chains |
| `lifi_get_tools` | List available bridges and DEXs |
| `lifi_gas_prices` | Get gas prices across all chains |
| `lifi_gas_suggestion` | Get gas suggestion for a chain |
| `lifi_get_connections` | Discover transfer paths between chains |
| `lifi_compose` | Cross-chain DeFi Composer (bridge + vault/stake/lend) |
| `resolve_agent_registration` | Resolve full ERC-8004 agent registration file |
| `get_agent_services` | List service endpoints for an agent |
| `get_agent_wallet` | Get agent payment wallet address |
| `verify_agent_endpoint` | Verify endpoint domain binding |
| `resolve_by_wallet` | Find agent ID from wallet address |
| `savax_stake_quote` | Get sAVAX quote for AVAX amount |
| `savax_stake` | Stake AVAX → sAVAX on Benqi |
| `savax_unstake_quote` | Get AVAX quote + instant pool check for sAVAX |
| `savax_unstake` | Unstake sAVAX → AVAX (instant or delayed) |
| `vault_info` | Get EIP-4626 vault metadata |
| `vault_deposit_quote` | Preview deposit shares |
| `vault_deposit` | Approve + deposit into EIP-4626 vault |
| `vault_withdraw_quote` | Preview redeem shares |
| `vault_withdraw` | Redeem shares from vault |

`lifi_swap_quote`, `lifi_swap`, and `lifi_compose` also accept `routeStrategy`, `routeOrder`, `preset`, `maxPriceImpact`, and `skipSimulation`.

Execution-oriented tools (`pm_*`, `hyperliquid_*`, `lifi_swap`, `lifi_compose`) return stable envelopes with `request`, `submission`, `verification`, and `warnings`.

DeFi MCP tools also accept an optional `network` override. For known protocols, Evalanche validates the requested chain against the canonical chain before issuing contract reads or writes.

For live operator validation, use the runbook in [docs/live-smoke-checklist.md](/Users/jaack/Desktop/Github/evalanche/docs/live-smoke-checklist.md).

### Environment Variables

| Variable | Description |
|----------|-------------|
| `AGENT_PRIVATE_KEY` | Agent wallet private key |
| `AGENT_MNEMONIC` | BIP-39 mnemonic (alternative) |
| `AGENT_KEYSTORE_DIR` | Keystore directory for `boot()` mode |
| `AGENT_ID` | ERC-8004 agent ID |
| `AVALANCHE_NETWORK` | Network alias (e.g. `base`, `ethereum`, `avalanche`) |
| `AVALANCHE_RPC_URL` | Custom RPC URL override |

## Architecture

```
┌──────────────────────────────────────────────────┐
│                   Evalanche                       │
│                                                  │
│  ┌──────────┐ ┌──────────┐ ┌────────────┐       │
│  │ Keystore │ │ Identity │ │ Reputation │       │
│  │(AES+scry)│ │ Resolver │ │  Reporter  │       │
│  └────┬─────┘ └────┬─────┘ └─────┬──────┘       │
│       │             │             │               │
│  ┌────┴─────┐ ┌────┴─────┐       │               │
│  │  Wallet  │ │ ERC-8004 │       │               │
│  │  Signer  │ │ Registry │       │               │
│  └────┬─────┘ └──────────┘       │               │
│       │                           │               │
│  ┌────┴─────┐ ┌──────────────────┴─────────────┐│
│  │   Tx     │ │     x402 Client                ││
│  │ Builder  │ │ (Pay-gated HTTP + Facilitator) ││
│  └────┬─────┘ └────────────────────────────────┘│
│       │                                          │
│  ┌────┴──────────────────────────────────────┐  │
│  │  Bridge Client (Li.Fi + Gas.zip)          │  │
│  │  Cross-chain swaps & gas funding          │  │
│  └────┬──────────────────────────────────────┘  │
│       │                                          │
│  ┌────┴──────────────────────────────────────┐  │
│  │  Chain Registry (21+ EVM chains)          │  │
│  │  Routescan RPCs │ Public fallbacks        │  │
│  └────┬──────────────────────────────────────┘  │
│       │                                          │
│  ┌────┴──────────────────────────────────────┐  │
│  │  EVM (ethers v6) │ X-Chain │ P-Chain      │  │
│  │  Any EVM chain   │ Avalanche-only         │  │
│  └────┬──────────────────────────────────────┘  │
│       │                                          │
│  ┌────┴──────────────────────────────────────┐  │
│  │  Platform CLI (optional subprocess)       │  │
│  │  Subnets │ L1 Validators │ BLS Staking    │  │
│  └───────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
```

## Roadmap

### v0.1.0
- C-Chain wallet, ERC-8004 identity, x402 payments, MCP server

### v0.2.0
- Multi-VM: X-Chain, P-Chain, cross-chain transfers, staking

### v0.3.0
- Non-custodial keystore, `Evalanche.boot()`, OpenClaw secrets

### v0.4.0
- Multi-EVM support (21+ chains: Ethereum, Base, Arbitrum, Optimism, Polygon, BSC, etc.)
- Routescan RPCs as preferred provider
- Li.Fi cross-chain bridging
- Gas.zip destination gas funding
- Network switching
- 17 MCP tools (7 new)

### v0.5.0
- Arena DEX swap module (buy/sell community tokens via bonding curve)
- 4 new MCP tools (arena_buy, arena_sell, arena_token_info, arena_buy_cost)

### v0.6.0
- Platform CLI integration (wraps ava-labs/platform-cli as optional subprocess)
- Subnet management (create, transfer ownership, convert to L1)
- L1 validator operations (register, set-weight, add-balance, disable)
- Enhanced staking with BLS keys + node endpoint auto-discovery
- P-Chain direct send, chain creation, node info
- 10 new MCP tools (27 total)

### v0.7.0
- **dYdX v4 perpetual futures** — trade 100+ perp markets via Cosmos-based dYdX chain
- `DydxClient` wrapping `@dydxprotocol/v4-client-js` (wallet derived from same mnemonic)
- `PerpVenue` interface — extensible for adding Hyperliquid, Vertex, etc.
- Market/limit orders, positions, balance, deposit/withdraw
- `findPerpMarket(ticker)` — search across all connected perp venues
- 10 new MCP tools (37 total), 164 tests

### v0.8.0
- **Full Li.Fi cross-chain liquidity SDK** — expanded from bridge-only to complete integration
- Same-chain DEX swaps via Li.Fi (31+ DEX aggregators on any chain)
- Transfer status tracking (poll PENDING/DONE/FAILED after bridge tx)
- Token discovery (list/lookup tokens with prices across all chains)
- Chain discovery (all Li.Fi supported chains)
- Bridge/DEX tool listing (available bridges and exchanges)
- Gas prices and suggestions per chain
- Connection discovery (possible transfer paths between chains)
- **DeFi Composer/Zaps** — one-tx cross-chain DeFi (bridge + deposit into Morpho/Aave V3/Euler/Pendle/Lido/EtherFi/etc.)
- 11 new MCP tools (52 total), 180 tests

### v0.9.0
- Contract interaction helpers: `approveAndCall()` and `upgradeProxy()`
- New MCP tools: `approve_and_call`, `upgrade_proxy`
- Gap 1 and Gap 2 marked resolved in `GAPS.md`
- 2 new MCP tools (54 total)

### v1.0.0
- **Agent Economy Layer** — spending policies, discovery, negotiation, settlement, escrow, persistent memory
- 15 new MCP tools (69 total), 325 tests

### v1.1.0
- **ERC-8004 full identity resolution** — interop layer Phase 7
- `InteropIdentityResolver`: resolve agent registration files from on-chain `agentURI`
- Service endpoint discovery, preferred transport selection (A2A > XMTP > MCP > web)
- Agent wallet resolution (on-chain metadata + registration file fallback)
- Endpoint domain verification via `.well-known/agent-registration.json`
- Reverse resolution: find agent ID from wallet address
- Supports `ipfs://`, `https://`, `data:` URI schemes
- 5 new MCP tools (74 total), 372 tests

### v1.2.0
- **DeFi module** — liquid staking and EIP-4626 vault operations
- `LiquidStakingClient`: sAVAX stake/unstake (instant + delayed), quotes, pool balance checks
- `VaultClient`: generic EIP-4626 deposit/withdraw/quote for any vault on any chain
- `agent.defi()` lazy accessor returning `{ staking, vaults }`
- Known vault: yoUSD vault on Base (`0x0000000f2eb9f69274678c76222b35eec7588a65`, ~17.73% APY)
- 9 new MCP tools (83 total), 395 tests

### v1.3.x
- Release hardening for exports and typings
- YieldYak export fixes
- package/release stability cleanup for downstream consumers

### v1.4.x
- **CoinGecko market intelligence**
- price lookups, rankings, trending assets, historical data, search
- `cg_*` MCP tools added for agent-native market research flows

### v1.5.0
- **Polymarket CLOB integration**
- market search, market details, order book access, balance and position discovery
- expanded Evalanche into prediction market workflows alongside DeFi + perps

### v1.8.8 (current)
- **Universal holdings + live verification**
- unified holdings scanning now combines native balances, seeded ERC-20s, DeFi positions, Polymarket positions, and perp venue positions behind `agent.holdings().scan()` and the MCP `get_holdings` tool
- the in-repo universal registry now seeds both DeFi routing and holdings discovery, with local canonical records taking precedence over AvaPilot and DefiLlama-enriched metadata
- npm-facing documentation now reflects the current package surface instead of the older DeFi-routing-only model

### v1.8.6
- **Report-closure remediation**
- DeFi MCP tools now resolve known protocols to canonical chains, support interoperable address inputs, and fail clearly on explicit wrong-chain requests
- Avalanche dapp resolution is enriched by a vendored AvaPilot-backed registry provider without introducing runtime GitHub/network dependency
- Polymarket sell and reconciliation flows now surface venue-state summaries and mismatch warnings directly in execution envelopes
- Hyperliquid and LI.FI MCP execution flows now return stronger verification payloads for operator recertification
- the live smoke checklist now doubles as a report-closure matrix for regression coverage and manual validation

### v1.8.0
- **Execution certification**
- Hyperliquid now has a real trade surface in both the SDK and MCP: market orders, limit orders, cancel, close, orders, and fills
- LI.FI execution paths now return structured submission and verification envelopes, including tx hashes, receipt status, transfer status, and best-effort balance deltas
- EIP-4626 vault reads/quotes now distinguish asset decimals from share decimals, and quote/info failures surface as typed integration errors
- a live smoke runbook now covers Polymarket, Hyperliquid, LI.FI, and vault flows for release certification

### v1.7.9
- **Polymarket buy unit normalization**
- Polymarket collateral balances/allowances are now normalized from raw 6-decimal USDC units before preflight compares them to human `amountUSDC`
- `pm_preflight` and `pm_buy` now correctly reject microUSDC-funded wallets before attempting a venue order instead of claiming the wallet is funded
- `pm_balances` preserves raw collateral fields alongside normalized display values for debugging and operator verification

### v1.7.8
- **Polymarket reliability and reconciliation**
- added deterministic `pm_preflight` checks for buy/sell/limit-sell flows, including market resolution, visible liquidity, allowance, and balance checks
- added venue-first inspection/reconciliation tools: `pm_balances`, `pm_order`, `pm_open_orders`, `pm_trades`, and `pm_reconcile`
- `pm_market`, `pm_orderbook`, `pm_positions`, `pm_buy`, `pm_sell`, and `pm_limit_sell` now return structured envelopes instead of ad hoc responses, which makes downstream agent execution easier to verify

### v1.7.7
- **Polymarket sell hardening**
- `pm_sell` now uses a slippage-protected immediate sell path instead of an unbounded market sell
- Polymarket CLOB auth fallback now uses fresh nonces per attempt, which makes API-key derive/create recovery more reliable
- `pm_limit_sell` now honors `postOnly: false` instead of always forcing a resting order

### v1.7.6
- **Polymarket execution and docs pass**
- Polymarket now prefers live CLOB market discovery with Gamma fallback for broader search coverage
- Polymarket supports direct SDK sell orders plus MCP `pm_sell` market sells toward a target USDC proceeds amount
- the README now documents the standalone Polymarket SDK flow, MCP tool surface, and current limitations such as `pm_redeem`

### v1.7.5
- **Perps + routing + roadmap consolidation**
- Li.Fi routes now support explicit route strategy selection, including minimum slippage, minimum execution-time bias, and fastest-route selection
- perpetuals were refactored around a venue-neutral model with Hyperliquid added as a first-class venue and HIP-3 represented as Hyperliquid market metadata
- the roadmap was consolidated into a single active `ROADMAP.md`

### v1.7.2
- **Release pipeline validation**
- follows `1.7.1` with the ClawHub publish slug fixed in CI
- intended to validate the full tag-driven release flow end-to-end, including skill publication

### v1.7.1
- **Release automation**
- version-tag pushes now drive the release flow end-to-end
- GitHub Actions creates the GitHub Release from `RELEASE_NOTES_X.Y.Z.md`
- npm publish remains trusted-publishing based, and ClawHub skill publication is now part of the same pipeline
- `RELEASING.md` documents the required human steps and expected outcomes

### v1.7.0
- **Security + runtime hardening release**
- x402 proofs are now single-use, challenge-bound, and request/body aware instead of replayable signed blobs
- settlement requires an explicit recipient address and MCP network switching now rebinds provider/wallet-dependent helpers correctly
- `safeFetch` now enforces body-size limits on streamed responses instead of trusting `content-length`
- Gas.zip funding now rides LI.FI's live `gasZipBridge` route surface and LI.FI gas suggestion handling was updated to the current endpoint/response shape
- dYdX runtime loading/build packaging was hardened and verified live from `dist`
- 434 tests passing

### v1.6.0
- **Sovereign Polymarket execution**
- `pm_approve` and `pm_buy` now work through the local sovereign wallet path
- Polymarket API-key handling hardened for wallets with existing credentials
- large coverage expansion across Avalanche provider/cross-chain, utils, transaction builder, YieldYak, reputation, x402 facilitator, and secrets
- 433 tests passing

### v1.5.2
- **RPC + Polymarket reliability pass**
- fixed custom RPC chain ID mapping across supported EVM aliases
- fixed Polymarket client construction to use Polygon chain ID explicitly
- fixed MCP handler wiring for search, order book lookup, and positions
- unsupported `pm_approve` / `pm_buy` / `pm_redeem` now fail honestly instead of pretending to work
- added dYdX market reference exports, including `ZEC-USD`, for faster perp workflow integration
- README / website / skill surface synced for the 1.5.2 release

### v2.0 (planned)
- A2A protocol support (Agent Cards, task lifecycle)
- XMTP transport layer (wallet-bound async messaging)
- Signed service manifests and canonical receipts

## License

MIT
