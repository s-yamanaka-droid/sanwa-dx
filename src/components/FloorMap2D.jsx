import { useState, useRef, useEffect, useCallback } from 'react'
import styles from './FloorMap2D.module.css'

const ZONE_COLORS = {
  general:  { fill: '#f0ede8', stroke: '#c4b89a', label: '食品棚',  textColor: '#6b5a3a' },
  fresh:    { fill: '#d6f0e4', stroke: '#4caa78', label: '生鮮',    textColor: '#0a5e36' },
  daily:    { fill: '#fce8f4', stroke: '#cc77aa', label: '日用品',  textColor: '#773355' },
}

const SHELF_COLORS = {
  'SH-1950':  { fill: '#d4c8b8', stroke: '#9a8c7a', textColor: '#3a2e22' },
  'SH-1500W': { fill: '#aae0cc', stroke: '#33aa77', textColor: '#0a3a22' },
}

const SCALE = 1.4
const MAP_W = 680
const MAP_H = 480

export default function FloorMap2D({ data }) {
  const [selectedShelf, setSelectedShelf] = useState(null)
  const [hoveredZone, setHoveredZone] = useState(null)

  // viewBox state: [x, y, w, h]
  const [vb, setVb] = useState([0, 0, MAP_W, MAP_H])
  const vbRef = useRef([0, 0, MAP_W, MAP_H])

  // drag state
  const svgRef = useRef(null)
  const dragRef = useRef(null)
  const hasDraggedRef = useRef(false)

  const { zones, shelves, meta, labor } = data

  const selectedPart = selectedShelf
    ? data.parts.find(p => p.id === selectedShelf.type)
    : null

  // Keep vbRef in sync
  useEffect(() => { vbRef.current = vb }, [vb])

  // Wheel zoom — must use non-passive listener
  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    const handler = (e) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const [vx, vy, vw, vh] = vbRef.current
      // mouse in SVG coords
      const mx = vx + ((e.clientX - rect.left) / rect.width) * vw
      const my = vy + ((e.clientY - rect.top) / rect.height) * vh
      const factor = e.deltaY > 0 ? 1.12 : 0.89
      const newW = Math.min(MAP_W * 3, Math.max(MAP_W * 0.25, vw * factor))
      const newH = Math.min(MAP_H * 3, Math.max(MAP_H * 0.25, vh * factor))
      const ratio = newW / vw
      const newX = Math.max(0, Math.min(MAP_W - newW, mx - (mx - vx) * ratio))
      const newY = Math.max(0, Math.min(MAP_H - newH, my - (my - vy) * ratio))
      const next = [newX, newY, newW, newH]
      vbRef.current = next
      setVb(next)
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [])

  // Drag pan
  const onMouseDown = useCallback((e) => {
    if (e.button !== 0) return
    dragRef.current = { startX: e.clientX, startY: e.clientY, startVb: [...vbRef.current] }
    hasDraggedRef.current = false
  }, [])

  const onMouseMove = useCallback((e) => {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) hasDraggedRef.current = true
    const rect = svgRef.current.getBoundingClientRect()
    const [, , vw, vh] = dragRef.current.startVb
    const scaleX = vw / rect.width
    const scaleY = vh / rect.height
    const ox = dragRef.current.startVb[0] - dx * scaleX
    const oy = dragRef.current.startVb[1] - dy * scaleY
    const nx = Math.max(0, Math.min(MAP_W - vw, ox))
    const ny = Math.max(0, Math.min(MAP_H - vh, oy))
    const next = [nx, ny, vw, vh]
    vbRef.current = next
    setVb(next)
  }, [])

  const onMouseUp = useCallback(() => { dragRef.current = null }, [])

  const handleShelfClick = useCallback((e, shelf) => {
    if (hasDraggedRef.current) return
    e.stopPropagation()
    setSelectedShelf(prev => prev?.id === shelf.id ? null : shelf)
  }, [])

  const resetZoom = () => {
    const next = [0, 0, MAP_W, MAP_H]
    vbRef.current = next
    setVb(next)
  }

  const zoomIn = () => {
    const [vx, vy, vw, vh] = vbRef.current
    const cx = vx + vw / 2, cy = vy + vh / 2
    const newW = Math.max(MAP_W * 0.25, vw * 0.75)
    const newH = Math.max(MAP_H * 0.25, vh * 0.75)
    const next = [Math.max(0, cx - newW / 2), Math.max(0, cy - newH / 2), newW, newH]
    vbRef.current = next; setVb(next)
  }

  const zoomOut = () => {
    const [vx, vy, vw, vh] = vbRef.current
    const cx = vx + vw / 2, cy = vy + vh / 2
    const newW = Math.min(MAP_W * 3, vw / 0.75)
    const newH = Math.min(MAP_H * 3, vh / 0.75)
    const next = [Math.max(0, cx - newW / 2), Math.max(0, cy - newH / 2), newW, newH]
    vbRef.current = next; setVb(next)
  }

  const zoomLevel = Math.round((MAP_W / vb[2]) * 100)

  return (
    <div className={styles.wrap}>
      <div className={styles.topRow}>
        <div className={styles.metaChips}>
          <span className={styles.metaChip}>
            <strong>売場面積</strong> {meta.area_sqm.toLocaleString()}㎡（{meta.area_tsubo}坪）
          </span>
          <span className={styles.metaChip}>
            <strong>棚ユニット</strong> {shelves.length}本
          </span>
          <span className={styles.metaChip}>
            <strong>推定工数</strong> {labor.total_man_days}人工 / {labor.estimated_days}日
          </span>
        </div>
        <div className={styles.legend}>
          {Object.entries(ZONE_COLORS).map(([k, v]) => (
            <span key={k} className={styles.legendItem}>
              <span className={styles.legendColor} style={{ background: v.fill, border: `1.5px solid ${v.stroke}` }} />
              {v.label}
            </span>
          ))}
        </div>
      </div>

      <div className={styles.mapWrap}>
        {/* Zoom controls */}
        <div className={styles.zoomControls}>
          <button className={styles.zoomBtn} onClick={zoomIn} title="ズームイン">
            <svg width="14" height="14" viewBox="0 0 14 14"><line x1="7" y1="2" x2="7" y2="12" stroke="currentColor" strokeWidth="1.8"/><line x1="2" y1="7" x2="12" y2="7" stroke="currentColor" strokeWidth="1.8"/></svg>
          </button>
          <span className={styles.zoomLevel}>{zoomLevel}%</span>
          <button className={styles.zoomBtn} onClick={zoomOut} title="ズームアウト">
            <svg width="14" height="14" viewBox="0 0 14 14"><line x1="2" y1="7" x2="12" y2="7" stroke="currentColor" strokeWidth="1.8"/></svg>
          </button>
          <button className={styles.zoomBtn} onClick={resetZoom} title="リセット" style={{ fontSize: '10px', padding: '0 6px' }}>
            全体
          </button>
        </div>

        <svg
          ref={svgRef}
          width="100%"
          viewBox={`${vb[0]} ${vb[1]} ${vb[2]} ${vb[3]}`}
          className={styles.svg}
          style={{ cursor: dragRef.current ? 'grabbing' : 'grab' }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        >
          {/* Grid */}
          {Array.from({ length: Math.floor(MAP_W / 60) }).map((_, i) => (
            <line key={`gx${i}`} x1={i * 60} y1={0} x2={i * 60} y2={MAP_H}
              stroke="#e8e4dc" strokeWidth="0.5" />
          ))}
          {Array.from({ length: Math.floor(MAP_H / 60) }).map((_, i) => (
            <line key={`gy${i}`} x1={0} y1={i * 60} x2={MAP_W} y2={i * 60}
              stroke="#e8e4dc" strokeWidth="0.5" />
          ))}

          {/* Zones */}
          {zones.map(zone => {
            const c = ZONE_COLORS[zone.type] || ZONE_COLORS.general
            const x = zone.x * SCALE, y = zone.y * SCALE
            const w = zone.w * SCALE, h = zone.h * SCALE
            return (
              <g key={zone.id}
                onMouseEnter={() => setHoveredZone(zone.id)}
                onMouseLeave={() => setHoveredZone(null)}
              >
                <rect
                  x={x} y={y} width={w} height={h} rx="6"
                  fill={c.fill}
                  stroke={c.stroke}
                  strokeWidth={hoveredZone === zone.id ? 2 : 1}
                  opacity={hoveredZone && hoveredZone !== zone.id ? 0.7 : 1}
                  style={{ transition: 'all .15s' }}
                />
                <text
                  x={x + 8} y={y + 16}
                  fontSize="11" fontWeight="600"
                  fill={c.textColor} fontFamily="var(--font)"
                >
                  {zone.name}
                </text>
              </g>
            )
          })}

          {/* Shelves */}
          {shelves.map(shelf => {
            const c = SHELF_COLORS[shelf.type] || SHELF_COLORS['SH-1950']
            const x = shelf.x * SCALE, y = shelf.y * SCALE
            const w = shelf.w * SCALE, h = shelf.h * SCALE
            const isSelected = selectedShelf?.id === shelf.id
            return (
              <g key={shelf.id}
                onClick={(e) => handleShelfClick(e, shelf)}
                style={{ cursor: 'pointer' }}
              >
                <rect
                  x={x} y={y} width={w} height={h} rx="3"
                  fill={c.fill}
                  stroke={isSelected ? '#e85c00' : c.stroke}
                  strokeWidth={isSelected ? 2.5 : 1}
                  style={{ transition: 'all .1s' }}
                />
                {w > 20 && h > 20 && (
                  <text
                    x={x + w / 2} y={y + h / 2 + 1}
                    textAnchor="middle" dominantBaseline="central"
                    fontSize="8" fontWeight="500"
                    fill={isSelected ? '#e85c00' : c.textColor}
                    fontFamily="var(--font)"
                  >
                    {shelf.label}
                  </text>
                )}
                {isSelected && (
                  <rect
                    x={x - 2} y={y - 2} width={w + 4} height={h + 4} rx="5"
                    fill="none" stroke="#e85c00" strokeWidth="2"
                    strokeDasharray="4 2" opacity="0.8"
                  />
                )}
              </g>
            )
          })}

          {/* Scale bar */}
          <g>
            <line x1="20" y1={MAP_H - 20} x2="90" y2={MAP_H - 20} stroke="var(--text2)" strokeWidth="1.5" />
            <line x1="20" y1={MAP_H - 25} x2="20" y2={MAP_H - 15} stroke="var(--text2)" strokeWidth="1.5" />
            <line x1="90" y1={MAP_H - 25} x2="90" y2={MAP_H - 15} stroke="var(--text2)" strokeWidth="1.5" />
            <text x="55" y={MAP_H - 25} textAnchor="middle" fontSize="9" fill="var(--text2)" fontFamily="var(--font)">
              50m
            </text>
          </g>
        </svg>

        {/* Shelf detail panel */}
        {selectedShelf && (
          <div className={styles.detailPanel}>
            <div className={styles.detailHeader}>
              <span className={styles.detailTitle}>{selectedShelf.label}</span>
              <button className={styles.closeBtn} onClick={() => setSelectedShelf(null)}>✕</button>
            </div>
            <table className={styles.detailTable}>
              <tbody>
                <tr><td>棚ID</td><td><code>{selectedShelf.id}</code></td></tr>
                <tr><td>タイプ</td><td><code>{selectedShelf.type}</code></td></tr>
                <tr><td>エリア</td><td>{zones.find(z => z.id === selectedShelf.zone)?.name}</td></tr>
              </tbody>
            </table>
            {selectedPart && (
              <>
                <div className={styles.detailDivider} />
                <div className={styles.detailSubtitle}>資材情報</div>
                <table className={styles.detailTable}>
                  <tbody>
                    <tr><td>品名</td><td>{selectedPart.name}</td></tr>
                    <tr><td>仕様</td><td>{selectedPart.spec}</td></tr>
                    <tr><td>必要数</td><td><strong>{selectedPart.qty} {selectedPart.unit}</strong></td></tr>
                    <tr><td>現在庫</td><td>
                      <span style={{ color: selectedPart.stock >= selectedPart.qty ? 'var(--green)' : 'var(--red)' }}>
                        {selectedPart.stock} {selectedPart.unit}
                      </span>
                    </td></tr>
                    <tr><td>単価</td><td>¥{selectedPart.unit_price.toLocaleString()}</td></tr>
                    {selectedPart.cost_price != null && (
                      <tr><td>原価</td><td className={styles.costPrice}>¥{selectedPart.cost_price.toLocaleString()}</td></tr>
                    )}
                  </tbody>
                </table>
              </>
            )}
          </div>
        )}
      </div>

      {/* Zoom hint */}
      <div className={styles.zoomHint}>ホイールでズーム、ドラッグでパン、棚をクリックで詳細表示</div>

      {/* Labor breakdown */}
      <div className={styles.laborRow}>
        <div className={styles.laborTitle}>工程別工数</div>
        <div className={styles.laborBars}>
          {labor.breakdown.map(b => (
            <div key={b.task} className={styles.laborItem}>
              <div className={styles.laborLabel}>{b.task}</div>
              <div className={styles.laborBarWrap}>
                <div
                  className={styles.laborBar}
                  style={{ width: `${(b.man_days / labor.total_man_days) * 100}%` }}
                />
              </div>
              <div className={styles.laborVal}>{b.man_days}人工</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
