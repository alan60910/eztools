/**
 * S5-T2.2（magi/05-statusline-builder/PLAN.md §產生器契約 4／契約 3／
 * 契約 5／§D2／§D3／§預覽契約）：resolve 兩趟演算法——存活判定在
 * value、composition 單源、C1 組合（{plain,powerline}×{隱藏位置}×
 * 閾值邊界×lastArrowCap 兩態）、dash-null bg 退主色、箭頭交接、
 * resets 後綴、aria-label 組裝（零 PUA＋負向 enforcement，.t17 §4 形）。
 * SP-5 三情境（a 中段隱藏＋鄰段閾值 bg／b 存活 dash-null 夾中段×cap
 * 兩態／c prefix＋icon 段 value null）在此先以 oracle byte 釘住，
 * T2.3 真跑兩 shell 對同一輸出比對。
 */
import { describe, expect, it } from 'vitest'
import type { ColorSpec } from './color.js'
import type { BuilderConfig, SegmentConfig } from './config.js'
import { toAnsi } from './emit-ansi.js'
import {
  MOCK_SCENARIOS_BY_ID,
  type MockScenario,
  type MockShellChannel,
} from './mock-data.js'
import {
  containsPua,
  DASH_TEXT,
  POWERLINE_ARROW,
  resolve,
  toAriaLabel,
  type ResolveInput,
} from './resolve.js'
import {
  DESCRIPTORS_BY_ID,
  formatCost,
  type SegmentId,
  type StatusData,
} from './segments.js'
import { autoFgBuckets, THRESHOLD_TEMPLATES } from './threshold.js'

const FULL = MOCK_SCENARIOS_BY_ID['full']
const EARLY = MOCK_SCENARIOS_BY_ID['early-null']
const COND = MOCK_SCENARIOS_BY_ID['conditional-absent']
const WIN = MOCK_SCENARIOS_BY_ID['windows-cjk']

const A = (index: number): ColorSpec => ({ kind: 'ansi256', index })
const TC = (hex: string): ColorSpec => ({ kind: 'truecolor', hex })
const TRAFFIC = THRESHOLD_TEMPLATES.traffic
const glyph = (id: SegmentId): string => DESCRIPTORS_BY_ID[id].icon.glyph

function seg(id: string, over: Partial<SegmentConfig> = {}): SegmentConfig {
  return { id, enabled: true, icon: false, color: { kind: 'default' }, ...over }
}

function cfg(over: Partial<BuilderConfig> = {}): BuilderConfig {
  const mode = over.mode ?? 'plain'
  return {
    version: 2,
    mode,
    separator: { kind: 'preset', value: '|' },
    lastArrowCap: true,
    powerlineArrow: mode === 'powerline',
    segments: [],
    ...over,
  }
}

/** canonical 情境為底、深拷貝改 data（mock 深凍結不可變；情境本身可整顆直傳 resolve）。 */
function inputWith(base: MockScenario, mutate: (d: StatusData) => void): ResolveInput {
  const data = JSON.parse(JSON.stringify(base.data)) as StatusData
  mutate(data)
  return { data, shell: base.shell, env: base.env }
}

function inputShell(base: MockScenario, shell: Partial<MockShellChannel>): ResolveInput {
  return { data: base.data, shell: { ...base.shell, ...shell }, env: base.env }
}

/** 本地時區構造 epoch 秒（formatResetsAt 亦走本地時分——斷言不依賴 CI 時區）。 */
const epochAt = (hours: number, minutes: number): number =>
  Math.floor(new Date(2026, 6, 8, hours, minutes).getTime() / 1000)

// ── 段內 composition（契約 4 單源） ──

