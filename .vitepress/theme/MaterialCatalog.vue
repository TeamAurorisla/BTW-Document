<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { withBase } from 'vitepress'
import materials from '../generated/materials.json'
import { sortFields, sortMaterials } from './material-sort.mjs'

type Material = (typeof materials)[number]
const filters = reactive({ q: '', origin: '', category: '', stage: '', school: '', uses: '', family: '' })
const view = ref<'cards' | 'table'>('cards')
const sortField = ref('name')
const sortDirection = ref<'asc' | 'desc'>('asc')
const ready = ref(false)
const names = new Map(materials.map((material) => [material.id, material.name]))
const dimensions = [
  { key: 'origin', label: '来源' }, { key: 'category', label: '类别' },
  { key: 'stage', label: '阶段' }, { key: 'school', label: '流派' },
  { key: 'uses', label: '用途' }, { key: 'family', label: '族' },
] as const
const options = Object.fromEntries(dimensions.map(({ key }) => [key,
  [...new Set(materials.flatMap((material) => {
    const value = material[key]
    return Array.isArray(value) ? value : value ? [value] : []
  }))].sort((a, b) => String(a).localeCompare(String(b), 'zh-CN')),
])) as Record<string, string[]>

function plainText(text: string) {
  return text.replace(/\[\[arcane_materials:([^\]|]+)(?:\|([^\]]+))?\]\]/g,
    (_, id, label) => label || names.get(id) || id)
    .replace(/<[^>]*>/g, '').replace(/[*_`#]/g, '')
}

function searchText(text: string) {
  return text.toLocaleLowerCase().replaceAll('’', "'")
}

const filtered = computed(() => {
  const query = searchText(filters.q.trim())
  return materials.filter((material) => {
    const searchFields = [material.name, material.name_en ?? '', material.id, plainText(material.description)]
    if (query && !searchFields.some((value) => searchText(value).includes(query))) return false
    return dimensions.every(({ key }) => {
      if (!filters[key]) return true
      const value = material[key]
      return Array.isArray(value) ? value.includes(filters[key]) : value === filters[key]
    })
  })
})
const active = computed(() => Boolean(filters.q || dimensions.some(({ key }) => filters[key])))
const sorted = computed<Material[]>(() => sortMaterials(filtered.value, sortField.value, sortDirection.value))
const tableColumns = [
  { key: 'name', label: '名称' }, ...dimensions,
]
const stageLabel = (material: Material) => material.stage === '通用' ? '通用阶段' : `阶段 ${material.stage}`

function sortColumn(key: string) {
  if (sortField.value === key) sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  else { sortField.value = key; sortDirection.value = 'asc' }
}

function reset() {
  for (const key of Object.keys(filters) as (keyof typeof filters)[]) filters[key] = ''
}
function readUrl() {
  const params = new URLSearchParams(window.location.search)
  filters.q = params.get('q') ?? ''
  for (const { key } of dimensions) {
    const value = params.get(key) ?? ''
    filters[key] = options[key].includes(value) ? value : ''
  }
  view.value = params.get('view') === 'table' ? 'table' : 'cards'
  const requestedSort = params.get('sort') ?? 'name'
  sortField.value = sortFields.some((field) => field.key === requestedSort) ? requestedSort : 'name'
  sortDirection.value = params.get('order') === 'desc' ? 'desc' : 'asc'
}
function writeUrl() {
  if (!ready.value) return
  const url = new URL(window.location.href)
  for (const [key, value] of Object.entries(filters)) value ? url.searchParams.set(key, value) : url.searchParams.delete(key)
  view.value === 'table' ? url.searchParams.set('view', 'table') : url.searchParams.delete('view')
  sortField.value === 'name' ? url.searchParams.delete('sort') : url.searchParams.set('sort', sortField.value)
  sortDirection.value === 'asc' ? url.searchParams.delete('order') : url.searchParams.set('order', sortDirection.value)
  window.history.replaceState(null, '', url)
}
onMounted(() => {
  readUrl()
  ready.value = true
  window.addEventListener('popstate', readUrl)
})
onUnmounted(() => { if (typeof window !== 'undefined') window.removeEventListener('popstate', readUrl) })
watch([filters, view, sortField, sortDirection], writeUrl, { deep: true })
</script>

<template>
  <section class="material-catalog" aria-label="材料索引">
    <div class="catalog-search">
      <label for="material-query">搜索材料</label>
      <input id="material-query" v-model="filters.q" type="search" placeholder="中英文名称、ID 或描述" autocomplete="off">
    </div>

    <div class="catalog-filters">
      <label v-for="dimension in dimensions" :key="dimension.key" :for="`material-${dimension.key}`">
        <span>{{ dimension.label }}</span>
        <select :id="`material-${dimension.key}`" v-model="filters[dimension.key]">
          <option value="">全部{{ dimension.label }}</option>
          <option v-for="option in options[dimension.key]" :key="option" :value="option">{{ option }}</option>
        </select>
      </label>
    </div>

    <div class="catalog-toolbar">
      <p class="catalog-count" role="status" aria-live="polite" aria-atomic="true">显示 {{ filtered.length }} / {{ materials.length }} 条材料</p>
      <div class="catalog-actions">
        <button v-if="active" type="button" class="reset-button" @click="reset">清除筛选</button>
        <div class="catalog-sort">
          <label for="material-sort">排序</label>
          <select id="material-sort" v-model="sortField">
            <option v-for="field in sortFields" :key="field.key" :value="field.key">{{ field.label }}</option>
          </select>
          <button type="button" :aria-label="sortDirection === 'asc' ? '当前升序，切换为降序' : '当前降序，切换为升序'" @click="sortDirection = sortDirection === 'asc' ? 'desc' : 'asc'">
            {{ sortDirection === 'asc' ? '升序 ↑' : '降序 ↓' }}
          </button>
        </div>
        <div class="view-switch" role="group" aria-label="显示方式">
          <button type="button" :aria-pressed="view === 'cards'" @click="view = 'cards'">卡片</button>
          <button type="button" :aria-pressed="view === 'table'" @click="view = 'table'">表格</button>
        </div>
      </div>
    </div>

    <div v-if="!filtered.length" class="catalog-empty">
      <h2>没有符合条件的材料</h2>
      <p>调整搜索词或清除筛选，查看其他材料。</p>
      <button type="button" @click="reset">清除筛选</button>
    </div>
    <div v-else-if="view === 'cards'" class="material-grid">
      <a v-for="material in sorted" :key="material.id" :href="withBase(material.url)" class="material-card">
        <div class="card-meta"><span>{{ material.category }}</span><span>{{ stageLabel(material) }}</span></div>
        <h2>{{ material.name }}</h2>
        <span v-if="material.name_en" class="material-name-en" lang="en">{{ material.name_en }}</span>
        <p class="card-description">{{ plainText(material.description) || '暂未填写描述。' }}</p>
        <div class="card-footer"><span>{{ material.school.join(' · ') }}</span><span>{{ material.origin }}</span></div>
      </a>
    </div>
    <div v-else class="material-table-wrap" role="region" aria-label="材料数据表，可横向滚动" tabindex="0">
      <table class="material-table">
        <thead><tr>
          <th v-for="column in tableColumns" :key="column.key" :aria-sort="sortField === column.key ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'">
            <button type="button" :aria-label="`按${column.label}排序${sortField === column.key ? (sortDirection === 'asc' ? '，当前升序' : '，当前降序') : ''}`" @click="sortColumn(column.key)">
              {{ column.label }} <span aria-hidden="true">{{ sortField === column.key ? (sortDirection === 'asc' ? '↑' : '↓') : '↕' }}</span>
            </button>
          </th>
        </tr></thead>
        <tbody>
          <tr v-for="material in sorted" :key="material.id">
            <td>
              <a :href="withBase(material.url)">{{ material.name }}</a>
              <span v-if="material.name_en" class="material-name-en" lang="en">{{ material.name_en }}</span>
            </td>
            <td>{{ material.origin }}</td><td>{{ material.category }}</td><td>{{ material.stage }}</td>
            <td>{{ material.school.join('、') }}</td><td>{{ material.uses.join('、') }}</td><td>{{ material.family || '—' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
.material-catalog { --catalog-accent: var(--vp-c-brand-1); margin: 28px 0 48px; }
.catalog-search label, .catalog-filters label > span { display: block; margin-bottom: 7px; color: var(--vp-c-text-2); font-size: 13px; font-weight: 600; }
.catalog-search input { width: 100%; min-height: 46px; padding: 10px 14px; border: 1px solid var(--vp-c-divider); border-radius: 6px; background: var(--vp-c-bg); color: var(--vp-c-text-1); font: inherit; }
.catalog-search input::placeholder { color: var(--vp-c-text-2); }
.catalog-filters { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; margin-top: 18px; }
.catalog-filters select { width: 100%; min-height: 44px; padding: 8px 10px; border: 1px solid var(--vp-c-divider); border-radius: 5px; background: var(--vp-c-bg); color: var(--vp-c-text-1); font: inherit; font-size: 14px; appearance: auto; }
.catalog-toolbar { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; margin: 24px 0 16px; padding-top: 18px; border-top: 1px solid var(--vp-c-divider); }
.catalog-count { margin: 0; font-size: 13px; color: var(--vp-c-text-2); }
.catalog-actions { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
.catalog-sort { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
.catalog-sort label { color: var(--vp-c-text-2); font-size: 13px; }
.catalog-sort select { min-height: 44px; padding: 8px 10px; border: 1px solid var(--vp-c-divider); border-radius: 5px; background: var(--vp-c-bg); color: var(--vp-c-text-1); font-size: 13px; appearance: auto; }
.catalog-actions button, .catalog-empty button { min-height: 44px; padding: 8px 12px; border: 1px solid var(--vp-c-divider); border-radius: 5px; color: var(--vp-c-text-1); background: var(--vp-c-bg); font-size: 13px; cursor: pointer; }
.view-switch { display: flex; gap: 4px; }
.view-switch button[aria-pressed="true"] { border-color: var(--catalog-accent); background: var(--vp-c-brand-soft); color: var(--catalog-accent); }
.material-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.material-card { display: flex; flex-direction: column; min-width: 0; padding: 16px; border: 1px solid var(--vp-c-divider); border-radius: 6px; background: var(--vp-c-bg); text-decoration: none !important; color: var(--vp-c-text-1); transition: border-color .16s, background .16s; }
.material-card:hover { border-color: var(--catalog-accent); background: var(--vp-c-bg-soft); }
.card-meta, .card-footer { display: flex; justify-content: space-between; gap: 8px; color: var(--vp-c-text-2); font-size: 12px; line-height: 1.6; }
.material-card h2 { margin: 10px 0 8px; padding: 0; border: 0; font-size: 18px; line-height: 1.5; font-weight: 650; }
.material-name-en { display: block; color: var(--vp-c-text-2); font-size: 13px; line-height: 1.5; }
.material-card .material-name-en { margin: -5px 0 8px; }
.card-description { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; margin: 0 0 16px; min-height: 44px; color: var(--vp-c-text-2); font-size: 13px; line-height: 22px; }
.card-footer { margin-top: auto; padding-top: 10px; border-top: 1px solid var(--vp-c-divider); }
.material-table-wrap { overflow-x: auto; }
.material-table { display: table; width: 100%; margin: 0; font-size: 13px; }
.material-table th, .material-table td { min-width: 70px; vertical-align: top; }
.material-table th { padding: 0; }
.material-table th button { display: flex; width: 100%; min-height: 44px; align-items: center; justify-content: space-between; gap: 8px; padding: 10px 12px; cursor: pointer; color: inherit; font: inherit; font-weight: 600; white-space: nowrap; }
.material-table th[aria-sort="ascending"], .material-table th[aria-sort="descending"] { color: var(--catalog-accent); }
.material-table td:first-child { min-width: 120px; }
.catalog-empty { padding: 36px 18px; text-align: center; border: 1px solid var(--vp-c-divider); border-radius: 6px; }
.catalog-empty h2 { margin: 0; padding: 0; border: 0; font-size: 18px; }
.catalog-empty p { color: var(--vp-c-text-2); font-size: 14px; }
input:focus-visible, select:focus-visible, button:focus-visible, a:focus-visible, .material-table-wrap:focus-visible { outline: 2px solid var(--catalog-accent); outline-offset: 3px; }
@media (min-width: 1440px) { .material-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
@media (max-width: 540px) { .catalog-filters { grid-template-columns: repeat(2, minmax(0, 1fr)); } .material-grid { grid-template-columns: minmax(0, 1fr); } }
@media (prefers-reduced-motion: reduce) { .material-card { transition: none; } }
</style>
