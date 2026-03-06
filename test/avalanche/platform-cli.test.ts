import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PlatformCLI } from '../../src/avalanche/platform-cli';
import { EvalancheError, EvalancheErrorCode } from '../../src/utils/errors';
import * as child_process from 'child_process';
import { promisify } from 'util';

// Mock child_process.execFile
vi.mock('child_process', () => ({
  execFile: vi.fn(),
}));

const mockExecFile = child_process.execFile as unknown as ReturnType<typeof vi.fn>;

/**
 * Helper to configure the mock for execFile (which gets promisified).
 * The promisified version calls execFile with a callback as the last arg.
 */
function mockExecFileResult(stdout: string, stderr = '') {
  mockExecFile.mockImplementation(
    (_cmd: string, _args: string[], _opts: unknown, callback?: (err: Error | null, result: { stdout: string; stderr: string }) => void) => {
      // promisify passes a callback
      if (typeof callback === 'function') {
        callback(null, { stdout, stderr });
      } else if (typeof _opts === 'function') {
        // 3-arg form: execFile(cmd, args, callback)
        (_opts as (err: Error | null, result: { stdout: string; stderr: string }) => void)(null, { stdout, stderr });
      }
      return { stdout, stderr };
    },
  );
}

function mockExecFileError(message: string, stderr = '') {
  mockExecFile.mockImplementation(
    (_cmd: string, _args: string[], _opts: unknown, callback?: (err: Error | null, result?: unknown) => void) => {
      const err = Object.assign(new Error(message), { stderr });
      if (typeof callback === 'function') {
        callback(err);
      } else if (typeof _opts === 'function') {
        (_opts as (err: Error | null) => void)(err);
      }
      return undefined;
    },
  );
}

// Track calls for arg assertions
function getLastCallArgs(): string[] {
  const calls = mockExecFile.mock.calls;
  const lastCall = calls[calls.length - 1];
  return lastCall[1] as string[]; // args array
}

