import { downloadVersions } from './utils/download';
import { getDiffInfo } from './utils/git';
import { parseGitPatch } from './utils/patch';
import { Config } from './config';
import { BaseParams} from 'onex-template-utils';
export { PatchResult } from './utils/patch';


export interface AnalyzeOptions {
  pkgName: string;
  oldVersion: string;
  newVersion: string;
  config: Config;
  options: BaseParams;
}

export default async (props: AnalyzeOptions) => {
  const {pkgName, oldVersion, newVersion, config, options} = props;
  const git = await downloadVersions({
    pkgName,
    versions: [oldVersion, newVersion],
    options: options,
    config: {
      ignorePattern: config.ignoreFilePattern,
    },
  });
  const diffInfo = await getDiffInfo({
    git,
    versions: [oldVersion, newVersion],
  });
  const parsePatch = parseGitPatch(diffInfo, {
    analyzePattern: config.analyzeFilePattern,
  });
  return parsePatch;
};


export interface CommitOptions extends AnalyzeOptions {}
export async function createCommitPatch(props: CommitOptions) {
  const {pkgName, oldVersion, newVersion, config, options} = props;
  const git = await downloadVersions({
    pkgName,
    versions: [oldVersion, newVersion],
    options,
    config: {
      ignorePattern: config.ignoreFilePattern,
    },
  });

  // 生成文件的diff
  const diffInfo = await getDiffInfo({
    git,
    versions: [oldVersion, newVersion],
  });
  return diffInfo;
};
