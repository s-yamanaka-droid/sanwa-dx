import { useState } from 'react'
import * as XLSX from 'xlsx'
import styles from './PartsList.module.css'

const CATEGORY_COLORS = {
  '主材':   { bg: '#e8f0fd', text: '#1547a0', border: '#c3d8f8' },
  '冷凍設備': { bg: '#dbeafe', text: '#1e40af', border: '#bfdbfe' },
  '固定材': { bg: '#fef3e2', text: '#92400e', border: '#fde68a' },
  '陳列部材': { bg: '#e6f7f0', text: '#065f46', border: '#a7f3d0' },
  '締結材': { bg: '#f3f4f6', text: '#374151', border: '#e5e7eb' },
  '施工材': { bg: '#fdf2f8', text: '#701a75', border: '#f5d0fe' },
}

export default function PartsList({ data }) {
  const [filter, setFilter] = useState('all')
  const { parts } = data

  const categories = ['all', ...new Set(parts.map(p => p.category))]

  const filtered = filter === 'all' ? parts : parts.filter(p => p.category === filter)

  const totalCost = filtered.reduce((sum, p) => sum + p.qty * p.unit_price, 0)

  const exportExcel = () => {
    const today = new Date().toLocaleDateString('ja-JP').replace(/\//g, '-')
    const header = ['品番', '品名', '仕様', '数量', '単位', 'カテゴリ', '現在庫', '単価(円)', '合計金額(円)']
    const rows = parts.map(p => [
      p.id, p.name, p.spec, p.qty, p.unit, p.category, p.stock, p.unit_price, p.qty * p.unit_price
    ])
    const subtotal = parts.reduce((s, p) => s + p.qty * p.unit_price, 0)
    rows.push(['', '', '', '', '', '', '', '合計', subtotal])
    const ws = XLSX.utils.aoa_to_sheet([header, ...rows])
    ws['!cols'] = [8, 20, 22, 8, 6, 10, 8, 10, 14].map(w => ({ wch: w }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '資材リスト')
    XLSX.writeFile(wb, `三和商研_資材リスト_${today}.xlsx`)
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar}>
        <div className={styles.filters}>
          {categories.map(cat => (
            <button
              key={cat}
              className={`${styles.filterBtn} ${filter === cat ? styles.filterActive : ''}`}
              onClick={() => setFilter(cat)}
            >
              {cat === 'all' ? 'すべて' : cat}
            </button>
          ))}
        </div>
        <div className={styles.toolbarRight}>
          <span className={styles.totalCost}>
            資材合計（{filter === 'all' ? '全品目' : filter}）: <strong>¥{totalCost.toLocaleString()}</strong>
          </span>
          <button className={styles.exportBtn} onClick={exportExcel}>
            Excel出力 ↓
          </button>
        </div>
      </div>

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
              <th>合計金額</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => {
              const cc = CATEGORY_COLORS[p.category] || CATEGORY_COLORS['施工材']
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
                  <td className={styles.total}>
                    ¥{(p.qty * p.unit_price).toLocaleString()}
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={6} className={styles.footLabel}>合計</td>
              <td className={styles.footTotal}>¥{totalCost.toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
