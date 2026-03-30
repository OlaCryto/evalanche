/**
 * Minimal ERC-4626 vault client with explicit asset/share decimal handling.
 */

import { Contract, MaxUint256, formatUnits, parseUnits } from 'ethers';
import type { AgentSigner } from '../wallet/signer';
import type { TransactionResult } from '../wallet/types';
import { EvalancheError, EvalancheErrorCode } from '../utils/errors';
import type { VaultInfo, VaultQuote } from './types';

export const YOUSD_VAULT = '0x0000000F2Eb9f69274678c76222B35eEC7588A65';

const ERC4626_ABI = [
  'function name() view returns (string)',
  'function asset() view returns (address)',
  'function totalAssets() view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function previewDeposit(uint256 assets) view returns (uint256)',
  'function previewRedeem(uint256 shares) view returns (uint256)',
  'function deposit(uint256 assets, address receiver) returns (uint256)',
  'function redeem(uint256 shares, address receiver, address owner) returns (uint256)',
  'function balanceOf(address owner) view returns (uint256)',
] as const;

const ERC20_ABI = [
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
] as const;

interface VaultMetadata {
  name: string;
  asset: string;
  assetSymbol?: string;
  assetDecimals: number;
  shareDecimals: number;
  totalAssets: bigint;
}

export class VaultClient {
  constructor(
    private readonly signer: AgentSigner,
    private readonly chain = 'avalanche',
  ) {}

  private vault(vaultAddress: string): Contract {
    return new Contract(vaultAddress, ERC4626_ABI, this.signer);
  }

  private vaultRead(vaultAddress: string): Contract {
    return new Contract(vaultAddress, ERC4626_ABI, this.signer.provider!);
  }

  private erc20(tokenAddress: string): Contract {
    return new Contract(tokenAddress, ERC20_ABI, this.signer);
  }

  private erc20Read(tokenAddress: string): Contract {
    return new Contract(tokenAddress, ERC20_ABI, this.signer.provider!);
  }

  private async ensureVaultDeployed(vaultAddress: string): Promise<void> {
    const code = await this.signer.provider?.getCode(vaultAddress);
    if (!code || code === '0x') {
      throw new EvalancheError(
        `No vault is deployed at ${vaultAddress} on ${this.chain}; it may exist on a different chain.`,
        EvalancheErrorCode.CONTRACT_NOT_DEPLOYED,
      );
    }
  }

  async vaultInfo(vaultAddress: string): Promise<VaultInfo> {
    try {
      const metadata = await this.loadMetadata(vaultAddress);

      return {
        address: vaultAddress,
        chain: this.chain,
        name: metadata.name,
        asset: metadata.asset,
        assetSymbol: metadata.assetSymbol,
        assetDecimals: metadata.assetDecimals,
        shareDecimals: metadata.shareDecimals,
        totalAssets: formatUnits(metadata.totalAssets, metadata.assetDecimals),
        eip4626: true,
      };
    } catch (error) {
      throw this.wrapVaultError('Vault info failed', error, EvalancheErrorCode.VAULT_ERROR);
    }
  }

  async depositQuote(
    vaultAddress: string,
    assets: string,
    assetDecimalsOverride?: number,
  ): Promise<VaultQuote> {
    try {
      const vault = this.vaultRead(vaultAddress);
      const metadata = await this.loadMetadata(vaultAddress);
      const assetDecimals = assetDecimalsOverride ?? metadata.assetDecimals;
      const amount = parseUnits(assets, assetDecimals);
      const shares = await vault.previewDeposit(amount);

      return {
        shares: formatUnits(shares, metadata.shareDecimals),
        expectedAssets: assets,
        assetDecimals,
        shareDecimals: metadata.shareDecimals,
      };
    } catch (error) {
      throw this.wrapVaultError('Vault deposit quote failed', error, EvalancheErrorCode.VAULT_ERROR);
    }
  }

