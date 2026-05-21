import { useState, useEffect, useRef } from 'react'
import { listProjects, createProject, deleteProject } from '../lib/supabase'
import styles from './ProjectSwitcher.module.css'

export default function ProjectSwitcher({ currentId, onSwitch, onCreate }) {
  const [projects, setProjects] = useState([])
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [pendingDeleteId, setPendingDeleteId] = useState(null)
  const ref = useRef(null)

  const reload = async () => {
    try {
      const list = await listProjects()
      setProjects(list)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => { reload() }, [])

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
        setCreating(false)
        setPendingDeleteId(null)
      }
    }
    window.addEventListener('mousedown', handler)
    return () => window.removeEventListener('mousedown', handler)
  }, [])

  const current = projects.find(p => p.id === currentId)

  const handleCreate = async () => {
    if (!newName.trim()) return
    try {
      const proj = await createProject({
        name: newName,
        date: new Date().toISOString().slice(0, 10),
        area_sqm: 0,
        area_tsubo: 0,
        notes: '',
      })
      await reload()
      setNewName('')
      setCreating(false)
      setOpen(false)
      onCreate?.(proj.id)
    } catch (e) {
      alert('案件作成に失敗しました: ' + e.message)
    }
  }

  const handleDelete = async (id) => {
    try {
      await deleteProject(id)
      await reload()
      setPendingDeleteId(null)
      if (id === currentId && projects.length > 1) {
        const next = projects.find(p => p.id !== id)
        onSwitch?.(next.id)
      }
    } catch (e) {
      alert('削除に失敗しました: ' + e.message)
    }
  }

  return (
    <div className={styles.wrap} ref={ref}>
      <button className={styles.trigger} onClick={() => setOpen(o => !o)}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <rect x="1.5" y="3" width="11" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
          <path d="M1.5 5h11" stroke="currentColor" strokeWidth="1.3"/>
        </svg>
        <span className={styles.triggerLabel}>{current?.name || '案件を選択'}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div className={styles.dropdown}>
          <div className={styles.dropdownHeader}>
            <span>案件一覧 ({projects.length})</span>
            {!creating && (
              <button className={styles.newBtn} onClick={() => setCreating(true)}>+ 新規</button>
            )}
          </div>

          {creating && (
            <div className={styles.createForm}>
              <input
                className={styles.input}
                placeholder="新しい案件名"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                autoFocus
              />
              <button className={styles.btnPrimary} onClick={handleCreate}>作成</button>
              <button className={styles.btnGhost} onClick={() => { setCreating(false); setNewName('') }}>キャンセル</button>
            </div>
          )}

          <div className={styles.list}>
            {projects.length === 0 && !creating && (
              <div className={styles.empty}>案件がありません。「+ 新規」から作成してください。</div>
            )}
            {projects.map(p => (
              <div
                key={p.id}
                className={`${styles.item} ${p.id === currentId ? styles.itemActive : ''}`}
              >
                <button
                  className={styles.itemMain}
                  onClick={() => { onSwitch?.(p.id); setOpen(false) }}
                >
                  <div className={styles.itemName}>{p.name}</div>
                  <div className={styles.itemMeta}>
                    {p.date && <span>{p.date}</span>}
                    {p.area_sqm > 0 && <span>{Number(p.area_sqm).toLocaleString()}㎡</span>}
                  </div>
                </button>
                {pendingDeleteId === p.id ? (
                  <div className={styles.confirmBox}>
                    <button className={styles.btnDanger} onClick={() => handleDelete(p.id)}>削除</button>
                    <button className={styles.btnGhost} onClick={() => setPendingDeleteId(null)}>戻る</button>
                  </div>
                ) : (
                  <button className={styles.deleteBtn} onClick={(e) => { e.stopPropagation(); setPendingDeleteId(p.id) }}>
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
