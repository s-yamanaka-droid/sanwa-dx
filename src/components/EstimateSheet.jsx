import { useRef } from 'react'
import * as XLSX from 'xlsx'
import styles from './EstimateSheet.module.css'

const LABOR_UNIT_PRICE = 25000 // 人工単価（円/人日）

export default function EstimateSheet({ data }) {
  const { meta, parts, labor } = data
  const today = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })

  const partsTotal = parts.reduce((s, p) => s + p.qty * p.unit_price, 0)
  const laborTotal = labor.total_man_days * LABOR_UNIT_PRICE
  const subtotal = partsTotal + laborTotal
  const tax = Math.floor(subtotal * 0.1)
  const grand = subtotal + tax

  const handlePrint = () => window.print()

  const handleMailto = () => {
    const subject = encodeURIComponent(`【見積書】${meta.project}`)
    const lines = [
      `${meta.project} 見積書`,
      `作成日：${today}`,
      ``,
      `■ 資材費`,
      ...parts.map(p => `  ${p.name}（${p.spec}）× ${p.qty}${p.unit}  ¥${(p.qty * p.unit_price).toLocaleString()}`),
      `  資材費 小計：¥${partsTotal.toLocaleString()}`,
      ``,
      `■ 施工費`,
      ...labor.breakdown.map(b => `  ${b.task}  ${b.man_days}人日`),
      `  施工費 小計：¥${laborTotal.toLocaleString()}`,
      ``,
      `─────────────────`,
      `  小計：¥${subtotal.toLocaleString()}`,
      `  消費税（10%）：¥${tax.toLocaleString()}`,
      `  合計：¥${grand.toLocaleString()}`,
      ``,
      `※ 本見積は三和商研 DX Platformにより自動生成されました。`,
    ].join('\n')
    const body = encodeURIComponent(lines)
    window.open(`mailto:?subject=${subject}&body=${body}`)
  }

  const handleExcel = () => {
    const dateStr = (meta.date || new Date().toLocaleDateString('ja-JP')).replace(/\//g, '-')
    // シート1: 見積サマリ
    const summaryData = [
      ['三和商研　見積書'],
      ['件名', meta.project],
      ['作成日', today],
      ['売場面積', `${meta.area_sqm}㎡（${meta.area_tsubo}坪）`],
      [],
      ['お見積金額（税込）', grand],
      [],
    ]
    // シート2: 資材明細
    const partsHeader = ['区分', '品番', '品名', '仕様', '数量', '単位', '単価(円)', '金額(円)']
    const partsRows = [
      partsHeader,
      ...parts.map(p => ['資材', p.id, p.name, p.spec, p.qty, p.unit, p.unit_price, p.qty * p.unit_price]),
      ...labor.breakdown.map(b => ['施工', '', b.task, '', b.man_days, '人日', LABOR_UNIT_PRICE, b.man_days * LABOR_UNIT_PRICE]),
      ['', '', '', '', '', '', '小計', subtotal],
      ['', '', '', '', '', '', '消費税(10%)', tax],
      ['', '', '', '', '', '', '合計(税込)', grand],
    ]
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData)
    const wsDetail  = XLSX.utils.aoa_to_sheet(partsRows)
    wsDetail['!cols'] = [6, 10, 20, 22, 8, 6, 10, 14].map(w => ({ wch: w }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, wsSummary, '見積書')
    XLSX.utils.book_append_sheet(wb, wsDetail,  '明細')
    XLSX.writeFile(wb, `三和商研_見積書_${dateStr}.xlsx`)
  }

  return (
    <div className={styles.wrap}>
      {/* 操作ボタン（印刷時は非表示） */}
      <div className={`${styles.actions} no-print`}>
        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handlePrint}>🖨️ 印刷 / PDF保存</button>
        <button className={`${styles.btn} ${styles.btnMail}`} onClick={handleMailto}>✉️ メールで送る</button>
        <button className={styles.btn} onClick={handleExcel}>📊 Excel出力</button>
      </div>

      {/* 見積書本体 */}
      <div className={styles.sheet} id="estimate-sheet">
        <div className={styles.sheetHeader}>
          <div className={styles.sheetTitle}>見　積　書</div>
          <div className={styles.sheetMeta}>
            <div>作成日：{today}</div>
            <div>有効期限：作成日より30日</div>
          </div>
        </div>

        <div className={styles.projectInfo}>
          <div className={styles.projectRow}>
            <span className={styles.projectLabel}>件名</span>
            <span className={styles.projectValue}>{meta.project}</span>
          </div>
          <div className={styles.projectRow}>
            <span className={styles.projectLabel}>売場面積</span>
            <span className={styles.projectValue}>{meta.area_sqm.toLocaleString()}㎡（{meta.area_tsubo}坪）</span>
          </div>
          {meta.notes && (
            <div className={styles.projectRow}>
              <span className={styles.projectLabel}>備考</span>
              <span className={styles.projectValue}>{meta.notes}</span>
            </div>
          )}
        </div>

        {/* 合計金額 */}
        <div className={styles.grandTotal}>
          <span className={styles.grandLabel}>お見積金額（税込）</span>
          <span className={styles.grandValue}>¥{grand.toLocaleString()}</span>
          <span className={styles.grandNote}>（税抜 ¥{subtotal.toLocaleString()} ＋ 消費税 ¥{tax.toLocaleString()}）</span>
        </div>

        {/* 資材費 */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>1. 資材費</div>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>品番</th><th>品名</th><th>仕様</th><th>数量</th><th>単位</th>
                <th>単価</th><th>金額</th><th>カテゴリ</th>
              </tr>
            </thead>
            <tbody>
              {parts.map(p => (
                <tr key={p.id}>
                  <td><code>{p.id}</code></td>
                  <td>{p.name}</td>
                  <td className={styles.spec}>{p.spec}</td>
                  <td className={styles.num}>{p.qty.toLocaleString()}</td>
                  <td>{p.unit}</td>
                  <td className={styles.num}>¥{p.unit_price.toLocaleString()}</td>
                  <td className={styles.num}>¥{(p.qty * p.unit_price).toLocaleString()}</td>
                  <td><span className={styles.tag}>{p.category}</span></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className={styles.subtotalRow}>
                <td colSpan={6}>資材費 小計</td>
                <td className={styles.num}>¥{partsTotal.toLocaleString()}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* 施工費 */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>2. 施工費</div>
          <table className={styles.table}>
            <thead>
              <tr><th>作業内容</th><th>人工数</th><th>人工単価</th><th>金額</th></tr>
            </thead>
            <tbody>
              {labor.breakdown.map((b, i) => (
                <tr key={i}>
                  <td>{b.task}</td>
                  <td className={styles.num}>{b.man_days} 人日</td>
                  <td className={styles.num}>¥{LABOR_UNIT_PRICE.toLocaleString()}</td>
                  <td className={styles.num}>¥{(b.man_days * LABOR_UNIT_PRICE).toLocaleString()}</td>
                </tr>
              ))}
              <tr className={styles.infoRow}>
                <td>工期目安</td>
                <td colSpan={3}>{labor.crew_size}名 × {labor.estimated_days}日（合計 {labor.total_man_days}人日）</td>
              </tr>
            </tbody>
            <tfoot>
              <tr className={styles.subtotalRow}>
                <td colSpan={3}>施工費 小計</td>
                <td className={styles.num}>¥{laborTotal.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* 合計表 */}
        <div className={styles.totalTable}>
          <div className={styles.totalRow}><span>資材費</span><span>¥{partsTotal.toLocaleString()}</span></div>
          <div className={styles.totalRow}><span>施工費</span><span>¥{laborTotal.toLocaleString()}</span></div>
          <div className={styles.totalRow}><span>小計</span><span>¥{subtotal.toLocaleString()}</span></div>
          <div className={styles.totalRow}><span>消費税（10%）</span><span>¥{tax.toLocaleString()}</span></div>
          <div className={`${styles.totalRow} ${styles.totalFinal}`}>
            <span>合計（税込）</span><span>¥{grand.toLocaleString()}</span>
          </div>
        </div>

        <div className={styles.footer}>
          <div>株式会社 三和商研</div>
          <div className={styles.footerNote}>※ 本見積書は三和商研 DX Platform により自動生成されました。実際の施工条件により変動する場合があります。</div>
        </div>
      </div>
    </div>
  )
}
