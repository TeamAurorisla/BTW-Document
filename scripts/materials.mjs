import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import MarkdownIt from 'markdown-it'
import { katex } from '@mdit/plugin-katex'
import {
  DATABASE_PATH, ROOT, GENERATED_ITEMS, GENERATED_DATA, FIELDS, LEGACY_MATERIAL_IDS,
  VALID_ORIGINS, VALID_CATEGORIES, readMaterialRows, splitTags,
  escapeHtml, safeRouteId, writeJson,
} from './materials-lib.mjs'
import { materialReferences } from './material-references.mjs'

const STAGES = new Set(['1', '2', '3', '4', '5', '通用'])
const SCHOOLS = new Set(['炽焰', '风暴', '寒冰', '磐石', '神圣', '通用'])
const USES = new Set(['法术编纂', '法杖合成', '法术精进', '辅助材料', '通用材料'])

export function validateDatabase(databasePath = DATABASE_PATH) {
  if (!fs.existsSync(databasePath)) throw new Error(`数据库不存在：${databasePath}`)
  const database = new DatabaseSync(databasePath, { readOnly: true })
  let rows
  try {
    const integrity = database.prepare('PRAGMA integrity_check').all()
    if (integrity.some((row) => Object.values(row)[0] !== 'ok')) throw new Error('SQLite 完整性检查失败')
    const columns = database.prepare('PRAGMA table_info(arcane_materials)').all()
    for (const field of FIELDS) {
      if (!columns.some((column) => column.name === field)) throw new Error(`arcane_materials 缺少字段 ${field}`)
    }
    rows = database.prepare(`SELECT ${FIELDS.join(', ')} FROM arcane_materials ORDER BY id`).all()
  } finally {
    database.close()
  }
  const errors = []
  const ids = new Set()
  const routeIds = new Set()
  for (const row of rows) {
    const label = row.id || '(空 ID)'
    for (const field of ['id', 'name', 'origin', 'category', 'stage']) {
      if (typeof row[field] !== 'string' || !row[field].trim()) errors.push(`${label}: ${field} 不能为空`)
    }
    if (typeof row.id !== 'string' || !/^[a-z0-9]+(?:_[a-z0-9]+)*$/.test(row.id)) errors.push(`${label}: ID 必须为小写 snake_case，仅使用英文字母和数字，并以下划线分隔`)
    if (ids.has(row.id)) errors.push(`${label}: 重复 ID`)
    ids.add(row.id)
    const routeId = safeRouteId(row.id).toLowerCase()
    if (routeIds.has(routeId)) errors.push(`${label}: 页面路径重复（忽略大小写）`)
    routeIds.add(routeId)
    if (!VALID_ORIGINS.has(row.origin)) errors.push(`${label}: 未知来源 ${row.origin}`)
    if (!VALID_CATEGORIES.has(row.category)) errors.push(`${label}: 未知类别 ${row.category}`)
    if (!STAGES.has(row.stage)) errors.push(`${label}: 未知阶段 ${row.stage}`)
    for (const [field, allowed] of [['school', SCHOOLS], ['uses', USES]]) {
      if (typeof row[field] !== 'string') { errors.push(`${label}: ${field} 必须为文本`); continue }
      const tags = splitTags(row[field])
      if (!tags.length) errors.push(`${label}: ${field} 不能为空`)
      for (const tag of tags) if (!allowed.has(tag)) errors.push(`${label}: ${field} 未知选项 ${tag}`)
      if (new Set(tags).size !== tags.length) errors.push(`${label}: ${field} 包含重复选项`)
    }
    for (const field of ['description', 'acquisition']) {
      if (typeof row[field] !== 'string') errors.push(`${label}: ${field} 必须为文本（可留空）`)
    }
    for (const field of ['notes', 'family']) {
      if (row[field] !== null && typeof row[field] !== 'string') errors.push(`${label}: ${field} 必须为文本或 NULL`)
    }
    if (row.name_en !== null && (typeof row.name_en !== 'string' || !row.name_en.trim())) {
      errors.push(`${label}: name_en 必须为非空文本或 NULL`)
    }
  }
  if (errors.length) throw new Error(errors.join('\n'))
  return rows
}

function walkMarkdown(directory) {
  if (!fs.existsSync(directory)) return []
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filePath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === '.vitepress' || filePath === GENERATED_ITEMS) return []
      return walkMarkdown(filePath)
    }
    return entry.name.endsWith('.md') ? [filePath] : []
  })
}

function markdownBody(source) {
  return source.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, '')
}

