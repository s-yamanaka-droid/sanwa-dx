import styles from './Landing.module.css'

const FEATURES = [
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
      </svg>
    ),
    title: '図面を読み取る',
    desc: '現場で決めたレイアウト図面（写真・PDF・2D図）をアップロードするだけ。AIが棚の種類・配置・数量を自動解析します。',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M3 6h18M3 12h18M3 18h18"/><rect x="2" y="4" width="4" height="4" rx="1" fill="currentColor" opacity=".3"/>
      </svg>
    ),
    title: '鋼材・部品を自動算出',
    desc: '棚柱・棚板・ベースアンカー・ボルトセットなど、レイアウトに必要な全資材の数量・仕様・単価を瞬時に一覧化します。',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/>
      </svg>
    ),
    title: '見積書を即出力',
    desc: '資材費＋施工費を自動集計し、税込見積書を生成。PDF保存・メール送付まで1クリックで完結します。',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
      </svg>
    ),
    title: '在庫不足を即アラート',
    desc: '現在庫と必要数を照合し、不足品を自動検出。そのままメールで発注できるので、手入力ゼロで調達が完結します。',
  },
]

const FLOW = [
  { step: '01', label: '図面をアップロード', sub: '写真・PDF・2D図面すべてOK' },
  { step: '02', label: 'AIが自動解析', sub: 'Gemini / Claude で棚構成を読み取り' },
  { step: '03', label: '資材リスト＆マップ生成', sub: '数秒でビジュアル化' },
  { step: '04', label: '見積書・発注メール送付', sub: '承認まで一気通貫' },
]

const STATS = [
  { value: '数秒', label: '図面→資材リスト変換' },
  { value: '¥0', label: 'API追加コスト（Gemini無料枠）' },
  { value: '5タブ', label: '図面取込〜見積書まで完結' },
  { value: '1クリック', label: '見積書PDF・メール発注' },
]

export default function Landing({ onStart }) {
  return (
    <div className={styles.wrap}>
      {/* Hero */}
      <div className={styles.hero}>
        <div className={styles.heroTag}>三和商研 × AI 什器管理</div>
        <h1 className={styles.heroTitle}>
          現場図面を読み込むだけで<br />
          <span className={styles.accent}>鋼材算出・見積書・発注</span>が<br />
          ぜんぶ自動になる
        </h1>
        <p className={styles.heroSub}>
          設計士が現場で決めたスーパーのレイアウト図面を貼り付けるだけ。必要な棚柱・棚板・固定材を自動集計し、見積書作成から発注メールまで一気通貫で完結します。
        </p>
        <button className={styles.ctaBtn} onClick={onStart}>
          図面を読み込んでみる →
        </button>
        <button className={styles.sampleLink} onClick={onStart}>
          サンプルデータで今すぐ体験
        </button>
      </div>

      {/* Stats */}
      <div className={styles.stats}>
        {STATS.map(s => (
          <div key={s.label} className={styles.statItem}>
            <div className={styles.statValue}>{s.value}</div>
            <div className={styles.statLabel}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Features */}
      <div className={styles.section}>
        <div className={styles.sectionLabel}>このAIでできること</div>
        <div className={styles.features}>
          {FEATURES.map(f => (
            <div key={f.title} className={styles.card}>
              <div className={styles.cardIcon}>{f.icon}</div>
              <div className={styles.cardTitle}>{f.title}</div>
              <div className={styles.cardDesc}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Flow */}
      <div className={styles.section}>
        <div className={styles.sectionLabel}>使い方・4ステップ</div>
        <div className={styles.flow}>
          {FLOW.map((f, i) => (
            <div key={f.step} className={styles.flowItem}>
              <div className={styles.flowStep}>{f.step}</div>
              <div className={styles.flowLabel}>{f.label}</div>
              <div className={styles.flowSub}>{f.sub}</div>
              {i < FLOW.length - 1 && <div className={styles.flowArrow}>→</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Before / After */}
      <div className={styles.section}>
        <div className={styles.sectionLabel}>導入前 vs 導入後</div>
        <div className={styles.compare}>
          <div className={`${styles.compareCol} ${styles.compareBefore}`}>
            <div className={styles.compareLabel}>導入前</div>
            {['図面を見ながら手で棚本数を数える','Excelで資材リストを手入力','単価を都度調べて電卓で合計','見積書フォーマットを毎回作り直す','在庫と照合して発注漏れが発生'].map(t => (
              <div key={t} className={styles.compareItem}>
                <span className={styles.xMark}>✕</span>{t}
              </div>
            ))}
          </div>
          <div className={`${styles.compareCol} ${styles.compareAfter}`}>
            <div className={styles.compareLabel}>導入後</div>
            {['図面をアップロードするだけ','資材リストが自動生成','単価・合計が即計算','見積書ボタン1つでPDF出力','在庫不足を自動検出→メール発注'].map(t => (
              <div key={t} className={styles.compareItem}>
                <span className={styles.checkMark}>✓</span>{t}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA bottom */}
      <div className={styles.ctaArea}>
        <p className={styles.ctaNote}>追加費用ゼロ。Gemini API 無料枠のみで動作します。</p>
        <button className={styles.ctaBtn} onClick={onStart}>
          実際に試してみる →
        </button>
      </div>
    </div>
  )
}