describe('段內 composition', () => {
  it('plain 單段：text＋fg（ansi256）', () => {
    const runs = resolve(cfg({ segments: [seg('model', { color: A(196) })] }), FULL)
    expect(runs).toEqual([{ text: 'Fable 5', fg: { kind: 'ansi256', index: 196 } }])
  })

  it('default 色不落 run 屬性（正規形）', () => {
    const runs = resolve(cfg({ segments: [seg('model')] }), FULL)
    expect(runs).toEqual([{ text: 'Fable 5' }])
    expect('fg' in runs[0]).toBe(false)
    expect('bg' in runs[0]).toBe(false)
  })

  it('composition 順序 prefix + icon-glyph + 空格 + value；aria＝glyph 機械代換', () => {
    const runs = resolve(cfg({ segments: [seg('model', { prefix: 'M:', icon: true })] }), FULL)
    expect(runs).toEqual([
      { text: `M:${glyph('model')} Fable 5`, ariaText: 'M:模型 Fable 5' },
    ])
  })

  it('truecolor fg → 38;2;r;g;b bytes', () => {
    const runs = resolve(cfg({ segments: [seg('model', { color: TC('#1a2b3c') })] }), FULL)
    expect(toAnsi(runs)).toBe('\x1b[0m\x1b[38;2;26;43;60mFable 5\x1b[0m')
  })
})

// ── 存活判定在 value（契約 4／契約 3 null 三態） ──

describe('存活判定在 value', () => {
  it('prefix＋icon 段 value null → 整段剔除，無懸空前綴（SP-5 情境 c）', () => {
    const ghost = cfg({
      segments: [
        seg('model'),
        seg('session-name', { prefix: '[s]', icon: true, color: A(99) }),
        seg('cost'),
      ],
    })
    const bare = cfg({ segments: [seg('model'), seg('cost')] })
    expect(resolve(ghost, EARLY).map((r) => r.text)).toEqual(['Sonnet 5', '|', '$0.0000'])
    expect(toAnsi(resolve(ghost, EARLY))).toBe(toAnsi(resolve(bare, EARLY)))
  })

  it('prefix＋icon 段 value null → 整段剔除（powerline 同構）', () => {
    const ghost = cfg({
      mode: 'powerline',
      segments: [
        seg('model', { color: A(226) }),
        seg('session-name', { prefix: '[s]', icon: true, color: A(99) }),
        seg('cost', { color: A(16) }),
      ],
    })
    const bare = cfg({
      mode: 'powerline',
      segments: [seg('model', { color: A(226) }), seg('cost', { color: A(16) })],
    })
    expect(toAnsi(resolve(ghost, EARLY))).toBe(toAnsi(resolve(bare, EARLY)))
  })

  it('hide 政策：條件段缺席 → 剔除', () => {
    const config = cfg({ segments: [seg('effort'), seg('vim-mode'), seg('agent-name')] })
    expect(resolve(config, COND)).toEqual([])
    expect(resolve(config, FULL).map((r) => r.text)).toEqual(['high', '|', 'NORMAL', '|', 'reviewer'])
  })

  it('empty 政策：thinking false 剔除、true → on（契約 3 刻意選擇）', () => {
    const config = cfg({ segments: [seg('thinking')] })
    expect(resolve(config, EARLY)).toEqual([])
    expect(resolve(config, FULL)).toEqual([{ text: 'on' }])
  })

  it('shell 通道死值：非 git（branch ""）／乾淨（dirty false）剔除；存活形＝DEV／*', () => {
    const config = cfg({ segments: [seg('git-branch'), seg('git-dirty')] })
    expect(resolve(config, COND)).toEqual([])
    expect(resolve(config, FULL).map((r) => r.text)).toEqual(['DEV', '|', '*'])
  })

  it('dash 政策：null 存活顯 "--"；0% 存活（0 非死值）', () => {
    const config = cfg({ segments: [seg('context-used')] })
    expect(resolve(config, EARLY)).toEqual([{ text: DASH_TEXT }])
    const zero = inputWith(FULL, (d) => {
      d.context_window.used_percentage = 0
    })
    expect(resolve(config, zero)).toEqual([{ text: '0%' }])
  })

  it('clock：shell 通道恆活、HH:mm 零填補', () => {
    expect(resolve(cfg({ segments: [seg('clock')] }), FULL)).toEqual([{ text: '09:05' }])
    expect(
      resolve(cfg({ segments: [seg('clock')] }), inputShell(FULL, { clock: { hours: 0, minutes: 0 } })),
    ).toEqual([{ text: '00:00' }])
  })
})