export function validateAllReferences(rows, docsDirectory = path.join(ROOT, 'docs')) {
  const references = new Map(rows.map((row) => [row.id, new Map()]))
  const md = new MarkdownIt().use(katex).use(materialReferences, {
    rows,
    onReference({ id, source }) {
      if (source.startsWith('arcane_materials:')) return
      references.get(id).set(source, source)
    },
  })
  for (const row of rows) {
    for (const field of ['description', 'acquisition', 'notes']) {
      md.parse(row[field] ?? '', { sourceName: `arcane_materials:${row.id}.${field}` })
    }
  }
  for (const filePath of walkMarkdown(docsDirectory)) {
    md.parse(markdownBody(fs.readFileSync(filePath, 'utf8')), { sourceName: path.relative(docsDirectory, filePath).replaceAll('\\', '/') })
  }
  return references
}

function metadataText(value) {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('|', '\\|').replaceAll('\n', ' ')
}

const generatedMarker = '<!-- Generated from data/arcane_materials.sqlite. Edit the database. -->'

export function generateMaterials(rows, references) {
  fs.mkdirSync(GENERATED_ITEMS, { recursive: true })
  const wanted = new Set()
  for (const row of rows) {
    const filename = `${safeRouteId(row.id)}.md`
    wanted.add(filename)
    const sameFamily = row.family ? rows.filter((other) => other.family === row.family && other.id !== row.id) : []
    const backlinks = [...(references.get(row.id)?.keys() ?? [])]
    const content = [
      '---', `title: ${JSON.stringify(row.name)}`, 'aside: true', 'excludeFromSidebar: true', 'prev: false', 'next: false', '---', '',
      generatedMarker, '',
      '[返回材料列表](../)', '', `# ${metadataText(row.name)}`, '',
      ...(row.name_en ? [`<p lang="en">${escapeHtml(row.name_en)}</p>`, ''] : []),
      '| 来源 | 类别 | 阶段 | 流派 |', '| --- | --- | --- | --- |',
      `| ${metadataText(row.origin)} | ${metadataText(row.category)} | ${metadataText(row.stage)} | ${metadataText(splitTags(row.school).join('、'))} |`, '',
      '## 描述', '', row.description || '暂未填写。', '',
      '## 获取与配方', '', row.acquisition || '暂未填写。', '',
      '## 用途', '', ...splitTags(row.uses).map((use) => `- ${use}`), '',
      ...(row.notes ? ['## 备注', '', row.notes, ''] : []),
      ...(row.family ? ['## 同族材料', '', `族：${metadataText(row.family)}`, '',
        ...(sameFamily.length ? sameFamily.map((other) => `- [[arcane_materials:${other.id}]]`) : ['暂无其他同族材料。']), ''] : []),
      ...(backlinks.length ? ['## 引用此材料的文档', '', ...backlinks.map((source) => {
        const sourceText = fs.readFileSync(path.join(ROOT, 'docs', source), 'utf8')
        const title = /^#\s+(.+)$/m.exec(sourceText)?.[1] ?? path.basename(source, '.md')
        return `- [${metadataText(title)}](/${source.replace(/\.md$/, '')})`
      }), ''] : []),
    ].join('\n')
    fs.writeFileSync(path.join(GENERATED_ITEMS, filename), content, 'utf8')
  }

  const materialsById = new Map(rows.map((row) => [row.id, row]))
  for (const [oldId, currentId] of Object.entries(LEGACY_MATERIAL_IDS)) {
    const material = materialsById.get(currentId)
    if (!material) continue
    const filename = `${oldId}.md`
    const head = [['meta', { 'http-equiv': 'refresh', content: `0;url=./${currentId}.html` }]]
    const content = [
      '---', `title: ${JSON.stringify(material.name)}`, 'layout: page', 'excludeFromSidebar: true',
      'search: false', `head: ${JSON.stringify(head)}`, '---', '', generatedMarker, '',
      `[前往${metadataText(material.name)}的详情页](./${currentId}.md)`, '',
    ].join('\n')
    wanted.add(filename)
    fs.writeFileSync(path.join(GENERATED_ITEMS, filename), content, 'utf8')
  }
  // Only remove files emitted by this generator, never unrelated files.
  for (const filename of fs.readdirSync(GENERATED_ITEMS)) {
    if (!filename.endsWith('.md') || wanted.has(filename)) continue
    const filePath = path.join(GENERATED_ITEMS, filename)
    if (fs.readFileSync(filePath, 'utf8').includes(generatedMarker)) fs.unlinkSync(filePath)
  }
  writeJson(GENERATED_DATA, rows.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN')).map((row) => ({
    ...row,
    uses: splitTags(row.uses), school: splitTags(row.school),
    url: `/library/magic-vanilla/arcane-materials/items/${encodeURIComponent(safeRouteId(row.id))}.html`,
  })))
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.join(ROOT, 'scripts', 'materials.mjs')) {
  const command = process.argv[2] ?? 'check'
  if (!['check', 'generate'].includes(command)) throw new Error('用法：node scripts/materials.mjs check|generate')
  const rows = validateDatabase()
  const references = validateAllReferences(rows)
  if (command === 'generate') generateMaterials(rows, references)
  console.log(`${command}: ${rows.length} 条材料，数据库与引用校验通过`)
}
