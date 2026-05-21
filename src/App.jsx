import { useState, useEffect, useCallback } from 'react'
import Landing from './components/Landing'
import EstimateSheet from './components/EstimateSheet'
import FloorMap2D from './components/FloorMap2D'
import PartsList from './components/PartsList'
import Inventory from './components/Inventory'
import JsonInput from './components/JsonInput'
import PdfReader from './components/PdfReader'
import ProjectSwitcher from './components/ProjectSwitcher'
import sampleData from './data/sampleLayout.json'
import {
  listProjects,
  loadFullProject,
  createProject as dbCreateProject,
  updateProject as dbUpdateProject,
  upsertLayout,
  upsertParts,
} from './lib/supabase'
import styles from './App.module.css'

const TABS = [
  { id: 'intro',     label: '概要' },
  { id: 'input',     label: '① 図面取込' },
  { id: 'floormap',  label: '② 2Dフロアマップ' },
  { id: 'parts',     label: '③ 資材リスト' },
  { id: 'inventory', label: '④ 在庫・発注' },
  { id: 'estimate',  label: '⑤ 見積書' },
  { id: 'pdfreader', label: '⑥ 手書き取込' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('intro')
  const [projectId, setProjectId] = useState(() => localStorage.getItem('sanwa_currentProjectId') || null)
  const [layoutData, setLayoutData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [syncStatus, setSyncStatus] = useState('idle')  // idle | syncing | error
  const [errorMsg, setErrorMsg] = useState('')

  // 初回ロード: 案件一覧→既存があれば最新、なければサンプル投入
  useEffect(() => {
    (async () => {
      try {
        const list = await listProjects()
        let id = projectId
        if (!id || !list.find(p => p.id === projectId)) {
          if (list.length > 0) {
            id = list[0].id
          } else {
            // 完全に空なら初期サンプルから案件を作成
            const newProj = await dbCreateProject(sampleData.meta)
            await upsertLayout(newProj.id, {
              zones: sampleData.zones,
              shelves: sampleData.shelves,
              labor: sampleData.labor,
            })
            await upsertParts(newProj.id, sampleData.parts)
            id = newProj.id
          }
        }
        await loadProject(id)
      } catch (e) {
        console.error(e)
        setErrorMsg('データ取得に失敗しました: ' + e.message)
        // フォールバック: バンドル同梱のサンプルで表示だけ動かす
        setLayoutData(sampleData)
        setLoading(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadProject = useCallback(async (id) => {
    setLoading(true)
    setErrorMsg('')
    try {
      const full = await loadFullProject(id)
      setLayoutData(full)
      setProjectId(id)
      localStorage.setItem('sanwa_currentProjectId', id)
    } catch (e) {
      console.error(e)
      setErrorMsg('案件読み込み失敗: ' + e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleSwitchProject = (id) => {
    loadProject(id)
  }

  const handleCreateProject = (id) => {
    loadProject(id)
  }

  // 図面取込で新しいJSONが来たとき → 現在の案件を上書き
  const handleDataLoad = async (data) => {
    if (!projectId) return
    setSyncStatus('syncing')
    setErrorMsg('')
    try {
      await dbUpdateProject(projectId, data.meta)
      await upsertLayout(projectId, {
        zones: data.zones,
        shelves: data.shelves,
        labor: data.labor,
      })
      await upsertParts(projectId, data.parts)
      await loadProject(projectId)
      setSyncStatus('idle')
      setActiveTab('floormap')
    } catch (e) {
      console.error(e)
      setSyncStatus('error')
      setErrorMsg('保存失敗: ' + e.message)
    }
  }

  // PdfReader からの反映 → 必要数を追加 (簡易マージ)
  const handlePdfReflect = async (items) => {
    if (!projectId || !layoutData) return
    setSyncStatus('syncing')
    try {
      const existing = [...layoutData.parts]
      items.forEach(item => {
        const idx = existing.findIndex(p => p.name === item.name)
        if (idx >= 0) {
          existing[idx] = { ...existing[idx], qty: (existing[idx].qty || 0) + item.qty }
        } else {
          existing.push({
            id: `MEMO-${Date.now()}-${existing.length}`,
            name: item.name,
            spec: item.spec || '',
            qty: item.qty,
            unit: item.unit || '個',
            category: '主材',
            stock: 0,
            unit_price: 0,
            cost_price: null,
          })
        }
      })
      await upsertParts(projectId, existing)
      await loadProject(projectId)
      setSyncStatus('idle')
      setActiveTab('inventory')
    } catch (e) {
      console.error(e)
      setSyncStatus('error')
      setErrorMsg('反映失敗: ' + e.message)
    }
  }

  if (loading || !layoutData) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <div>データを読み込み中…</div>
        {errorMsg && <div className={styles.loadingError}>{errorMsg}</div>}
      </div>
    )
  }

  const orderCount = layoutData.parts.filter(p => p.stock < p.qty).length

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <rect x="2" y="2" width="8" height="8" rx="2" fill="#1a5fd4" opacity=".9"/>
            <rect x="12" y="2" width="8" height="8" rx="2" fill="#1a5fd4" opacity=".5"/>
            <rect x="2" y="12" width="8" height="8" rx="2" fill="#1a5fd4" opacity=".5"/>
            <rect x="12" y="12" width="8" height="8" rx="2" fill="#0a7c4e" opacity=".9"/>
          </svg>
          <span className={styles.headerTitle}>
            <strong>三和商研</strong> DX Platform
          </span>
          <span className={styles.headerSub}>什器レイアウト管理システム</span>
        </div>
        <div className={styles.headerRight}>
          <ProjectSwitcher
            currentId={projectId}
            onSwitch={handleSwitchProject}
            onCreate={handleCreateProject}
          />
          {syncStatus === 'syncing' && <span className={styles.syncBadge}>同期中…</span>}
          {syncStatus === 'error' && <span className={styles.errorBadge}>同期エラー</span>}
          {syncStatus === 'idle' && (
            <span className={styles.cloudBadge}>
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                <circle cx="5.5" cy="5.5" r="2" fill="var(--green)"/>
              </svg>
              クラウド同期
            </span>
          )}
          <span className={styles.chip}>
            売場 {layoutData.meta.area_sqm?.toLocaleString() || 0}㎡
          </span>
        </div>
      </header>

      {errorMsg && (
        <div className={styles.errorBar}>
          {errorMsg}
          <button className={styles.errorClose} onClick={() => setErrorMsg('')}>✕</button>
        </div>
      )}

      <nav className={styles.tabs}>
        {TABS.map(t => (
          <button
            key={t.id}
            className={`${styles.tab} ${activeTab === t.id ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
            {t.id === 'inventory' && orderCount > 0 && (
              <span className={styles.badge}>{orderCount}</span>
            )}
          </button>
        ))}
      </nav>

      <main className={styles.main}>
        {activeTab === 'intro' && (
          <Landing onStart={() => setActiveTab('input')} />
        )}
        {activeTab === 'input' && (
          <JsonInput data={layoutData} onLoad={handleDataLoad} onNext={() => setActiveTab('floormap')} />
        )}
        {activeTab === 'floormap' && (
          <FloorMap2D data={layoutData} />
        )}
        {activeTab === 'parts' && (
          <PartsList data={layoutData} />
        )}
        {activeTab === 'inventory' && (
          <Inventory data={layoutData} projectId={projectId} onReload={() => loadProject(projectId)} />
        )}
        {activeTab === 'estimate' && (
          <EstimateSheet data={layoutData} />
        )}
        {activeTab === 'pdfreader' && (
          <PdfReader onReflect={handlePdfReflect} />
        )}
      </main>
    </div>
  )
}
