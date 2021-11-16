import path from 'path';
import os from 'os';
import hash from 'object-hash';
import { BaseParams } from '@generator-template/utils';


export const npmPackageVersionRootPath = (pkgName: string, options: BaseParams) => {
  return path.resolve(os.tmpdir(), `./npm-version/${pkgName}/${hash(options)}`);
};

export interface Config {
  analyzeFilePattern?: string; // 文件分析的文件模式
  ignoreFilePattern?: string; // 过滤的文件模式
};
