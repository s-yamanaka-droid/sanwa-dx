import { useState } from 'react'
import * as XLSX from 'xlsx'
import styles from './Inventory.module.css'

export default function Inventory({ data }) {
  const [orderList, setOrderList] = useState([])
  const [ordered, setOrdered] = useState({})
  const { parts } = data

  const needOrder = parts.filter(p => p.stock < p.qty)
  const sufficient = parts.filter(p => p.stock >= p.qty)

  const toggleOrder = (id) => {
    setOrderList(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const selectAll = () => {
    setOrderList(needOrder.map(p => p.id))
  }

  const placeOrder = () => {
    const ts = new Date().toLocaleString('ja-JP')
    const newOrdered = {}
    orderList.forEach(id => { newOrdered[id] = ts })
    setOrdered(prev => ({ ...prev, ...newOrdered }))
    setOrderList([])
  }

  const totalOrderCost = orderList.reduce((sum, id) => {
    const p = parts.find(x => x.id === id)
    if (!p) return sum
    const needed = Math.max(0, p.qty - p.stock)
    return sum + needed * p.unit_price
  }, 0)

  const sendOrderMail = () => {
    if (orderList.length === 0) return
    const subject = encodeURIComponent(`【発注依頼】${data.meta.project}`)
    const lines = [
      `三和商研 様`,
      ``,
      `下記の通り発注をお願いいたします。`,
      ``,
      `件名：${data.meta.project}`,
      `発注日：${new Date().toLocaleDateString('ja-JP')}`,
      ``,
      `─── 発注品目 ───`,
      ...orderList.map(id => {
        const p = parts.find(x => x.id === id)
        const qty = Math.max(0, p.qty - p.stock)
        return `  ${p.name}（${p.id}）× ${qty}${p.unit}  ¥${(qty * p.unit_price).toLocaleString()}`
      }),
      ``,
      `合計金額：¥${totalOrderCost.toLocaleString()}（税抜）`,
      ``,
      `以上、よろしくお願いいたします。`,
    ].join('\n')
    window.open(`mailto:?subject=${subject}&body=${encodeURIComponent(lines)}`)
  }

  const exportExcel = () => {
    if (orderList.length === 0) return
    const today = new Date().toLocaleDateString('ja-JP').replace(/\//g, '-')
    const header = ['品番', '品名', '仕様', '発注数', '単位', '単価(円)', '発注金額(円)']
    const rows = orderList.map(id => {
      const p = parts.find(x => x.id === id)
      const qty = Math.max(0, p.qty - p.stock)
      return [p.id, p.name, p.spec, qty, p.unit, p.unit_price, qty * p.unit_price]
    })
    const total = orderList.reduce((s, id) => {
      const p = parts.find(x => x.id === id)
      const qty = Math.max(0, p.qty - p.stock)
      return s + qty * p.unit_price
    }, 0)
    rows.push(['', '', '', '', '', '合計', total])
    const ws = XLSX.utils.aoa_to_sheet([header, ...rows])
    ws['!cols'] = [8, 20, 22, 8, 6, 10, 14].map(w => ({ wch: w }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '発注リスト')
    XLSX.writeFile(wb, `三和商研_発注リスト_${today}.xlsx`)
  }

  return (
    <div className={styles.wrap}>
      {/* Summary cards */}
      <div className={styles.cards}>
        <div className={`${styles.card} ${styles.cardDanger}`}>
          <div className={styles.cardLabel}>要発注品目</div>
          <div className={styles.cardValue}>{needOrder.length}<span>品目</span></div>
        </div>
        <div className={`${styles.card} ${styles.cardOk}`}>
          <div className={styles.cardLabel}>在庫充足</div>
          <div className={styles.cardValue}>{sufficient.length}<span>品目</span></div>
        </div>
        <div className={`${styles.card} ${styles.cardAmber}`}>
          <div className={styles.cardLabel}>発注予定金額</div>
          <div className={styles.cardValue} style={{ fontSize: orderList.length ? '22px' : '18px' }}>
            {orderList.length ? `¥${totalOrderCost.toLocaleString()}` : '—'}
          </div>
        </div>
        <div className={styles.card}>
          <div className={styles.cardLabel}>選択中</div>
          <div className={styles.cardValue}>{orderList.length}<span>品目</span></div>
        </div>
      </div>

      {/* Need order section */}
      {needOrder.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitle}>
              <span className={styles.dangerDot} />
              在庫不足 — 要発注
            </div>
            <div className={styles.sectionActions}>
              <button className={styles.btnSm} onClick={selectAll}>全選択</button>
              <button className={styles.btnSm} onClick={() => setOrderList([])}>全解除</button>
              {orderList.length > 0 && (
                <>
                  <button className={styles.btnSm} onClick={exportExcel}>Excel出力 ↓</button>
                  <button className={`${styles.btnSm} ${styles.btnMail}`} onClick={sendOrderMail}>✉️ メール発注</button>
                  <button className={`${styles.btn} ${styles.btnSuccess}`} onClick={placeOrder}>
                    {orderList.length}品目を発注する
                  </button>
                </>
              )}
            </div>
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: 36 }}></th>
                  <th>品番</th>
                  <th>品名</th>
                  <th>必要数</th>
                  <th>現在庫</th>
                  <th>不足数</th>
                  <th>発注金額</th>
                  <th>ステータス</th>
                </tr>
              </thead>
              <tbody>
                {needOrder.map(p => {
                  const shortage = p.qty - p.stock
                  const isSelected = orderList.includes(p.id)
                  const isOrdered = !!ordered[p.id]
                  return (
                    <tr
                      key={p.id}
                      className={isSelected ? styles.rowSelected : ''}
                      onClick={() => !isOrdered && toggleOrder(p.id)}
                      style={{ cursor: isOrdered ? 'default' : 'pointer' }}
                    >
                      <td>
                        {!isOrdered && (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleOrder(p.id)}
                            onClick={e => e.stopPropagation()}
                            className={styles.checkbox}
                          />
                        )}
                      </td>
                      <td><code className={styles.code}>{p.id}</code></td>
                      <td className={styles.name}>{p.name}<div className={styles.spec}>{p.spec}</div></td>
                      <td>{p.qty.toLocaleString()} {p.unit}</td>
                      <td className={styles.stockLow}>{p.stock.toLocaleString()} {p.unit}</td>
                      <td className={styles.shortage}>▲ {shortage.toLocaleString()} {p.unit}</td>
                      <td>¥{(shortage * p.unit_price).toLocaleString()}</td>
                      <td>
                        {isOrdered
                          ? <span className={`${styles.badge} ${styles.badgeOk}`}>発注済 {ordered[p.id]}</span>
                          : <span className={`${styles.badge} ${styles.badgeDanger}`}>要発注</span>
                        }
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sufficient section */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>
            <span className={styles.okDot} />
            在庫充足
          </div>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>品番</th>
                <th>品名</th>
                <th>必要数</th>
                <th>現在庫</th>
                <th>余剰</th>
                <th>ステータス</th>
              </tr>
            </thead>
            <tbody>
              {sufficient.map(p => (
                <tr key={p.id}>
                  <td><code className={styles.code}>{p.id}</code></td>
                  <td className={styles.name}>{p.name}</td>
                  <td>{p.qty.toLocaleString()} {p.unit}</td>
                  <td>{p.stock.toLocaleString()} {p.unit}</td>
                  <td className={styles.surplus}>+{(p.stock - p.qty).toLocaleString()} {p.unit}</td>
                  <td><span className={`${styles.badge} ${styles.badgeOk}`}>在庫OK</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
