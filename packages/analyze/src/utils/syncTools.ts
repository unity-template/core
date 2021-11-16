import { BaseParams, getNpmLatestSemverVersion } from '@generator-template/utils';
import chalk from 'chalk';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import semver from 'semver';
import simpleGit, {
  BranchSummaryBranch,
  ResetMode,
  SimpleGit,
  SimpleGitOptions,
  StatusResult,
} from 'simple-git';
import { createCommitPatch } from './../analyze';
import { isInsideNetWork, promiseQueueExecute } from './common';
import { SyncToolsError, MergeConflictError } from './error';
import { onUnexpectedError, ora } from './log';
import { parseGitPatch } from './patch';

interface SyncToolsOptions {
  config: BaseParams;
  cwd: string;
  baseVersion: string;
  isNeedSync: boolean;
  templateName: string;
}

export default class SyncTools {
  public config: BaseParams; // 模板初始化的参数
  public cwd: string; // 当前仓库的cwd目录
  public baseVersion: string; // 首次版本同步的基线版本
  public isNeedSync: boolean; // 是否需要同步
  public templateName: string; // 模板包名称
  public currentBranchCommitHashList: string[]; // 当前分支的log commit hash信息
  public initializeGitBranch: BranchSummaryBranch; // 初始化分支
  public currentGit: SimpleGit; // 目前cwd下的 currentGit 实例
  public targetVersion: string; // 同步的目标版本
  public package: Record<string, any>; // 当前git实例下的packageJson内容
  public needCreateSyncBranch = false; // 是否需要创建sync分支
  public currentStatusResult: StatusResult; // 初始化提交的 status 信息
  private modifyFiles: string[] = []; // patch文件更新的细节
  private spinner: any; // 当前cli loading 实例
  private resetSteps: (() => Promise<void>)[] = []; // env回退执行

  constructor(props: SyncToolsOptions) {
    this.config = props.config;
    this.cwd = props.cwd;
    this.baseVersion = props.baseVersion;
    this.templateName = props.templateName;
    this.isNeedSync = props.isNeedSync;
    this.currentGit = this.createGit();
    this.package = JSON.parse(
        fs.readFileSync(path.join(this.cwd, './package.json')).toString(),
    );
  }

  private get firstCommitHash() {
    // 首次提交的 commit hash
    const len = this.currentBranchCommitHashList.length;
    return this.currentBranchCommitHashList[len - 1];
  }

  private get latestCommitHash() {
    // 最后一次提交的commit hash
    return this.currentBranchCommitHashList[0];
  }

  private logError(message: string) {
    this.spinner.info(`Error: ${message}`);
  }

  private async execAndReset(step: () => Promise<void>, resetStep: () => Promise<void>) {
    try {
      await step();
    } finally {
      this.resetSteps.unshift(async () => {
        try {
          await resetStep();
        } catch {}
      });
    }
  }

  public async sync() {
    this.spinner = ora('检查是否需要同步...').start();
    try {
      if (!(await this.needSync())) {
        this.spinner.stop();
        return;
      }
      if (await this.checkNeedCreateSyncBranch()) {
        this.spinner.text = '正在创建sync分支进行同步';
        await this.createSyncBranch();
      }
      this.spinner.succeed('检测完毕，需要在sync分支同步版本');
      this.spinner = ora('正在同步最新版本模板...').start();
      await this.syncBranchSync();
      this.spinner.succeed('同步最新版本模板成功');
      this.spinner = ora('正在合并到目标分支...').start();
      await this.mergeLatestVersion();
      this.spinner.succeed('分支已合并，请确认运行正常后提交');
      console.log(`${chalk.green('✔')} 修改文件如下：\n  ${this.modifyFiles.join('\n  ')}`);
      process.exit(0);
    } catch (error) {
      if (error instanceof MergeConflictError) {
        // 如果catch的MergeConflictError，说明合并过程中存在冲突，用户解决后提交即可，不需要输出日志
        this.spinner.fail('同步过程中存在冲突，请解决冲突后提交');
        return process.exit(1);
      }
      this.spinner.text = '同步过程中出现错误，正在恢复当前开发环境...';
      await promiseQueueExecute(this.resetSteps);
      onUnexpectedError(error, this);
      this.spinner.fail('同步过程中出现错误，日志已保存至根目录template-sync-error.log，请联系@云墨排查问题');
      process.exit(1);
    }
  }

