/**
 * S5-T2.4 canonical 黃金 config 集——**單一事實來源**，同時供：
 *   - 黃金重生腳本 `scripts/golden-statusline.mjs`（emit → __golden__/*.sh）
 *   - `emit-bash.test.ts` 的黃金比對＋端到端 byte-exact 測試
 * 兩處 import 同一份，零漂移（threshold 直接引真模板、scenario 由真
 * mock-data 派生——不 inline、不重打）。
 *
 * `scenario` 存在＝該 case 可端到端 byte-exact（純 jq、無 shell-out）：
 * `emitBash(config)` 產出的腳本真跑（bash＋jq）→ stdout 須與
 * `toAnsi(resolve(config, scenario))` byte-exact。缺 `scenario`＝
 * golden-only（含 shell-out，真 git/date 非決定論、只作腳本文字人審）。
 *
 * 此檔為 .ts：vite（vitest）直接載入；node 重生腳本以 registerHooks
 * shim 載入（見 golden-statusline.mjs）。
 */
import type { BuilderConfig, SegmentConfig } from '../tools/statusline-builder/config.js'
import type { ColorSpec } from '../tools/statusline-builder/color.js'
import { MOCK_SCENARIOS_BY_ID } from '../tools/statusline-builder/mock-data.js'
import type { MockShellChannel } from '../tools/statusline-builder/mock-data.js'
import type { StatusData } from '../tools/statusline-builder/segments.js'
import { THRESHOLD_TEMPLATES } from '../tools/statusline-builder/threshold.js'

export interface ByteExactScenario {
  data: StatusData
  shell: MockShellChannel
  env: { home: string }
}

export interface GoldenCase {
  /** 黃金檔名（不含副檔名）＋測試 case 名。 */
  name: string
  config: BuilderConfig
  /** 存在＝可端到端 byte-exact（純 jq）；缺＝golden-only（shell-out）。 */
  scenario?: ByteExactScenario
}

const A = (index: number): ColorSpec => ({ kind: 'ansi256', index })
const TC = (hex: string): ColorSpec => ({ kind: 'truecolor', hex })

const TRAFFIC = THRESHOLD_TEMPLATES.traffic
const TRAFFIC_INV = THRESHOLD_TEMPLATES['traffic-inv']

const FULL = MOCK_SCENARIOS_BY_ID.full
const EARLY = MOCK_SCENARIOS_BY_ID['early-null']

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T

function seg(id: string, over: Partial<SegmentConfig> = {}): SegmentConfig {
  return { id, enabled: true, icon: false, color: { kind: 'default' }, ...over }
}

function cfg(mode: BuilderConfig['mode'], over: Partial<BuilderConfig>): BuilderConfig {
  return {
    version: 1,
    mode,
    separator: { kind: 'preset', value: '|' },
    lastArrowCap: true,
    segments: [],
    ...over,
  }
}

/** FULL 派生 scenario（clone 後突變；shell/env 沿用 FULL）。 */
function fullWith(mutate: (d: StatusData) => void = () => {}): ByteExactScenario {
  const data = clone(FULL.data)
  mutate(data)
  return { data, shell: FULL.shell, env: FULL.env }
}

/** 指定 mock 情境派生（原樣、無突變）。 */
function fromMock(base: (typeof MOCK_SCENARIOS_BY_ID)[keyof typeof MOCK_SCENARIOS_BY_ID]): ByteExactScenario {
  return { data: clone(base.data), shell: base.shell, env: base.env }
}

export const GOLDEN_CASES: readonly GoldenCase[] = [
  // ── SP-5 三情境（byte-exact 已由 sp5/harness.mjs 對手寫 join 證實；此處
  //    改由 emitBash 產出、cap=true 一態簽黃金；cap 兩態於測試另跑） ──
  {
    name: 'sp5-a-powerline',
    config: cfg('powerline', {
      segments: [
        seg('model', { color: A(226) }),
        seg('session-name', { color: A(99) }),
        seg('context-used', { color: A(240), threshold: TRAFFIC }),
      ],
    }),
    // 中段條件隱藏（刪 session_name）＋鄰段閾值 bg（used=100→桶9）。
    scenario: fullWith((d) => {
      delete d.session_name
      d.context_window.used_percentage = 100
    }),
  },
  {
    name: 'sp5-b-powerline',
    config: cfg('powerline', {
      segments: [
        seg('model', { color: A(226) }),
        seg('rate-5h', { color: A(240), threshold: TRAFFIC }),
        seg('cost', { color: A(16) }),
      ],
    }),
    // 存活 dash-null 段夾中段（five_hour=null→'--' 退主色）＋cost=0.5。
    scenario: fullWith((d) => {
      d.rate_limits!.five_hour!.used_percentage = null
      d.cost.total_cost_usd = 0.5
    }),
  },
  {
    name: 'sp5-c-plain',
    config: cfg('plain', {
      segments: [
        seg('model'),
        seg('session-name', { prefix: '[s]', icon: true, color: A(99) }),
        seg('cost'),
      ],
    }),
    // prefix＋icon 段 value null（EARLY 無 session_name）→ 整段剔除無懸空前綴。
    scenario: fromMock(EARLY),
  },

  // ── plain 滿配（canonical）：涵蓋所有 jq 格式化 FormatKind＋閾值分裂 ──
  {
    name: 'plain-rich',
    config: cfg('plain', {
      separator: { kind: 'preset', value: '·' },
      segments: [
        seg('cwd', { variant: 'tilde', color: A(250) }),
        seg('version', {}),
        seg('cost', { color: A(82) }),
        seg('duration', { color: A(118) }),
        seg('context-size', { color: A(154) }),
        seg('lines-changed', { color: A(190) }),
        seg('pr', { color: TC('#ff8800') }),
        seg('repo', { color: A(45) }),
        seg('thinking', { color: A(220), icon: true }),
        // prefix＋icon＋閾值 → plain 分裂兩 run（head 主色、value 桶色）。
        seg('context-remaining', { prefix: 'R', icon: true, color: A(214), threshold: TRAFFIC_INV }),
      ],
    }),
    scenario: fullWith(),
  },

  // ── powerline＋閾值（canonical）：箭頭交接＋auto-fg＋fgOverride＋dash ──
  {
    name: 'powerline-rich',
    config: cfg('powerline', {
      segments: [
        seg('model', { color: A(226), icon: true }),
        seg('cwd', { variant: 'basename', color: A(24) }),
        seg('cost', { color: A(16) }),
        seg('context-used', { color: A(240), threshold: TRAFFIC, fgOverride: A(15) }),
        seg('rate-7d', { color: A(99) }),
        seg('repo', { color: TC('#334455') }),
      ],
    }),
    scenario: fullWith(),
  },

  // ── escaping（契約 6）：使用者前綴／自訂分隔符含 `'`／`$(…)`／`!` ──
  {
    name: 'escaping',
    config: cfg('plain', {
      separator: { kind: 'custom', value: "'" },
      segments: [
        seg('model', { prefix: "'$(x)", color: A(226) }),
        seg('version', { prefix: 'a!b' }),
      ],
    }),
    scenario: fullWith(),
  },

  // ── shell-out（golden-only）：git-branch／git-dirty／clock 的防禦包裹 ──
  {
    name: 'shellout',
    config: cfg('plain', {
      segments: [
        seg('model', { color: A(226) }),
        seg('git-branch', { color: A(46), icon: true }),
        seg('git-dirty', { color: A(196), icon: true }),
        seg('clock', { color: A(33), icon: true }),
      ],
    }),
    // 無 scenario：真 git/date 非決定論，只作腳本文字人審。
  },
]
