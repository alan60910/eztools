/**
 * S5-T2.1（magi/05-statusline-builder/PLAN.md §Segment 目錄／§型別契約
 * SegmentDescriptor／§格式化對等規則／產生器契約 3 null 三態／§D1）：
 * StatusData＝真 stdin JSON 的忠實 typed mirror（照 F1 巢狀結構，不改名
 * 不扁平化）、tri-path SegmentDescriptor 全目錄、格式化 TS 參考純函式
 * （FormatKind 鍵供 bash/ps1 emitter 對等實作）。
 *
 * ── provisional 體制（SP-0 對帳後，2026-07-09）──
 * SP-0 真機 fixture（fixtures/stdin-dump.jsonl，73 筆）逐欄對帳完成：全部
 * tri-path jqPath 皆命中真檔、無一錯路徑（null 三態、epoch 秒、雙表述
 * 皆坐實）。已驗欄位拆 `provisional` 標記；**僅 vim-mode／pr 兩段維持
 * `provisional: true`**（73 筆真檔皆未出現：vim 於本環境為 Unknown
 * command、DEV 分支無開啟 PR），其 presence／shape 仍未驗證。對帳協定
 * 與逐欄證據見 sp0/INSTRUCTIONS.md §4＋WORKS 2026-07-09。
 *
 * ── worktree 雙表述裁定（SP-0 判定：獨立並存 → 拆兩段）──
 * SP-0 實證（fixture L22）：`workspace.git_worktree`（字串＝工作樹名稱）與
 * top-level `worktree` 物件（{name,path,branch,original_cwd,original_branch}）
 * **同時並存且互補**——名稱兩者皆給、`worktree.branch`（工作樹分支名）為
 * 額外資訊。故依 PLAN 名目拆回兩段：`worktree`（名稱，取值 fallback 鏈
 * `workspace.git_worktree` 優先、次 `worktree.name`；tsPath `??`／jqPath `//`
 * ／ps1Path `$(if …)` 三路同構）＋`worktree-branch`（`.worktree.branch`）。
 * 目錄實數 **25 段**（＝PLAN 名目）。
 *
 * ── tri-path 取值 idiom（下游 emitter 依此抄寫）──
 * - tsPath：`(d: StatusData) => unknown`，回傳「未格式化的來源節點」；
 *   條件欄以 optional chaining（缺席 → undefined）。
 * - jqPath：對根 `.` 的 jq 表達式，**裸取值、不含 null 政策 idiom**
 *   （`// "--"`／`// empty` 由 emitter 依 nullPolicy 附加——單一來源在
 *   nullPolicy 欄，路徑不重複編碼）。唯一例外：worktree 的 `//` 是
 *   fallback 值邏輯、非 null 政策。
 * - ps1Path：對 `$d`（`ConvertFrom-Json` 結果）的 PS 5.1 表達式，可直接
 *   `$value = <ps1Path>` 嵌入。**產出腳本不得 Set-StrictMode**（缺席屬性
 *   鏈須靜默回 $null）；null 判定一律顯式 `$null -eq/-ne`（PS 把 0 視為
 *   falsy，truthiness 判定會誤殺 0%）。TS 端同理用 `v == null`、禁 `!v`。
 * - shell-out 段：值不出於 stdin JSON——jqPath/ps1Path 為空字串（不可
 *   用），命令在 `shellOut.{bash,ps1}`（核心命令；`2>/dev/null || true`
 *   等防禦包裹＝emitter 契約 9 的職責）。預覽側的值由 mock-data.ts 的
 *   shell 通道供給（tsPath 恆回 undefined）。
 *
 * ── null／存活語意（resolve（T2.2）依此實作）──
 * - nullPolicy 'dash'（4 百分比段）：主值 nullish → 顯示 '--'、不套閾值
 *   色，段仍存活。
 * - 'hide'／'empty'：值「死」→ 整段（含 prefix、icon）自段陣列剔除。
 *   死值判定見 isValueDead：null／undefined／''／false——false 入列使
 *   thinking 的 jq `// empty`（false 亦 fallback）語意三後端同構
 *   （PLAN 契約 3：null/false 同視為不顯示，刻意選擇）。
 *
 * 純函式、零 DOM import，node 可測。
 */
import type { SegmentCatalog } from './config.js'

// ── StatusData：stdin JSON 忠實 typed mirror（F1） ──

