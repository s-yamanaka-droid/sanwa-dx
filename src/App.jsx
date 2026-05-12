import { useState } from 'react'
import Landing from './components/Landing'
import EstimateSheet from './components/EstimateSheet'
import FloorMap2D from './components/FloorMap2D'
import PartsList from './components/PartsList'
import Inventory from './components/Inventory'
import JsonInput from './components/JsonInput'
import sampleData from './data/sampleLayout.json'
import styles from './App.module.css'

const TABS = [
  { id: 'intro',     label: '🏠 概要' },
  { id: 'input',     label: '① 図面取込' },
  { id: 'floormap',  label: '② 2Dフロアマップ' },
  { id: 'parts',     label: '③ 資材リスト' },
  { id: 'inventory', label: '④ 在庫・発注' },
  { id: 'estimate',  label: '⑤ 見積書' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('intro')
  const [layoutData, setLayoutData] = useState(sampleData)

  const handleDataLoad = (data) => {
    setLayoutData(data)
    setActiveTab('floormap')
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
          <span className={styles.chip}>
            <span className={styles.dot} style={{ background: '#0a7c4e' }} />
            {layoutData.meta.project}
          </span>
          <span className={styles.chip}>
            売場 {layoutData.meta.area_sqm.toLocaleString()}㎡
          </span>
        </div>
      </header>

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
          <Inventory data={layoutData} />
        )}
        {activeTab === 'estimate' && (
          <EstimateSheet data={layoutData} />
        )}
      </main>
    </div>
  )
}
