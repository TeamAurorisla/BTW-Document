import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import Mermaid from './Mermaid.vue'
import MaterialCatalog from './MaterialCatalog.vue'
import 'katex/dist/katex.min.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('Mermaid', Mermaid)
    app.component('MaterialCatalog', MaterialCatalog)
  }
} satisfies Theme
