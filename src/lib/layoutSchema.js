import { z } from 'zod'

/**
 * sanwa-dx 図面レイアウトJSONの zod スキーマ。
 * Geminiから返ってきたJSONを safeParse() で検証する。
 *
 * 仕様の出典: sanwa-dx/CLAUDE.md, src/data/sampleLayout.json
 */

export const metaSchema = z.object({
  project: z.string().min(1),
  date: z.string().min(1),
  area_sqm: z.number(),
  area_tsubo: z.number(),
  notes: z.string().optional().default(''),
})

export const zoneSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(['general', 'fresh', 'daily']),
  color: z.string().min(1),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
})

export const shelfSchema = z.object({
  id: z.string().min(1),
  zone: z.string().min(1),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  type: z.enum(['SH-1950', 'SH-1500W']),
  label: z.string().min(1),
})

export const partSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  spec: z.string(),
  qty: z.number(),
  unit: z.string().min(1),
  category: z.enum(['主材', '固定材', '陳列部材', '締結材', '施工材']),
  stock: z.number(),
  unit_price: z.number(),
  // cost_price は null 許容（CLAUDE.md 注意点参照）
  cost_price: z.number().nullable().optional(),
})

export const laborSchema = z.object({
  total_man_days: z.number(),
  crew_size: z.number(),
  estimated_days: z.number(),
  breakdown: z.array(
    z.object({
      task: z.string().min(1),
      man_days: z.number(),
    })
  ),
})

export const layoutSchema = z.object({
  meta: metaSchema,
  zones: z.array(zoneSchema).min(1),
  shelves: z.array(shelfSchema).min(1),
  parts: z.array(partSchema).min(1),
  labor: laborSchema,
})

/**
 * zod のエラーを日本語の分かりやすいメッセージに変換する。
 * @param {z.ZodError} zodError
 * @returns {{ path: string, message: string }[]}
 */
export function formatZodIssues(zodError) {
  if (!zodError || !zodError.issues) return []
  return zodError.issues.map((issue) => {
    const path = issue.path.join('.') || '(ルート)'
    let message = ''
    switch (issue.code) {
      case 'invalid_type':
        message = `${path}: ${issue.expected} が必要ですが ${issue.received} が来ました`
        break
      case 'too_small':
        message = `${path}: 値が小さすぎます（${issue.minimum} 以上が必要）`
        break
      case 'too_big':
        message = `${path}: 値が大きすぎます（${issue.maximum} 以下が必要）`
        break
      case 'invalid_enum_value':
        message = `${path}: 許可されない値です（許可: ${issue.options?.join(' / ')}）`
        break
      case 'invalid_value':
        // zod v4 の新エラーコード
        message = `${path}: 許可されない値です${issue.values ? `（許可: ${issue.values.join(' / ')}）` : ''}`
        break
      case 'unrecognized_keys':
        message = `${path}: 未知のキーが含まれています（${issue.keys?.join(', ')}）`
        break
      default:
        message = `${path}: ${issue.message}`
    }
    return { path, message }
  })
}

/**
 * 安全にパースしてエラーメッセージを整形する。
 * @param {unknown} raw
 * @returns {{ success: true, data: any } | { success: false, issues: { path: string, message: string }[] }}
 */
export function safeParseLayout(raw) {
  const result = layoutSchema.safeParse(raw)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return { success: false, issues: formatZodIssues(result.error) }
}
