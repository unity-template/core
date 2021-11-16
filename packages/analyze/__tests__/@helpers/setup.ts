import { BranchSummary, ListLogSummary, StatusResult } from 'simple-git';
import * as analyze from '../../src/analyze';

export const mockGitInstance = {
  add: jest.fn(() => Promise.resolve()),
  commit: jest.fn(() => Promise.resolve()),
  checkoutLocalBranch: jest.fn(() => Promise.resolve()),
  init: jest.fn(() => Promise.resolve()),
  branchLocal: jest.fn(() => Promise.resolve({ branches: {} })),
  raw: jest.fn(() => Promise.resolve()),
  status: jest.fn<Promise<Partial<StatusResult>>, any[]>(),
  branch: jest.fn<Promise<BranchSummary>, any[]>(),
  checkout: jest.fn(() => Promise.resolve()),
  pull: jest.fn(() => Promise.resolve()),
  log: jest.fn<Promise<Partial<ListLogSummary>>, any[]>(),
  push: jest.fn(() => Promise.resolve()),
  reset: jest.fn(() => Promise.resolve()),
  merge: jest.fn(() => Promise.resolve()),
};
jest.mock('simple-git', () => jest.fn(() => mockGitInstance));

// moc utils
export const mockDownloadInstance = {
  downloadMaterialTemplate: jest.fn(() => Promise.resolve()),
  getNpmLatestSemverVersion: jest.fn<Promise<string>, any[]>(() => Promise.resolve('')),
  generator: jest.fn(),
};
jest.mock('@generator-template/utils', () => (mockDownloadInstance));

// mock fs
export const mockFsInstance = {
  readFileSync: jest.fn(() => '{"node":1, "repository": {"url": "test.repository.git"} }'),
  writeFileSync: jest.fn(),
  readJsonSync: jest.fn(),
  ensureDir: jest.fn(),
  ensureDirSync: jest.fn(),
  emptyDirSync: jest.fn(),
};
jest.mock('fs-extra', () => mockFsInstance);


// mock patch
jest.mock('../../src/analyze');
export const mockCreateCommitPatch = jest.fn(() => Promise.resolve());
(analyze.createCommitPatch as jest.Mock) = mockCreateCommitPatch;

// mock ali intranet
jest.mock('is-ali-intranet', () => jest.fn(() => Promise.resolve({isAliIntranet: true})));

// mock ora
export const mockOraInstance = {
  info: jest.fn(() => mockOraInstance),
  start: jest.fn(() => mockOraInstance),
  stop: jest.fn(() => mockOraInstance),
  succeed: jest.fn(() => mockOraInstance),
  fail: jest.fn(() => mockOraInstance),
  setText: jest.fn(), // mock set text属性
  set text(value) {
    this.setText(value);
  },
};
jest.mock('ora', () => jest.fn(() => mockOraInstance));
