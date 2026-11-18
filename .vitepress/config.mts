import { defineConfig } from 'vitepress'
import type { DefaultTheme } from 'vitepress/theme'
import { katex } from '@mdit/plugin-katex'
import { withSidebar } from 'vitepress-sidebar'
import { materialReferences } from '../scripts/material-references.mjs'
import { readMaterialRows } from '../scripts/materials-lib.mjs'
import { sortMaterials } from './theme/material-sort.mjs'

const materialRows = readMaterialRows()
const siteBase = process.env.NODE_ENV === 'production' || process.argv.includes('preview') ? '/BTW-Document/' : '/'

// https://vitepress.dev/reference/site-config
const config = withSidebar(
  {
    title: '航迹 · 开发文档',
    description: '航迹整合包开发文档',
    srcDir: 'docs',
    base: siteBase,

    markdown: {
      math: false,
      config: (md) => {
        md.use(katex)
        md.use(materialReferences, { rows: materialRows, base: siteBase })

        const fence = md.renderer.rules.fence
        md.renderer.rules.fence = (...args) => {
          const [tokens, idx] = args
          const token = tokens[idx]
          if (token.info.trim() === 'mermaid') {
            return `<Mermaid id="mermaid-${idx}" graph="${encodeURIComponent(token.content)}"></Mermaid>`
          }
          return fence!(...args)
        }
      }
    },

    themeConfig: {
      // https://vitepress.dev/reference/default-theme-config
      nav: [
        { text: '主页', link: '/' },
        { text: '项目概览', link: '/projects/' }, 
        { text: '环境部署', link: '/development/env-deployment/' }
      ],

      socialLinks: [
        { icon: 'github', link: 'https://github.com/TeamAurorisla/BTW-Document' }
      ],

      search: {
        provider: 'local',
        options: {
          translations: {
            button: {
              buttonText: '搜索文档',
              buttonAriaLabel: '搜索文档'
            },
            modal: {
              noResultsText: '无法找到相关结果',
              resetButtonTitle: '清除查询条件',
              footer: {
                selectText: '选择',
                navigateText: '切换'
              }
            }
          }
        }
      }

      // sidebar 由 vitepress-sidebar 自动生成
    }
  },
  // vitepress-sidebar 选项
  {
    documentRootPath: 'docs',
    useTitleFromFileHeading: true,
    useFolderTitleFromIndexFile: true,
    useFolderLinkFromIndexFile: true,
    hyphenToSpace: true,
    capitalizeFirst: false,
    collapsed: true,
    collapseDepth: 2,
    sortMenusByFrontmatterOrder: true,
    includeRootIndexFile: false,
    excludeFilesByFrontmatterFieldName: 'excludeFromSidebar',
    excludeByGlobPattern: ['api-examples.md', 'markdown-examples.md']
  }
)

function addMaterialEntries(items: DefaultTheme.SidebarItem[]) {
  for (const item of items) {
    if (item.link === '/library/magic-vanilla/arcane-materials/index.md') {
      item.collapsed = true
      item.items = sortMaterials(materialRows).map((material) => ({
        text: material.name,
        link: `/library/magic-vanilla/arcane-materials/items/${encodeURIComponent(material.id)}.html`,
      }))
    } else if (item.items) {
      addMaterialEntries(item.items)
    }
  }
}

if (Array.isArray(config.themeConfig?.sidebar)) addMaterialEntries(config.themeConfig.sidebar)

export default defineConfig(config)