describe('PlatformCLI', () => {
  let cli: PlatformCLI;

  beforeEach(() => {
    vi.clearAllMocks();
    cli = new PlatformCLI({
      binaryPath: '/usr/local/bin/platform-cli',
      network: 'fuji',
      privateKey: '0x' + 'a'.repeat(64),
    });
  });

  describe('isAvailable', () => {
    it('should return true when binary is found', async () => {
      mockExecFileResult('platform-cli v1.0.1');
      const available = await cli.isAvailable();
      expect(available).toBe(true);
    });

    it('should return false when binary is not found', async () => {
      mockExecFileError('ENOENT');
      const available = await cli.isAvailable();
      expect(available).toBe(false);
    });

    it('should cache the availability result', async () => {
      mockExecFileResult('platform-cli v1.0.1');
      await cli.isAvailable();
      await cli.isAvailable();
      // First call checks version, but subsequent calls should be cached
      // (the version check is called once, then availability is cached)
      expect(mockExecFile).toHaveBeenCalledTimes(1);
    });
  });

  describe('getAddress', () => {
    it('should parse P-Chain address from output', async () => {
      mockExecFileResult('P-avax1qm2a25eytsrj235hf2');
      // Need to make available first
      (cli as unknown as { _available: boolean })._available = true;

      const address = await cli.getAddress();
      expect(address).toBe('P-avax1qm2a25eytsrj235hf2');
    });

    it('should throw if address cannot be parsed', async () => {
      mockExecFileResult('some unexpected output');
      (cli as unknown as { _available: boolean })._available = true;

      await expect(cli.getAddress()).rejects.toThrow(EvalancheError);
    });
  });

  describe('getBalance', () => {
    it('should parse balance from output', async () => {
      mockExecFileResult('Balance: 25.5 AVAX (25500000000 nAVAX)');
      (cli as unknown as { _available: boolean })._available = true;

      const balance = await cli.getBalance();
      expect(balance.balanceAvax).toBe('25.5');
      expect(balance.balanceNAvax).toBe(BigInt(25500000000));
    });

    it('should return zero for empty output', async () => {
      mockExecFileResult('Balance: 0 AVAX');
      (cli as unknown as { _available: boolean })._available = true;

      const balance = await cli.getBalance();
      expect(balance.balanceAvax).toBe('0');
    });
  });

  describe('sendOnPChain', () => {
    it('should pass correct args for AVAX amount', async () => {
      mockExecFileResult('TxID: abc123def456');
      (cli as unknown as { _available: boolean })._available = true;

      await cli.sendOnPChain({ to: 'P-avax1abc', amountAvax: 10.5 });
      const args = getLastCallArgs();
      expect(args).toContain('transfer');
      expect(args).toContain('send');
      expect(args).toContain('--to');
      expect(args).toContain('P-avax1abc');
      expect(args).toContain('--amount');
      expect(args).toContain('10.5');
    });

    it('should pass correct args for nAVAX amount', async () => {
      mockExecFileResult('TxID: abc123def456');
      (cli as unknown as { _available: boolean })._available = true;

      await cli.sendOnPChain({ to: 'P-avax1abc', amountNAvax: BigInt(10500000000) });
      const args = getLastCallArgs();
      expect(args).toContain('--amount-navax');
      expect(args).toContain('10500000000');
    });
  });

  describe('transferPtoC', () => {
    it('should execute P to C transfer', async () => {
      mockExecFileResult('Export TxID: abc\nImport TxID: def');
      (cli as unknown as { _available: boolean })._available = true;

      const result = await cli.transferPtoC({ amountAvax: 5 });
      expect(result.stdout).toContain('Export');
    });
  });

  describe('transferCtoP', () => {
    it('should execute C to P transfer', async () => {
      mockExecFileResult('Export TxID: abc\nImport TxID: def');
      (cli as unknown as { _available: boolean })._available = true;

      const result = await cli.transferCtoP({ amountAvax: 5 });
      expect(result.stdout).toContain('Export');
    });
  });

  describe('addValidator', () => {
    it('should pass all validator params', async () => {
      mockExecFileResult('TxID: val123');
      (cli as unknown as { _available: boolean })._available = true;

      await cli.addValidator({
        nodeId: 'NodeID-abc123',
        stakeAvax: 2000,
        durationHours: 720,
        delegationFee: 0.02,
        blsPublicKey: '0xbls123',
        blsPop: '0xpop456',
      });

      const args = getLastCallArgs();
      expect(args).toContain('validator');
      expect(args).toContain('add');
      expect(args).toContain('--node-id');
      expect(args).toContain('NodeID-abc123');
      expect(args).toContain('--stake');
      expect(args).toContain('2000');
      expect(args).toContain('--duration');
      expect(args).toContain('720h');
      expect(args).toContain('--delegation-fee');
      expect(args).toContain('0.02');
      expect(args).toContain('--bls-public-key');
      expect(args).toContain('0xbls123');
      expect(args).toContain('--bls-pop');
      expect(args).toContain('0xpop456');
    });

    it('should support node endpoint auto-discovery', async () => {
      mockExecFileResult('TxID: val456');
      (cli as unknown as { _available: boolean })._available = true;

      await cli.addValidator({
        nodeId: 'NodeID-abc123',
        stakeAvax: 2000,
        nodeEndpoint: 'https://node.example.com:9650',
      });

      const args = getLastCallArgs();
      expect(args).toContain('--node-endpoint');
      expect(args).toContain('https://node.example.com:9650');
    });
  });

  describe('delegateStake', () => {
    it('should pass delegation params', async () => {
      mockExecFileResult('TxID: del123');
      (cli as unknown as { _available: boolean })._available = true;

      await cli.delegateStake({
        nodeId: 'NodeID-abc123',
        stakeAvax: 100,
        durationHours: 336,
        rewardAddress: 'P-avax1reward',
      });

      const args = getLastCallArgs();
      expect(args).toContain('validator');
      expect(args).toContain('delegate');
      expect(args).toContain('--node-id');
      expect(args).toContain('NodeID-abc123');
      expect(args).toContain('--stake');
      expect(args).toContain('100');
      expect(args).toContain('--duration');
      expect(args).toContain('336h');
      expect(args).toContain('--reward-address');
      expect(args).toContain('P-avax1reward');
    });
  });

  describe('createSubnet', () => {
    it('should parse subnet creation output', async () => {
      mockExecFileResult('Subnet created!\nSubnet ID: 2Z36RnQuk1hvsnFeGWzfDUqT2sMCNsEFW9P6ihN\nTx ID: abc123def456');
      (cli as unknown as { _available: boolean })._available = true;

      const result = await cli.createSubnet();
      expect(result.subnetId).toBe('2Z36RnQuk1hvsnFeGWzfDUqT2sMCNsEFW9P6ihN');
    });
  });

  describe('transferSubnetOwnership', () => {
    it('should pass correct args', async () => {
      mockExecFileResult('Ownership transferred. Tx ID: own123');
      (cli as unknown as { _available: boolean })._available = true;

      await cli.transferSubnetOwnership('subnet123', 'P-avax1newowner');
      const args = getLastCallArgs();
      expect(args).toContain('subnet');
      expect(args).toContain('transfer-ownership');
      expect(args).toContain('--subnet-id');
      expect(args).toContain('subnet123');
      expect(args).toContain('--new-owner');
      expect(args).toContain('P-avax1newowner');
    });
  });

  describe('convertSubnetToL1', () => {
    it('should pass convert params with validators', async () => {
      mockExecFileResult('Subnet converted to L1. Tx ID: conv123');
      (cli as unknown as { _available: boolean })._available = true;

      await cli.convertSubnetToL1({
        subnetId: 'subnet456',
        chainId: 'chain789',
        validators: 'https://node1:9650,https://node2:9650',
        managerAddress: '0xmanager',
      });

      const args = getLastCallArgs();
      expect(args).toContain('subnet');
      expect(args).toContain('convert-l1');
      expect(args).toContain('--subnet-id');
      expect(args).toContain('subnet456');
      expect(args).toContain('--chain-id');
      expect(args).toContain('chain789');
      expect(args).toContain('--validators');
      expect(args).toContain('--manager');
      expect(args).toContain('0xmanager');
    });

    it('should support mock validator for testing', async () => {
      mockExecFileResult('Subnet converted (mock). Tx ID: mock123');
      (cli as unknown as { _available: boolean })._available = true;

      await cli.convertSubnetToL1({
        subnetId: 'subnet456',
        chainId: 'chain789',
        mockValidator: true,
      });

      const args = getLastCallArgs();
      expect(args).toContain('--mock-validator');
    });
  });

  describe('registerL1Validator', () => {
    it('should pass registration params', async () => {
      mockExecFileResult('Validator registered!\nTx ID: reg123\nValidation ID: val456');
      (cli as unknown as { _available: boolean })._available = true;

      const result = await cli.registerL1Validator(1.0, '0xpop', '0xmessage');
      expect(result.txId).toBeDefined();
    });
  });

  describe('addL1ValidatorBalance', () => {
    it('should pass correct args', async () => {
      mockExecFileResult('Balance added. Tx ID: bal123');
      (cli as unknown as { _available: boolean })._available = true;

      await cli.addL1ValidatorBalance('val123', 0.5);
      const args = getLastCallArgs();
      expect(args).toContain('l1');
      expect(args).toContain('add-balance');
      expect(args).toContain('--validation-id');
      expect(args).toContain('val123');
      expect(args).toContain('--balance');
      expect(args).toContain('0.5');
    });
  });

  describe('disableL1Validator', () => {
    it('should pass correct args', async () => {
      mockExecFileResult('Validator disabled. Tx ID: dis123');
      (cli as unknown as { _available: boolean })._available = true;

      await cli.disableL1Validator('val456');
      const args = getLastCallArgs();
      expect(args).toContain('l1');
      expect(args).toContain('disable-validator');
      expect(args).toContain('--validation-id');
      expect(args).toContain('val456');
    });
  });

  describe('setL1ValidatorWeight', () => {
    it('should pass message', async () => {
      mockExecFileResult('Weight set. Tx ID: wt123');
      (cli as unknown as { _available: boolean })._available = true;

      await cli.setL1ValidatorWeight('0xwarpmessage');
      const args = getLastCallArgs();
      expect(args).toContain('l1');
      expect(args).toContain('set-weight');
      expect(args).toContain('--message');
      expect(args).toContain('0xwarpmessage');
    });
  });

  describe('createChain', () => {
    it('should pass chain creation params', async () => {
      mockExecFileResult('Chain created. Tx ID: chain123');
      (cli as unknown as { _available: boolean })._available = true;

      await cli.createChain('subnet789', '/path/to/genesis.json', 'mychain');
      const args = getLastCallArgs();
      expect(args).toContain('chain');
      expect(args).toContain('create');
      expect(args).toContain('--subnet-id');
      expect(args).toContain('subnet789');
      expect(args).toContain('--genesis');
      expect(args).toContain('/path/to/genesis.json');
      expect(args).toContain('--name');
      expect(args).toContain('mychain');
    });
  });

  describe('getNodeInfo', () => {
    it('should parse node info from output', async () => {
      mockExecFileResult(
        'Node ID: NodeID-7Xhw2mDxuDS44j42TCB6U5579esbSt3Lg\n' +
        'BLS Public Key: 85abc123def456\n' +
        'BLS Proof of Possession: 99aabb7890cc\n',
      );
      (cli as unknown as { _available: boolean })._available = true;

      const info = await cli.getNodeInfo('127.0.0.1:9650');
      expect(info.nodeId).toBe('NodeID-7Xhw2mDxuDS44j42TCB6U5579esbSt3Lg');
      expect(info.blsPublicKey).toBe('85abc123def456');
      expect(info.blsPop).toBe('99aabb7890cc');
    });

    it('should throw if node ID not found', async () => {
      mockExecFileResult('Connection refused');
      (cli as unknown as { _available: boolean })._available = true;

      await expect(cli.getNodeInfo('127.0.0.1:9999')).rejects.toThrow(EvalancheError);
    });
  });

  describe('importKey', () => {
    it('should import key without encryption', async () => {
      mockExecFileResult('Key imported: mykey');
      (cli as unknown as { _available: boolean })._available = true;

      await cli.importKey('mykey', 'PrivateKey-abc123', false);
      const args = getLastCallArgs();
      expect(args).toContain('keys');
      expect(args).toContain('import');
      expect(args).toContain('--name');
      expect(args).toContain('mykey');
      expect(args).toContain('--private-key');
      expect(args).toContain('PrivateKey-abc123');
      expect(args).toContain('--encrypt=false');
    });
  });

  describe('listKeys', () => {
    it('should return key list output', async () => {
      mockExecFileResult('mykey: P-avax1abc\ndefault: P-avax1def');
      (cli as unknown as { _available: boolean })._available = true;

      const output = await cli.listKeys();
      expect(output).toContain('mykey');
      expect(output).toContain('P-avax1abc');
    });
  });

  describe('getVersion', () => {
    it('should return version string', async () => {
      mockExecFileResult('platform-cli v1.0.1');
      (cli as unknown as { _available: boolean })._available = true;

      const version = await cli.getVersion();
      expect(version).toBe('platform-cli v1.0.1');
    });
  });

  describe('network and auth flags', () => {
    it('should pass network flag', async () => {
      mockExecFileResult('ok');
      (cli as unknown as { _available: boolean })._available = true;

      await cli.getVersion();
      const args = getLastCallArgs();
      expect(args).toContain('--network');
      expect(args).toContain('fuji');
    });

    it('should pass key-name when configured', async () => {
      const cliWithKey = new PlatformCLI({
        binaryPath: '/usr/local/bin/platform-cli',
        network: 'mainnet',
        keyName: 'eva',
      });
      (cliWithKey as unknown as { _available: boolean })._available = true;
      mockExecFileResult('ok');

      await cliWithKey.getVersion();
      const args = getLastCallArgs();
      expect(args).toContain('--key-name');
      expect(args).toContain('eva');
      expect(args).toContain('--network');
      expect(args).toContain('mainnet');
    });

    it('should pass rpc-url when configured', async () => {
      const cliWithRpc = new PlatformCLI({
        binaryPath: '/usr/local/bin/platform-cli',
        rpcUrl: 'http://localhost:9650',
      });
      (cliWithRpc as unknown as { _available: boolean })._available = true;
      mockExecFileResult('ok');

      await cliWithRpc.getVersion();
      const args = getLastCallArgs();
      expect(args).toContain('--rpc-url');
      expect(args).toContain('http://localhost:9650');
    });

    it('should set AVALANCHE_PRIVATE_KEY env when configured', async () => {
      const cliWithPk = new PlatformCLI({
        binaryPath: '/usr/local/bin/platform-cli',
        network: 'fuji',
        privateKey: '0xdeadbeef',
      });
      (cliWithPk as unknown as { _available: boolean })._available = true;
      mockExecFileResult('ok');

      await cliWithPk.getVersion();
      const lastCall = mockExecFile.mock.calls[mockExecFile.mock.calls.length - 1];
      const opts = lastCall[2] as { env?: Record<string, string> };
      expect(opts.env?.AVALANCHE_PRIVATE_KEY).toBe('0xdeadbeef');
    });
  });

  describe('error handling', () => {
    it('should throw PLATFORM_CLI_NOT_FOUND when binary missing', async () => {
      const missingCli = new PlatformCLI({ binaryPath: '/nonexistent/path' });
      mockExecFileError('ENOENT');

      try {
        await missingCli.getVersion();
        expect.fail('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(EvalancheError);
        expect((e as EvalancheError).code).toBe(EvalancheErrorCode.PLATFORM_CLI_NOT_FOUND);
      }
    });

    it('should throw PLATFORM_CLI_ERROR on command failure', async () => {
      (cli as unknown as { _available: boolean })._available = true;
      mockExecFileError('insufficient funds', 'Error: insufficient funds for stake');

      try {
        await cli.addValidator({ nodeId: 'NodeID-abc', stakeAvax: 2000 });
        expect.fail('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(EvalancheError);
        expect((e as EvalancheError).code).toBe(EvalancheErrorCode.PLATFORM_CLI_ERROR);
        expect((e as EvalancheError).message).toContain('insufficient funds');
      }
    });
  });
});
