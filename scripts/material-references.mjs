import { escapeHtml, safeRouteId } from './materials-lib.mjs'

/** Inline rule: fenced/inline code and math are consumed by their own Markdown rules. */
export function materialReferences(md, { rows, base = '/', onReference } = {}) {
  const lookup = new Map(rows.map((row) => [row.id, row]))
  md.inline.ruler.before('link', 'material_reference', (state, silent) => {
    const start = state.pos
    if (!state.src.startsWith('[[', start) || state.linkLevel > 0) return false
    const match = /^\[\[([a-zA-Z_][\w-]*):([^\]\n|]+)(?:\|([^\]\n]+))?\]\]/.exec(state.src.slice(start))
    if (!match) return false
    const [, table, rawId, customLabel] = match
    const id = rawId.trim()
    const row = table === 'arcane_materials' ? lookup.get(id) : undefined
    const source = state.env.relativePath ?? state.env.path ?? state.env.sourceName ?? 'Markdown'
    if (!row) throw new Error(`${source}: 无效引用 [[${table}:${id}]]（表或 ID 不存在）`)
    if (!silent) {
      onReference?.({ table, id, source })
      const token = state.push('material_reference', '', 0)
      token.meta = { id, name: row.name, label: customLabel?.trim() || row.name }
    }
    state.pos += match[0].length
    return true
  })
  md.renderer.rules.material_reference = (tokens, index) => {
    const { id, name, label } = tokens[index].meta
    const href = `${base.replace(/\/$/, '')}/library/magic-vanilla/arcane-materials/items/${encodeURIComponent(safeRouteId(id))}.html`
    return `<a class="material-reference" href="${escapeHtml(href)}" title="${escapeHtml(name)}">${escapeHtml(label)}</a>`
  }
}