// ── C1：plain join（隱藏位置×分隔符） ──

describe('plain join', () => {
  const trio = (ids: string[]) => cfg({ segments: ids.map((id) => seg(id)) })

  it('中段隱藏：無雙分隔符（byte 級）', () => {
    const runs = resolve(trio(['model', 'session-name', 'cost']), EARLY)
    expect(toAnsi(runs)).toBe('\x1b[0mSonnet 5\x1b[0m|\x1b[0m$0.0000\x1b[0m')
  })

  it('首段隱藏：無 leading 分隔符', () => {
    const runs = resolve(trio(['session-name', 'model', 'cost']), EARLY)
    expect(runs.map((r) => r.text)).toEqual(['Sonnet 5', '|', '$0.0000'])
  })

  it('末段隱藏：無 trailing 分隔符', () => {
    const runs = resolve(trio(['model', 'cost', 'session-name']), EARLY)
    expect(runs.map((r) => r.text)).toEqual(['Sonnet 5', '|', '$0.0000'])
  })

  it('全隱藏 → []；toAnsi 恆出行尾 reset', () => {
    const runs = resolve(trio(['session-name', 'vim-mode', 'agent-name']), EARLY)
    expect(runs).toEqual([])
    expect(toAnsi(runs)).toBe('\x1b[0m')
  })

  it('分隔符 run 形＝{text, ariaText:""}（純裝飾，不著色）', () => {
    const runs = resolve(trio(['model', 'cost']), EARLY)
    expect(runs[1]).toEqual({ text: '|', ariaText: '' })
  })

  it('custom 分隔符：空字串＝直接串接（無分隔 run）；非空照 value', () => {
    const empty = cfg({
      separator: { kind: 'custom', value: '' },
      segments: [seg('model'), seg('cost')],
    })
    expect(resolve(empty, EARLY).map((r) => r.text)).toEqual(['Sonnet 5', '$0.0000'])
    const custom = cfg({
      separator: { kind: 'custom', value: ' >> ' },
      segments: [seg('model'), seg('cost')],
    })
    expect(resolve(custom, EARLY).map((r) => r.text)).toEqual(['Sonnet 5', ' >> ', '$0.0000'])
  })
})

// ── C1：powerline join（箭頭交接×lastArrowCap 兩態） ──

