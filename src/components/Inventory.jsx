import { useState, useEffect } from 'react'
import * as XLSX from 'xlsx'
import styles from './Inventory.module.css'

const DEFAULT_COL_FORMAT = [
  { key: 'id',         label: '品番',       on: true  },
  { key: 'name',       label: '品名',       on: true  },
  { key: 'spec',       label: '仕様',       on: true  },
  { key: 'qty',        label: '発注数',     on: true  },
  { key: 'unit',       label: '単位',       on: true  },
  { key: 'unit_price', label: '単価(円)',   on: true  },
  { key: 'total',      label: '発注金額(円)',on: true  },
]

export default function Inventory({ data }) {
  const [orderList, setOrderList] = useState([])
  const [ordered, setOrdered] = useState({})

  // localStorage: alert email
  const [alertEmail, setAlertEmail] = useState(() =>
    localStorage.getItem('sanwa_alertEmail') || ''
  )
  const [emailEditing, setEmailEditing] = useState(false)
  const [emailDraft, setEmailDraft] = useState('')

  // localStorage: order history
  const [orderHistory, setOrderHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sanwa_orderHistory') || '[]') } catch { return [] }
  })

  // localStorage: Excel col format
  const [colFormat, setColFormat] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('sanwa_colFormat') || 'null')
      return saved || DEFAULT_COL_FORMAT
    } catch { return DEFAULT_COL_FORMAT }
  })
  const [showColConfig, setShowColConfig] = useState(false)

  // 2-step delete confirm
  const [confirmClear, setConfirmClear] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState(null)

  const { parts } = data

  const needOrder = parts.filter(p => p.stock < p.qty)
  const sufficient = parts.filter(p => p.stock >= p.qty)

  const toggleOrder = (id) => {
    setOrderList(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const selectAll = () => setOrderList(needOrder.map(p => p.id))

  const totalOrderCost = orderList.reduce((sum, id) => {
    const p = parts.find(x => x.id === id)
    if (!p) return sum
    return sum + Math.max(0, p.qty - p.stock) * p.unit_price
  }, 0)

  const placeOrder = () => {
    const now = new Date()
    const entry = {
      histId: `ORD-${now.getTime()}`,
      date: now.toLocaleString('ja-JP'),
      isoDate: now.toISOString(),
      project: data.meta.project,
      items: orderList.map(id => {
        const p = parts.find(x => x.id === id)
        const qty = Math.max(0, p.qty - p.stock)
        return { id: p.id, name: p.name, spec: p.spec, qty, unit: p.unit, unit_price: p.unit_price, total: qty * p.unit_price }
      }),
      totalAmount: totalOrderCost,
    }
    const next = [entry, ...orderHistory]
    setOrderHistory(next)
    localStorage.setItem('sanwa_orderHistory', JSON.stringify(next))

    const ts = now.toLocaleString('ja-JP')
    const newOrdered = {}
    orderList.forEach(id => { newOrdered[id] = ts })
    setOrdered(prev => ({ ...prev, ...newOrdered }))
    setOrderList([])
  }

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
    const to = alertEmail ? encodeURIComponent(alertEmail) : ''
    window.open(`mailto:${to}?subject=${subject}&body=${encodeURIComponent(lines)}`)
  }

  const sendAlertMail = () => {
    const subject = encodeURIComponent(`【在庫不足アラート】${data.meta.project}`)
    const lines = [
      `在庫不足のアラートです。`,
      ``,
      ...needOrder.map(p => `  ${p.name}（${p.id}）：必要${p.qty}${p.unit} / 在庫${p.stock}${p.unit} / 不足${p.qty - p.stock}${p.unit}`),
    ].join('\n')
    const to = alertEmail ? encodeURIComponent(alertEmail) : ''
    window.open(`mailto:${to}?subject=${subject}&body=${encodeURIComponent(lines)}`)
  }

  const exportExcel = () => {
    if (orderList.length === 0) return
    const today = new Date().toLocaleDateString('ja-JP').replace(/\//g, '-')
    const activeCols = colFormat.filter(c => c.on)
    const header = activeCols.map(c => c.label)
    const colWidths = { id: 8, name: 20, spec: 22, qty: 8, unit: 6, unit_price: 10, total: 14 }

    const rows = orderList.map(id => {
      const p = parts.find(x => x.id === id)
      const qty = Math.max(0, p.qty - p.stock)
      const rowMap = { id: p.id, name: p.name, spec: p.spec, qty, unit: p.unit, unit_price: p.unit_price, total: qty * p.unit_price }
      return activeCols.map(c => rowMap[c.key])
    })
    const total = orderList.reduce((s, id) => {
      const p = parts.find(x => x.id === id)
      const qty = Math.max(0, p.qty - p.stock)
      return s + qty * p.unit_price
    }, 0)
    // Totals row
    const totalRow = activeCols.map(c => {
      if (c.key === 'total') return total
      if (c.key === 'unit_price') return '合計'
      return ''
    })
    rows.push(totalRow)

    const ws = XLSX.utils.aoa_to_sheet([header, ...rows])
    ws['!cols'] = activeCols.map(c => ({ wch: colWidths[c.key] || 12 }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '発注リスト')
    XLSX.writeFile(wb, `三和商研_発注リスト_${today}.xlsx`)
  }

  const exportHistoryExcel = () => {
    if (orderHistory.length === 0) return
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const header = ['発注日', '案件名', '品番', '品名', '数量', '単位', '単価(円)', '金額(円)']
    const rows = []
    orderHistory.forEach(h => {
      h.items.forEach((item, i) => {
        rows.push([
          i === 0 ? h.date : '',
          i === 0 ? h.project : '',
          item.id, item.name, item.qty, item.unit, item.unit_price, item.total
        ])
      })
      rows.push(['', '', '', '', '', '', '小計', h.totalAmount])
      rows.push([])
    })
    const ws = XLSX.utils.aoa_to_sheet([header, ...rows])
    ws['!cols'] = [16, 20, 8, 20, 8, 6, 10, 14].map(w => ({ wch: w }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '発注履歴')
    XLSX.writeFile(wb, `三和商研_発注履歴_${today}.xlsx`)
  }

  const saveEmail = () => {
    localStorage.setItem('sanwa_alertEmail', emailDraft)
    setAlertEmail(emailDraft)
    setEmailEditing(false)
  }

  const toggleCol = (key) => {
    const next = colFormat.map(c => c.key === key ? { ...c, on: !c.on } : c)
    setColFormat(next)
    localStorage.setItem('sanwa_colFormat', JSON.stringify(next))
  }

  const deleteHistEntry = (histId) => {
    const next = orderHistory.filter(h => h.histId !== histId)
    setOrderHistory(next)
    localStorage.setItem('sanwa_orderHistory', JSON.stringify(next))
    setPendingDeleteId(null)
  }

  const clearHistory = () => {
    setOrderHistory([])
    localStorage.removeItem('sanwa_orderHistory')
    setConfirmClear(false)
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

      {/* Alert email setting */}
      <div className={styles.alertBar}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="7" cy="7" r="6" stroke="var(--accent)" strokeWidth="1.4"/>
          <line x1="7" y1="6" x2="7" y2="10" stroke="var(--accent)" strokeWidth="1.4" strokeLinecap="round"/>
          <circle cx="7" cy="4.5" r=".7" fill="var(--accent)"/>
        </svg>
        <span className={styles.alertLabel}>アラート送信先</span>
        {emailEditing ? (
          <>
            <input
              className={styles.emailInput}
              value={emailDraft}
              onChange={e => setEmailDraft(e.target.value)}
              placeholder="example@email.com"
              type="email"
            />
            <button className={styles.btnXs} onClick={saveEmail}>保存</button>
            <button className={styles.btnXs} onClick={() => setEmailEditing(false)}>キャンセル</button>
          </>
        ) : (
          <>
            <span className={styles.emailDisplay}>{alertEmail || '未設定'}</span>
            <button className={styles.btnXs} onClick={() => { setEmailDraft(alertEmail); setEmailEditing(true) }}>
              {alertEmail ? '変更' : '設定'}
            </button>
            {needOrder.length > 0 && alertEmail && (
              <button className={`${styles.btnXs} ${styles.btnAlert}`} onClick={sendAlertMail}>
                在庫不足を通知
              </button>
            )}
          </>
        )}
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
                  <button className={styles.btnSm} onClick={() => setShowColConfig(v => !v)}>列設定</button>
                  <button className={styles.btnSm} onClick={exportExcel}>Excel出力 ↓</button>
                  <button className={`${styles.btnSm} ${styles.btnMail}`} onClick={sendOrderMail}>メール発注</button>
                  <button className={`${styles.btn} ${styles.btnSuccess}`} onClick={placeOrder}>
                    {orderList.length}品目を発注する
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Column config */}
          {showColConfig && (
            <div className={styles.colConfig}>
              <div className={styles.colConfigTitle}>Excel出力 列設定</div>
              <div className={styles.colConfigItems}>
                {colFormat.map(c => (
                  <label key={c.key} className={styles.colItem}>
                    <input
                      type="checkbox"
                      checked={c.on}
                      onChange={() => toggleCol(c.key)}
                      className={styles.checkbox}
                    />
                    {c.label}
                  </label>
                ))}
              </div>
            </div>
          )}

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
                          ? <span className={`${styles.badge} ${styles.badgeOk}`}>発注済</span>
                          : <span className={`${styles.badge} ${styles.badgeDanger}`}>要発注</span>}
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

      {/* Order history */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>
            <span className={styles.histDot} />
            発注履歴 ({orderHistory.length}件)
          </div>
          <div className={styles.sectionActions}>
            {orderHistory.length > 0 && (
              <>
                <button className={styles.btnSm} onClick={exportHistoryExcel}>Excel出力 ↓</button>
                {confirmClear ? (
                  <>
                    <span className={styles.confirmText}>本当に削除しますか？</span>
                    <button className={`${styles.btnSm} ${styles.btnDanger}`} onClick={clearHistory}>削除する</button>
                    <button className={styles.btnSm} onClick={() => setConfirmClear(false)}>キャンセル</button>
                  </>
                ) : (
                  <button className={styles.btnSm} onClick={() => setConfirmClear(true)}>履歴をクリア</button>
                )}
              </>
            )}
          </div>
        </div>

        {orderHistory.length === 0 ? (
          <div className={styles.emptyHist}>発注履歴はありません</div>
        ) : (
          <div className={styles.histList}>
            {orderHistory.map(h => (
              <div key={h.histId} className={styles.histCard}>
                <div className={styles.histCardHeader}>
                  <div>
                    <span className={styles.histDate}>{h.date}</span>
                    <span className={styles.histProject}>{h.project}</span>
                  </div>
                  <div className={styles.histRight}>
                    <span className={styles.histTotal}>¥{h.totalAmount.toLocaleString()}</span>
                    {pendingDeleteId === h.histId ? (
                      <>
                        <button className={`${styles.btnXs} ${styles.btnDanger}`} onClick={() => deleteHistEntry(h.histId)}>削除</button>
                        <button className={styles.btnXs} onClick={() => setPendingDeleteId(null)}>戻る</button>
                      </>
                    ) : (
                      <button className={styles.histDeleteBtn} onClick={() => setPendingDeleteId(h.histId)}>✕</button>
                    )}
                  </div>
                </div>
                <div className={styles.histItems}>
                  {h.items.map((item, i) => (
                    <span key={i} className={styles.histItem}>
                      {item.name} × {item.qty}{item.unit}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
