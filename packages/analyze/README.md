# `onex-template-version-analyze`

[![version](http://web.npm.alibaba-inc.com/badge/v/onex-template-version-analyze.svg?style=flat-square)](https://web.npm.alibaba-inc.com/package/onex-template-version-analyze) [![](http://web.npm.alibaba-inc.com/badge/d/onex-template-version-analyze.svg?style=flat-square)](https://web.npm.alibaba-inc.com/package/onex-template-version-analyze)

针对现有的模板初始化的流程中添加了以下的能力：
* 补丁(patch、diff)文件分析
* 仓库和模板进行关联，同步


## 目录
  - [项目背景](#%E9%A1%B9%E7%9B%AE%E8%83%8C%E6%99%AF)
  - [功能特性](#%E5%8A%9F%E8%83%BD%E7%89%B9%E6%80%A7)
      - [1. patch 文件分析](#1-patch-%E6%96%87%E4%BB%B6%E5%88%86%E6%9E%90)
      - [2. template 版本分析](#2-template-%E7%89%88%E6%9C%AC%E5%88%86%E6%9E%90)
      - [3. sync 同步](#3-sync-%E5%90%8C%E6%AD%A5)
  - [安装](#%E5%AE%89%E8%A3%85)
  - [使用](#%E4%BD%BF%E7%94%A8)
  - [维护人员](#%E7%BB%B4%E6%8A%A4%E4%BA%BA%E5%91%98)


## 项目背景
我们项目使用`generator`进行初始化，短时间来看是没什么问题，但是在我们在长时间的使用过程中，我们发现了一些问题：

1. 集团构建器的升级，之后会强制要求进行升级，否则不允许发布新版本，随着我们使用这个模板创建的仓库越来越多，我们跟随集团升级仓库的成本就越来越高


2. 如果模板添加新的能力或者修改了存在问题文件，如何通知到使用这个模板创建的仓库，持续为仓库提供一些能力的补充，这个目前来看是做不到。随着时间的进行，针对这些持续维护的仓库将和模板越来越分化，不利于后期的统一维护，和我们使用`generator`初始化仓库的初心越来越远

为了解决这些问题，我们思考是否可以将模板和初始化之后的仓库关联起来，建立模板和仓库之间的关系，建立这些关系之后，我们就可以通过这些关系来做到仓库和模板之间的同步。

## 功能特性

#### 1. patch 文件分析

整个工具处理流程需要分析`git diff`的内容，我们将这个能力暴露出来提供给其他地方使用，后续可能拆分这个能力，举例说明下这个能力：
```patch
diff --git a/src/events/http/HttpServer.js b/src/events/http/HttpServer.js
index 20bf454..c0fdafb 100644
--- a/src/events/http/HttpServer.js
+++ b/src/events/http/HttpServer.js
@@ -770,7 +770,9 @@ export default class HttpServer {
           override: false,
         })
 
-        if (result && typeof result.body !== 'undefined') {
+        if (typeof result === 'string') {
+          response.source = JSON.stringify(result)
+        } else if (result && typeof result.body !== 'undefined') {
           if (result.isBase64Encoded) {
             response.encoding = 'binary'
             response.source = Buffer.from(result.body, 'base64')
-- 
2.21.1 (Apple Git-122.3)
```
通过分析之后，生成如下json描述：

```json
{
  "files": [
    {
      "added": false,
      "afterName": "src/events/http/HttpServer.js",
      "beforeName": "src/events/http/HttpServer.js",
      "deleted": false,
      "modifiedLines": [
        {
          "added": false,
          "line": "        if (result && typeof result.body !== 'undefined') {",
          "lineNumber": 774
        },
        {
          "added": true,
          "line": "        if (typeof result === 'string') {",
          "lineNumber": 774
        },
        {
          "added": true,
          "line": "          response.source = JSON.stringify(result)",
          "lineNumber": 775
        },
        {
          "added": true,
          "line": "        } else if (result && typeof result.body !== 'undefined') {",
          "lineNumber": 776
        }
      ]
    }
  ]
}
```

#### 2. template 版本分析
`template`版本分析分能力，就是针对多个模板初始化的仓库进行`diff`，生成一份多个模板初始化仓库之间的补丁(`patch`)文件，便于后续的仓库同步，整个模板流程简化处理如下：

![](/packages/analyze/assets/template分析.png)

#### 3. sync 同步
针对使用`template`初始化的仓库，通过`onex-template-version-analyze`提供项目同步的功能，保持仓库持续和模板同步更新。

整体的同步流程简单介绍下，首先我们会在原有的仓库的首次提交的`commit`上切换一个`sync`分支，这个分支用于同步`template`的变化，每次`template`变动之后，我们会在`sync`分支上，获取当前版本到最新版本的补丁（`patch`）文件，之后应用这个补丁更新更新初始化仓库，使用`git merge`将sync分支合并到当前的分支之上，从而完整整个过程

![](/packages/analyze/assets/同步流程.png)

## 安装

首先全局安装
> tnpm install --global onex-template-version-analyze

判断是否全局安装成功，存在template-sync命令
> which template-sync

## 使用
「**注意**」工具目前没有拆分出来，和template的整套流程是强关联的，无法单独使用。

如果开发的模板需要支持模板同步的能力，需要在对应的模板的`_package.json`添加如下`syncConfig`配置和相关依赖及其命令，具体配置项如下：

```json
{
  "scripts": {
    "sync": "./node_modules/.bin/template-sync"
  },
  "devDependencies": {
    "onex-template-version-analyze": "^1.0.25"
  },
  "syncConfig": {
    "isNeedSync": true,
    "baseVersion": "<%=templateVersion%>",
    "templateName": "<%=templateName%>",
    "config": {
      "description": "<%=description%>",
      "packageName": "<%=packageName%>",
      "author": "<%=author%>",
      "gitUrl": "<%=gitUrl%>"
    }
  }
}
```
## 维护人员
[@云墨](https://work.alibaba-inc.com/nwpipe/u/208143?spm=a1z2e.8101737.persons.2.1bf24f9bndkRnS)

