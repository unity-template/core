export class SyncToolsError extends Error {
  static NotExist(templateName: string) {
    return new SyncToolsError(`${templateName} 不存在`);
  }

  static PatchFileError(filePath: string) {
    return new SyncToolsError(`git apply ${filePath} 执行报错，请检查`);
  }

  static CreatNewSyncBranch() {
    return new SyncToolsError('创建分支报错推送origin报错');
  }

  static MergeConflict() {
    return new MergeConflictError('merge分支报错，请检查');
  }
};

export class MergeConflictError extends SyncToolsError {};