describe('powerline join', () => {
  it('三段交接：箭頭 fg=前段bg、bg=後段bg；段 fg=auto-fg；cap fg=末段bg', () => {
    const config = cfg({
      mode: 'powerline',
      segments: [
        seg('model', { color: A(226) }),
        seg('git-branch', { color: A(240) }),
        seg('cost', { color: TC('#112233') }),
      ],
    })
    expect(resolve(config, FULL)).toEqual([
      { text: 'Fable 5', fg: { kind: 'ansi256', index: 16 }, bg: { kind: 'ansi256', index: 226 } },
      {
        text: POWERLINE_ARROW,
        ariaText: '',
        fg: { kind: 'ansi256', index: 226 },
        bg: { kind: 'ansi256', index: 240 },
      },
      { text: 'DEV', fg: { kind: 'ansi256', index: 231 }, bg: { kind: 'ansi256', index: 240 } },
      {
        text: POWERLINE_ARROW,
        ariaText: '',
        fg: { kind: 'ansi256', index: 240 },
        bg: { kind: 'truecolor', hex: '#112233' },
      },
      {
        text: formatCost(3.3341),
        fg: { kind: 'truecolor', hex: '#ffffff' },
        bg: { kind: 'truecolor', hex: '#112233' },
      },
      { text: POWERLINE_ARROW, ariaText: '', fg: { kind: 'truecolor', hex: '#112233' } },
    ])
  })

  it('lastArrowCap=false：無收尾箭頭', () => {
    const config = cfg({
      mode: 'powerline',
      lastArrowCap: false,
      segments: [seg('model', { color: A(226) }), seg('cost', { color: A(16) })],
    })
    const runs = resolve(config, FULL)
    expect(runs).toHaveLength(3)
    expect(runs[runs.length - 1].text).toBe(formatCost(3.3341))
  })

  it('中段條件隱藏＋鄰段閾值 bg：箭頭跨接存活段（SP-5 情境 a，byte 級）', () => {
    const config = cfg({
      mode: 'powerline',
      segments: [
        seg('model', { color: A(226) }),
        seg('session-name', { color: A(99) }),
        seg('context-used', { threshold: TRAFFIC, color: A(240) }),
      ],
    })
    const input = inputWith(FULL, (d) => {
      delete d.session_name
      d.context_window.used_percentage = 100
    })
    expect(toAnsi(resolve(config, input))).toBe(
      '\x1b[0m\x1b[38;5;16m\x1b[48;5;226mFable 5' +
        `\x1b[0m\x1b[38;5;226m\x1b[48;5;196m${POWERLINE_ARROW}` +
        '\x1b[0m\x1b[38;5;16m\x1b[48;5;196m100%' +
        `\x1b[0m\x1b[38;5;196m${POWERLINE_ARROW}` +
        '\x1b[0m',
    )
  })

  it('存活 dash-null 段夾中段：bg 退 SegmentConfig.color、交接色恆有定義（SP-5 情境 b，cap 兩態）', () => {
    const segments = [
      seg('model', { color: A(226) }),
      seg('rate-5h', { color: A(240), threshold: TRAFFIC }),
      seg('cost', { color: A(16) }),
    ]
    const input = inputWith(FULL, (d) => {
      d.rate_limits!.five_hour!.used_percentage = null
      d.cost.total_cost_usd = 0.5
    })
    const capped = resolve(cfg({ mode: 'powerline', segments }), input)
    expect(capped).toEqual([
      { text: 'Fable 5', fg: { kind: 'ansi256', index: 16 }, bg: { kind: 'ansi256', index: 226 } },
      {
        text: POWERLINE_ARROW,
        ariaText: '',
        fg: { kind: 'ansi256', index: 226 },
        bg: { kind: 'ansi256', index: 240 },
      },
      { text: DASH_TEXT, fg: { kind: 'ansi256', index: 231 }, bg: { kind: 'ansi256', index: 240 } },
      {
        text: POWERLINE_ARROW,
        ariaText: '',
        fg: { kind: 'ansi256', index: 240 },
        bg: { kind: 'ansi256', index: 16 },
      },
      { text: '$0.5000', fg: { kind: 'ansi256', index: 231 }, bg: { kind: 'ansi256', index: 16 } },
      { text: POWERLINE_ARROW, ariaText: '', fg: { kind: 'ansi256', index: 16 } },
    ])
    expect(toAnsi(capped)).toBe(
      '\x1b[0m\x1b[38;5;16m\x1b[48;5;226mFable 5' +
        `\x1b[0m\x1b[38;5;226m\x1b[48;5;240m${POWERLINE_ARROW}` +
        '\x1b[0m\x1b[38;5;231m\x1b[48;5;240m--' +
        `\x1b[0m\x1b[38;5;240m\x1b[48;5;16m${POWERLINE_ARROW}` +
        '\x1b[0m\x1b[38;5;231m\x1b[48;5;16m$0.5000' +
        `\x1b[0m\x1b[38;5;16m${POWERLINE_ARROW}` +
        '\x1b[0m',
    )
    const uncapped = resolve(cfg({ mode: 'powerline', lastArrowCap: false, segments }), input)
    expect(uncapped).toEqual(capped.slice(0, -1))
  })

  it('首段隱藏：無 leading 箭頭', () => {
    const config = cfg({
      mode: 'powerline',
      segments: [seg('session-name', { color: A(99) }), seg('model', { color: A(226) })],
    })
    const runs = resolve(config, EARLY)
    expect(runs.map((r) => r.text)).toEqual(['Sonnet 5', POWERLINE_ARROW])
  })

  it('全隱藏（powerline）→ []＋行尾 reset', () => {
    const config = cfg({
      mode: 'powerline',
      segments: [seg('session-name'), seg('agent-name')],
    })
    expect(resolve(config, EARLY)).toEqual([])
    expect(toAnsi(resolve(config, EARLY))).toBe('\x1b[0m')
  })

  it('單段存活：cap=true 收尾箭頭、cap=false 僅段 run', () => {
    const one = [seg('model', { color: A(226) })]
    expect(
      resolve(cfg({ mode: 'powerline', segments: one }), FULL).map((r) => r.text),
    ).toEqual(['Fable 5', POWERLINE_ARROW])
    expect(
      resolve(cfg({ mode: 'powerline', lastArrowCap: false, segments: one }), FULL).map(
        (r) => r.text,
      ),
    ).toEqual(['Fable 5'])
  })

  it('default bg 段：箭頭交接色恆有定義（default＝不著色，run 無 fg/bg 屬性）', () => {
    const config = cfg({ mode: 'powerline', segments: [seg('model'), seg('cost')] })
    const runs = resolve(config, EARLY)
    expect(runs[1]).toEqual({ text: POWERLINE_ARROW, ariaText: '' })
    expect(runs[3]).toEqual({ text: POWERLINE_ARROW, ariaText: '' })
  })
})

