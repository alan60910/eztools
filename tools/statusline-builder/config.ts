/**
 * S5-T1.3（magi/05-statusline-builder/PLAN.md §型別契約 BuilderConfig／
 * config 清洗註解）：BuilderConfig／SegmentConfig 型別、serialize／
 * deserialize／migrate 骨架＋drop-unknown-and-continue 清洗純函式。
 *
 * 清洗承諾（「重整不丟」）：絕不整份拒收——未知 id 丟棄、未知 variant
 * 退預設、ansi256 越界 clamp（color.ts 同源）、壞 hex 退 default、未知
 * 欄忽略、threshold buckets 桶數校正恰 10（不足補預設、超長截斷；
 * auto-fg 平行陣列不入 config——emit 期由 threshold.ts autoFgBuckets
 * 派生，校正後自然同步）、separator／prefix 過 validate.ts 失敗即退
 * 預設；version≠1 → migrate（v1 為首版 schema，現階段＝重置）。
 *
 * segment 目錄以 SegmentCatalog 注入（segments.ts 於 M2 才建立，本模組
 * 不依賴之）：id 型別暫為 string，清洗以「id ∈ catalog.ids」執行期保證
 * ——M2 segments.ts 建立 SegmentId 字面聯合後，resolve 端可安全窄化。
 *
 * 純函式、零 DOM import、不碰 localStorage（讀寫在 main.ts 層）。
 */
import { clampAnsi256Index, normalizeHex, type ColorSpec } from './color.js'
import { THRESHOLD_BUCKET_COUNT, type ThresholdRule } from './threshold.js'
import { validateCustomText } from './validate.js'

// ── 目錄注入 ──

/** segment 目錄的最小注入面（M2 segments.ts 派生真目錄；測試可給假目錄）。 */
export interface SegmentCatalog {
  /** 全部 segment id，目錄順序＝缺段補列時的附加順序。 */
  ids: readonly string[]
  /** 各 id 的允許 variant 集（目錄衍生，非自由字串）；無 variant 之段可缺鍵。 */
  variantsById: Readonly<Record<string, readonly string[] | undefined>>
}

// ── 型別（PLAN 型別契約） ──

export const CONFIG_VERSION = 1

/** 分隔符 preset 正面表列（PLAN：'|'／'›'／'·'／空格）。 */
export const SEPARATOR_PRESETS = ['|', '›', '·', ' '] as const
export type SeparatorPresetValue = (typeof SEPARATOR_PRESETS)[number]

export type SeparatorConfig =
  | { kind: 'preset'; value: SeparatorPresetValue }
  | { kind: 'custom'; value: string } // plain 限定，≤8、過拒收集 R

export interface SegmentConfig {
  id: string // 清洗保證 ∈ catalog.ids（見檔頭）
  enabled: boolean
  icon: boolean
  prefix?: string // ≤8 字元，過 validate.ts 拒收集 R（Q4 進 v1）
  color: ColorSpec // plain=fg；powerline=bg（D3：mode 切換保值）
  fgOverride?: ColorSpec // powerline 覆寫 auto-fg
  threshold?: ThresholdRule
  variant?: string // 須 ∈ catalog.variantsById[id]，否則清洗退預設
}

export interface BuilderConfig {
  version: typeof CONFIG_VERSION
  mode: 'plain' | 'powerline'
  separator: SeparatorConfig
  lastArrowCap: boolean // powerline 末段收尾箭頭（預設 true，Q1）
  segments: SegmentConfig[]
}

// ── 預設值工廠 ──

function defaultSeparator(): SeparatorConfig {
  return { kind: 'preset', value: '|' }
}

/** 單一 segment 的預設列（未啟用、無 icon、終端預設色、選填欄全缺）。 */
export function defaultSegmentConfig(id: string): SegmentConfig {
  return { id, enabled: false, icon: false, color: { kind: 'default' } }
}

/** 預設 config：目錄順序全列、全停用（初始啟用集屬 M3 UI 決策）。 */
export function defaultConfig(catalog: SegmentCatalog): BuilderConfig {
  return {
    version: CONFIG_VERSION,
    mode: 'plain',
    separator: defaultSeparator(),
    lastArrowCap: true,
    segments: catalog.ids.map((id) => defaultSegmentConfig(id)),
  }
}

// ── serialize ──

/** BuilderConfig → JSON 字串（localStorage 存放形；main.ts 層負責讀寫）。 */
export function serializeConfig(config: BuilderConfig): string {
  return JSON.stringify(config)
}

// ── deserialize（drop-unknown-and-continue 清洗） ──

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/** 無法辨識（含壞 hex、非數字 index、未知 kind）→ null，呼叫端退各自預設。 */
function sanitizeColorSpec(raw: unknown): ColorSpec | null {
  if (!isRecord(raw)) return null
  switch (raw.kind) {
    case 'default':
      return { kind: 'default' }
    case 'ansi256':
      return typeof raw.index === 'number'
        ? { kind: 'ansi256', index: clampAnsi256Index(raw.index) }
        : null
    case 'truecolor': {
      if (typeof raw.hex !== 'string') return null
      const hex = normalizeHex(raw.hex)
      return hex === null ? null : { kind: 'truecolor', hex }
    }
    default:
      return null
  }
}

