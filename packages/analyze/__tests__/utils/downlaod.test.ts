import { downloadVersions, getNeedDownloadVersion } from '../../src/utils/download';
import { promiseQueue } from '../../src/utils/common';
import { mockDownloadInstance } from '../@helpers/setup';

import fs from 'fs-extra';
import simpleGit from 'simple-git';

// mock git operator
const mockGitAdd = jest.fn(() => Promise.resolve());
const mockGitCommit = jest.fn(() => Promise.resolve());
const mockCheckoutLocalBranch = jest.fn(() => Promise.resolve());
const mockInit = jest.fn(() => Promise.resolve());
const mockBranchLocal = jest.fn(() => Promise.resolve({ branches: {} }));
const mockRaw = jest.fn(() => Promise.resolve());

const gitInstance = jest.fn(() => ({
  add: mockGitAdd,
  commit: mockGitCommit,
  checkoutLocalBranch: mockCheckoutLocalBranch,
  init: mockInit,
  branchLocal: mockBranchLocal,
  raw: mockRaw,
}));
jest.mock('simple-git', () => jest.fn());

(simpleGit as jest.Mock).mockImplementation(gitInstance);


// mock fs-extra
jest.mock('fs-extra');
fs.ensureDirSync = jest.fn(() => true);
fs.existsSync = jest.fn(() => false);

const testParams = {
  dir: '',
  description: '',
  packageName: '',
  author: '',
  gitUrl: '',
};

describe('test promiseQueue', () => {
  test('should return async queue', async () => {
    const start = Promise.resolve('start');
    const end = Promise.resolve('end');
    const result = await promiseQueue([start, end]);
    expect(result).toEqual('end');
  });

  test('should catch error', () => {
    const start = Promise.resolve('start');
    // eslint-disable-next-line prefer-promise-reject-errors
    const end = Promise.reject('error');
    expect(promiseQueue([start, end])).rejects.toBe('error');
  });
});

describe('test getNeedDownloadVersion', () => {
  const mockGitBranch = jest.fn();
  const mockGit = {
    branchLocal: mockGitBranch,
  };
  beforeEach(() => {
    mockBranchLocal.mockClear();
  });
  test('should invoke 1 when git branch already have same branch', async () => {
    mockGitBranch.mockResolvedValueOnce({
      branches: {
        'beta': '',
        '0.0.1': '',
      },
    });
    const result = await getNeedDownloadVersion(mockGit as any, ['beta', '0.0.1']);
    expect(result).toEqual([]);
  });

  test('should invoke twice ', async () => {
    mockGitBranch.mockReturnValueOnce({
      branches: {},
    });
    const result = await getNeedDownloadVersion(mockGit as any, ['beta', '0.0.1']);
    expect(result).toEqual(['beta', '0.0.1']);
  });
});


describe('test downloadVersion', () => {
  beforeEach(() => {
    mockDownloadInstance.downloadMaterialTemplate.mockClear();
  });

  test('should download two version when git branch is null', async () => {
    await downloadVersions({
      pkgName: 'onex-json-template',
      versions: ['beta', 'latest'],
      options: testParams,
    });
    expect(mockDownloadInstance.downloadMaterialTemplate.mock.calls.length).toBe(2);
  });

  test('should download once when git branch already have beta branch', async () => {
    (mockBranchLocal).mockReturnValueOnce(
        Promise.resolve({
          branches: {
            beta: '',
          },
        }),
    );
    await downloadVersions({
      pkgName: 'onex-json-template',
      versions: ['beta', 'latest'],
      options: testParams,
    });
    expect(mockDownloadInstance.downloadMaterialTemplate.mock.calls.length).toBe(2);
  });
});