/**
 * `context_window.current_usage` 非 null 時的形狀（SP-0 對帳確認：
 * `{cache_creation_input_tokens, cache_read_input_tokens, input_tokens,
 * output_tokens}` 皆 number；欄位永在、null 期 4/73＝首回應前／compact 後）。
 * v1 無段消費本節點，型別保留寬 Record 即可。
 */
export type CurrentUsage = Record<string, unknown>

/**
 * rate_limits 視窗（SP-0 對帳確認：Pro/Max＋首次回應後出現，69/73 在席）。
 * `resets_at` 為 epoch 秒（fixture 實測 1783575600 ≈ 2026-07；PLAN 產生器
 * 契約 12 FromUnixTimeSeconds 坐實）。`used_percentage` 恆為 number（真檔
 * 未見 null，nullable 為防禦保留）。
 */
export interface RateLimitWindow {
  used_percentage: number | null
  resets_at: number | null
}

/**
 * 真 stdin JSON 的 typed mirror：欄名、巢狀結構照 F1，不改名不扁平化。
 * 三態建模：永在欄＝必填；「欄位在、值可 null」＝`| null`；條件欄
 * （缺席＝狀態不成立）＝`?:` optional（序列化時**鍵缺席**，非 null）。
 */
export interface StatusData {
  cwd: string
  session_id: string
  transcript_path: string
  version: string
  model: { id: string; display_name: string }
  workspace: {
    current_dir: string
    project_dir: string
    added_dirs: string[]
    /** SP-0 確認：字串＝工作樹名稱；條件欄，與 top-level worktree 並存（L22）。 */
    git_worktree?: string
    /** SP-0 確認：恆在（73/73）、形狀 {host,owner,name}。 */
    repo?: { host: string; owner: string; name: string }
  }
  output_style: { name: string }
  cost: {
    total_cost_usd: number
    total_duration_ms: number
    total_api_duration_ms: number
    total_lines_added: number
    total_lines_removed: number
  }
  context_window: {
    /** F6：v2.1.132 起＝「當前 context」語意（非累計）——僅支援現行語意。 */
    total_input_tokens: number
    total_output_tokens: number
    context_window_size: number
    used_percentage: number | null
    remaining_percentage: number | null
    current_usage: CurrentUsage | null
  }
  exceeds_200k_tokens: boolean
  thinking: { enabled: boolean }
  session_name?: string
  /** SP-0 確認：條件欄（67/73 在席），string。 */
  prompt_id?: string
  /** SP-0 確認：真檔恆在（值 'xhigh'）；enum 全集未窮舉但 v1 原樣顯示不受限。 */
  effort?: { level: string }
  /** ⚠ vim-mode provisional：73 筆真檔皆無 vim 欄（本環境 /vim＝Unknown command）。 */
  vim?: { mode: string }
  /** SP-0 確認：條件欄（1/73，值 'magi:developer'），形狀 {name}。 */
  agent?: { name: string }
  /** ⚠ pr provisional：73 筆真檔皆無 pr 欄（DEV 分支無開啟 PR）；shape 未驗證。 */
  pr?: { number: number; url: string; review_state: string }
  rate_limits?: { five_hour?: RateLimitWindow; seven_day?: RateLimitWindow }
  /**
   * SP-0 確認（fixture L22）：top-level worktree 物件與 workspace.git_worktree
   * 並存互補——name 兩者皆給、branch 為額外工作樹分支名。名稱段走 worktree
   * （此物件的 name 為 fallback 次選）；branch 另立 worktree-branch 段。
   */
  worktree?: {
    name?: string
    path?: string
    branch?: string
    original_cwd?: string
    original_branch?: string
  }
  /** SP-0 新欄位（73/73，boolean）：/fast 模式旗標。v1 不設段（backlog）。 */
  fast_mode?: boolean
  /** SP-0 新欄位（1/73，string；與 agent.name 同值）。v1 不設段（backlog）。 */
  agent_type?: string
}

// ── 目錄型別 ──

export type SegmentId =
  | 'model' | 'cwd' | 'project-dir' | 'output-style' | 'version'
  | 'cost' | 'duration' | 'lines-changed' | 'context-size' | 'thinking'
  | 'context-used' | 'context-remaining' | 'rate-5h' | 'rate-7d'
  | 'session-name' | 'effort' | 'vim-mode' | 'agent-name' | 'pr' | 'repo'
  | 'worktree' | 'worktree-branch'
  | 'git-branch' | 'git-dirty' | 'clock'

export type SegmentCategory = 'always' | 'percentage' | 'conditional' | 'shell-out'

