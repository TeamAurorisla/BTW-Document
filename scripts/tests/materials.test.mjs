import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { DatabaseSync } from 'node:sqlite'
import MarkdownIt from 'markdown-it'
import { katex } from '@mdit/plugin-katex'
import { materialReferences } from '../material-references.mjs'
import { compareMaterials, renderReport, rowsAtRevision } from '../materials-report.mjs'
import { validateDatabase } from '../materials.mjs'

const sulfur = { id: 'sulfur', name: '硫', origin: '新增', category: '原材料', description: '晶体', uses: '法杖合成;法术编纂', stage: '3', school: '炽焰;风暴', acquisition: '下界', notes: null, family: null }
function markdown() {
  return new MarkdownIt().use(katex).use(materialReferences, { rows: [sulfur], base: '/BTW-Document/' })
}

test('references resolve current names and custom labels with production base', () => {
  const html = markdown().render('使用 [[arcane_materials:sulfur]] 和 [[arcane_materials:sulfur|硫晶]]。')
  assert.match(html, /href="\/BTW-Document\/library\/magic-vanilla\/arcane-materials\/items\/sulfur.html"/)
  assert.match(html, />硫<\/a>/)
  assert.match(html, />硫晶<\/a>/)
})

test('invalid targets fail with source context; code, escapes and formulas are ignored', () => {
  const md = markdown()
  assert.throws(() => md.render('[[arcane_materials:missing]]', { sourceName: 'example.md' }), /example.md.*missing/)
  assert.throws(() => md.render('[[other:sulfur]]'), /other:sulfur/)
  const source = [
    '`[[arcane_materials:missing]]`', '', '```md', '[[arcane_materials:missing]]', '```', '',
    '\\[[arcane_materials:missing]]', '', '$[[arcane_materials:missing]]$', '',
    '$$', '[[arcane_materials:missing]]', '$$',
  ].join('\n')
  assert.doesNotThrow(() => md.render(source))
})

test('labels are escaped and references work inside Markdown tables', () => {
  assert.match(markdown().render('[[arcane_materials:sulfur|<img src=x>]]'), /&lt;img src=x&gt;/)
  const html = markdown().render('| 材料 |\n| --- |\n| [[arcane_materials:sulfur\\|硫晶]] |')
  assert.match(html, /<td><a[^>]*>硫晶<\/a><\/td>/)
})

test('reports compare tags as sets and identify field edits, additions and deletions', () => {
  const reordered = { ...sulfur, uses: '法术编纂;法杖合成', school: '风暴;炽焰' }
  assert.deepEqual(compareMaterials([sulfur], [reordered]), { added: [], deleted: [], modified: [] })
  const old = { ...sulfur, id: 'old', name: '旧材料' }
  const added = { ...sulfur, id: 'new', name: '新材料' }
  const diff = compareMaterials([sulfur, old], [{ ...reordered, description: '精炼晶体' }, added])
  assert.equal(diff.added[0].id, 'new')
  assert.equal(diff.deleted[0].id, 'old')
  assert.deepEqual(diff.modified[0].changes, [{ field: 'description', before: '晶体', after: '精炼晶体' }])
  const report = renderReport(diff)
  assert.match(report, /新增 \*\*1\*\* 条，修改 \*\*1\*\* 条，删除 \*\*1\*\* 条/)
  assert.match(report, /晶体 \| 精炼晶体/)
  assert.match(renderReport(compareMaterials([], [{ ...added, description: '[a|b]\n<script>x</script>' }])), /&#91;a&#124;b&#93;<br>&lt;script&gt;/)
})

test('database validation rejects bad metadata and unsafe routes while allowing draft blanks', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'btw-materials-test-'))
  const filename = path.join(directory, 'test.sqlite')
  const db = new DatabaseSync(filename)
  try {
    db.exec('CREATE TABLE arcane_materials (id TEXT, name TEXT, origin TEXT, category TEXT, description TEXT, uses TEXT, stage TEXT, school TEXT, acquisition TEXT, notes TEXT, family TEXT, name_en TEXT)')
    db.prepare('INSERT INTO arcane_materials VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)').run(...Object.values(sulfur))
    assert.equal(validateDatabase(filename)[0].name_en, null)
    db.exec("UPDATE arcane_materials SET name_en = '   '")
    assert.throws(() => validateDatabase(filename), /name_en/)
    db.exec("UPDATE arcane_materials SET name_en = 'Sulfur'")
    assert.equal(validateDatabase(filename)[0].name_en, 'Sulfur')
    db.exec("UPDATE arcane_materials SET id = '../escape', stage = '6', school = '未知'")
    assert.throws(() => validateDatabase(filename), /ID 必须为小写 snake_case[\s\S]*未知阶段[\s\S]*未知选项/)
    db.exec("UPDATE arcane_materials SET stage = '通用', school = '通用', description = '', acquisition = ''")
    for (const id of ['硫', 'Sulfur', 'sulfur-dust', 'sulfur__dust', '_sulfur', 'sulfur_']) {
      db.prepare('UPDATE arcane_materials SET id = ?').run(id)
      assert.throws(() => validateDatabase(filename), /ID 必须为小写 snake_case/)
    }
    db.exec("UPDATE arcane_materials SET id = 'sulfur_dust'")
    assert.equal(validateDatabase(filename)[0].stage, '通用')
  } finally {
    db.close()
    fs.rmSync(directory, { recursive: true, force: true })
  }
})