  private async needSync() {
    const isInside = await isInsideNetWork();
    if (!isInside) {
      this.logError('目前不处于内网环境，不进行sync');
      return false;
    }
    if (!this.isNeedSync) {
      this.logError('package.json中syncConfig配置项isNeedSync为false');
      return false;
    }

    this.targetVersion = await getNpmLatestSemverVersion(
        this.templateName,
        `${this.baseVersion.split('.')[0]}.x`,
    );

    if (this.targetVersion === this.baseVersion) {
      this.logError('不存在新版本更新');
      return false;
    }

    this.currentStatusResult = await this.currentGit.status();
    if (
      this.currentStatusResult?.conflicted?.length ||
      this.currentStatusResult?.created?.length ||
      this.currentStatusResult?.deleted?.length ||
      this.currentStatusResult?.files?.length ||
      this.currentStatusResult?.modified?.length ||
      this.currentStatusResult?.not_added?.length ||
      this.currentStatusResult?.renamed?.length ||
      this.currentStatusResult?.staged?.length
    ) {
      this.logError('请首先执行git commit -m <message>');
      return false;
    }
    if (!this.targetVersion) {
      throw SyncToolsError.NotExist(this.templateName);
    }

    return true;
  }

  private createGit() {
    const options: SimpleGitOptions = {
      baseDir: this.cwd,
      binary: 'git',
      maxConcurrentProcesses: 6,
      config: [],
    };
    return simpleGit(options);
  }

  private async checkNeedCreateSyncBranch() {
    const branch = await (await this.currentGit.branch()).branches;
    // save current branch
    Object.keys(branch).map((branchName) => {
      if (branch[branchName].current) {
        this.initializeGitBranch = branch[branchName];
      }
    });
    const branchNameList = Object.keys(branch);
    // if have remotes/origin/sync branch, then check will auto relate
    this.needCreateSyncBranch = !(
      branchNameList.includes('sync') ||
      branchNameList.includes('remotes/origin/sync')
    );
    return this.needCreateSyncBranch;
  }

  private async createSyncBranch() {
    this.currentBranchCommitHashList = (await this.currentGit.log()).all.map(
        (i) => i.hash,
    );
    // if use soft type reset commit, that will exist no`t commit info, so needs use hard type，
    await this.execAndReset(
        async () => {
          await this.currentGit.reset(ResetMode.HARD, [this.firstCommitHash]);
        },
        async () => {
          await this.currentGit.reset(ResetMode.HARD, [this.latestCommitHash]);
        },
    );

    await this.execAndReset(
        async () => {
          await this.currentGit.checkoutLocalBranch('sync');
        },
        async () => {
          const { name } = this.initializeGitBranch;
          await this.currentGit.checkout(name);
        },
    );

    try {
      const repository = this.package.repository.url;
      await this.currentGit.push(repository, 'sync');
    } catch {
      throw SyncToolsError.CreatNewSyncBranch();
    }
  }

  private async syncBranchSync() {
    await this.execAndReset(
        async () => {
          try {
            await this.currentGit.checkout('sync');
          } catch {};
        },
        async () => {
          await this.resetSteps.push(async () => {
            const { name } = this.initializeGitBranch;
            await this.currentGit.checkout(name);
          });
        },
    );

    // Multi-branch development，just maintenance one sync branch
    try {
      await this.currentGit.pull('origin', 'sync', {'--no-rebase': null});
    } catch {}
    const lastMessage = (await this.currentGit.log()).latest.message;
    const syncVersion = semver.valid(lastMessage) || this.baseVersion;

    if (syncVersion !== this.targetVersion) {
      const patchInfo = await createCommitPatch({
        pkgName: this.templateName,
        oldVersion: syncVersion,
        newVersion: this.targetVersion,
        options: this.config,
        config: {},
      });
      this.saveModifyFiles(patchInfo);
      await this.patchFileWithCurrentBranch(patchInfo);
      await this.pushCurrentSycBranch();
    }
  }

  private saveModifyFiles(patchInfo: string) {
    if (!patchInfo) return;
    const patch = parseGitPatch(patchInfo);
    patch.files.forEach((file) => {
      if (file.added) {
        this.modifyFiles.push(chalk.green(`add: ${file.afterName}`));
      } else if (file.deleted) {
        this.modifyFiles.push(chalk.red(`delete: ${file.beforeName}`));
      } else {
        this.modifyFiles.push(chalk.blue(`modify: ${file.afterName}`));
      }
    });
  }

  private async pushCurrentSycBranch() {
    await this.currentGit.commit(this.targetVersion, '.', { '--allow-empty': null });
    try {
      // maybe the targetVersion nothing can commit
      const repository = this.package.repository.url;
      await this.currentGit.push(repository, 'sync');
    } catch {}
  }

  private async mergeLatestVersion() {
    const { name } = this.initializeGitBranch;
    await this.currentGit.checkout(name);
    if (this.needCreateSyncBranch) {
      await this.currentGit.reset(ResetMode.HARD, [this.latestCommitHash]);
    }
    try {
      await this.currentGit.merge(['sync']);
    } catch {
      throw SyncToolsError.MergeConflict();
    }
  }

  private async patchFileWithCurrentBranch(patchInfo: string) {
    // save diff file into os.tmp dir
    const filePath = path.join(os.tmpdir(), `./${this.targetVersion}.diff`);
    fs.writeFileSync(filePath, patchInfo);
    // exec git apply filePath cmd
    try {
      await this.currentGit.raw('apply', filePath);
    } catch {
      throw SyncToolsError.PatchFileError(filePath);
    }
  }
}
