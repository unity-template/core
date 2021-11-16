import fs from 'fs-extra';
import simpleGit, { SimpleGit, SimpleGitOptions } from 'simple-git';


interface DiffInfoProps {
  versions: string[];
  git: SimpleGit;
};
export async function getDiffInfo(props: DiffInfoProps) {
  const { git, versions } = props;
  const info = await git.diff([...versions]);
  return info;
}

export async function createGit(cwd: string) {
  if (!fs.ensureDir(cwd)) {
    throw new Error(`${cwd}目录不存在，不支持版本合并`);
  }
  const options: SimpleGitOptions = {
    baseDir: cwd,
    binary: 'git',
    maxConcurrentProcesses: 6,
    config: [],
  };
  const git = simpleGit(options);
  return git;
};
