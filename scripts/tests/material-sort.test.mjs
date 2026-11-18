import assert from 'node:assert/strict'
import test from 'node:test'
import { sortMaterials } from '../../.vitepress/theme/material-sort.mjs'

const material = (id, values = {}) => ({ id, name: id, stage: '1', school: ['通用'], uses: [], family: null, ...values })
const ids = (rows) => rows.map((row) => row.id)

test('stages sort numerically in both directions and common stages remain last', () => {
  const rows = [material('common', { stage: '通用' }), material('five', { stage: '5' }), material('one'), material('three', { stage: '3' })]
  assert.deepEqual(ids(sortMaterials(rows, 'stage')), ['one', 'three', 'five', 'common'])
  assert.deepEqual(ids(sortMaterials(rows, 'stage', 'desc')), ['five', 'three', 'one', 'common'])
  assert.deepEqual(ids(rows), ['common', 'five', 'one', 'three'])
})

test('school sorting compares canonical tag sets instead of stored tag order', () => {
  const rows = [material('holy', { school: ['神圣'] }), material('mixed', { school: ['神圣', '炽焰'] }), material('fire', { school: ['炽焰'] }), material('storm', { school: ['风暴'] })]
  assert.deepEqual(ids(sortMaterials(rows, 'school')), ['fire', 'mixed', 'storm', 'holy'])
  assert.deepEqual(ids(sortMaterials(rows, 'school', 'desc')), ['holy', 'storm', 'mixed', 'fire'])
  const reorderedTags = rows.map((row) => ({ ...row, school: [...row.school].reverse() }))
  assert.deepEqual(ids(sortMaterials(rows, 'school')), ids(sortMaterials(reorderedTags, 'school')))
  assert.deepEqual(rows[1].school, ['神圣', '炽焰'])
})

test('name ties are deterministic and empty families stay last in either direction', () => {
  const rows = [material('none'), material('second', { family: '乙' }), material('first', { family: '甲' })]
  assert.deepEqual(ids(sortMaterials(rows, 'family')), ['first', 'second', 'none'])
  assert.deepEqual(ids(sortMaterials(rows, 'family', 'desc')), ['second', 'first', 'none'])
  assert.deepEqual(ids(sortMaterials([material('b', { name: '硫' }), material('a', { name: '硫' })], 'name')), ['a', 'b'])
  assert.deepEqual(ids(sortMaterials([material('材料10'), material('材料2')], 'unknown')), ['材料2', '材料10'])
})