// ── D1 gating（06a：powerlineArrow × lastArrowCap 四組合，僅 powerline） ──

describe('D1 gating（powerlineArrow × lastArrowCap）', () => {
  const two = (over: Partial<BuilderConfig>) =>
    cfg({
      mode: 'powerline',
      segments: [seg('model', { color: A(226) }), seg('cost', { color: A(16) })],
      ...over,
    })

  it.each([true, false])(
    'powerlineArrow=false（lastArrowCap=%s 無效）：無段間箭頭、無 cap、每段 value 後補一格',
    (lastArrowCap) => {
      const runs = resolve(two({ powerlineArrow: false, lastArrowCap }), FULL)
      expect(runs.map((r) => r.text)).toEqual([`Fable 5 `, `${formatCost(3.3341)} `])
      expect(runs.some((r) => r.text === POWERLINE_ARROW)).toBe(false)
    },
  )

  it('powerlineArrow=true：完整 v1 語意（箭頭生效、無 padding）；lastArrowCap 依其值決定 cap', () => {
    const capped = resolve(two({ powerlineArrow: true, lastArrowCap: true }), FULL)
    expect(capped.map((r) => r.text)).toEqual([
      'Fable 5',
      POWERLINE_ARROW,
      formatCost(3.3341),
      POWERLINE_ARROW,
    ])
    const uncapped = resolve(two({ powerlineArrow: true, lastArrowCap: false }), FULL)
    expect(uncapped.map((r) => r.text)).toEqual(['Fable 5', POWERLINE_ARROW, formatCost(3.3341)])
  })

  it('padding 併入著色 run（fg/bg 不變）、不新增裝飾 run（沉默處選擇 7）', () => {
    const runs = resolve(two({ powerlineArrow: false, lastArrowCap: true }), FULL)
    expect(runs).toEqual([
      { text: 'Fable 5 ', fg: { kind: 'ansi256', index: 16 }, bg: { kind: 'ansi256', index: 226 } },
      { text: `${formatCost(3.3341)} `, fg: { kind: 'ansi256', index: 231 }, bg: { kind: 'ansi256', index: 16 } },
    ])
  })

  it('padding 不進 ariaText（toAriaLabel 逐 chunk trim，省略較不誤導）', () => {
    const runs = resolve(
      two({ powerlineArrow: false, segments: [seg('model', { icon: true, color: A(226) })] }),
      FULL,
    )
    expect(runs[0].ariaText).toBe('模型 Fable 5')
    expect(toAriaLabel(runs)).toBe('模型 Fable 5')
  })
})

