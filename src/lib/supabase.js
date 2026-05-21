import { createClient } from '@supabase/supabase-js'

// trepro-pl 既存プロジェクトに sanwa_* プレフィックスで同居
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://ooigquspvrnvnuxfnrxm.supabase.co'
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_7gGPRUmjqN-w-TpSnP5fOg_RN5aN2ED'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ─── Projects ─────────────────────────────────────────
export async function listProjects() {
  const { data, error } = await supabase
    .from('sanwa_projects')
    .select('*')
    .order('updated_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createProject(meta) {
  const { data, error } = await supabase
    .from('sanwa_projects')
    .insert({
      name: meta.project || meta.name,
      date: meta.date,
      area_sqm: meta.area_sqm,
      area_tsubo: meta.area_tsubo,
      notes: meta.notes,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateProject(id, meta) {
  const { error } = await supabase
    .from('sanwa_projects')
    .update({
      name: meta.project || meta.name,
      date: meta.date,
      area_sqm: meta.area_sqm,
      area_tsubo: meta.area_tsubo,
      notes: meta.notes,
    })
    .eq('id', id)
  if (error) throw error
}

export async function deleteProject(id) {
  const { error } = await supabase.from('sanwa_projects').delete().eq('id', id)
  if (error) throw error
}

// ─── Layout ───────────────────────────────────────────
export async function getLayout(projectId) {
  const { data, error } = await supabase
    .from('sanwa_layouts')
    .select('*')
    .eq('project_id', projectId)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function upsertLayout(projectId, { zones, shelves, labor }) {
  const existing = await getLayout(projectId)
  if (existing) {
    const { error } = await supabase
      .from('sanwa_layouts')
      .update({ zones, shelves, labor })
      .eq('id', existing.id)
    if (error) throw error
  } else {
    const { error } = await supabase
      .from('sanwa_layouts')
      .insert({ project_id: projectId, zones, shelves, labor })
    if (error) throw error
  }
}

// ─── Parts ────────────────────────────────────────────
export async function listParts(projectId) {
  const { data, error } = await supabase
    .from('sanwa_parts')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at')
  if (error) throw error
  return data.map(toClientPart)
}

export async function upsertParts(projectId, parts) {
  const { error: delErr } = await supabase
    .from('sanwa_parts')
    .delete()
    .eq('project_id', projectId)
  if (delErr) throw delErr
  if (!parts || parts.length === 0) return
  const rows = parts.map(p => ({
    project_id: projectId,
    part_id: p.id,
    name: p.name,
    spec: p.spec,
    qty: p.qty,
    unit: p.unit,
    category: p.category,
    stock: p.stock,
    unit_price: p.unit_price,
    cost_price: p.cost_price ?? null,
  }))
  const { error } = await supabase.from('sanwa_parts').insert(rows)
  if (error) throw error
}

export async function updatePartStock(projectId, partId, stock) {
  const { error } = await supabase
    .from('sanwa_parts')
    .update({ stock })
    .eq('project_id', projectId)
    .eq('part_id', partId)
  if (error) throw error
}

function toClientPart(row) {
  return {
    id: row.part_id,
    name: row.name,
    spec: row.spec,
    qty: row.qty,
    unit: row.unit,
    category: row.category,
    stock: row.stock,
    unit_price: row.unit_price,
    cost_price: row.cost_price,
  }
}

// ─── Order History ────────────────────────────────────
export async function listOrderHistory(projectId) {
  const { data, error } = await supabase
    .from('sanwa_order_history')
    .select('*')
    .eq('project_id', projectId)
    .order('ordered_at', { ascending: false })
  if (error) throw error
  return data.map(h => ({
    histId: h.id,
    date: new Date(h.ordered_at).toLocaleString('ja-JP'),
    isoDate: h.ordered_at,
    project: '',
    items: h.items,
    totalAmount: h.total_amount,
  }))
}

export async function createOrder(projectId, entry) {
  const { error } = await supabase.from('sanwa_order_history').insert({
    project_id: projectId,
    ordered_at: new Date().toISOString(),
    total_amount: entry.totalAmount,
    items: entry.items,
  })
  if (error) throw error
}

export async function deleteOrder(histId) {
  const { error } = await supabase
    .from('sanwa_order_history')
    .delete()
    .eq('id', histId)
  if (error) throw error
}

export async function clearOrderHistory(projectId) {
  const { error } = await supabase
    .from('sanwa_order_history')
    .delete()
    .eq('project_id', projectId)
  if (error) throw error
}

// ─── Settings (key-value, global) ─────────────────────
export async function getSetting(key) {
  const { data, error } = await supabase
    .from('sanwa_settings')
    .select('value')
    .eq('key', key)
    .maybeSingle()
  if (error) throw error
  return data?.value ?? null
}

export async function setSetting(key, value) {
  const { error } = await supabase
    .from('sanwa_settings')
    .upsert({ key, value }, { onConflict: 'key' })
  if (error) throw error
}

// ─── Load full project data ───────────────────────────
export async function loadFullProject(projectId) {
  const [project, layout, parts] = await Promise.all([
    supabase.from('sanwa_projects').select('*').eq('id', projectId).single().then(r => {
      if (r.error) throw r.error; return r.data
    }),
    getLayout(projectId),
    listParts(projectId),
  ])
  return {
    id: project.id,
    meta: {
      project: project.name,
      date: project.date,
      area_sqm: Number(project.area_sqm),
      area_tsubo: Number(project.area_tsubo),
      notes: project.notes || '',
    },
    zones: layout?.zones || [],
    shelves: layout?.shelves || [],
    labor: layout?.labor || { total_man_days: 0, crew_size: 0, estimated_days: 0, breakdown: [] },
    parts: parts || [],
  }
}
