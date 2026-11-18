import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { execFileSync } from 'node:child_process'
import { ROOT, FIELDS, normalizeTags, readMaterialRows } from './materials-lib.mjs'

const DATABASE_GIT_PATH = 'data/arcane_materials.sqlite'
const LABELS = {
  id: 'ID', name: '名称', origin: '来源', category: '类别', description: '描述',
  uses: '用途', stage: '阶段', school: '流派', acquisition: '获取与配方', notes: '备注', family: '族',
}

function comparable(field, value) {
  return ['uses', 'school'].includes(field) ? JSON.stringify(normalizeTags(value)) : value
}

export function compareMaterials(beforeRows, afterRows) {
  const before = new Map(beforeRows.map((row) => [row.id, row]))
  const after = new Map(afterRows.map((row) => [row.id, row]))
  const added = afterRows.filter((row) => !before.has(row.id))
  const deleted = beforeRows.filter((row) => !after.has(row.id))
  const modified = []
  for (const row of afterRows) {
    const old = before.get(row.id)
    if (!old) continue
    const changes = FIELDS.filter((field) => field !== 'id' && comparable(field, old[field]) !== comparable(field, row[field]))
      .map((field) => ({ field, before: old[field], after: row[field] }))
    if (changes.length) modified.push({ id: row.id, name: row.name, changes })
  }
  return { added, deleted, modified }
}

function cell(value) {
  if (value === null || value === undefined) return '（空）'
  return String(value)
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('\\', '&#92;').replaceAll('|', '&#124;')
    .replaceAll('`', '&#96;').replaceAll('*', '&#42;').replaceAll('_', '&#95;')
    .replaceAll('[', '&#91;').replaceAll(']', '&#93;')
    .replace(/\r?\n/g, '<br>') || '（空文本）'
}

export function renderReport(diff, { base = '空数据库', head = '工作区' } = {}) {
  const output = ['# 奥法新生材料变更', '', `对比：${cell(base)} → ${cell(head)}`, '',
    `新增 **${diff.added.length}** 条，修改 **${diff.modified.length}** 条，删除 **${diff.deleted.length}** 条。`, '']
  if (!diff.added.length && !diff.modified.length && !diff.deleted.length) output.push('材料数据没有变化。', '')
  for (const [title, rows] of [['新增材料', diff.added], ['删除材料', diff.deleted]]) {
    if (!rows.length) continue
    output.push(`## ${title}`, '')
    for (const row of rows) {
      output.push(`### ${cell(row.name)}（${cell(row.id)}）`, '', '| 字段 | 内容 |', '| --- | --- |')
      for (const field of FIELDS.filter((field) => field !== 'id')) output.push(`| ${LABELS[field]} | ${cell(row[field])} |`)
      output.push('')
    }
  }
  if (diff.modified.length) {
    output.push('## 修改材料', '', '| ID | 名称 | 字段 | 修改前 | 修改后 |', '| --- | --- | --- | --- | --- |')
    for (const row of diff.modified) for (const change of row.changes) {
      output.push(`| ${cell(row.id)} | ${cell(row.name)} | ${LABELS[change.field]} | ${cell(change.before)} | ${cell(change.after)} |`)
    }
    output.push('')
  }
  return output.join('\n')
}

function git(args, options = {}) {
  return execFileSync('git', args, { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], ...options })
}

export function rowsAtRevision(revision, temporaryDirectory, label, repositoryRoot = ROOT) {
  if (!revision || /^0+$/.test(revision)) return []
  // Verify the commit separately: an unavailable base must not silently become an empty database.
  git(['rev-parse', '--verify', `${revision}^{commit}`], { cwd: repositoryRoot })
  const exists = git(['ls-tree', revision, '--', DATABASE_GIT_PATH], { encoding: 'utf8', cwd: repositoryRoot }).trim()
  if (!exists) return []
  const filePath = path.join(temporaryDirectory, `${label}.sqlite`)
  fs.writeFileSync(filePath, git(['show', `${revision}:${DATABASE_GIT_PATH}`], { maxBuffer: 64 * 1024 * 1024, cwd: repositoryRoot }))
  return readMaterialRows(filePath)
}

function eventRevisions() {
  const event = process.env.GITHUB_EVENT_PATH ? JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8')) : null
  if (event?.pull_request) {
    const head = event.pull_request.head.sha
    const base = git(['merge-base', event.pull_request.base.sha, head], { encoding: 'utf8' }).trim()
    return { base, head }
  }
  if (event?.before) return { base: event.before, head: event.after ?? process.env.GITHUB_SHA }
  if (process.env.GITHUB_SHA) {
    const head = process.env.GITHUB_SHA
    const parents = git(['rev-list', '--parents', '-n', '1', head], { encoding: 'utf8' }).trim().split(/\s+/)
    return { base: parents[1] ?? '0000000000000000000000000000000000000000', head }
  }
  return { base: 'HEAD', head: null }
}

function main() {
  const args = process.argv.slice(2)
  const option = (name) => { const index = args.indexOf(name); return index < 0 ? undefined : args[index + 1] }
  const defaults = eventRevisions()
  const base = option('--base') ?? defaults.base
  const head = option('--head') ?? defaults.head
  const outputPath = path.resolve(ROOT, option('--output') ?? '.report/materials-report.md')
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'btw-materials-report-'))
  try {
    const before = rowsAtRevision(base, temporaryDirectory, 'before')
    const after = head ? rowsAtRevision(head, temporaryDirectory, 'after') : readMaterialRows()
    const diff = compareMaterials(before, after)
    const report = renderReport(diff, { base, head: head ?? '工作区' })
    fs.mkdirSync(path.dirname(outputPath), { recursive: true })
    fs.writeFileSync(outputPath, report, 'utf8')
    if (process.env.GITHUB_STEP_SUMMARY) {
      const summary = Buffer.byteLength(report, 'utf8') <= 600_000 ? report
        : renderReport({ added: [], deleted: [], modified: [] }, { base, head: head ?? '工作区' }).split('材料数据没有变化。')[0]
          + `报告过长：新增 ${diff.added.length} 条、修改 ${diff.modified.length} 条、删除 ${diff.deleted.length} 条。请下载 materials-report 工件查看完整报告。\n`
      fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary, 'utf8')
    }
    console.log(`Report: +${diff.added.length} ~${diff.modified.length} -${diff.deleted.length} → ${outputPath}`)
  } finally {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true })
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.join(ROOT, 'scripts', 'materials-report.mjs')) main()
