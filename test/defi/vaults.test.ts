import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EvalancheErrorCode } from '../../src/utils/errors';

const USDC_ASSET = '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E';

let vaultContractMock: ReturnType<typeof makeVaultContractMock>;
let assetContractMock: ReturnType<typeof makeAssetContractMock>;

vi.mock('ethers', async (importOriginal) => {
  const actual = await importOriginal<typeof import('ethers')>();
  class MockContract {
    constructor(address: string) {
      return address.toLowerCase() === USDC_ASSET.toLowerCase()
        ? assetContractMock ?? makeAssetContractMock()
        : vaultContractMock ?? makeVaultContractMock();
    }
  }
  return {
    ...actual,
    Contract: MockContract,
  };
});

import { MaxUint256, parseUnits, formatUnits } from 'ethers';
import { VaultClient, YOUSD_VAULT } from '../../src/defi/vaults';

function makeMockSigner() {
  return {
    address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    provider: { _isProvider: true },
  } as unknown as ConstructorParameters<typeof VaultClient>[0];
}

const ASSET_DECIMALS = 6;
const SHARE_DECIMALS = 18;
const DEPOSIT_AMOUNT = parseUnits('1000', ASSET_DECIMALS);
const EXPECTED_SHARES = parseUnits('990', SHARE_DECIMALS);
const EXPECTED_ASSETS = parseUnits('1010', ASSET_DECIMALS);
const TOTAL_ASSETS = parseUnits('5000000', ASSET_DECIMALS);

function makeVaultContractMock(overrides: Record<string, unknown> = {}) {
  return {
    name: vi.fn().mockResolvedValue('yoUSD Vault'),
    asset: vi.fn().mockResolvedValue(USDC_ASSET),
    totalAssets: vi.fn().mockResolvedValue(TOTAL_ASSETS),
    decimals: vi.fn().mockResolvedValue(SHARE_DECIMALS),
    previewDeposit: vi.fn().mockResolvedValue(EXPECTED_SHARES),
    previewRedeem: vi.fn().mockResolvedValue(EXPECTED_ASSETS),
    balanceOf: vi.fn().mockResolvedValue(parseUnits('500', SHARE_DECIMALS)),
    deposit: vi.fn().mockResolvedValue({
      hash: '0xdeposit123',
      wait: vi.fn().mockResolvedValue({ status: 1 }),
    }),
    redeem: vi.fn().mockResolvedValue({
      hash: '0xredeem456',
      wait: vi.fn().mockResolvedValue({ status: 1 }),
    }),
    ...overrides,
  };
}

function makeAssetContractMock(overrides: Record<string, unknown> = {}) {
  return {
    allowance: vi.fn().mockResolvedValue(MaxUint256),
    approve: vi.fn().mockResolvedValue({
      hash: '0xapprove',
      wait: vi.fn().mockResolvedValue({}),
    }),
    symbol: vi.fn().mockResolvedValue('USDC'),
    decimals: vi.fn().mockResolvedValue(ASSET_DECIMALS),
    ...overrides,
  };
}

describe('VaultClient — constants', () => {
  it('YOUSD_VAULT is the correct Base address', () => {
    expect(YOUSD_VAULT.toLowerCase()).toBe(
      '0x0000000f2eb9f69274678c76222b35eec7588a65',
    );
  });
});

describe('VaultClient', () => {
  beforeEach(() => {
    vaultContractMock = makeVaultContractMock();
    assetContractMock = makeAssetContractMock();
  });

  it('returns vault metadata with separate asset/share decimals', async () => {
    const client = new VaultClient(makeMockSigner(), 'base');
    const info = await client.vaultInfo(YOUSD_VAULT);

    expect(info.name).toBe('yoUSD Vault');
    expect(info.asset).toBe(USDC_ASSET);
    expect(info.assetSymbol).toBe('USDC');
    expect(info.assetDecimals).toBe(ASSET_DECIMALS);
    expect(info.shareDecimals).toBe(SHARE_DECIMALS);
    expect(info.totalAssets).toBe(formatUnits(TOTAL_ASSETS, ASSET_DECIMALS));
  });

  it('returns expected shares using asset decimals, not share decimals', async () => {
    const client = new VaultClient(makeMockSigner(), 'base');
    const quote = await client.depositQuote(YOUSD_VAULT, '1000');

    expect(vaultContractMock.previewDeposit).toHaveBeenCalledWith(DEPOSIT_AMOUNT);
    expect(quote.shares).toBe(formatUnits(EXPECTED_SHARES, SHARE_DECIMALS));
    expect(quote.assetDecimals).toBe(ASSET_DECIMALS);
    expect(quote.shareDecimals).toBe(SHARE_DECIMALS);
  });

  it('supports explicit asset decimal overrides for deposit quote', async () => {
    const client = new VaultClient(makeMockSigner(), 'base');
    await client.depositQuote(YOUSD_VAULT, '1', 18);

    expect(vaultContractMock.previewDeposit).toHaveBeenCalledWith(parseUnits('1', 18));
  });

  it('deposits using asset decimals and returns a transaction result', async () => {
    const client = new VaultClient(makeMockSigner(), 'base');
    const result = await client.deposit(YOUSD_VAULT, '1000');

    expect(assetContractMock.allowance).toHaveBeenCalled();
    expect(vaultContractMock.deposit).toHaveBeenCalledWith(DEPOSIT_AMOUNT, makeMockSigner().address);
    expect(result.hash).toBe('0xdeposit123');
  });

  it('returns expected assets using asset decimals on withdraw quote', async () => {
    const client = new VaultClient(makeMockSigner(), 'base');
    const quote = await client.withdrawQuote(YOUSD_VAULT, '990');

    expect(vaultContractMock.previewRedeem).toHaveBeenCalledWith(parseUnits('990', SHARE_DECIMALS));
    expect(quote.expectedAssets).toBe(formatUnits(EXPECTED_ASSETS, ASSET_DECIMALS));
  });

  it('redeems shares using share decimals and returns transaction result', async () => {
    const client = new VaultClient(makeMockSigner(), 'base');
    const result = await client.withdraw(YOUSD_VAULT, '990');

    expect(vaultContractMock.redeem).toHaveBeenCalledWith(
      parseUnits('990', SHARE_DECIMALS),
      makeMockSigner().address,
      makeMockSigner().address,
    );
    expect(result.hash).toBe('0xredeem456');
  });

  it('wraps unsupported vault metadata reads in VAULT_ERROR', async () => {
    vaultContractMock = makeVaultContractMock({
      asset: vi.fn().mockRejectedValue(new Error('execution reverted')),
    });

    const client = new VaultClient(makeMockSigner(), 'base');
    await expect(client.vaultInfo(YOUSD_VAULT)).rejects.toMatchObject({
      code: EvalancheErrorCode.VAULT_ERROR,
    });
  });

  it('wraps reverted quotes in VAULT_ERROR', async () => {
    vaultContractMock = makeVaultContractMock({
      previewRedeem: vi.fn().mockRejectedValue(new Error('CALL_EXCEPTION')),
    });

    const client = new VaultClient(makeMockSigner(), 'base');
    await expect(client.withdrawQuote(YOUSD_VAULT, '990')).rejects.toMatchObject({
      code: EvalancheErrorCode.VAULT_ERROR,
    });
  });
});
