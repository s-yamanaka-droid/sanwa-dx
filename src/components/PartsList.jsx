import { useState } from 'react'
import * as XLSX from 'xlsx'
import styles from './PartsList.module.css'

const CATEGORY_COLORS = {
  '主材':    { bg: '#e8f0fd', text: '#1547a0', border: '#c3d8f8' },
  '固定材':  { bg: '#fef3e2', text: '#92400e', border: '#fde68a' },
  '陳列部材':{ bg: '#e6f7f0', text: '#065f46', border: '#a7f3d0' },
  '締結材':  { bg: '#f3f4f6', text: '#374151', border: '#e5e7eb' },
  '施工材':  { bg: '#fdf2f8', text: '#701a75', border: '#f5d0fe' },
}

export default function PartsList({ data }) {
  const [selectedCats, setSelectedCats] = useState([])
  const [showCost, setShowCost] = useState(false)
  const { parts } = data

  const categories = [...new Set(parts.map(p => p.category))]
  const hasCostData = parts.some(p => p.cost_price != null)

  const toggleCat = (cat) => {
    setSelectedCats(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    )
  }

  const filtered = selectedCats.length === 0
    ? parts
    : parts.filter(p => selectedCats.includes(p.category))

  const totalSell = filtered.reduce((s, p) => s + p.qty * p.unit_price, 0)
  const totalCostVal = filtered.reduce((s, p) => s + p.qty * (p.cost_price ?? p.unit_price), 0)
  const totalGross = totalSell - totalCostVal
  const grossRate = totalSell > 0 ? Math.round((totalGross / totalSell) * 100) : 0

  const exportExcel = () => {
    const today = new Date().toLocaleDateString('ja-JP').replace(/\//g, '-')
    const baseHeader = ['品番', '品名', '仕様', '数量', '単位', 'カテゴリ', '現在庫', '単価(円)', '合計金額(円)']
    const costHeader = [...baseHeader, '原価(円)', '原価合計(円)', '粗利(円)', '粗利率(%)']
    const header = showCost && hasCostData ? costHeader : baseHeader

    const rows = parts.map(p => {
      const base = [p.id, p.name, p.spec, p.qty, p.unit, p.category, p.stock, p.unit_price, p.qty * p.unit_price]
      if (showCost && hasCostData) {
        const cp = p.cost_price ?? p.unit_price
        const costTotal = p.qty * cp
        const gross = p.qty * p.unit_price - costTotal
        const gr = p.unit_price > 0 ? Math.round((1 - cp / p.unit_price) * 100) : 0
        return [...base, cp, costTotal, gross, gr]
      }
      return base
    })

    const subtotal = parts.reduce((s, p) => s + p.qty * p.unit_price, 0)
    const lastRow = showCost && hasCostData
      ? ['', '', '', '', '', '', '', '合計', subtotal, '', totalCostVal, totalGross, grossRate]
      : ['', '', '', '', '', '', '', '合計', subtotal]
    rows.push(lastRow)

    const ws = XLSX.utils.aoa_to_sheet([header, ...rows])
    ws['!cols'] = (showCost && hasCostData
      ? [8, 20, 22, 8, 6, 10, 8, 10, 14, 10, 14, 12, 8]
      : [8, 20, 22, 8, 6, 10, 8, 10, 14]
    ).map(w => ({ wch: w }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '資材リスト')
    XLSX.writeFile(wb, `三和商研_資材リスト_${today}.xlsx`)
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar}>
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>カテゴリ</span>
          <div className={styles.filters}>
            {categories.map(cat => {
              const cc = CATEGORY_COLORS[cat] || CATEGORY_COLORS['施工材']
              const active = selectedCats.includes(cat)
              return (
                <button
                  key={cat}
                  className={`${styles.filterBtn} ${active ? styles.filterActive : ''}`}
                  style={active ? { background: cc.bg, color: cc.text, borderColor: cc.border } : {}}
                  onClick={() => toggleCat(cat)}
                >
                  {cat}
                </button>
              )
            })}
            {selectedCats.length > 0 && (
              <button className={styles.clearBtn} onClick={() => setSelectedCats([])}>
                クリア
              </button>
            )}
          </div>
        </div>
        <div className={styles.toolbarRight}>
          {hasCostData && (
            <button
              className={`${styles.costToggle} ${showCost ? styles.costToggleOn : ''}`}
              onClick={() => setShowCost(v => !v)}
            >
              {showCost ? '原価を非表示' : '原価・粗利を表示'}
            </button>
          )}
          <span className={styles.totalCost}>
            {selectedCats.length > 0 ? `[${selectedCats.join('・')}]` : '全品目'}: <strong>¥{totalSell.toLocaleString()}</strong>
          </span>
          <button className={styles.exportBtn} onClick={exportExcel}>
            Excel出力 ↓
          </button>
        </div>
      </div>

      {showCost && hasCostData && (
        <div className={styles.grossSummary}>
          <div className={styles.grossItem}>
            <span>売上合計</span>
            <strong>¥{totalSell.toLocaleString()}</strong>
          </div>
          <div className={styles.grossItem}>
            <span>原価合計</span>
            <strong className={styles.costVal}>¥{totalCostVal.toLocaleString()}</strong>
          </div>
          <div className={styles.grossItem}>
            <span>粗利</span>
            <strong className={styles.grossVal}>¥{totalGross.toLocaleString()}</strong>
          </div>
          <div className={styles.grossItem}>
            <span>粗利率</span>
            <strong className={styles.grossVal}>{grossRate}%</strong>
          </div>
        </div>
      )}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>品番</th>
              <th>品名</th>
              <th>仕様</th>
              <th>必要数</th>
              <th>カテゴリ</th>
              <th>単価</th>
              {showCost && hasCostData && <th className={styles.costCol}>原価</th>}
              <th>合計金額</th>
              {showCost && hasCostData && <th className={styles.costCol}>粗利率</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => {
              const cc = CATEGORY_COLORS[p.category] || CATEGORY_COLORS['施工材']
              const cp = p.cost_price
              const gross = cp != null ? Math.round((1 - cp / p.unit_price) * 100) : null
              return (
                <tr key={p.id}>
                  <td><code className={styles.code}>{p.id}</code></td>
                  <td className={styles.nameCell}>
                    <div className={styles.name}>{p.name}</div>
                  </td>
                  <td className={styles.spec}>{p.spec}</td>
                  <td className={styles.qty}>
                    <strong>{p.qty.toLocaleString()}</strong> {p.unit}
                  </td>
                  <td>
                    <span
                      className={styles.catBadge}
                      style={{ background: cc.bg, color: cc.text, border: `1px solid ${cc.border}` }}
                    >
                      {p.category}
                    </span>
                  </td>
                  <td className={styles.price}>¥{p.unit_price.toLocaleString()}</td>
                  {showCost && hasCostData && (
                    <td className={styles.costCol}>
                      {cp != null
                        ? <span className={styles.costVal}>¥{cp.toLocaleString()}</span>
                        : <span className={styles.noCost}>—</span>}
                    </td>
                  )}
                  <td className={styles.total}>
                    ¥{(p.qty * p.unit_price).toLocaleString()}
                  </td>
                  {showCost && hasCostData && (
                    <td className={styles.costCol}>
                      {gross != null
                        ? <span className={styles.grossVal}>{gross}%</span>
                        : <span className={styles.noCost}>—</span>}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={showCost && hasCostData ? 7 : 6} className={styles.footLabel}>合計</td>
              <td className={styles.footTotal}>¥{totalSell.toLocaleString()}</td>
              {showCost && hasCostData && (
                <td className={`${styles.footTotal} ${styles.grossVal}`}>{grossRate}%</td>
              )}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
