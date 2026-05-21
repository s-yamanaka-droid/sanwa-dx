import { useState, useRef } from 'react'
import styles from './JsonInput.module.css'
import { safeParseLayout } from '../lib/layoutSchema'

const PROMPT_TEMPLATE = `以下のスーパーマーケット什器レイアウト図面を解析して、必要な鋼材・部品・工具を算出し、JSONで出力してください。

【目的】
設計士が現場で決めたレイアウトをもとに、必要な棚什器の鋼材・部品・締結材・施工工具を自動算出し、見積書を作成します。

出力形式（このJSONをそのままコピーしてツールに貼り付けてください）:
{
  "meta": {
    "project": "プロジェクト名",
    "date": "YYYY-MM-DD",
    "area_sqm": 売場面積（数値）,
    "area_tsubo": 坪数（数値）,
    "notes": "備考"
  },
  "zones": [
    { "id": "zone-1", "name": "エリア名", "type": "general|fresh|daily", "color": "#カラーコード", "x": 0, "y": 0, "w": 幅, "h": 高さ }
  ],
  "shelves": [
    { "id": "S001", "zone": "zone-1", "x": X座標, "y": Y座標, "w": 幅, "h": 高さ, "type": "SH-1950|SH-1500W", "label": "棚ラベル" }
  ],
  "parts": [
    { "id": "品番", "name": "品名", "spec": "仕様・寸法", "qty": 数量, "unit": "単位", "category": "主材|固定材|陳列部材|締結材|施工材", "stock": 0, "unit_price": 単価, "cost_price": 原価またはnull }
  ],
  "labor": {
    "total_man_days": 合計人工,
    "crew_size": 作業人数,
    "estimated_days": 工期日数,
    "breakdown": [{ "task": "作業名", "man_days": 人工数 }]
  }
}

図面から算出する情報:
- 棚柱ユニット（SH-1950H）の本数 ← 棚列数 × 両端で算出
- 棚板の枚数・幅種別（970mm / 1500mm）← 棚段数 × 列数
- ベースアンカー数 ← 棚柱本数と同数
- 価格レール・ラベルホルダー数 ← 棚板枚数から算出
- ボルト・ナットセット数 ← 棚柱 × 段数 × 2
- 養生テープ・施工材
- 施工人工数（棚柱組立・棚板取付・養生搬入・清掃）

重要な制約:
- zone.type は "general" / "fresh" / "daily" のいずれか（frozen/refrigeratedは禁止）
- shelf.type は "SH-1950" / "SH-1500W" のいずれか
- part.category は "主材" / "固定材" / "陳列部材" / "締結材" / "施工材" のいずれか

JSONのみを出力してください。説明文・コードブロック・前置きは一切不要です。`

