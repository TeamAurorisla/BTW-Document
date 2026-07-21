import { defineConfig } from 'vitepress'
import { katex } from '@mdit/plugin-katex'
import { withSidebar } from 'vitepress-sidebar'

// https://vitepress.dev/reference/site-config
export default withSidebar(
  {
    title: '航迹 · 开发文档',
    description: '航迹整合包开发文档',
    srcDir: 'docs',

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
        { text: '示例', link: '/examples/' },
        { text: 'LaTeX', link: '/examples/latex' },
        { text: 'Mermaid', link: '/examples/mermaid' }
      ],

      socialLinks: [
        { icon: 'github', link: 'https://github.com/vuejs/vitepress' }
      ]

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
