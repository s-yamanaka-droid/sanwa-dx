import { useState } from 'react'
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

export default function FloorMap2D({ data }) {
  const [selectedShelf, setSelectedShelf] = useState(null)
  const [hoveredZone, setHoveredZone] = useState(null)

  const { zones, shelves, meta, labor } = data

  const mapW = 680
  const mapH = 480

  const selectedPart = selectedShelf
    ? data.parts.find(p => p.id === selectedShelf.type)
    : null

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
        <svg
          width="100%"
          viewBox={`0 0 ${mapW} ${mapH}`}
          className={styles.svg}
        >
          {/* Grid */}
          {Array.from({ length: Math.floor(mapW / 60) }).map((_, i) => (
            <line key={`gx${i}`} x1={i * 60} y1={0} x2={i * 60} y2={mapH}
              stroke="#e8e4dc" strokeWidth="0.5" />
          ))}
          {Array.from({ length: Math.floor(mapH / 60) }).map((_, i) => (
            <line key={`gy${i}`} x1={0} y1={i * 60} x2={mapW} y2={i * 60}
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
                onClick={() => setSelectedShelf(isSelected ? null : shelf)}
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
            <line x1="20" y1={mapH - 20} x2="90" y2={mapH - 20} stroke="var(--text2)" strokeWidth="1.5" />
            <line x1="20" y1={mapH - 25} x2="20" y2={mapH - 15} stroke="var(--text2)" strokeWidth="1.5" />
            <line x1="90" y1={mapH - 25} x2="90" y2={mapH - 15} stroke="var(--text2)" strokeWidth="1.5" />
            <text x="55" y={mapH - 25} textAnchor="middle" fontSize="9" fill="var(--text2)" fontFamily="var(--font)">
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
                  </tbody>
                </table>
              </>
            )}
          </div>
        )}
      </div>

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