// ── 閾值（契約 5＋D2 成對 auto-fg） ──

describe('閾值', () => {
  it.each([
    [0, 46],
    [9.9, 46],
    [10, 82],
    [42.5, 190],
    [100, 196],
    [105, 196],
  ])('plain：p=%f → 桶色 ansi256 %i 作用於 fg', (p, colorIndex) => {
    const config = cfg({ segments: [seg('context-used', { threshold: TRAFFIC, color: A(240) })] })
    const input = inputWith(FULL, (d) => {
      d.context_window.used_percentage = p
    })
    expect(resolve(config, input)).toEqual([
      { text: `${Math.floor(p)}%`, fg: { kind: 'ansi256', index: colorIndex } },
    ])
  })

  it('dash-null：不套閾值色——plain fg 退主色／powerline bg 退主色＋auto-fg', () => {
    const segments = [seg('context-used', { threshold: TRAFFIC, color: A(240) })]
    expect(resolve(cfg({ segments }), EARLY)).toEqual([
      { text: DASH_TEXT, fg: { kind: 'ansi256', index: 240 } },
    ])
    expect(resolve(cfg({ mode: 'powerline', lastArrowCap: false, segments }), EARLY)).toEqual([
      { text: DASH_TEXT, fg: { kind: 'ansi256', index: 231 }, bg: { kind: 'ansi256', index: 240 } },
    ])
  })

  it('plain 閾值＋head 非空 → 兩 run：head 隨段主色、value 隨桶色', () => {
    const config = cfg({
      segments: [
        seg('context-used', { prefix: 'ctx ', icon: true, threshold: TRAFFIC, color: A(45) }),
      ],
    })
    expect(resolve(config, FULL)).toEqual([
      {
        text: `ctx ${glyph('context-used')} `,
        ariaText: 'ctx 上下文已用',
        fg: { kind: 'ansi256', index: 45 },
      },
      { text: '42%', fg: { kind: 'ansi256', index: 190 } },
    ])
  })

  it('powerline 閾值：bg=桶色、fg=成對 auto-fg（執行期零亮度數學）', () => {
    const config = cfg({
      mode: 'powerline',
      lastArrowCap: false,
      segments: [seg('context-used', { threshold: TRAFFIC, color: A(240) })],
    })
    const at = (p: number) =>
      resolve(
        config,
        inputWith(FULL, (d) => {
          d.context_window.used_percentage = p
        }),
      )
    expect(at(100)).toEqual([
      { text: '100%', fg: { kind: 'ansi256', index: 16 }, bg: { kind: 'ansi256', index: 196 } },
    ])
    expect(at(5)).toEqual([
      { text: '5%', fg: { kind: 'ansi256', index: 16 }, bg: { kind: 'ansi256', index: 46 } },
    ])
  })

  it('powerline fgOverride：全桶用 override（autoFgBuckets 同構）', () => {
    const config = cfg({
      mode: 'powerline',
      lastArrowCap: false,
      segments: [seg('context-used', { threshold: TRAFFIC, fgOverride: A(201), color: A(240) })],
    })
    const input = inputWith(FULL, (d) => {
      d.context_window.used_percentage = 100
    })
    expect(resolve(config, input)).toEqual([
      { text: '100%', fg: { kind: 'ansi256', index: 201 }, bg: { kind: 'ansi256', index: 196 } },
    ])
    expect(autoFgBuckets(TRAFFIC, A(201))[9]).toEqual({ kind: 'ansi256', index: 201 })
  })

  it('非 percentage 段掛 threshold → 忽略（不分裂、不套桶色）', () => {
    const config = cfg({
      segments: [seg('model', { icon: true, threshold: TRAFFIC, color: A(27) })],
    })
    const runs = resolve(config, FULL)
    expect(runs).toHaveLength(1)
    expect(runs[0].fg).toEqual({ kind: 'ansi256', index: 27 })
  })
})

