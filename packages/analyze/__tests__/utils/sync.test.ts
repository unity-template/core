import SyncTools from '../../src/utils/syncTools';
import path from 'path';
import {
  mockGitInstance,
  mockFsInstance,
  mockDownloadInstance,
  mockCreateCommitPatch,
  mockOraInstance,
} from '../@helpers/setup';

const defaultOptions = {
  cwd: path.join(__dirname, '../project'),
  baseVersion: '0.0.1',
  isNeedSync: true,
  templateName: 'onex-template',
  config: {
    dir: '',
    description: '',
    packageName: '',
    author: '',
    gitUrl: '',
  },
};

mockFsInstance.readJsonSync.mockReturnValue({
  version: '',
});

const processExit = jest.fn<never, [code: number]>();
jest.spyOn(process, 'exit').mockImplementation(processExit);


describe('sync tools needSync', () => {
  afterEach(() => {
    mockGitInstance.status.mockClear();
    mockDownloadInstance.getNpmLatestSemverVersion.mockClear();
  });
  test('should break up git process when options.baseVersion != targetVersion', async () => {
    mockDownloadInstance.getNpmLatestSemverVersion.mockResolvedValueOnce('0.0.1');
    const sync = new SyncTools(defaultOptions);
    await sync.sync();
    expect(mockOraInstance.info.mock.calls[0]).toEqual(['Error: 不存在新版本更新']);
  });

  test('should break up git process when git.status have not commit files.', async () => {
    mockGitInstance.status.mockResolvedValueOnce({not_added: ['1', '2']});
    mockDownloadInstance.getNpmLatestSemverVersion.mockResolvedValueOnce('0.0.2');
    console.info = jest.fn();
    const sync = new SyncTools(defaultOptions);
    await sync.sync();
    expect(mockOraInstance.info.mock.calls[0]).toEqual(['Error: 请首先执行git commit -m <message>']);
  });
});

describe('sync tools checkNeedCreateSyncBranch and mergeLatestVersion', () => {
  beforeEach(() => {
    mockGitInstance.status.mockResolvedValueOnce({});
    mockDownloadInstance.getNpmLatestSemverVersion.mockResolvedValueOnce('0.0.2');
  });

  afterEach(() => {
    mockGitInstance.status.mockClear();
    mockDownloadInstance.getNpmLatestSemverVersion.mockClear();
    mockGitInstance.branch.mockClear();
    mockGitInstance.log.mockClear();
    mockGitInstance.pull.mockClear();
    mockCreateCommitPatch.mockClear();
    mockGitInstance.push.mockClear();
    mockGitInstance.reset.mockClear();
    mockGitInstance.merge.mockClear();
  });


  test('should break up git process when git.branch branches already have sync branch', async () => {
    mockGitInstance.branch.mockResolvedValueOnce({
      detached: false,
      current: '',
      all: [],
      branches: {
        sync: {
          current: false,
          name: 'sync',
          commit: '',
          label: '',
        },
      },
    });
    mockGitInstance.log.mockResolvedValueOnce({
      latest: {
        message: '0.0.2', // 和 mockDownloadInstance.getNpmLatestSemverVersion 返回保持相同
        hash: '',
        date: '',
        refs: '',
        body: '',
        author_name: '',
        author_email: '',
      },
    });
    expect.assertions(4);
    const sync = new SyncTools(defaultOptions);
    try {
      await sync.sync();
    } catch {}
    // 首先判断Branch
    expect(mockGitInstance.branch.mock.calls.length).toBe(1);
    // 确定对比之后，切换至sync分支
    expect(mockGitInstance.checkout.mock.calls[0]).toEqual(['sync']);
    // 尝试pull一下分支
    expect(mockGitInstance.pull.mock.calls[0]).toEqual(['origin', 'sync', {'--no-rebase': null}]);
    // 尝试调用log，获取当前最新分支
    expect(mockGitInstance.log.mock.calls.length).toBe(1);
  });

  test('should createCommitPatch and push the target version commit', async () => {
    mockGitInstance.branch.mockResolvedValueOnce({
      detached: false,
      current: '',
      all: [],
      branches: {
        sync: {
          current: false,
          name: 'sync',
          commit: '',
          label: '',
        },
      },
    });
    mockGitInstance.log.mockResolvedValueOnce({
      latest: {
        message: '0.0.0',
        hash: '',
        date: '',
        refs: '',
        body: '',
        author_name: '',
        author_email: '',
      },
    });
    expect.assertions(4);
    const sync = new SyncTools(defaultOptions);
    try {
      await sync.sync();
    } catch {}
    // 创建commitPatch
    expect(mockCreateCommitPatch.mock.calls.length).toBe(1);
    // 调用raw进行apply
    expect(mockGitInstance.raw.mock.calls.length).toBe(1);
    // add and commit
    expect(mockGitInstance.commit.mock.calls[0]).toEqual(['0.0.2', '.', {'--allow-empty': null}]);
    // push the commit
    expect(mockGitInstance.push.mock.calls[0]).toEqual(['test.repository.git', 'sync']);
  });
});

