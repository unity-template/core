### 一、工具库说明

> 项目采用TS开发，如果调试过程中发现改动代码一直没有执行，请尝试重新构建项目再运行

#### 1. 项目启动

* npm run bootstrap


#### 2. 依赖删除

* lerna clean # 清除所有依赖

#### 3. 新增模板

* lerna create # 创建包名

#### 4. 安装|删除依赖

* yarn add -W -D commitizen # 给当前workspace 安装相应的依赖，不针对任何一个package
* lerna add package : 为所有包安装此依赖
* lerna add <packageName> [--scope=<local_package_name>] # 为local_package_name安装packageName

#### 5. 项目构建
* npm run build

> lerna支持按照拓扑排序规则执行命令, --sort参数可以控制以拓扑排序规则执行命令


#### 6. 项目发布
* lerna publish

#### 7. 项目调试
* vscode 切换到 debugger terminal
* 执行./bin/cli.ts test 可以直接在vscode断点调试
* 项目根目录执行 cli -h 命令查看参数
### 二、template说明

#### 1. 目录说明

* template: 项目模板
* init.ts： 生成模板函数
* mock.json：mock生成模板的数据
* tmp：本地测试目录

#### 2. 模板调试

* 参考项目调试部分

#### 3.项目发布(只允许master分支发布)

* npm  run publish

### 三、版本控制

* 查看版本变更：lerna changed
* 查看更改的具体内容： lerna diff
* 版本发布： lerna publish
* 

### 四、yarn workspace相关命令

* yarn install # 安装依赖项
* yarn workspaces run clean  # 清除项目中所有 node_modules
* yarn workspaces info # 当前workspaces 信息
* yarn workspaces run # 工作区运行命令

* yarn add        # 添加 package
* yarn init       # 初始化
* yarn publish    # 发布
* yarn remove     # 删除

* yarn workspace  # 具体某个工作区的相关命令

### 五、lerna 相关命令

* lerna bootstrap  # 安装所有依赖项并链接任何交叉依赖项
* 
* lerna exec       # 在每个包中执行任意命令
* 
* lerna add        # 安装依赖，支持交叉依赖
* 
* lerna changed    # 检查自上次发布以来哪些软件包已经更新
* lerna diff       # 自上次发布以来，对所有包或单个包进行区分
* lerna publish    # 发布版本
* 
* lerna clean      # 清除项目中所有 node_modules
* lerna init       # 初始化项目
* lerna create     # 创建项目中的子package
* 
* lerna run        # 在包含该脚本的包中运行 npm 脚本
* lerna info       # 查看信息
* lerna import     # 导入
* lerna link       # 软链
* lerna version    # 查看版本
* lerna ls         # 列出当前 lerna 项目中的公共包
* lerna version  --conventional-commits # --conventional-commits用于生成changelog
* lerna ls --graph --all # 查看项目的依赖关系


### 六、相关依赖

* [eslint、stylelint、prettier、commitlint相关配置](https://github.com/ice-lab/spec)