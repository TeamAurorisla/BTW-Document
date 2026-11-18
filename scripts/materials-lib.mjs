import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'

export const ROOT = fileURLToPath(new URL('..', import.meta.url))
export const DATABASE_PATH = path.join(ROOT, 'data', 'arcane_materials.sqlite')
export const GENERATED_ROOT = path.join(ROOT, 'docs', 'library', 'magic-vanilla', 'arcane-materials')
export const GENERATED_ITEMS = path.join(GENERATED_ROOT, 'items')
export const GENERATED_DATA = path.join(ROOT, '.vitepress', 'generated', 'materials.json')

export const FIELDS = ['id', 'name', 'origin', 'category', 'description', 'uses', 'stage', 'school', 'acquisition', 'notes', 'family']
export const VALID_ORIGINS = new Set(['原版', '新增'])
export const VALID_CATEGORIES = new Set(['原材料', '战利品', '加工品', '源质'])

export function safeRouteId(id) {
  return String(id)
}

export function splitTags(value) {
  return String(value ?? '').split(';').map((part) => part.trim()).filter(Boolean)
}

export function normalizeTags(value) {
  return [...new Set(splitTags(value))].sort((a, b) => a.localeCompare(b, 'zh-CN'))
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

export function readMaterialRows(databasePath = DATABASE_PATH) {
  const database = new DatabaseSync(databasePath, { readOnly: true })
  try {
    return database.prepare(`SELECT ${FIELDS.join(', ')} FROM arcane_materials ORDER BY id`).all()
  } finally {
    database.close()
  }
}

export function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