export type NullPolicy = 'dash' | 'hide' | 'empty'

/**
 * 格式化規則鍵（§格式化對等規則）：TS 參考實作在本檔 formatValue；
 * bash（jq 端）／ps1 emitter 逐鍵實作同語意（行為相等歸 §3 真執行）。
 */
export type FormatKind =
  | 'text'          // 字串原樣
  | 'path'          // cwd variants：full／basename／tilde
  | 'cost'          // $D.DDDD（單次浮點乘 floor、4 位補尾零）
  | 'duration'      // 整數除法 h/m/s 三階
  | 'percentage'    // ⌊p⌋%
  | 'context-size'  // context_window 節點 → in+out 總和 → ≥10⁶→⌊n/10⁶⌋M else ⌊n/10³⌋k
  | 'lines-changed' // cost 節點 → +A/-R
  | 'flag'          // true → 'on'（thinking；false/null 由 empty 政策剔段）
  | 'dirty'         // true → '*'（git-dirty；false/null 由 hide 政策剔段）
  | 'pr'            // pr 節點 → #<number>
  | 'repo'          // repo 節點 → <owner>/<name>
  | 'clock'         // ClockParts → HH:mm（零填補）

/** 三後端取值路徑組（resets_at 後綴通道複用）。 */
export interface TriPath {
  tsPath: (d: StatusData) => unknown
  jqPath: string
  ps1Path: string
}

/**
 * tri-path 描述子——三後端取值語意的單一事實來源（PLAN 型別契約）。
 * 契約沉默處的本檔擴充欄：resetsAt／shellOut／provisional(+Note)；
 * icon 收窄為必填（06a 核可 emoji 對照表 25 段全覆蓋）。
 */
export interface SegmentDescriptor {
  id: SegmentId
  /** UI 顯示＋控件 accessible name 的段身分部。 */
  label: string
  category: SegmentCategory
  tsPath: (d: StatusData) => unknown
  jqPath: string
  ps1Path: string
  format: FormatKind
  /** glyph＝06a 核可對照表 emoji 字面（T1.2 結論：無需字寬／可辨識性調整）；ariaText＝SR 文字等價（中文）。 */
  icon: { glyph: string; ariaText: string }
  nullPolicy: NullPolicy
  /** 允許集（目錄衍生）；預設＝variants[0]（見 defaultVariant）。 */
  variants?: readonly string[]
  /**
   * rate 段限定：resets_at 後綴 tri-path。variant 'percent-reset' 且值
   * 非 null 時，於主值後附 ` (HH:mm)`（resetsAtSuffix）；後綴為段內
   * composition 成分、非主值——主值 null 判定不看它。
   */
  resetsAt?: TriPath
  /** shell-out 段限定：兩後端核心命令（防禦包裹＝emitter 契約 9）。 */
  shellOut?: { bash: string; ps1: string }
  /** SP-0 前全目錄 true（provisional 體制）；對帳後逐段拆標。 */
  provisional: boolean
  /** 段別的具體待驗點（worktree 雙表述、enum 集、epoch 假設等）。 */
  provisionalNote?: string
}

// ── variants 表列 ──

export const CWD_VARIANTS = ['full', 'basename', 'tilde'] as const
export type CwdVariant = (typeof CWD_VARIANTS)[number]

/** rate 段：'percent'＝僅百分比；'percent-reset'＝附 resets_at 後綴。 */
export const RATE_VARIANTS = ['percent', 'percent-reset'] as const
export type RateVariant = (typeof RATE_VARIANTS)[number]

/** 預設 variant＝表列第一項（config 清洗後 variant 缺席時 resolve 用此）。 */
export function defaultVariant(descriptor: SegmentDescriptor): string | undefined {
  return descriptor.variants?.[0]
}

// ── 存活語意 ──

/**
 * hide／empty 政策的「死值」判定（dash 段不適用——null 顯示 '--' 仍存活）：
 * null／undefined（缺席）、''（空字串段身空殼）、false（jq `// empty`
 * 對 false 亦 fallback——thinking 三後端同構的關鍵）。0 存活（0% 合法）。
 */
export function isValueDead(v: unknown): boolean {
  return v === null || v === undefined || v === '' || v === false
}

// ── 格式化純函式（TS 參考實作；對抗值測試見 segments.test.ts） ──