describe('sync tools git process', () => {
  beforeEach(() => {
    mockGitInstance.branch.mockResolvedValueOnce({
      detached: false,
      current: '',
      all: [],
      branches: {
        sync: {
          current: true,
          name: 'sync',
          commit: '',
          label: '',
        },
      },
    });
    mockGitInstance.log.mockResolvedValueOnce({
      latest: {
        message: '0.0.2', // 和 mockDownloadInstance.getNpmLatestSemverVersion 返回保持相同
        hash: '',
        date: '',
        refs: '',
        body: '',
        author_name: '',
        author_email: '',
      },
    });
    mockGitInstance.status.mockResolvedValueOnce({});
    mockDownloadInstance.getNpmLatestSemverVersion.mockResolvedValueOnce('0.0.2');
  });

  afterEach(() => {
    mockGitInstance.status.mockClear();
    mockDownloadInstance.getNpmLatestSemverVersion.mockClear();
    mockGitInstance.branch.mockClear();
    mockGitInstance.log.mockClear();
    mockGitInstance.pull.mockClear();
    mockCreateCommitPatch.mockClear();
    mockGitInstance.push.mockClear();
    mockGitInstance.reset.mockClear();
    mockGitInstance.merge.mockClear();
  });

  test('should merge', async () => {
    expect.assertions(8);
    const sync = new SyncTools(defaultOptions);
    await sync.sync();
    // 调用 status，判断当前仓库状态
    expect(mockGitInstance.status.mock.calls.length).toEqual(1);

    // 调用 branch 判断是否需要创建分支（测试用例中，存在sync分支，同时目前处于sync分支上）
    expect(mockGitInstance.branch.mock.calls.length).toEqual(1);
    // 调用checkout 切换到sync分支
    expect(mockGitInstance.checkout.mock.calls[0]).toEqual(['sync']);
    // 尝试 pull 获取最新分支
    expect(mockGitInstance.pull.mock.calls[0]).toEqual(['origin', 'sync', {'--no-rebase': null}]);
    // 通过log日志 找到最新版本（这个测试用例中，是相同的）
    expect(mockGitInstance.log.mock.calls.length).toEqual(1);
    expect(mockCreateCommitPatch.mock.calls.length).toBe(0);

    // 首先checkout切换值sync分支
    expect(mockGitInstance.checkout.mock.calls[1]).toEqual(['sync']);
    // 执行merge git能力
    expect(mockGitInstance.merge.mock.calls[0]).toEqual([['sync']]);
  });
});


describe('sync tools git process when git merger sync throw MergeConflictError', () => {
  beforeEach(() => {
    mockGitInstance.branch.mockResolvedValueOnce({
      detached: false,
      current: '',
      all: [],
      branches: {
        sync: {
          current: true,
          name: 'sync',
          commit: '',
          label: '',
        },
      },
    });
    mockGitInstance.log.mockResolvedValueOnce({
      latest: {
        message: '0.0.2', // 和 mockDownloadInstance.getNpmLatestSemverVersion 返回保持相同
        hash: '',
        date: '',
        refs: '',
        body: '',
        author_name: '',
        author_email: '',
      },
    });
    mockGitInstance.status.mockResolvedValueOnce({});
    mockDownloadInstance.getNpmLatestSemverVersion.mockResolvedValueOnce('0.0.2');
    mockGitInstance.merge.mockRejectedValueOnce('同步错误');
  });

  afterEach(() => {
    mockGitInstance.status.mockClear();
    mockDownloadInstance.getNpmLatestSemverVersion.mockClear();
    mockGitInstance.branch.mockClear();
    mockGitInstance.log.mockClear();
    mockGitInstance.pull.mockClear();
    mockCreateCommitPatch.mockClear();
    mockGitInstance.push.mockClear();
    mockGitInstance.reset.mockClear();
    mockGitInstance.merge.mockClear();
  });

  test('should merge', async () => {
    expect.assertions(2);
    const sync = new SyncTools(defaultOptions);
    await sync.sync();
    // merge过程中存在冲突
    expect(mockOraInstance.fail.mock.calls[0][0]).toEqual('同步过程中存在冲突，请解决冲突后提交');
    // 确保ora fail仅调用一次
    expect(mockOraInstance.fail.mock.calls.length).toEqual(1);
  });
});

