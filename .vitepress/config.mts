import { defineConfig } from 'vitepress'
import { katex } from '@mdit/plugin-katex'
import { withSidebar } from 'vitepress-sidebar'

// https://vitepress.dev/reference/site-config
export default withSidebar(
  {
    title: '航迹 · 开发文档',
    description: '航迹整合包开发文档',
    srcDir: 'docs',
    base: process.env.NODE_ENV === 'production' ? '/BTW-Document/' : '/',

    markdown: {
      math: false,
      config: (md) => {
        md.use(katex)

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
        { text: 'Home', link: '/' },
        { text: '项目概览', link: '/projects/' }, 
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
    excludeByGlobPattern: ['api-examples.md', 'markdown-examples.md']
  }
)