/**
 * cost：`$⌊usd×10⁴⌋ 插小數點、4 位補尾零`。單次浮點乘後 floor，其後全
 * 整數運算（禁捨入模式相依格式化）；float 乘積下緣一致偏（0.0029 →
 * 28.999… → '$0.0028'，三後端同 double 同偏）。負值 clamp 0（cost 恆
 * ≥0 假設；clamp 為 FormatKind 'cost' 語意的一部分，emitter 同構）。
 */
export function formatCost(usd: number): string {
  const scaled = Math.max(0, Math.floor(usd * 10000))
  const whole = Math.floor(scaled / 10000)
  const frac = String(scaled % 10000).padStart(4, '0')
  return `$${whole}.${frac}`
}

/** duration：h=⌊ms/3.6e6⌋、m=⌊ms/6e4⌋%60、s=⌊ms/1e3⌋%60；h>0→`{h}h{m}m`、m>0→`{m}m{s}s`、else `{s}s`。 */
export function formatDuration(ms: number): string {
  const h = Math.floor(ms / 3600000)
  const m = Math.floor(ms / 60000) % 60
  const s = Math.floor(ms / 1000) % 60
  if (h > 0) return `${h}h${m}m`
  if (m > 0) return `${m}m${s}s`
  return `${s}s`
}

/** percentage：`⌊p⌋%`（顯示層不 clamp——閾值分桶的 clamp 在 threshold.ts）。 */
export function formatPercentage(p: number): string {
  return `${Math.floor(p)}%`
}

/** context-size：tokens ≥10⁶ → `⌊n/10⁶⌋M`、else `⌊n/10³⌋k`（<10³ → '0k'）。 */
export function formatContextSize(totalTokens: number): string {
  if (totalTokens >= 1_000_000) return `${Math.floor(totalTokens / 1_000_000)}M`
  return `${Math.floor(totalTokens / 1_000)}k`
}

/** lines-changed：`+A/-R` 原整數。 */
export function formatLinesChanged(added: number, removed: number): string {
  return `+${added}/-${removed}`
}

/** 預覽時鐘的決定論輸入（真腳本用系統時鐘：`date +%H:%M`／Get-Date）。 */
export interface ClockParts {
  hours: number
  minutes: number
}

