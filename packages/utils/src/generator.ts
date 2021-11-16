import fs from 'fs-extra';
import path from 'path';
import { BaseParams, GeneralTemplate, Template } from './template';
import { default as ora } from 'ora';
import {
  DownloadConfig,
  getAndExtractTarball,
  getNpmTarball,
  isAliNpm,
} from './utils/npm';
import { JsonObject } from 'type-fest';
import { spawnSync } from 'child_process';

export { DownloadConfig };

export interface GeneratorOptions {
  templateDir: string;
  options: BaseParams;
}
export async function generator(
    params: GeneratorOptions,
) {
  const {options, templateDir} = params;
  // current template resolve dir
  const currentTemplateDir = path.isAbsolute(templateDir) ?
    templateDir :
    path.resolve(process.cwd(), templateDir);

  const customerTemplatePath = path.resolve(
      currentTemplateDir,
      './build/template.js',
  );

  const templatePackageJson = fs.readJsonSync(path.join(templateDir, './package.json'));

  if (fs.existsSync(customerTemplatePath)) {
    const isAliNpmPackage = isAliNpm(templatePackageJson.name);
    const cli = isAliNpmPackage ? 'tnpm' : 'npm';
    try {
      spawnSync(cli, ['install'], {
        cwd: templateDir,
      });
    } catch (error) {
      // TODO: 包安装报错，需要进行处理
      console.log('包安装报错', error);
    }
  }

  // current template instance
  const currentTemplate: Template = await (
  !fs.existsSync(customerTemplatePath) ?
  new GeneralTemplate({templateDir: currentTemplateDir}) :
  import(customerTemplatePath).then(
      (CustomerTemplateModule) => {
        const CustomerTemplate = CustomerTemplateModule.default;
        return new CustomerTemplate({templateDir: currentTemplateDir}) as Template;
      })
  );

  let extParams!: JsonObject;
  try {
    extParams = JSON.parse(options.extParamJsonString);
  } catch {
    extParams = {};
  }

  await currentTemplate.write({
    ...options,
    extParams,
    templateName: templatePackageJson.name,
    templateVersion: templatePackageJson.version,
  });
}

export interface DownloadMaterialTemplate {
  dir: string;
  pkgName: string;
  registry?: string;
  version?: string;
  isNotEmptyDir?: boolean;
  config?: DownloadConfig;
}
export async function downloadMaterialTemplate({
  dir,
  pkgName,
  registry,
  version,
  isNotEmptyDir,
  config,
}: DownloadMaterialTemplate): Promise<void> {
  !isNotEmptyDir && await fs.emptyDir(dir);
  const isLocalPath = /^[./]|(^[a-zA-Z]:)/.test(pkgName);
  if (isLocalPath) {
    await fs.copy(pkgName, dir);
  } else {
    const tarballURL = await getNpmTarball(
        pkgName,
        version || 'latest',
        registry,
    );
    console.log('download template tarball', tarballURL);
    const spinner = ora('download npm tarball start').start();
    await getAndExtractTarball(
        dir,
        tarballURL,
        (state) => {
          spinner.text = `download npm tarball progress: ${Math.floor(
              state.percent * 100,
          )}%`;
        },
        // format filename
        (filename) => {
          return filename;
        },
        config,
    );
    spinner.succeed('download npm tarball successfully.');
  }
}
