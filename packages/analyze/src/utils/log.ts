import fs from 'fs-extra';
import path from 'path';
import SyncTools from './syncTools';
const loading = require('ora');

const loadingOra: string[] = [];
function getInfo() {
  const currentPackage = fs.readJsonSync(path.join(__dirname, '../../package.json'));
  return {
    version: currentPackage.version, // 工具包版本
  };
};

export function onUnexpectedError(error: Error, instance: SyncTools) {
  // 日志添加
  function indent(str: string = ''): string {
    return '\n  ' + str.trim().split('\n').join('\n  ');
  }

  const { version } = getInfo();

  const log = [];
  // base info
  log.push(`Arguments: ${indent(process.argv.join(' '))}`);
  log.push(`PATH: ${indent(process.env.PATH || 'undefined')}`);
  log.push(`Analyze version: ${indent(version)}`);
  log.push(`Node version: ${indent(process.versions.node)}`);
  log.push(`Platform: ${indent(process.platform + ' ' + process.arch)}`);

  // execute info
  const baseInfo: string[] = [];
  baseInfo.push(`cwd: ${instance.cwd}`);
  baseInfo.push(`templateName: ${instance.templateName}`);
  baseInfo.push(`targetVersion: ${instance.targetVersion}`);
  baseInfo.push(`currentBranchCommitHashList: ${instance.currentBranchCommitHashList?.join(' ')}`);
  log.push(`BaseInfo: ${indent(baseInfo.join('\n'))}`);

  // process info
  log.push(`ProcessInfo: ${indent(loadingOra.join('\n'))}`);

  // Trace info
  log.push(`Trace: ${indent(error?.stack)}`);
  writeErrorReport(log);
}

function writeErrorReport(log: string[]) {
  const logFilePath = path.join(process.cwd(), './template-sync-error.log');
  fs.removeSync(logFilePath);
  fs.ensureFileSync(logFilePath);
  try {
    fs.writeFileSync(logFilePath, log.join('\n\n') + '\n');
  } catch {}
}


export function ora(message: string) {
  const ora = loading(message);
  loadingOra.push(`start: ${message}`);

  return new Proxy(ora, {
    get(target, key) {
      switch (key) {
        case 'succeed': {
          return (message: string) => {
            loadingOra.push(`succeed: ${message}`);
            target[key](message);
          };
        };
        case 'fail': {
          return (message: string) => {
            loadingOra.push(`fail: ${message}`);
            target[key](message);
          };
        }
      }
      return target[key];
    },
    set(target, key, value) {
      if (key === 'text') {
        loadingOra.push(`change: ${value}`);
      }
      target[key] = value;
      return true;
    },
  });
};