// ── resets 後綴（rate 段 variant） ──

describe('resets 後綴', () => {
  const rateAt = (
    over: Partial<SegmentConfig>,
    mutate: (d: StatusData) => void,
  ) => resolve(cfg({ segments: [seg('rate-5h', over)] }), inputWith(FULL, mutate))

  it('percent-reset＋resets_at 非 null → 主值後附 " (HH:mm)"', () => {
    const runs = rateAt({ variant: 'percent-reset' }, (d) => {
      d.rate_limits!.five_hour!.used_percentage = 63.2
      d.rate_limits!.five_hour!.resets_at = epochAt(14, 30)
    })
    expect(runs).toEqual([{ text: '63% (14:30)' }])
  })

  it('variant 缺省＝percent：不附後綴（resets_at 在亦不附）', () => {
    expect(resolve(cfg({ segments: [seg('rate-5h')] }), FULL)).toEqual([{ text: '63%' }])
  })

  it('percent-reset＋resets_at null → 後綴剔除', () => {
    expect(resolve(cfg({ segments: [seg('rate-7d', { variant: 'percent-reset' })] }), WIN)).toEqual([
      { text: '88%' },
    ])
  })

  it('dash＋後綴共存："-- (HH:mm)"（後綴獨立於主值，沉默處選擇 3）', () => {
    const runs = rateAt({ variant: 'percent-reset' }, (d) => {
      d.rate_limits!.five_hour!.used_percentage = null
      d.rate_limits!.five_hour!.resets_at = epochAt(9, 5)
    })
    expect(runs).toEqual([{ text: '-- (09:05)' }])
  })

  it('閾值分裂時後綴隨值色（value run 一體）', () => {
    const runs = resolve(
      cfg({
        segments: [
          seg('rate-5h', {
            icon: true,
            variant: 'percent-reset',
            threshold: TRAFFIC,
            color: A(240),
          }),
        ],
      }),
      inputWith(FULL, (d) => {
        d.rate_limits!.five_hour!.used_percentage = 63.2
        d.rate_limits!.five_hour!.resets_at = epochAt(14, 30)
      }),
    )
    expect(runs).toEqual([
      {
        text: `${glyph('rate-5h')} `,
        ariaText: '5 小時限額',
        fg: { kind: 'ansi256', index: 240 },
      },
      { text: '63% (14:30)', fg: { kind: 'ansi256', index: 220 } },
    ])
  })
})

// ── path variants／env 通道 ──

describe('path／env 通道', () => {
  it('tilde 用 env.home 縮寫', () => {
    expect(resolve(cfg({ segments: [seg('cwd', { variant: 'tilde' })] }), FULL)).toEqual([
      { text: '~/projects/eztools' },
    ])
  })

  it('basename：反斜線＋CJK 路徑', () => {
    expect(resolve(cfg({ segments: [seg('cwd', { variant: 'basename' })] }), WIN)).toEqual([
      { text: 'eztools 工作區' },
    ])
  })
})

// ── aria-label（§預覽契約；.t17 §4 形） ──

