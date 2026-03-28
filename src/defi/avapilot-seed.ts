/**
 * Vendored snapshot of Avalanche service contracts seeded by AvaPilot.
 *
 * Source: https://github.com/avapilot/avapilot/blob/main/avapilot/registry/seed.py
 * This file is intentionally static so runtime dapp resolution remains offline-safe.
 */

export interface AvaPilotSeedServiceContract {
  address: string;
  label: string;
}

export interface AvaPilotSeedService {
  name: string;
  contracts: AvaPilotSeedServiceContract[];
  description?: string;
  category?: string;
  website?: string;
  aliases?: string[];
}

export const AVAPILOT_SEED_SERVICES: AvaPilotSeedService[] = [
  {
    name: 'Trader Joe',
    aliases: ['trader-joe', 'traderjoe', 'joe'],
    contracts: [
      { address: '0x60aE616a2155Ee3d9A68541Ba4544862310933d4', label: 'router-v1' },
      { address: '0x9Ad6C38BE94206cA50bb0d90783181834C915012', label: 'factory-v1' },
      { address: '0xb4315e873dBcf96Ffd0acd8EA43f689D8c20fB30', label: 'router-v2' },
    ],
    description: 'The leading DEX on Avalanche.',
    category: 'DeFi',
    website: 'https://traderjoexyz.com',
  },
  {
    name: 'Benqi Lending',
    aliases: ['benqi-lending', 'benqi'],
    contracts: [
      { address: '0x486Af39519B4Dc9a7fCcd318217352830D8B1cf8', label: 'comptroller' },
      { address: '0x5C0401e81Bc07Ca70fAD469b451682c0d747Ef1c', label: 'qiAVAX' },
      { address: '0xBEb5d47A3f720Ec0a390d04b4d41ED7d9688bC7F', label: 'qiUSDC' },
    ],
    description: 'Lend, borrow, and earn interest on Avalanche.',
    category: 'DeFi',
    website: 'https://benqi.fi',
  },
  {
    name: 'sAVAX',
    aliases: ['savax', 'benqi-savax'],
    contracts: [
      { address: '0x2b2C81e08f1Af8835a78Bb2A90AE924ACE0eA4bE', label: 'token' },
    ],
    description: 'Benqi liquid staking token.',
    category: 'DeFi',
    website: 'https://benqi.fi',
  },
  {
    name: 'Yield Yak',
    aliases: ['yieldyak', 'yield-yak'],
    contracts: [
      { address: '0xC73DF1e68FC203F6E4b6270240D6f82A850e8D38', label: 'router' },
    ],
    description: 'Yield optimizer and DEX aggregator.',
    category: 'DeFi',
    website: 'https://yieldyak.com',
  },
  {
    name: 'Stargate',
    aliases: ['stargate-finance', 'layerzero-stargate'],
    contracts: [
      { address: '0x1205f31718499dBf1fCa446663B532Ef87481fe1', label: 'usdc-pool' },
      { address: '0x45A01E4e04F14f7A4a6702c74187c5F6222033cd', label: 'router' },
    ],
    description: 'Cross-chain bridge on Avalanche.',
    category: 'DeFi',
    website: 'https://stargate.finance',
  },
  {
    name: 'WAVAX',
    aliases: ['wrapped-avax'],
    contracts: [
      { address: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7', label: 'token' },
    ],
    description: 'Wrapped AVAX.',
    category: 'Token',
  },
  {
    name: 'USDC',
    aliases: ['circle-usdc'],
    contracts: [
      { address: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', label: 'token' },
    ],
    description: "Circle's native USDC stablecoin on Avalanche.",
    category: 'Token',
  },
];
