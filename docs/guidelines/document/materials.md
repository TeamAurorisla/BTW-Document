---
title: 奥法新生材料维护
---

# 奥法新生材料维护

奥法新生材料以 `data/arcane_materials.sqlite` 为日常维护来源，主表为 `arcane_materials`。Library 文件夹中的 Excel 表单是早期手稿与导出文档，请勿编辑。

通用的编辑流程、自动引用语法、构建和变更报告见 [数据库与自动引用](./database.md)。本页说明材料表的字段和业务规则，页面位于“资料库 → 法术系统 原版 → [材料列表](../../library/magic-vanilla/arcane-materials/)”。

## 编辑材料

使用 DB Browser for SQLite 等图形工具打开数据库，在“浏览数据”中选择 `arcane_materials`，编辑后写入并关闭数据库连接，再运行构建或提交 Git。

| 字段 | 内容 |
| --- | --- |
| `id` | 稳定 ID，必填且唯一。使用小写 `snake_case`，如 `ink_crystal`。原版材料沿用 Minecraft ID 的路径部分，如 `quartz`。 |
| `name` | 显示名称，必填且唯一 |
| `origin` | 原版、新增 |
| `category` | 原材料、战利品、加工品、源质 |
| `description` | 描述，支持 Markdown 与材料引用 |
| `uses` | 用途；多项用英文分号分隔 |
| `stage` | 1、2、3、4、5、通用 |
| `school` | 流派；多项用英文分号分隔 |
| `acquisition` | 获取与配方的文本说明，支持 Markdown 与材料引用 |
| `notes` | 可选备注，支持 Markdown 与材料引用 |
| `family` | 可选材料族 |

用途选项：法术编纂、法杖合成、法术精进、辅助材料、通用材料。

流派选项：炽焰、风暴、寒冰、磐石、神圣、通用。“通用”按独立选项保留。

## 页面与引用

描述、获取与配方、备注支持 Markdown 与材料引用，例如 [[arcane_materials:sulfur]]，也可以自定义显示为 [[arcane_materials:sulfur|硫晶]]。详情页同时展示同族材料，以及引用此材料的文档。旧中文详情页地址会跳转到新地址。

配方保留在 `acquisition` ，目前是文本，将来计划实现 JSON 配方解析功能

目前没有图标参数，同样也是将来计划实现。

## 变更报告规则

流派、用途按集合比较，调整分号项的顺序不会产生修改记录。其他字段按内容比较，报告保存到 `.report/materials-report.md`。
