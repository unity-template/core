import editor, {Editor} from 'mem-fs-editor';
import memFS from 'mem-fs';
import {commit} from './decorator';
import glob from 'glob';
import path from 'path';
import { JsonObject } from 'type-fest';
export interface BaseParams {
  /**
   *模板输出的目录
   *
   * @type {string}
   * @memberof BaseParams
   */
  dir: string;
  /**
   *包描述
   *
   * @type {string}
   * @memberof Params
   */
  description?: string;
  /**
   *工具包名称
   *
   * @type {string}
   * @memberof Params
   */
  packageName: string;
  /**
   *作者
   *
   * @type {string}
   * @memberof Params
   */
  author: string;
  /**
   *git url对应的地址
   *
   * @type {string}
   * @memberof Params
   */
  gitUrl: string;
  /**
   * 额外的参数
   */
  extParamJsonString?: string;
}

export interface WritePrams extends BaseParams {
  templateName: string,
  templateVersion: string,
  extParams: JsonObject,
}

export abstract class Template {
  templateDir: string;
  edit: Editor;
  constructor({templateDir}) {
    this.edit = editor.create(memFS.create());
    this.templateDir = templateDir ? templateDir : this.currentModulePath;
  }

  get currentModulePath() {
    const dirname = __dirname;
    if (__dirname.endsWith('/build')) {
      return dirname.replace(/\/build$/g, '');
    }
    return dirname;
  }
  public abstract write(params: WritePrams): void;
}


/**
 * 默认的模板生成General
 */
export class GeneralTemplate extends Template {
  @commit
  async write(params: WritePrams) {
    // save normal template
    this.edit.copyTpl(
        `${this.templateDir}/template/normal/**/*`,
        `${params.dir}`,
        params,
    );
    // save ignore file
    const ignorePaths = glob.sync(`${this.templateDir}/template/ignore/*`);
    ignorePaths.forEach((item) => {
      const targetPath = path.resolve(
          params.dir,
          item.replace(this.templateDir + '/template/ignore/_', '.'),
      );
      this.edit.copyTpl(
          item,
          targetPath,
          params,
      );
    });

    // save config file
    const impactPaths = glob.sync(`${this.templateDir}/template/impact/*`);
    impactPaths.forEach((item) => {
      const targetPath = path.resolve(
          params.dir,
          item.replace(this.templateDir + '/template/impact/_', ''),
      );
      this.edit.copyTpl(
          item,
          targetPath,
          params,
      );
    });
  }
}