// スーパーマーケット平面図 SVG（什器エリアのみ）
const SupermarketSVG = () => (
  <svg viewBox="0 0 640 420" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: 'auto', borderRadius: 8 }}>
    {/* 外壁 */}
    <rect x="10" y="10" width="620" height="400" rx="4" fill="#f8f8f5" stroke="#333" strokeWidth="3"/>

    {/* 入口 */}
    <rect x="260" y="7" width="120" height="8" fill="#f8f8f5" stroke="none"/>
    <text x="320" y="6" textAnchor="middle" fontSize="11" fill="#333" fontWeight="bold">入口 / 出口</text>

    {/* ── 食品棚エリア（上段・メイン） ── */}
    <rect x="20" y="20" width="600" height="200" rx="3" fill="#fdf7ee" stroke="#ccaa55" strokeWidth="1.5"/>
    <text x="320" y="34" textAnchor="middle" fontSize="11" fill="#886622" fontWeight="700">食品・加工品エリア（棚什器 SH-1950 × 12列）</text>
    {[30,80,130,180,230,280,330,380,430,480,530,580].map((x,i) => (
      <g key={i}>
        <rect x={x} y="42" width="36" height="170" rx="2" fill="#f5e4bb" stroke="#bb9944" strokeWidth="1"/>
        <text x={x+18} y="100" textAnchor="middle" fontSize="8" fill="#664400" transform={`rotate(-90,${x+18},100)`}>食品{String(i+1).padStart(2,'0')}</text>
      </g>
    ))}
    {/* 通路ライン */}
    <line x1="20" y1="130" x2="620" y2="130" stroke="#e0d0a0" strokeWidth="1" strokeDasharray="4,6"/>
    <text x="628" y="134" fontSize="8" fill="#bba060">通路</text>

    {/* ── 生鮮エリア（左下） ── */}
    <rect x="20" y="232" width="290" height="160" rx="3" fill="#e6f7f0" stroke="#44aa77" strokeWidth="1.5"/>
    <text x="165" y="248" textAnchor="middle" fontSize="11" fill="#116644" fontWeight="700">生鮮エリア（棚什器 SH-1500W × 3列）</text>
    {[30, 120, 215].map((x,i) => (
      <g key={i}>
        <rect x={x} y="256" width="75" height="128" rx="2" fill="#aae8cc" stroke="#33bb77" strokeWidth="1"/>
        <text x={x+37} y="322" textAnchor="middle" fontSize="9" fill="#116644">生鮮{i+1}</text>
      </g>
    ))}

    {/* ── 日用品エリア（右下） ── */}
    <rect x="330" y="232" width="290" height="160" rx="3" fill="#fef0f8" stroke="#cc77aa" strokeWidth="1.5"/>
    <text x="475" y="248" textAnchor="middle" fontSize="11" fill="#884466" fontWeight="700">日用品エリア（棚什器 SH-1950 × 4列）</text>
    {[340, 400, 460, 530].map((x,i) => (
      <g key={i}>
        <rect x={x} y="256" width="55" height="128" rx="2" fill="#f8d8ec" stroke="#cc77aa" strokeWidth="1"/>
        <text x={x+27} y="322" textAnchor="middle" fontSize="9" fill="#773355">日用{i+1}</text>
      </g>
    ))}

    {/* 寸法補助線 */}
    <line x1="20" y1="408" x2="620" y2="408" stroke="#aaa" strokeWidth="0.5" markerEnd="url(#arr)"/>
    <text x="320" y="418" textAnchor="middle" fontSize="9" fill="#999">全幅 約40m（1818㎡ / 550坪）</text>

    {/* 凡例 */}
    <g transform="translate(20, 395)">
      {[['#fdf7ee','食品棚'],['#e6f7f0','生鮮棚'],['#fef0f8','日用品棚']].map(([c,l],i) => (
        <g key={i} transform={`translate(${i*120},0)`}>
          <rect width="10" height="10" fill={c} stroke="#999" strokeWidth="0.5"/>
          <text x="13" y="9" fontSize="9" fill="#555">{l}</text>
        </g>
      ))}
    </g>
  </svg>
)