  async deposit(
    vaultAddress: string,
    assets: string,
    assetDecimalsOverride?: number,
  ): Promise<TransactionResult> {
    try {
      const vault = this.vault(vaultAddress);
      const metadata = await this.loadMetadata(vaultAddress);
      const assetDecimals = assetDecimalsOverride ?? metadata.assetDecimals;
      const amount = parseUnits(assets, assetDecimals);
      const token = this.erc20(metadata.asset);

      const allowance = await token.allowance(this.signer.address, vaultAddress);
      if (allowance < amount) {
        const approveTx = await token.approve(vaultAddress, MaxUint256);
        await approveTx.wait();
      }

      const tx = await vault.deposit(amount, this.signer.address);
      const receipt = await tx.wait();
      if (!receipt) throw new Error('Transaction receipt is null');
      return { hash: tx.hash, receipt };
    } catch (error) {
      throw this.wrapVaultError('Vault deposit failed', error, EvalancheErrorCode.VAULT_ERROR);
    }
  }

  async withdrawQuote(
    vaultAddress: string,
    shares: string,
    shareDecimalsOverride?: number,
  ): Promise<VaultQuote> {
    try {
      const vault = this.vaultRead(vaultAddress);
      const metadata = await this.loadMetadata(vaultAddress);
      const shareDecimals = shareDecimalsOverride ?? metadata.shareDecimals;
      const shareAmount = parseUnits(shares, shareDecimals);
      const assets = await vault.previewRedeem(shareAmount);

      return {
        shares,
        expectedAssets: formatUnits(assets, metadata.assetDecimals),
        assetDecimals: metadata.assetDecimals,
        shareDecimals,
      };
    } catch (error) {
      throw this.wrapVaultError('Vault withdraw quote failed', error, EvalancheErrorCode.VAULT_ERROR);
    }
  }

  async withdraw(
    vaultAddress: string,
    shares: string,
    shareDecimalsOverride?: number,
  ): Promise<TransactionResult> {
    try {
      const vault = this.vault(vaultAddress);
      const metadata = await this.loadMetadata(vaultAddress);
      const shareDecimals = shareDecimalsOverride ?? metadata.shareDecimals;
      const shareAmount = parseUnits(shares, shareDecimals);
      const tx = await vault.redeem(shareAmount, this.signer.address, this.signer.address);
      const receipt = await tx.wait();
      if (!receipt) throw new Error('Transaction receipt is null');
      return { hash: tx.hash, receipt };
    } catch (error) {
      throw this.wrapVaultError('Vault withdraw failed', error, EvalancheErrorCode.VAULT_ERROR);
    }
  }

  private async loadMetadata(vaultAddress: string): Promise<VaultMetadata> {
    await this.ensureVaultDeployed(vaultAddress);
    const vault = this.vaultRead(vaultAddress);

    try {
      // Some RPCs become flaky when several ERC-4626 metadata calls are issued in parallel.
      // Keep these reads sequential so quote/info paths stay deterministic across providers.
      const name = await vault.name();
      const asset = await vault.asset();
      const totalAssets = await vault.totalAssets();
      const shareDecimals = await vault.decimals();

      const assetContract = this.erc20Read(asset);
      const assetDecimals = await assetContract.decimals();
      const assetSymbol = await assetContract.symbol().catch(() => undefined);

      return {
        name,
        asset,
        assetSymbol,
        assetDecimals: Number(assetDecimals),
        shareDecimals: Number(shareDecimals),
        totalAssets,
      };
    } catch (error) {
      throw this.wrapVaultError(
        'Vault does not expose the required ERC-4626 metadata',
        error,
        EvalancheErrorCode.VAULT_ERROR,
      );
    }
  }

  private wrapVaultError(message: string, error: unknown, code: EvalancheErrorCode): EvalancheError {
    if (error instanceof EvalancheError) return error;
    const detail = this.describeError(error);
    return new EvalancheError(
      `${message}: ${detail}`,
      code,
      error instanceof Error ? error : undefined,
    );
  }

  private describeError(error: unknown): string {
    if (error instanceof Error) {
      const candidate = error as Error & {
        shortMessage?: string;
        reason?: string;
        code?: string;
        info?: { errorName?: string; errorArgs?: unknown[] };
      };
      if (candidate.shortMessage) return candidate.shortMessage;
      if (candidate.reason) return candidate.reason;
      if (candidate.info?.errorName) return candidate.info.errorName;
      return candidate.message;
    }
    return String(error);
  }
}
