import { BaseParams } from '@generator-template/utils';
import SyncTools from './utils/syncTools';

interface AsyncProps {
  config: BaseParams;
  cwd: string; // 当前运行的process.cwd目录
  baseVersion: string; // 根据baseVersion进行版本同步
  isNeedSync: boolean; // 是否需要同步
  templateName: string; // 模板包名称
}

// 使用的时候，git暂缓区中不要存在变更
export default async function sync(options: AsyncProps) {
  const tool = new SyncTools(options);
  await tool.sync();
}
