---
title: 整合包
order: 20
---

# 整合包

## 部署整合包

### 1. 克隆主仓库

> 启动器推荐首选 HMCL，备选方案为 PCL2 和 Prism。

使用 Git 图形客户端或命令行将 `Beyond-The-Wake` 仓库克隆至启动器的实例文件夹下。

**注意克隆到本地的路径不要填错**，你可以参考以下路径直接复制粘贴：

- HMCL、PCL2：`xxx\.minecraft\versions\Beyond-The-Wake`
- Prism：`xxx\instances\Beyond-The-Wake\minecraft`

这里最好不要将 `Beyond-The-Wake` 这个名字换掉，方便下一步操作。

### 2. 安装整合包

先在群内找到 `BTW.zip` 和 `BTW-Prism.zip` 两个压缩文件。

使用 HMCL 和 PCL2 启动器的需下载 `BTW.zip`，使用 Prism 启动器需下载 `BTW-Prism.zip`。

下载后拖入启动器安装即可。

> **注意**：实例名称需与刚才克隆到本地的仓库的名字一样（`Beyond-The-Wake`）。
>
> Prism 启动器在安装时需要手动输入实例名称；HMCL 和 PCL2 已设置好，一路默认即可。

### 3. 下载模组

你可以看到我们有一个 `BTW-Packwiz` 仓库，这个仓库就是用于管理模组、材质包等内容的。

安装模组并不复杂，下面将介绍两种方法。

#### 直接启动游戏，等待弹窗下载

> 整合包安装包内置了自动更新所需要的组件，并且已经通过预启动命令连接了 `BTW-Packwiz` 仓库的 Page。

每次启动整合包时，会跳出一个 Packwiz 的弹窗，检查是否有需要更新的文件并下载。

但 Packwiz 所需的网络条件很奇怪，有时候下载地特别缓慢，甚至直接下载不了，出现这种情况你可以看另一种方法。

不过你至少得保证你在浏览器可以正常访问 `github.io`、`CurseForge`、`Modrinth` 这几个页面。

首次部署整合包后需要下载的内容是比较多的，也推荐你直接用下面这种方法下载。

#### 前往 Actions 下载

`BTW-Packwiz` 仓库的工作流会在每次 commit 过后下载所有资源并上传至 [Actions](https://github.com/TeamAurorisla/BTW-Packwiz/actions) 保存 90 天，期间可以手动下载到本地。

除标题为 `pages build and deployment` 以外的运行结果均可下载，找到最新的运行结果即可。

这种情况是在网络不佳的情况下的备用方案，如果 Packwiz 弹窗可以很顺畅地下载资源，你就不用手动下载了。

## 在 VSCode 中打开整合包仓库

打开 Visual Studio Code，然后在左上角文件处选择打开文件夹，再选择整合包仓库文件夹，打开后点击信任按钮。

在 VSCode 中打开仓库可以快速查找并管理所有整合包文件，这对于使用 KubeJS 进行魔改或者更改 config 中的配置文件是非常方便的。

如果你装载了跟 Git 挂钩的插件，还可以在 VSCode 中推送你所做的更改。

## .gitignore 相关

整体采用分级制的方式来存放 `.gitignore` 文件，这样做的好处是每一个 `.gitignore` 内的内容都一目了然，避免臃肿。

### 根目录

根目录使用**<u>白名单模式</u>**，需要上传的文件和目录会在 `.gitignore` 中注明。

其第 1 行的内容为 `/*`，作用就是将整个仓库设置为白名单模式，避免垃圾文件被上传。

### 子目录

子目录使用**<u>黑名单模式</u>**，仅注明被屏蔽的文件和目录。

需要上传的子目录如 `config`、`kubejs` 这些，它们的文件夹下一般也会有一个 `.gitignore` 文件，用于屏蔽不需要上传的文件和目录。

一般默认子目录内的所有文件都上传，如果没有看到 `.gitignore` 文件，就说明这个目录内没有需要屏蔽的东西。

> 需要注意，如果你要将某个<u>子目录</u>上传，比如 `config`，你得事先在<u>根目录</u>的 `.gitignore` 内声明好。