/**
 * 桶數校正恰 10：不足補 { kind:'default' }、超長截斷、壞桶逐桶退
 * default。threshold 整體非物件／buckets 非陣列＝形狀不可辨 → undefined
 * （退「無閾值」預設，不猜）。
 */
function sanitizeThreshold(raw: unknown): ThresholdRule | undefined {
  if (!isRecord(raw) || !Array.isArray(raw.buckets)) return undefined
  const buckets: ColorSpec[] = []
  for (let i = 0; i < THRESHOLD_BUCKET_COUNT; i++) {
    buckets.push(sanitizeColorSpec(raw.buckets[i]) ?? { kind: 'default' })
  }
  return { buckets: buckets as unknown as ThresholdRule['buckets'] }
}

function sanitizeSeparator(raw: unknown): SeparatorConfig {
  if (!isRecord(raw) || typeof raw.value !== 'string') return defaultSeparator()
  if (raw.kind === 'preset') {
    return (SEPARATOR_PRESETS as readonly string[]).includes(raw.value)
      ? { kind: 'preset', value: raw.value as SeparatorPresetValue }
      : defaultSeparator()
  }
  if (raw.kind === 'custom') {
    return validateCustomText(raw.value).ok
      ? { kind: 'custom', value: raw.value }
      : defaultSeparator()
  }
  return defaultSeparator()
}

/** 未知 id／非物件 → null（整列丟棄）；其餘欄逐欄清洗、未知欄不搬運即忽略。 */
function sanitizeSegment(raw: unknown, catalog: SegmentCatalog): SegmentConfig | null {
  if (!isRecord(raw)) return null
  const id = raw.id
  if (typeof id !== 'string' || !catalog.ids.includes(id)) return null

  const seg: SegmentConfig = {
    id,
    enabled: raw.enabled === true,
    icon: raw.icon === true,
    color: sanitizeColorSpec(raw.color) ?? { kind: 'default' },
  }
  if (typeof raw.prefix === 'string' && validateCustomText(raw.prefix).ok) {
    seg.prefix = raw.prefix
  }
  const fgOverride = sanitizeColorSpec(raw.fgOverride)
  if (fgOverride !== null) seg.fgOverride = fgOverride
  const threshold = sanitizeThreshold(raw.threshold)
  if (threshold !== undefined) seg.threshold = threshold
  const variants = catalog.variantsById[id]
  if (typeof raw.variant === 'string' && variants !== undefined && variants.includes(raw.variant)) {
    seg.variant = raw.variant
  }
  return seg
}

/**
 * segments 清洗＋目錄對帳：保留存檔順序（使用者拖曳序）、未知 id 丟、
 * 重複 id 取首見；目錄新增而存檔缺列者，依目錄順序補預設列於末——
 * 產出恆為 catalog.ids 的一個排列（UI 25 列清單直接可用）。
 */
function sanitizeSegments(raw: unknown, catalog: SegmentCatalog): SegmentConfig[] {
  const out: SegmentConfig[] = []
  const seen = new Set<string>()
  if (Array.isArray(raw)) {
    for (const entry of raw) {
      const seg = sanitizeSegment(entry, catalog)
      if (seg !== null && !seen.has(seg.id)) {
        seen.add(seg.id)
        out.push(seg)
      }
    }
  }
  for (const id of catalog.ids) {
    if (!seen.has(id)) out.push(defaultSegmentConfig(id))
  }
  return out
}

function sanitizeConfig(raw: Record<string, unknown>, catalog: SegmentCatalog): BuilderConfig {
  return {
    version: CONFIG_VERSION,
    mode: raw.mode === 'powerline' ? 'powerline' : 'plain',
    separator: sanitizeSeparator(raw.separator),
    lastArrowCap: typeof raw.lastArrowCap === 'boolean' ? raw.lastArrowCap : true,
    segments: sanitizeSegments(raw.segments, catalog),
  }
}

/**
 * migrate 骨架：v1 為首版 schema、無前代可遷——未知版本（0、2、字串、
 * 缺欄）一律重置為預設。未來 v2 時在此逐版遷移（v1→v2…）後再走
 * sanitizeConfig。
 */
function migrateConfig(_raw: Record<string, unknown>, catalog: SegmentCatalog): BuilderConfig {
  return defaultConfig(catalog)
}

/**
 * JSON 字串 → BuilderConfig。絕不丟例外、絕不整份拒收：壞 JSON／非
 * 物件頂層 → 預設 config；version≠1（嚴格 ===，"1" 字串不收）→
 * migrate；version=1 → 逐欄清洗（drop-unknown-and-continue，未知
 * 頂層欄不搬運即忽略）。清洗為冪等純函式。
 */
export function deserializeConfig(json: string, catalog: SegmentCatalog): BuilderConfig {
  let raw: unknown
  try {
    raw = JSON.parse(json)
  } catch {
    return defaultConfig(catalog)
  }
  if (!isRecord(raw)) return defaultConfig(catalog)
  if (raw.version !== CONFIG_VERSION) return migrateConfig(raw, catalog)
  return sanitizeConfig(raw, catalog)
}
