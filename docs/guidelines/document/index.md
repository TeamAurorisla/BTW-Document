---
order: 0
---

# 文档指南

文档通过 VitePress 构建，使用 GitHub Pages 托管。你可以通过向 [Github 仓库](https://github.com/TeamAurorisla/BTW-Document) 推送提交以自动化更新文档。文档位于 `docs` 目录下，使用 Markdown 语法编写。你可以在本地使用 `npm run docs:dev` 进行预览和调试。

文档内容没有过多要求，只要清晰明了，结构合理，方便阅读和理解即可,可以参考其他文档的内容编写，具体的内容规范和插件使用可以查看后续章节的说明。

::: tip 关于标题和命名
除了资料库等列表类条目外，不推荐中文作文件名，否则生成的 URL 包含转义字符，可读性较差，难以分享。我们使用 `VitePress Sidebar` 插件自动生成侧边栏，条目的标题由 frontmatter 的 `title` 字段或文件第一个一级标题（`#`）决定。详情请查阅 [边栏排序与标题](./sidebar.md)。
:::