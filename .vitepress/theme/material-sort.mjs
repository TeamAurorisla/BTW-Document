export const sortFields = [
  { key: 'name', label: '名称' },
  { key: 'school', label: '流派' },
  { key: 'stage', label: '阶段' },
  { key: 'origin', label: '来源' },
  { key: 'category', label: '类别' },
  { key: 'uses', label: '用途' },
  { key: 'family', label: '族' },
]

const collator = new Intl.Collator('zh-CN', { numeric: true })
const orders = {
  school: ['炽焰', '风暴', '寒冰', '磐石', '神圣', '通用'],
  origin: ['原版', '新增'],
  category: ['原材料', '战利品', '加工品', '源质'],
  uses: ['法术编纂', '法杖合成', '法术精进', '辅助材料', '通用材料'],
}

function compareValue(field, left, right) {
  if (field === 'stage') return Number(left) - Number(right)
  const order = orders[field]
  if (!order) return collator.compare(String(left), String(right))
  const leftRank = order.indexOf(left)
  const rightRank = order.indexOf(right)
  return (leftRank < 0 ? order.length : leftRank) - (rightRank < 0 ? order.length : rightRank)
    || collator.compare(String(left), String(right))
}

function sortValues(field, value) {
  const values = Array.isArray(value) ? [...new Set(value)] : [value]
  return values.filter((item) => item !== null && item !== undefined && item !== '')
    .sort((a, b) => compareValue(field, a, b))
}

/** Return a new array. Ties use name/ID; absent values and common stages stay last. */
export function sortMaterials(materials, field = 'name', direction = 'asc') {
  if (!sortFields.some((option) => option.key === field)) field = 'name'
  const multiplier = direction === 'desc' ? -1 : 1
  return [...materials].sort((left, right) => {
    const a = sortValues(field, left[field])
    const b = sortValues(field, right[field])
    const aLast = !a.length || (field === 'stage' && left.stage === '通用')
    const bLast = !b.length || (field === 'stage' && right.stage === '通用')
    if (aLast !== bLast) return aLast ? 1 : -1
    if (!aLast) {
      for (let index = 0; index < Math.min(a.length, b.length); index++) {
        const comparison = compareValue(field, a[index], b[index])
        if (comparison) return comparison * multiplier
      }
      if (a.length !== b.length) return (a.length - b.length) * multiplier
    }
    return collator.compare(left.name, right.name) || collator.compare(left.id, right.id)
  })
}
