import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: false,
    target: 'node18',
    // Keep Avalanche deps external — they're lazy-loaded at runtime
    external: ['@avalabs/core-wallets-sdk', '@avalabs/avalanchejs', '@dydxprotocol/v4-client-js'],
  },
  {
    entry: ['src/mcp/cli.ts'],
    format: ['esm'],
    dts: false,
    splitting: false,
    sourcemap: false,
    clean: false,
    target: 'node18',
    banner: { js: '#!/usr/bin/env node' },
    outDir: 'dist/mcp',
    // Don't bundle Avalanche-related deps — require them at runtime from node_modules
    // This avoids Ledger SDK bundling issues while keeping the file small
    external: [
      '@avalabs/core-wallets-sdk',
      '@avalabs/avalanchejs',
      '@avalabs/core-chains-sdk',
      '@avalabs/glacier-sdk',
      '@avalabs/hw-app-avalanche',
      '@dydxprotocol/v4-client-js',
      '@ledgerhq/hw-transport',
      '@ledgerhq/hw-app-eth',
      '@ledgerhq/errors',
      '@metamask/eth-sig-util',
      'ledger-bitcoin',
    ],
  },
]);