async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const data = e.target.result
      // strip "data:...;base64," prefix
      resolve(data.split(',')[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function extractJsonFromText(text) {
  if (!text) return null
  // コードブロックから抽出する場合
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const candidate = fence ? fence[1] : text
  const match = candidate.match(/\{[\s\S]*\}/)
  if (!match) return null
  try {
    return JSON.parse(match[0])
  } catch {
    return null
  }
}

export default function JsonInput({ data, onLoad, onNext }) {
  const [jsonText, setJsonText] = useState('')
  const [error, setError] = useState('')
  const [imgPreview, setImgPreview] = useState(null)
  const [imgFile, setImgFile] = useState(null)
  const [copied, setCopied] = useState(false)
  const fileRef = useRef()

  // Gemini API キー（PdfReader と共有）
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('sanwa_geminiKey') || '')
  const [keyEditing, setKeyEditing] = useState(!localStorage.getItem('sanwa_geminiKey'))
  const [keyDraft, setKeyDraft] = useState('')

  // AI自動生成のフロー状態
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const [aiIssues, setAiIssues] = useState([])
  const [aiResult, setAiResult] = useState(null) // parsed & validated data
  const [aiRawJson, setAiRawJson] = useState('') // 失敗時の生JSON（手動修正用）

  const saveKey = () => {
    localStorage.setItem('sanwa_geminiKey', keyDraft)
    setApiKey(keyDraft)
    setKeyEditing(false)
  }

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setImgFile(file)
    setAiError('')
    setAiIssues([])
    setAiResult(null)
    setAiRawJson('')
    const reader = new FileReader()
    reader.onload = (ev) => setImgPreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (!file) return
    setImgFile(file)
    setAiError('')
    setAiIssues([])
    setAiResult(null)
    setAiRawJson('')
    const reader = new FileReader()
    reader.onload = (ev) => setImgPreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  const clearImage = () => {
    setImgPreview(null)
    setImgFile(null)
    setAiError('')
    setAiIssues([])
    setAiResult(null)
    setAiRawJson('')
  }

  const handleLoad = () => {
    setError('')
    try {
      const parsed = JSON.parse(jsonText)
      const validation = safeParseLayout(parsed)
      if (!validation.success) {
        setError(
          'JSONの形式は正しいですが、スキーマ検証に失敗しました:\n' +
            validation.issues.map((i) => '・' + i.message).join('\n')
        )
        return
      }
      onLoad(validation.data)
    } catch {
      setError('JSONの形式が正しくありません。Claude / Gemini の出力をそのまま貼り付けてください。')
    }
  }

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(PROMPT_TEMPLATE)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleAiGenerate = async () => {
    if (!imgFile || !apiKey) return
    setAiLoading(true)
    setAiError('')
    setAiIssues([])
    setAiResult(null)
    setAiRawJson('')
    try {
      // PDFは未対応とする（図面取込タブは画像のみ）
      const mimeType = imgFile.type
      const isImage = mimeType.startsWith('image/')
      const isPdf = mimeType === 'application/pdf'
      if (!isImage && !isPdf) {
        throw new Error('対応していないファイル形式です。JPG / PNG / WEBP / PDF をアップロードしてください。')
      }
      if (imgFile.size > 20 * 1024 * 1024) {
        throw new Error('ファイルサイズが大きすぎます（最大 20MB）')
      }

      const base64 = await fileToBase64(imgFile)

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: PROMPT_TEMPLATE },
                  { inlineData: { mimeType, data: base64 } },
                ],
              },
            ],
            generationConfig: {
              response_mime_type: 'application/json',
              temperature: 0.1,
            },
          }),
        }
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message || `HTTP ${res.status}`)
      }
      const json = await res.json()
      const text = json?.candidates?.[0]?.content?.parts?.[0]?.text || ''

      // response_mime_type=application/json 指定なので、まずそのままパースを試す
      let parsed = null
      try {
        parsed = JSON.parse(text)
      } catch {
        parsed = extractJsonFromText(text)
      }
      if (!parsed) {
        setAiRawJson(text)
        throw new Error('Geminiの出力からJSONを取り出せませんでした。下のテキストを確認してください。')
      }

      const validation = safeParseLayout(parsed)
      if (!validation.success) {
        // スキーマ違反 → 生JSONを編集可能にする
        setAiRawJson(JSON.stringify(parsed, null, 2))
        setAiIssues(validation.issues)
        throw new Error('AIが生成したJSONがスキーマと一致しませんでした。下記の項目を確認してください。')
      }

      setAiResult(validation.data)
    } catch (e) {
      setAiError(e.message || String(e))
    } finally {
      setAiLoading(false)
    }
  }

  const acceptAiResult = () => {
    if (!aiResult) return
    onLoad(aiResult)
  }

  const useRawJsonInTextarea = () => {
    if (!aiRawJson) return
    setJsonText(aiRawJson)
    setAiResult(null)
    setAiIssues([])
    setAiError('')
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.notice}>
        <div className={styles.noticeIcon}>i</div>
        <div>
          <div className={styles.noticeTitle}>AI解析フロー（Gemini API 直結 + 手動貼付フォールバック）</div>
          <div className={styles.noticeText}>
            図面をアップロード → 「AIで自動生成」で Gemini に直接送信 → JSON自動取得 → スキーマ検証 → マップ生成。
            手動で Gemini / Claude に貼り付ける従来フローも利用可能です。
          </div>
        </div>
      </div>

      <div className={styles.grid}>
        {/* Step 1 */}
        <div className={styles.card}>
          <div className={styles.stepNum}>STEP 1</div>
          <div className={styles.stepTitle}>図面をアップロード</div>

          {/* サンプル図面プレビュー */}
          {!imgPreview && (
            <div className={styles.sampleWrap}>
              <div className={styles.sampleLabel}>▼ サンプル図面（スーパーマーケット什器レイアウト）</div>
              <SupermarketSVG />
            </div>
          )}

          <div
            className={styles.dropzone}
            onClick={() => fileRef.current.click()}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            {imgPreview ? (
              <img src={imgPreview} alt="図面プレビュー" className={styles.preview} />
            ) : (
              <>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={styles.uploadIcon}>
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                </svg>
                <div className={styles.dropText}>実際の図面はここにドロップ</div>
                <div className={styles.dropHint}>JPG / PNG / WEBP / PDF（最大 20MB）</div>
              </>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={handleFile} style={{ display: 'none' }} />
          {imgPreview && (
            <button className={styles.btnSm} onClick={clearImage}>
              画像をクリア
            </button>
          )}
        </div>

        {/* Step 2 — AI 自動生成（Gemini API 直結） */}
        <div className={styles.card}>
          <div className={styles.stepNum}>STEP 2 (推奨)</div>
          <div className={styles.stepTitle}>AIで自動生成（Gemini API 直結）</div>

          {/* API Key 設定UI */}
          <div className={styles.keyBar}>
            <span className={styles.keyLabel}>Gemini API キー</span>
            {keyEditing ? (
              <>
                <input
                  className={styles.keyInput}
                  value={keyDraft}
                  onChange={(e) => setKeyDraft(e.target.value)}
                  placeholder="AIza..."
                  type="password"
                />
                <button className={styles.btnSm} onClick={saveKey} disabled={!keyDraft.trim()}>保存</button>
                {apiKey && <button className={styles.btnSm} onClick={() => setKeyEditing(false)}>キャンセル</button>}
              </>
            ) : (
              <>
                <span className={styles.keyDisplay}>{apiKey ? '●●●●●●●●' : '未設定'}</span>
                <button className={styles.btnSm} onClick={() => { setKeyDraft(apiKey); setKeyEditing(true) }}>
                  {apiKey ? '変更' : '設定'}
                </button>
              </>
            )}
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className={styles.keyLink}
            >
              キーを取得（無料）
            </a>
          </div>

          <button
            className={`${styles.btn} ${styles.btnAccent}`}
            onClick={handleAiGenerate}
            disabled={!imgFile || !apiKey || aiLoading}
          >
            {aiLoading ? 'Geminiが図面を解析中... 10-30秒' : 'AIで自動生成 →'}
          </button>

          {!imgFile && (
            <div className={styles.hint}>図面をアップロードすると有効になります</div>
          )}
          {imgFile && !apiKey && (
            <div className={styles.hint}>Gemini API キーを設定してください</div>
          )}

          {/* 成功表示 */}
          {aiResult && (
            <div className={styles.aiSuccess}>
              <div className={styles.aiSuccessTitle}>
                ✓ {aiResult.shelves.length}個の棚 / {aiResult.parts.length}個の資材を検出しました
              </div>
              <div className={styles.aiSuccessMeta}>
                プロジェクト: {aiResult.meta.project} / 面積: {aiResult.meta.area_sqm}㎡
              </div>
              <button
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={acceptAiResult}
              >
                このデータでマップを生成 →
              </button>
            </div>
          )}

          {/* エラー表示 */}
          {aiError && (
            <div className={styles.aiError}>
              <div className={styles.aiErrorTitle}>✗ AI生成失敗</div>
              <div className={styles.aiErrorMsg}>{aiError}</div>
              {aiIssues.length > 0 && (
                <ul className={styles.aiIssueList}>
                  {aiIssues.slice(0, 8).map((iss, i) => (
                    <li key={i}>{iss.message}</li>
                  ))}
                  {aiIssues.length > 8 && <li>...他 {aiIssues.length - 8} 件</li>}
                </ul>
              )}
              <div className={styles.aiErrorActions}>
                <button className={styles.btnSm} onClick={handleAiGenerate} disabled={aiLoading || !imgFile || !apiKey}>
                  もう一度試す
                </button>
                {aiRawJson && (
                  <button className={styles.btnSm} onClick={useRawJsonInTextarea}>
                    手動で編集する
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Step 2b — 手動フォールバック */}
        <div className={styles.card} style={{ gridColumn: '1 / -1' }}>
          <div className={styles.stepNum}>STEP 2 (フォールバック)</div>
          <div className={styles.stepTitle}>手動で Gemini / Claude にプロンプトを貼り付ける</div>

          <div className={styles.aiOptions}>
            <a
              href="https://aistudio.google.com/prompts/new_chat"
              target="_blank"
              rel="noreferrer"
              className={`${styles.aiBtn} ${styles.aiBtnGemini}`}
            >
              Gemini で解析する
            </a>
            <a
              href="https://claude.ai"
              target="_blank"
              rel="noreferrer"
              className={`${styles.aiBtn} ${styles.aiBtnClaude}`}
            >
              Claude で解析する
            </a>
          </div>

          <div className={styles.promptBox}>
            <div className={styles.promptText}>{PROMPT_TEMPLATE.slice(0, 200)}...</div>
          </div>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleCopyPrompt}>
            {copied ? '✓ コピーしました' : 'プロンプトをコピー'}
          </button>
          <div className={styles.hint}>
            図面画像と一緒に Gemini / Claude に貼り付けてJSONを生成し、下のテキストエリアに貼り付けてください
          </div>
        </div>

        {/* Step 3 */}
        <div className={styles.card} style={{ gridColumn: '1 / -1' }}>
          <div className={styles.stepNum}>STEP 3</div>
          <div className={styles.stepTitle}>JSONを貼り付けてマップ生成（手動フロー / AI失敗時の修正）</div>
          <textarea
            className={styles.textarea}
            placeholder={'Gemini / Claude の返答をここに貼り付けてください...\n\n{\n  "meta": { ... },\n  "parts": [ ... ],\n  ...\n}'}
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
          />
          {error && <div className={styles.error} style={{ whiteSpace: 'pre-wrap' }}>{error}</div>}
          <div className={styles.btnRow}>
            <button
              className={`${styles.btn} ${styles.btnPrimary}`}
              onClick={handleLoad}
              disabled={!jsonText.trim()}
            >
              読み込んでマップ生成 →
            </button>
            <button className={styles.btn} onClick={onNext}>
              サンプルデータで試す
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