/** clock／resets_at 共用的 HH:mm 渲染（兩欄皆零填補兩位）。 */
export function formatClockHM(hours: number, minutes: number): string {
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

/**
 * resets_at（epoch 秒，provisional）→ 本地 HH:mm。epoch→本地時分的分解
 * 屬環境（bash `date`／ps1 ToLocalTime 同語意）；渲染鎖 formatClockHM。
 */
export function formatResetsAt(epochSeconds: number): string {
  const d = new Date(epochSeconds * 1000)
  return formatClockHM(d.getHours(), d.getMinutes())
}

/**
 * resets_at 後綴：null/undefined → ''（無後綴）；epoch 秒 → ` (HH:mm)`
 * （空格＋括號的後綴形＝FormatKind 對等面的一部分，emitter 同構）。
 * 非 number 的非 null 值＝epoch 假設破產（SP-0 對帳點）→ TypeError。
 */
export function resetsAtSuffix(v: unknown): string {
  if (v === null || v === undefined) return ''
  if (typeof v !== 'number' || Number.isNaN(v)) {
    throw new TypeError(`resets_at 預期 epoch 秒（number），得到 ${typeof v}`)
  }
  return ` (${formatResetsAt(v)})`
}

/**
 * path（cwd variants）：'full' 原樣；'basename' 取最後路徑節（`/`／`\`
 * 皆為分隔、尾分隔忽略）；'tilde' 以 home 前綴（嚴格逐字比對，含大小寫
 * ——Windows 大小寫寬鬆比對不做，保守）換 `~`（home 為空字串時原樣）。
 */
export function formatPath(p: string, variant: CwdVariant, home: string): string {
  switch (variant) {
    case 'full':
      return p
    case 'basename': {
      const parts = p.split(/[\\/]+/).filter((part) => part !== '')
      return parts.length > 0 ? parts[parts.length - 1] : p
    }
    case 'tilde': {
      if (home === '') return p
      if (p === home) return '~'
      if (p.startsWith(`${home}/`) || p.startsWith(`${home}\\`)) return `~${p.slice(home.length)}`
      return p
    }
  }
}

// ── formatValue：FormatKind 派發（resolve 消費面） ──

export interface FormatContext {
  /** 段 variant（config 已清洗；未知值＝programmer error → TypeError）。 */
  variant?: string
  /** tilde 縮寫的 home（bash `$HOME`／ps1 `$env:USERPROFILE`；預覽由 mock env 通道供給）。 */
  home?: string
}

function asNumber(v: unknown, what: string): number {
  if (typeof v !== 'number' || Number.isNaN(v)) throw new TypeError(`${what} 預期 number，得到 ${typeof v === 'number' ? 'NaN' : typeof v}`)
  return v
}

function asString(v: unknown, what: string): string {
  if (typeof v !== 'string') throw new TypeError(`${what} 預期 string，得到 ${typeof v}`)
  return v
}

function asRecord(v: unknown, what: string): Record<string, unknown> {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new TypeError(`${what} 預期物件節點`)
  return v as Record<string, unknown>
}

/**
 * 存活主值 → 顯示字串。**只對存活值呼叫**（dash 的 '--'、hide/empty 的
 * 剔段判定皆在 resolve 層先行）；形狀不符＝programmer error → TypeError
 * （對齊 color.ts hexToRgb 邊界哲學——使用者輸入的驗證閘在上游）。
 */
export function formatValue(kind: FormatKind, value: unknown, ctx: FormatContext = {}): string {
  switch (kind) {
    case 'text':
      return asString(value, 'text 值')
    case 'path': {
      const variant = ctx.variant ?? CWD_VARIANTS[0]
      if (!(CWD_VARIANTS as readonly string[]).includes(variant)) {
        throw new TypeError(`未知 path variant：${variant}`)
      }
      return formatPath(asString(value, 'path 值'), variant as CwdVariant, ctx.home ?? '')
    }
    case 'cost':
      return formatCost(asNumber(value, 'cost 值'))
    case 'duration':
      return formatDuration(asNumber(value, 'duration 值'))
    case 'percentage':
      return formatPercentage(asNumber(value, 'percentage 值'))
    case 'context-size': {
      const node = asRecord(value, 'context_window 節點')
      return formatContextSize(
        asNumber(node.total_input_tokens, 'total_input_tokens') +
          asNumber(node.total_output_tokens, 'total_output_tokens'),
      )
    }
    case 'lines-changed': {
      const node = asRecord(value, 'cost 節點')
      return formatLinesChanged(
        asNumber(node.total_lines_added, 'total_lines_added'),
        asNumber(node.total_lines_removed, 'total_lines_removed'),
      )
    }
    case 'flag':
      if (value !== true) throw new TypeError('flag 只對 true 呼叫（false/null 由 empty 政策剔段）')
      return 'on'
    case 'dirty':
      if (value !== true) throw new TypeError('dirty 只對 true 呼叫（false/null 由 hide 政策剔段）')
      return '*'
    case 'pr': {
      const node = asRecord(value, 'pr 節點')
      return `#${asNumber(node.number, 'pr.number')}`
    }
    case 'repo': {
      const node = asRecord(value, 'repo 節點')
      return `${asString(node.owner, 'repo.owner')}/${asString(node.name, 'repo.name')}`
    }
    case 'clock': {
      const node = asRecord(value, 'clock 值')
      return formatClockHM(asNumber(node.hours, 'clock.hours'), asNumber(node.minutes, 'clock.minutes'))
    }
  }
}

// ── Segment 目錄（25 段；順序＝PLAN 目錄表序＝UI 清單序） ──

function deepFreeze<T>(v: T): T {
  if (v !== null && (typeof v === 'object' || typeof v === 'function')) {
    for (const key of Object.getOwnPropertyNames(v)) {
      deepFreeze((v as Record<string, unknown>)[key])
    }
    Object.freeze(v)
  }
  return v
}

const SEGMENT_DESCRIPTOR_LIST: SegmentDescriptor[] = [
  // ── 永在（10） ──
  {
    id: 'model',
    label: '模型',
    category: 'always',
    tsPath: (d) => d.model.display_name,
    jqPath: '.model.display_name',
    ps1Path: '$d.model.display_name',
    format: 'text',
    icon: { glyph: '🤖', ariaText: '模型' },
    nullPolicy: 'empty',
    provisional: false,
  },
  {
    id: 'cwd',
    label: '目前目錄',
    category: 'always',
    // 採 top-level `.cwd`（官方範例慣用欄）；workspace.current_dir 疑為
    // 同值雙表述（未驗證），SP-0 對帳。
    tsPath: (d) => d.cwd,
    jqPath: '.cwd',
    ps1Path: '$d.cwd',
    format: 'path',
    icon: { glyph: '📁', ariaText: '目前目錄' },
    nullPolicy: 'empty',
    variants: CWD_VARIANTS,
    provisional: false,
  },
  {
    id: 'project-dir',
    label: '專案目錄',
    category: 'always',
    tsPath: (d) => d.workspace.project_dir,
    jqPath: '.workspace.project_dir',
    ps1Path: '$d.workspace.project_dir',
    format: 'text',
    icon: { glyph: '📂', ariaText: '專案目錄' },
    nullPolicy: 'empty',
    provisional: false,
  },
  {
    id: 'output-style',
    label: '輸出風格',
    category: 'always',
    tsPath: (d) => d.output_style.name,
    jqPath: '.output_style.name',
    ps1Path: '$d.output_style.name',
    format: 'text',
    icon: { glyph: '🎨', ariaText: '輸出風格' },
    nullPolicy: 'empty',
    provisional: false,
  },
  {
    id: 'version',
    label: '版本',
    category: 'always',
    tsPath: (d) => d.version,
    jqPath: '.version',
    ps1Path: '$d.version',
    format: 'text',
    icon: { glyph: '🔖', ariaText: '版本' },
    nullPolicy: 'empty',
    provisional: false,
  },
  {
    id: 'cost',
    label: '費用',
    category: 'always',
    tsPath: (d) => d.cost.total_cost_usd,
    jqPath: '.cost.total_cost_usd',
    ps1Path: '$d.cost.total_cost_usd',
    format: 'cost',
    icon: { glyph: '💰', ariaText: '費用' },
    nullPolicy: 'empty',
    provisional: false,
  },
  {
    id: 'duration',
    label: '工作時長',
    category: 'always',
    // 取 total_duration_ms（wall clock）；total_api_duration_ms 不設段。
    tsPath: (d) => d.cost.total_duration_ms,
    jqPath: '.cost.total_duration_ms',
    ps1Path: '$d.cost.total_duration_ms',
    format: 'duration',
    icon: { glyph: '⌛', ariaText: '工作時長' },
    nullPolicy: 'empty',
    provisional: false,
  },
  {
    id: 'lines-changed',
    label: '行數增減',
    category: 'always',
    // 多欄位段：取 cost 節點，欄位讀取歸 FormatKind 'lines-changed'。
    tsPath: (d) => d.cost,
    jqPath: '.cost',
    ps1Path: '$d.cost',
    format: 'lines-changed',
    icon: { glyph: '📝', ariaText: '行數增減' },
    nullPolicy: 'empty',
    provisional: false,
  },
  {
    id: 'context-size',
    label: '上下文大小',
    category: 'always',
    // in+out 總和＝「當前 context」token 數（F6 現行語意鎖定）。
    tsPath: (d) => d.context_window,
    jqPath: '.context_window',
    ps1Path: '$d.context_window',
    format: 'context-size',
    icon: { glyph: '🧠', ariaText: '上下文大小' },
    nullPolicy: 'empty',
    provisional: false,
  },
  {
    id: 'thinking',
    label: '思考模式',
    category: 'always',
    tsPath: (d) => d.thinking.enabled,
    jqPath: '.thinking.enabled',
    ps1Path: '$d.thinking.enabled',
    format: 'flag',
    icon: { glyph: '💭', ariaText: '思考模式' },
    // empty＝null/false 同視為不顯示（jq `// empty` 對 false 亦 fallback
    // ——刻意選擇，PLAN 契約 3）。
    nullPolicy: 'empty',
    provisional: false,
  },
  // ── 百分比（4，可掛閾值；主值 null → '--' 不套閾值色） ──
  {
    id: 'context-used',
    label: '上下文已用',
    category: 'percentage',
    tsPath: (d) => d.context_window.used_percentage,
    jqPath: '.context_window.used_percentage',
    ps1Path: '$d.context_window.used_percentage',
    format: 'percentage',
    icon: { glyph: '📊', ariaText: '上下文已用' },
    nullPolicy: 'dash',
    provisional: false,
  },
  {
    id: 'context-remaining',
    label: '上下文剩餘',
    category: 'percentage',
    tsPath: (d) => d.context_window.remaining_percentage,
    jqPath: '.context_window.remaining_percentage',
    ps1Path: '$d.context_window.remaining_percentage',
    format: 'percentage',
    icon: { glyph: '🔋', ariaText: '上下文剩餘' },
    nullPolicy: 'dash',
    provisional: false,
  },
  {
    id: 'rate-5h',
    label: '5 小時限額',
    category: 'percentage',
    // rate_limits 整包缺席（非 Pro/Max）→ 主值 undefined → dash '--'
    // （PLAN 目錄把 rate 段歸百分比類、dash 政策；不做整段隱藏）。
    tsPath: (d) => d.rate_limits?.five_hour?.used_percentage,
    jqPath: '.rate_limits.five_hour.used_percentage',
    ps1Path: '$d.rate_limits.five_hour.used_percentage',
    format: 'percentage',
    icon: { glyph: '⏳', ariaText: '5 小時限額' },
    nullPolicy: 'dash',
    variants: RATE_VARIANTS,
    resetsAt: {
      tsPath: (d) => d.rate_limits?.five_hour?.resets_at,
      jqPath: '.rate_limits.five_hour.resets_at',
      ps1Path: '$d.rate_limits.five_hour.resets_at',
    },
    provisional: false,
  },
  {
    id: 'rate-7d',
    label: '7 日限額',
    category: 'percentage',
    tsPath: (d) => d.rate_limits?.seven_day?.used_percentage,
    jqPath: '.rate_limits.seven_day.used_percentage',
    ps1Path: '$d.rate_limits.seven_day.used_percentage',
    format: 'percentage',
    icon: { glyph: '📅', ariaText: '7 日限額' },
    nullPolicy: 'dash',
    variants: RATE_VARIANTS,
    resetsAt: {
      tsPath: (d) => d.rate_limits?.seven_day?.resets_at,
      jqPath: '.rate_limits.seven_day.resets_at',
      ps1Path: '$d.rate_limits.seven_day.resets_at',
    },
    provisional: false,
  },
  // ── 條件性（7；缺席 → 整段剔除） ──
  {
    id: 'session-name',
    label: '工作階段名稱',
    category: 'conditional',
    tsPath: (d) => d.session_name,
    jqPath: '.session_name',
    ps1Path: '$d.session_name',
    format: 'text',
    icon: { glyph: '💬', ariaText: '工作階段名稱' },
    nullPolicy: 'hide',
    provisional: false,
  },
  {
    id: 'effort',
    label: '推理強度',
    category: 'conditional',
    tsPath: (d) => d.effort?.level,
    jqPath: '.effort.level',
    ps1Path: '$d.effort.level',
    format: 'text',
    icon: { glyph: '⚡', ariaText: '推理強度' },
    nullPolicy: 'hide',
    provisional: false,
  },
  {
    id: 'vim-mode',
    label: 'Vim 模式',
    category: 'conditional',
    tsPath: (d) => d.vim?.mode,
    jqPath: '.vim.mode',
    ps1Path: '$d.vim.mode',
    format: 'text',
    icon: { glyph: '⌨️', ariaText: 'Vim 模式' },
    nullPolicy: 'hide',
    provisional: true,
    provisionalNote:
      'SP-0 provisional：73 筆真檔皆無 vim 欄（本環境 /vim＝Unknown command）；presence／enum 集皆未驗證',
  },
  {
    id: 'agent-name',
    label: '代理名稱',
    category: 'conditional',
    tsPath: (d) => d.agent?.name,
    jqPath: '.agent.name',
    ps1Path: '$d.agent.name',
    format: 'text',
    icon: { glyph: '🎭', ariaText: '代理名稱' },
    nullPolicy: 'hide',
    provisional: false,
  },
  {
    id: 'pr',
    label: 'PR',
    category: 'conditional',
    // 顯示 #<number>；url／review_state 為 mirror 欄、v1 不顯示。
    tsPath: (d) => d.pr,
    jqPath: '.pr',
    ps1Path: '$d.pr',
    format: 'pr',
    icon: { glyph: '🔀', ariaText: '拉取請求' },
    nullPolicy: 'hide',
    provisional: true,
    provisionalNote:
      'SP-0 provisional：73 筆真檔皆無 pr 欄（DEV 分支無開啟 PR）；presence／shape 皆未驗證',
  },
  {
    id: 'repo',
    label: '儲存庫',
    category: 'conditional',
    // 顯示 <owner>/<name>；host 為 mirror 欄、v1 不顯示。
    tsPath: (d) => d.workspace.repo,
    jqPath: '.workspace.repo',
    ps1Path: '$d.workspace.repo',
    format: 'repo',
    icon: { glyph: '📦', ariaText: '儲存庫' },
    nullPolicy: 'hide',
    provisional: false,
  },
  {
    id: 'worktree',
    label: 'Git 工作樹',
    category: 'conditional',
    // 名稱段（SP-0 拆段後）：取值 fallback 鏈 git_worktree 優先、次
    // worktree.name。tsPath `??`（nullish）≈ jq `//`（null/false）——本欄
    // 為字串、false 不會出現，同構成立。分支資訊另立 worktree-branch 段。
    tsPath: (d) => d.workspace.git_worktree ?? d.worktree?.name,
    jqPath: '.workspace.git_worktree // .worktree.name',
    ps1Path:
      '$(if ($null -ne $d.workspace.git_worktree) { $d.workspace.git_worktree } else { $d.worktree.name })',
    format: 'text',
    icon: { glyph: '🌳', ariaText: 'Git 工作樹' },
    nullPolicy: 'hide',
    provisional: false,
  },
  {
    id: 'worktree-branch',
    label: 'Git 工作樹分支',
    category: 'conditional',
    // SP-0 實證（fixture L22）：worktree.branch＝工作樹分支名
    // （'worktree-calm-purring-sifakis'）；與 worktree 名稱段互補。普通
    // stdin 段（ps1Path === $d + jqPath）。glyph＝🌱（U+1F331，06a 核可
    // 對照表）；emoji 字面直書（TS 源檔 UTF-8，非 PUA 字面損毀疑慮）。
    tsPath: (d) => d.worktree?.branch,
    jqPath: '.worktree.branch',
    ps1Path: '$d.worktree.branch',
    format: 'text',
    icon: { glyph: '🌱', ariaText: 'Git 工作樹分支' },
    nullPolicy: 'hide',
    provisional: false,
  },
  // ── shell-out（3；值不出於 stdin JSON，見檔頭 idiom 節） ──
  {
    id: 'git-branch',
    label: 'Git 分支',
    category: 'shell-out',
    tsPath: () => undefined,
    jqPath: '',
    ps1Path: '',
    format: 'text',
    icon: { glyph: '🌿', ariaText: '分支' },
    // 非 git 目錄／detached → 空輸出 → 剔段。
    nullPolicy: 'hide',
    shellOut: { bash: 'git branch --show-current', ps1: 'git branch --show-current' },
    provisional: false,
  },
  {
    id: 'git-dirty',
    label: 'Git 髒標記',
    category: 'shell-out',
    tsPath: () => undefined,
    jqPath: '',
    ps1Path: '',
    format: 'dirty',
    icon: { glyph: '🚧', ariaText: '未提交變更' },
    // porcelain 空（乾淨）／非 git 目錄 → 剔段；非空 → '*'。
    nullPolicy: 'hide',
    shellOut: { bash: 'git status --porcelain', ps1: 'git status --porcelain' },
    provisional: false,
  },
  {
    id: 'clock',
    label: '時鐘',
    category: 'shell-out',
    tsPath: () => undefined,
    jqPath: '',
    ps1Path: '',
    format: 'clock',
    icon: { glyph: '🕐', ariaText: '時鐘' },
    // 恆有值；啟用 → settings 附 refreshInterval: 60（emit-settings）。
    nullPolicy: 'empty',
    shellOut: { bash: 'date +%H:%M', ps1: 'Get-Date -Format HH:mm' },
    provisional: false,
  },
]

/** 全目錄（凍結；順序＝PLAN 目錄表序：永在 10→百分比 4→條件 7→shell-out 3）。 */
export const SEGMENT_DESCRIPTORS: readonly SegmentDescriptor[] = deepFreeze(SEGMENT_DESCRIPTOR_LIST)

export const SEGMENT_IDS: readonly SegmentId[] = Object.freeze(
  SEGMENT_DESCRIPTORS.map((descriptor) => descriptor.id),
)

export const DESCRIPTORS_BY_ID: Readonly<Record<SegmentId, SegmentDescriptor>> = Object.freeze(
  Object.fromEntries(SEGMENT_DESCRIPTORS.map((descriptor) => [descriptor.id, descriptor])) as Record<
    SegmentId,
    SegmentDescriptor
  >,
)

/** config.ts 注入面（{ids, variantsById}——型別由 config.ts 契約鎖定）。 */
export const SEGMENT_CATALOG: SegmentCatalog = deepFreeze({
  ids: SEGMENT_IDS,
  variantsById: Object.fromEntries(
    SEGMENT_DESCRIPTORS.filter((descriptor) => descriptor.variants !== undefined).map(
      (descriptor) => [descriptor.id, descriptor.variants],
    ),
  ),
})
