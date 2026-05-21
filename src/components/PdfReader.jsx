import { useState, useRef } from 'react'
import styles from './PdfReader.module.css'

export default function PdfReader({ onReflect }) {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('sanwa_geminiKey') || '')
  const [keyEditing, setKeyEditing] = useState(!localStorage.getItem('sanwa_geminiKey'))
  const [keyDraft, setKeyDraft] = useState('')

  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null) // array of { name, spec, qty, unit }
  const [reflected, setReflected] = useState(false)

  const dropRef = useRef(null)
  const inputRef = useRef(null)

  const saveKey = () => {
    localStorage.setItem('sanwa_geminiKey', keyDraft)
    setApiKey(keyDraft)
    setKeyEditing(false)
  }

  const handleFile = (f) => {
    if (!f) return
    setFile(f)
    setResult(null)
    setError('')
    setReflected(false)
    if (f.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = e => setPreview(e.target.result)
      reader.readAsDataURL(f)
    } else {
      setPreview(null)
    }
  }

  const onDrop = (e) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
    dropRef.current.classList.remove(styles.dragOver)
  }

  const onDragOver = (e) => {
    e.preventDefault()
    dropRef.current.classList.add(styles.dragOver)
  }

  const onDragLeave = () => {
    dropRef.current.classList.remove(styles.dragOver)
  }

  const readFile = async () => {
    if (!file || !apiKey) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const base64 = await fileToBase64(file)
      const prompt = `この画像またはPDFは手書きの棚割・発注メモです。
品名・仕様・数量・単位を読み取り、以下のJSON配列として返してください。
他のテキストは一切含めないこと。
[
  { "name": "品名", "spec": "仕様（不明なら空文字）", "qty": 数値, "unit": "本|枚|個|組|巻|枚" }
]`

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: prompt },
                { inlineData: { mimeType: file.type, data: base64 } }
              ]
            }]
          })
        }
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message || `HTTP ${res.status}`)
      }
      const json = await res.json()
      const text = json?.candidates?.[0]?.content?.parts?.[0]?.text || ''
      const match = text.match(/\[[\s\S]*\]/)
      if (!match) throw new Error('JSONが取得できませんでした。手書きが読み取れなかった可能性があります。')
      const parsed = JSON.parse(match[0])
      setResult(parsed)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const reflectToInventory = () => {
    if (!result || !onReflect) return
    onReflect(result)
    setReflected(true)
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div className={styles.headerTitle}>手書き取込</div>
        <div className={styles.headerSub}>手書きの棚割メモ・発注書をAIで読み取り、品目データに反映します</div>
      </div>

      {/* API Key setting */}
      <div className={styles.keyBar}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="5.5" cy="5.5" r="3.5" stroke="var(--amber)" strokeWidth="1.4"/>
          <line x1="8" y1="8" x2="12" y2="12" stroke="var(--amber)" strokeWidth="1.4" strokeLinecap="round"/>
        </svg>
        <span className={styles.keyLabel}>Gemini API キー</span>
        {keyEditing ? (
          <>
            <input
              className={styles.keyInput}
              value={keyDraft}
              onChange={e => setKeyDraft(e.target.value)}
              placeholder="AIza..."
              type="password"
            />
            <button className={styles.btnSm} onClick={saveKey}>保存</button>
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
          キーを取得 (無料)
        </a>
      </div>

      {/* Drop zone */}
      <div
        ref={dropRef}
        className={styles.dropZone}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          style={{ display: 'none' }}
          onChange={e => handleFile(e.target.files[0])}
        />
        {file ? (
          <div className={styles.fileInfo}>
            {preview ? (
              <img src={preview} alt="preview" className={styles.preview} />
            ) : (
              <div className={styles.pdfIcon}>
                <svg width="32" height="40" viewBox="0 0 32 40" fill="none">
                  <rect x="1" y="1" width="30" height="38" rx="3" fill="#fee2e2" stroke="#ef4444" strokeWidth="1.5"/>
                  <text x="16" y="24" textAnchor="middle" fontSize="10" fontWeight="700" fill="#ef4444" fontFamily="sans-serif">PDF</text>
                </svg>
              </div>
            )}
            <span className={styles.fileName}>{file.name}</span>
            <span className={styles.fileSize}>{(file.size / 1024).toFixed(0)} KB</span>
          </div>
        ) : (
          <div className={styles.dropPrompt}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M16 4v16M10 14l6-10 6 10" stroke="var(--text3)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6 24h20" stroke="var(--text3)" strokeWidth="1.8" strokeLinecap="round"/>
              <rect x="3" y="20" width="26" height="9" rx="2" fill="none" stroke="var(--border2)" strokeWidth="1.2"/>
            </svg>
            <div className={styles.dropText}>PDF / JPG / PNG をドラッグ＆ドロップ</div>
            <div className={styles.dropSub}>またはクリックしてファイルを選択（最大 20MB）</div>
          </div>
        )}
      </div>

      {/* Analyze button */}
      <div className={styles.actions}>
        <button
          className={`${styles.btn} ${styles.btnPrimary}`}
          disabled={!file || !apiKey || loading}
          onClick={readFile}
        >
          {loading ? (
            <span className={styles.loadingText}>読み取り中...</span>
          ) : 'AIで読み取る'}
        </button>
        {file && (
          <button className={styles.btn} onClick={() => { setFile(null); setPreview(null); setResult(null); setError('') }}>
            クリア
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className={styles.errorBox}>
          <strong>エラー:</strong> {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className={styles.resultSection}>
          <div className={styles.resultHeader}>
            <span className={styles.resultTitle}>読み取り結果（{result.length}件）</span>
            <button
              className={`${styles.btn} ${styles.btnSuccess}`}
              disabled={reflected}
              onClick={reflectToInventory}
            >
              {reflected ? '反映済み' : '在庫・発注データに反映する'}
            </button>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>品名</th>
                  <th>仕様</th>
                  <th>数量</th>
                  <th>単位</th>
                </tr>
              </thead>
              <tbody>
                {result.map((item, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td className={styles.itemName}>{item.name}</td>
                    <td className={styles.itemSpec}>{item.spec || '—'}</td>
                    <td className={styles.itemQty}><strong>{item.qty}</strong></td>
                    <td>{item.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {reflected && (
            <div className={styles.reflectedNote}>
              在庫・発注タブに反映しました。④ タブをご確認ください。
            </div>
          )}
        </div>
      )}

      {/* How to use */}
      {!result && !loading && (
        <div className={styles.howto}>
          <div className={styles.howtoTitle}>使い方</div>
          <ol className={styles.howtoList}>
            <li>Gemini API キーを設定（Googleアカウントで無料取得可）</li>
            <li>手書きの棚割メモ・発注書の写真またはPDFをアップロード</li>
            <li>「AIで読み取る」をクリック</li>
            <li>読み取り結果を確認し「在庫・発注データに反映する」をクリック</li>
          </ol>
          <div className={styles.howtoNote}>
            Gemini 2.0 Flash を使用。JPG・PNG・PDF に対応（最大20MB）。
            APIキーはブラウザのlocalStorageに保存されます。
          </div>
        </div>
      )}
    </div>
  )
}

async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => {
      const data = e.target.result
      // strip "data:...;base64," prefix
      resolve(data.split(',')[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
