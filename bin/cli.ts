#!/usr/bin/env ts-node
import {BaseParams, generator} from '../packages/utils';
import chalk from 'chalk';
import childProcess from 'child_process';
import {Command} from 'commander';
import glob from 'fast-glob';
import fs from 'fs-extra';
import inquirer from 'inquirer';
import isGit from 'is-git-repository';
import loading from 'loading-cli';
import lodash from 'lodash';
import os from 'os';
import path from 'path';

const sniff = require('is-ali-intranet');
const tempDir = path.resolve(os.tmpdir(), './template');
const defaultMockData = {
  packageName: 'node',
  author: 'Genluo',
  dir: tempDir,
  description: '测试仓库',
  gitUrl: 'git@gitlab.alibaba-inc.com:test/node.git',
  extParamJsonString: '',
};


const program = new Command();
program
    .command('list')
    .description('展示仓库中的模板')
    .action(async (options) => {
      const load = loading('寻找模板中...').start();
      const templateList = await getTemplateList();
      templateList.map((template, index) => {
        console.log(chalk.blue(`${index + 1}. ${template}`));
      });
      load.succeed('执行完成');
    });

program
    .command('test')
    .description('测试某个模板库')
    .action(async (_, otherParams) => {
      let templateDirPath = '';
      if (otherParams?.length) {
        templateDirPath = await getTemplateDir(otherParams[0]);
        if (!templateDirPath) {
          return console.error(
              chalk.red(`不存在包名称或者文件夹路径的包：${otherParams[0]}`),
          );
        }
      }
      if (!templateDirPath) {
        const inquirerList = await (await getAllTemplate()).map((info) => {
          return {
            name: info.packageName,
            value: info.dirPath,
          };
        });
        const choiceValue = await inquirer.prompt([
          {
            type: 'list',
            name: 'templateName',
            message: '请选择一个你需要测试的模板',
            choices: inquirerList,
          },
        ]);
        templateDirPath = await getTemplateDir(choiceValue.templateName);
      };
      const load = loading('创建测试仓库中...').start();
      await deleteTemp();
      await createTest(templateDirPath);
      setTimeout(async () => {
        load.text = '安装测试仓库依赖中....';
        await openVsCodeAndInstallDep();
        load.succeed('测试仓库准备完毕');
      }, 10000);
    });

program.parse(process.argv);

interface PackageInfo {
  packageName: string;
  version: string;
  author: string;
}

function getPackageInfo(packagePath: string): PackageInfo {
  const content = require(packagePath);

  return {
    packageName: content.name,
    version: content.version,
    author: content.author,
  };
}

interface TemplateInfo extends PackageInfo {
  dirPath: string;
  dirName: string;
}

async function getAllTemplate() {
  const pattern = path.resolve(
      __dirname,
      '../packages/*/template/ignore/_gitignore',
  );
  const allMockInit = await glob(pattern);
  const allTemplateInfo: TemplateInfo[] = allMockInit.map((mockInit) => {
    const templatePackagePath = path.join(mockInit, '../../../package.json');
    return {
      ...getPackageInfo(templatePackagePath),
      dirPath: path.dirname(templatePackagePath),
      dirName: path.basename(path.dirname(templatePackagePath)),
    };
  });
  return allTemplateInfo;
}

async function getTemplateList() {
  const templateInfoList = await getAllTemplate();
  const list: string[] = [];
  templateInfoList.map((info) => {
    list.push(`${info.packageName}@${info.version}`);
  });
  return list;
}

async function getTemplateDir(nameOrDirName: string) {
  const allTemplate = await getAllTemplate();
  const currentTemplate =
    lodash.find(allTemplate, {packageName: nameOrDirName}) ||
    lodash.find(allTemplate, {dirPath: nameOrDirName}) ||
    lodash.find(allTemplate, {dirName: nameOrDirName});

  if (currentTemplate) {
    return currentTemplate.dirPath;
  }
  return '';
}

async function deleteTemp() {
  return fs.remove(tempDir);
}

async function createTest(templateDirPath: string) {
  const mockPath = path.resolve(templateDirPath, './mock.ts');
  const mockData: BaseParams = await (!fs.existsSync(mockPath) ?
    defaultMockData :
    import(mockPath).then(
        (createMock) => createMock.default(tempDir) as BaseParams)
  );
  generator({
    templateDir: templateDirPath,
    options: mockData,
  });
}

async function isInsideNetWork() {
  try {
    const isInside = await sniff();
    return isInside.isAliIntranet;
  } catch {
    return false;
  }
}

async function openVsCodeAndInstallDep() {
  if (!isGit(tempDir)) {
    await runCommand('git init');
  };
  if (await isInsideNetWork()) {
    await runCommand('tnpm i');
  } else {
    console.log(chalk.red('目前不处于阿里内网环境，请连接内网之后手动安装依赖!'));
  }
  await runCommand('code ./');
}

function runCommand(cmd: string) {
  return new Promise<void>(async (resolve, reject) => {
    if (!isGit(tempDir) && cmd !== 'git init') {
      await runCommand('git init');
    }
    childProcess.exec(
        cmd,
        {
          cwd: tempDir,
          timeout: 200000,
        },
        (error) => {
          if (error) reject(error);
          resolve();
        },
    );
  });
}
