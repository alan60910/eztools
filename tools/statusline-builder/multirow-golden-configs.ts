/**
 * T3.3 補件（MAGI code review 2026-07-11 Important #2／Fix 2 採納）：
 * multirow golden config 的**單一事實來源**——同時供：
 *   - `scripts/golden-statusline.mjs`（MULTIROW_CASES → emitBash → 簽入
 *     `__golden__/multirow-{plain,powerline}.sh`）
 *   - `scripts/golden-statusline-ps1.mjs`（CANONICAL_CONFIGS 內 multirow
 *     兩案 → emitPs1 → 簽入 `__golden__/multirow-{plain,powerline}.ps1`）
 *   - `emit-bash.test.ts`／`emit-ps1.test.ts` 的黃金比對常駐迴圈（本次
 *     新增；先前僅由 T3.3 人審產出，未被 `npm test` 覆蓋——見 PLAN
 *     §Verification 1／MAGI review Important #2）
 *
 * 收攏原因：先前 bash／ps1 兩個 .mjs harness 各自 inline 定義同名
 * multirow config（欄位逐字相同，僅 icon 預設值寫法不同——bash helper
 * 預設 `icon:false`、ps1 helper 逐段顯式覆寫 `icon:false`，效果等價），
 * 屬字面重複、有漂移風險。改由本檔案輸出純資料（`BuilderConfig`，
 * `icon:false` 為顯式欄位，兩後端消費同一物件），emit-bash／emit-ps1 兩
 * 產生器各自依 mode／backend 特性序列化，config 本身不含後端特定資訊。
 *
 * **與 `scripts/statusline-golden-configs.ts`（單列 GOLDEN_CASES 單一
 * 事實來源）刻意分離、零耦合**——後者為 emit-bash.test.ts 既有黃金比對
 * ＋端到端 byte-exact 測試的事實來源，非本次任務範圍（PLAN 註記「本兩案
 * 為本任務新增，非本任務範圍禁改該檔」）；`emit-ps1.test.ts` 的
 * `GOLDENS`（PLAIN_FULL／POWERLINE_THRESHOLD／POWERLINE_NOARROW）亦不受
 * 本檔影響，維持原「與 golden-statusline-ps1.mjs 逐字同步」慣例。
 *
 * **golden 檔本身為禁區**（不得重生／手改）：本檔僅重整 config 來源，
 * 兩個 __golden__/multirow-*.{sh,ps1} 之 bytes 不變——sha1sum 前後一致
 * 已於本次修復驗證（見 code review 回報）。
 */
import type { BuilderConfig, SegmentConfig } from './config.js'
import type { ColorSpec } from './color.js'
import { THRESHOLD_TEMPLATES } from './threshold.js'

const A = (index: number): ColorSpec => ({ kind: 'ansi256', index })
const TRAFFIC = THRESHOLD_TEMPLATES.traffic

const seg = (id: string, over: Partial<SegmentConfig> = {}): SegmentConfig => ({
  id,
  enabled: true,
  icon: false,
  color: { kind: 'default' },
  ...over,
})

const cfg = (mode: BuilderConfig['mode'], over: Partial<Omit<BuilderConfig, 'mode'>> = {}): BuilderConfig => ({
  version: 2,
  mode,
  separator: { kind: 'preset', value: '|' },
  lastArrowCap: true,
  powerlineArrow: mode === 'powerline',
  segments: [],
  ...over,
})

export interface MultirowGoldenCase {
  /** 黃金檔名 stem（`.sh`／`.ps1` 兩後端共用同一 name）。 */
  name: string
  config: BuilderConfig
}

/**
 * 三列（row 0/1/2）、列內兩段（驗分隔符／箭頭不跨列）：plain 與
 * powerline（含 arrow gating true）各一——與原 `MULTIROW_CASES`（bash）
 * ／`CANONICAL_CONFIGS` multirow 兩案（ps1）逐欄比對後確認等價，逐字
 * 移植於此。
 */
export const MULTIROW_GOLDEN_CASES: readonly MultirowGoldenCase[] = [
  {
    name: 'multirow-plain',
    // plain 三列：row 0＝model+cwd（tilde）、row 1＝cost+duration、row 2＝
    // context-used（threshold 桶色）+rate-5h（無 threshold，dash 政策）。
    // 列內以 SEP='|' 相接、列間單一換行（bash：LF；ps1：`` `n ``）；驗
    // 分隔符不跨列（row 0 末段與 row 1 首段之間無 '|'，各列各自的 SEP
    // 迴圈獨立求值）。
    config: cfg('plain', {
      segments: [
        seg('model', { color: A(75), row: 0 }),
        seg('cwd', { variant: 'tilde', prefix: '@', color: A(45), row: 0 }),
        seg('cost', { color: A(220), row: 1 }),
        seg('duration', { color: A(118), row: 1 }),
        seg('context-used', { threshold: TRAFFIC, color: A(240), row: 2 }),
        seg('rate-5h', { color: A(99), row: 2 }),
      ],
    }),
  },
  {
    name: 'multirow-powerline',
    // powerline 三列、arrow gating true（powerlineArrow:true）：驗段間箭頭
    // 交接與 lastArrowCap 收尾皆列內獨立（row 0/1/2 各自收尾箭頭，不跨列
    // 串接、不與下一列首段交接）。
    config: cfg('powerline', {
      powerlineArrow: true,
      lastArrowCap: true,
      segments: [
        seg('model', { color: A(226), row: 0 }),
        seg('cwd', { variant: 'basename', color: A(24), row: 0 }),
        seg('cost', { color: A(16), row: 1 }),
        seg('duration', { color: A(46), row: 1 }),
        seg('context-used', { threshold: TRAFFIC, color: A(240), row: 2 }),
        seg('rate-5h', { color: A(99), row: 2 }),
      ],
    }),
  },
]
