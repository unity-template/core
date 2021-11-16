import { BaseParams, downloadMaterialTemplate, generator } from 'onex-template-utils';
import fs from 'fs-extra';
import isGit from 'is-git-repository';
import os from 'os';
import path from 'path';
import simpleGit, { SimpleGit, SimpleGitOptions } from 'simple-git';
import { npmPackageVersionRootPath } from '../config';
import { promiseQueueExecute } from './common';

type VersionList = string[];
interface DownloadTemplate {
  templateDir: string; // 模板文件夹
  versionList: VersionList; // 需要下载的版本
  pkgName: string; // 需要的模板名称
}
export async function downloadTemplate({ versionList, pkgName, templateDir }: DownloadTemplate) {
  const downloadList = versionList.map((version) => {
    const currentVersionDir = path.join(templateDir, `./${version}`);
    // 如果存在版本目录，默认此版本已经下载
    if (fs.existsSync(currentVersionDir)) return Promise.resolve();
    fs.ensureDir(currentVersionDir);
    return downloadMaterialTemplate({
      dir: currentVersionDir,
      pkgName,
      version: version,
    });
  });
  await await Promise.all(downloadList);
}

interface DownloadVersionParams {
  versions: VersionList;
  pkgName: string;
  options: BaseParams,
  config?: {
    ignorePattern: string;
  };
}

/**
 *下载对应的包版本到本地
 * @TODO: config ignorePattern params
 * @export
 * @param {DownloadVersionParams} { versions, pkgName }
 * @returns
 */
export async function downloadVersions({ versions, pkgName, options }: DownloadVersionParams) {
  const templateDir = path.join(os.tmpdir(), `./${pkgName}`);
  await downloadTemplate({
    pkgName,
    versionList: versions,
    templateDir,
  });
  const currentPackagePath = npmPackageVersionRootPath(pkgName, options);
  const git = await createPackageGit(pkgName, options);
  const needDownloadVersion = await getNeedDownloadVersion(git, versions);

  // To prevent the processes running at the same time
  const promiseFunList = needDownloadVersion.map((version) => {
    return (async () => {
      try {
        await git.checkout('master');
      } catch {}
      await generator({
        templateDir: path.join(templateDir, `./${version}`),
        options: {
          ...options,
          dir: currentPackagePath,
        },
      });
      try {
        await git.checkoutLocalBranch(version);
      } catch {
        await git.checkout(version);
      }
      await git.add('.');
      await git.commit(version);
    });
  });
  await promiseQueueExecute(promiseFunList);
  return git;
};


/**
 *创建package的.git目录
 *
 * @export
 * @param {string} pkgName
 * @returns
 */
export async function createPackageGit(pkgName: string, options: BaseParams) {
  const currentPackageDirPath = npmPackageVersionRootPath(pkgName, options);
  // if git repository not exist need create the git dir
  fs.ensureDirSync(currentPackageDirPath);
  fs.emptyDirSync(currentPackageDirPath);
  const gitOptions: SimpleGitOptions = {
    baseDir: currentPackageDirPath,
    binary: 'git',
    maxConcurrentProcesses: 6,
    config: [],
  };
  const git = simpleGit(gitOptions);
  // if repository is not include .git dir then exec git init command
  if (!isGit(currentPackageDirPath)) {
    try {
      await git.init();
      await git.raw(['commit', '--allow-empty', '-m', 'first-commit']);
    } catch {};
  };
  return git;
}

/**
 *获得需要下载分析的版本号
 *
 * @export
 * @param {SimpleGit} git
 * @param {string[]} versions
 * @returns
 */
export async function getNeedDownloadVersion(git: SimpleGit, versions: string[]) {
  const gitRepositoryBranchList = Object.keys(await (await git.branchLocal())?.branches) ?? [];
  return versions.filter((version) => {
    return version && !gitRepositoryBranchList.includes(version);
  });
}