test('report reads two binary SQLite revisions from Git and handles the initial migration', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'btw-materials-git-'))
  const snapshots = path.join(directory, 'snapshots')
  fs.mkdirSync(snapshots)
  const git = (...args) => execFileSync('git', args, { cwd: directory, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
  const commit = () => {
    git('add', 'data/arcane_materials.sqlite')
    git('-c', 'user.name=Material test', '-c', 'user.email=materials-test@example.invalid', 'commit', '-m', 'fixture')
    return git('rev-parse', 'HEAD')
  }
  try {
    git('init')
    git('-c', 'user.name=Material test', '-c', 'user.email=materials-test@example.invalid', 'commit', '--allow-empty', '-m', 'empty')
    const empty = git('rev-parse', 'HEAD')
    fs.mkdirSync(path.join(directory, 'data'))
    const filename = path.join(directory, 'data', 'arcane_materials.sqlite')
    const first = new DatabaseSync(filename)
    first.exec('CREATE TABLE arcane_materials (id TEXT, name TEXT, origin TEXT, category TEXT, description TEXT, uses TEXT, stage TEXT, school TEXT, acquisition TEXT, notes TEXT, family TEXT)')
    first.prepare('INSERT INTO arcane_materials VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(...Object.values({ ...sulfur, id: '硫' }))
    first.close()
    const baseline = commit()
    const second = new DatabaseSync(filename)
    second.exec('ALTER TABLE arcane_materials ADD COLUMN name_en TEXT')
    second.exec("UPDATE arcane_materials SET id = 'sulfur', description = '精炼晶体', name_en = 'Sulfur'")
    second.close()
    const head = commit()
    const before = rowsAtRevision(baseline, snapshots, 'before', directory)
    const after = rowsAtRevision(head, snapshots, 'after', directory)
    const diff = compareMaterials(before, after)
    assert.deepEqual(diff.added, [])
    assert.deepEqual(diff.deleted, [])
    assert.deepEqual(diff.modified[0].changes, [
      { field: 'id', before: '硫', after: 'sulfur' },
      { field: 'description', before: '晶体', after: '精炼晶体' },
      { field: 'name_en', before: null, after: 'Sulfur' },
    ])
    assert.match(renderReport(diff), /英文名 \| （空） \| Sulfur/)
    assert.deepEqual(rowsAtRevision(empty, snapshots, 'empty', directory), [])
    assert.equal(compareMaterials([], after).added.length, 1)
    assert.throws(() => rowsAtRevision('not-a-real-ref', snapshots, 'invalid', directory))
  } finally {
    fs.rmSync(directory, { recursive: true, force: true })
  }
})