describe('toAriaLabel', () => {
  it('icons 全開＋powerline：零 PUA、箭頭不進 label、.t17 形', () => {
    const config = cfg({
      mode: 'powerline',
      segments: [
        seg('model', { icon: true, color: A(27) }),
        seg('cwd', { icon: true, variant: 'tilde', color: A(33) }),
        seg('git-branch', { icon: true, color: A(99) }),
        seg('context-used', { icon: true, threshold: TRAFFIC, color: A(240) }),
        seg('cost', { color: A(226) }),
      ],
    })
    const runs = resolve(config, FULL)
    const label = toAriaLabel(runs)
    expect(label).toBe(
      `模型 Fable 5 目前目錄 ~/projects/eztools 分支 DEV 上下文已用 42% ${formatCost(3.3341)}`,
    )
    expect(containsPua(label)).toBe(false)
    expect(label).not.toContain(POWERLINE_ARROW)
    expect(runs[0].ariaText).toBe('模型 Fable 5')
  })

  it('plain：分隔符（ariaText=""）不進 label；純文字 run fallback text', () => {
    const runs = resolve(cfg({ segments: [seg('model'), seg('cost')] }), EARLY)
    expect(toAriaLabel(runs)).toBe('Sonnet 5 $0.0000')
  })

  it('dash 值以字面 "--" 進 label（值的文字等價）', () => {
    const runs = resolve(cfg({ segments: [seg('context-used', { icon: true })] }), EARLY)
    expect(toAriaLabel(runs)).toBe('上下文已用 --')
  })

  it('空 runs → ""；全空白 fallback chunk 剔除', () => {
    expect(toAriaLabel([])).toBe('')
    expect(toAriaLabel([{ text: '   ' }])).toBe('')
  })

  it('負向：PUA run 省略 ariaText → TypeError（fallback 僅限純文字 run；PUA_RE 行為未變——06a icon' +
    ' emoji 化後 segment glyph 不再是 PUA，改用 POWERLINE_ARROW 驗證 PUA_RE 本身，見 PLAN D1 Round 2）', () => {
    expect(() => toAriaLabel([{ text: `${POWERLINE_ARROW} DEV` }])).toThrow(TypeError)
  })

  it('負向：顯式 ariaText 夾帶 PUA → TypeError（結果零 PUA 機械斷言）', () => {
    expect(() => toAriaLabel([{ text: 'x', ariaText: POWERLINE_ARROW }])).toThrow(TypeError)
  })

  it('正向（06a D1 Round 2）：emoji 前綴放行——不觸發 PUA enforcement（validate.ts 明文放行政策不變）', () => {
    // icon run：glyph 已 emoji 化（06a）、顯式 ariaText（resolve 實際產生形）——不拋。
    const iconRun = { text: `${glyph('git-branch')} DEV`, ariaText: '分支 DEV' }
    expect(() => toAriaLabel([iconRun])).not.toThrow()
    expect(toAriaLabel([iconRun])).toBe('分支 DEV')
    // 純文字 run：省略 ariaText、text 含 emoji 前綴——containsPua 對 emoji 恆 false（emoji 碼位不落
    // PUA_RE 涵蓋的 BMP／補充私用平面區段），走 fallback text，不拋。
    const plainRun = { text: `${glyph('model')} 待辦事項` }
    expect(() => toAriaLabel([plainRun])).not.toThrow()
    expect(toAriaLabel([plainRun])).toBe(`${glyph('model')} 待辦事項`)
  })
})

// ── 防禦邊界 ──

describe('防禦邊界', () => {
  it('未知 segment id → TypeError（config 應先經清洗）', () => {
    expect(() => resolve(cfg({ segments: [seg('nope')] }), FULL)).toThrow(TypeError)
  })

  it('停用段不參與', () => {
    expect(resolve(cfg({ segments: [seg('model', { enabled: false })] }), FULL)).toEqual([])
  })

  it('深凍結 mock 情境可整顆直傳；重複呼叫等值（純函式）', () => {
    const config = cfg({
      segments: [seg('model'), seg('context-used', { threshold: TRAFFIC, color: A(240) })],
    })
    expect(resolve(config, FULL)).toEqual(resolve(config, FULL))
  })
})
