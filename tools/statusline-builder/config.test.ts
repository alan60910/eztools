/**
 * S5-T1.3（magi/05-statusline-builder/PLAN.md §型別契約 config 清洗
 * 註解／§Verification 1）：defaultConfig 工廠、serialize/deserialize
 * roundtrip、drop-unknown-and-continue 全類（未知 id／variant／欄、
 * 越界色、壞 hex、桶數 8/12、separator/prefix 驗證退預設）、目錄變動
 * 對帳（舊 config×新目錄）、v1→v2 遷移（powerlineArrow 派生）、其他
 * 版本 0/3 重置、清洗冪等。
 *
 * catalog 為假目錄注入（segments.ts 於 M2 才建立——契約即為此設計）。
 */
import { describe, expect, it } from 'vitest'
import { type ColorSpec } from './color.js'
import { THRESHOLD_TEMPLATES, type ThresholdBuckets } from './threshold.js'
import {
  CONFIG_VERSION,
  defaultConfig,
  defaultSegmentConfig,
  deserializeConfig,
  SEPARATOR_PRESETS,
  serializeConfig,
  type BuilderConfig,
  type SegmentCatalog,
} from './config.js'

const ansi = (index: number): ColorSpec => ({ kind: 'ansi256', index })

const CATALOG: SegmentCatalog = {
  ids: ['model', 'cwd', 'context-used', 'git-branch'],
  variantsById: { cwd: ['full', 'basename', 'tilde'] },
}

/** 有效且含全部選填欄的滿配 config（覆蓋 catalog 全 id、非目錄序）。 */
function fullConfig(): BuilderConfig {
  return {
    version: 2,
    mode: 'powerline',
    separator: { kind: 'preset', value: '›' },
    lastArrowCap: false,
    powerlineArrow: true,
    segments: [
      {
        id: 'context-used',
        enabled: true,
        icon: true,
        prefix: 'CTX ',
        color: ansi(137),
        fgOverride: { kind: 'truecolor', hex: '#000000' },
        threshold: {
          buckets: [
            ansi(46), ansi(82), ansi(118), ansi(154), ansi(190),
            { kind: 'truecolor', hex: '#ffaf00' }, { kind: 'default' },
            ansi(208), ansi(202), ansi(196),
          ] as unknown as ThresholdBuckets,
        },
      },
      {
        id: 'cwd',
        enabled: true,
        icon: false,
        color: { kind: 'truecolor', hex: '#5f87af' },
        variant: 'basename',
      },
      { id: 'git-branch', enabled: true, icon: true, color: ansi(2) },
      { id: 'model', enabled: false, icon: false, color: { kind: 'default' } },
    ],
  }
}

describe('defaultConfig 工廠', () => {
  it('version 2／plain／preset "|"／lastArrowCap true／powerlineArrow false／目錄序全列全停用', () => {
    expect(defaultConfig(CATALOG)).toEqual({
      version: 2,
      mode: 'plain',
      separator: { kind: 'preset', value: '|' },
      lastArrowCap: true,
      powerlineArrow: false,
      segments: [
        { id: 'model', enabled: false, icon: false, color: { kind: 'default' } },
        { id: 'cwd', enabled: false, icon: false, color: { kind: 'default' } },
        { id: 'context-used', enabled: false, icon: false, color: { kind: 'default' } },
        { id: 'git-branch', enabled: false, icon: false, color: { kind: 'default' } },
      ],
    })
  })

  it('預設列選填欄位確實缺席（非 undefined 值）', () => {
    const seg = defaultSegmentConfig('model')
    expect('prefix' in seg).toBe(false)
    expect('fgOverride' in seg).toBe(false)
    expect('threshold' in seg).toBe(false)
    expect('variant' in seg).toBe(false)
  })

  it('每次呼叫回傳新物件（非共享參照）', () => {
    const a = defaultConfig(CATALOG)
    const b = defaultConfig(CATALOG)
    expect(a).not.toBe(b)
    expect(a.segments[0]).not.toBe(b.segments[0])
  })

  it('CONFIG_VERSION＝2；SEPARATOR_PRESETS 正面表列', () => {
    expect(CONFIG_VERSION).toBe(2)
    expect(SEPARATOR_PRESETS).toEqual(['|', '›', '·', ' '])
  })
})

describe('serialize／deserialize roundtrip', () => {
  it('滿配 config 完整往返（含 threshold／fgOverride／variant／prefix／排序）', () => {
    const config = fullConfig()
    expect(deserializeConfig(serializeConfig(config), CATALOG)).toEqual(config)
  })

  it('custom separator（plain）往返；空字串 custom 亦合法保留', () => {
    const config: BuilderConfig = {
      ...defaultConfig(CATALOG),
      separator: { kind: 'custom', value: '→' },
    }
    expect(deserializeConfig(serializeConfig(config), CATALOG)).toEqual(config)

    const empty: BuilderConfig = {
      ...defaultConfig(CATALOG),
      separator: { kind: 'custom', value: '' },
    }
    expect(deserializeConfig(serializeConfig(empty), CATALOG)).toEqual(empty)
  })

  it('全 preset 值逐一往返', () => {
    for (const value of SEPARATOR_PRESETS) {
      const config: BuilderConfig = {
        ...defaultConfig(CATALOG),
        separator: { kind: 'preset', value },
      }
      expect(deserializeConfig(serializeConfig(config), CATALOG).separator).toEqual({
        kind: 'preset',
        value,
      })
    }
  })

  it('清洗冪等：dirty 輸入清洗一次後，再 serialize→deserialize 不再變形', () => {
    const dirty = JSON.stringify({
      version: 1,
      mode: 'powerline',
      separator: { kind: 'custom', value: 'x'.repeat(9) },
      segments: [
        { id: 'ghost', enabled: true },
        { id: 'cwd', enabled: true, variant: 'nope', color: { kind: 'ansi256', index: 999 } },
      ],
      bogusTop: true,
    })
    const once = deserializeConfig(dirty, CATALOG)
    const twice = deserializeConfig(serializeConfig(once), CATALOG)
    expect(twice).toEqual(once)
  })
})

describe('整份層級的保底（絕不丟例外）', () => {
  it.each([
    ['壞 JSON', 'not json{'],
    ['空字串', ''],
    ['JSON null', 'null'],
    ['頂層陣列', '[]'],
    ['頂層字串', '"config"'],
    ['頂層數字', '42'],
  ])('%s → 預設 config', (_name, json) => {
    expect(deserializeConfig(json, CATALOG)).toEqual(defaultConfig(CATALOG))
  })

  it('version∉{1,2}（v1 專用遷移之外的其他版本）→ 重置：0／3／"2" 字串／缺欄', () => {
    for (const version of [0, 3, '2', undefined]) {
      const json = JSON.stringify({ version, mode: 'powerline', segments: [] })
      expect(deserializeConfig(json, CATALOG), `version=${String(version)}`).toEqual(
        defaultConfig(CATALOG),
      )
    }
  })

  it('version=1 但其餘全壞 → 逐欄退預設＋powerlineArrow false，等同預設 config（不整份拒收）', () => {
    const json = JSON.stringify({ version: 1, mode: 9, separator: null, segments: 'nope' })
    const result = deserializeConfig(json, CATALOG)
    expect(result).toEqual(defaultConfig(CATALOG))
    expect(result.powerlineArrow).toBe(false)
  })
})

describe('v2 遷移（migrateConfig：v1→v2 powerlineArrow 派生／其他版本重置）', () => {
  it('v1 mode:"powerline" → powerlineArrow true（保留既有箭頭觀感）', () => {
    const json = JSON.stringify({ version: 1, mode: 'powerline', segments: [] })
    const result = deserializeConfig(json, CATALOG)
    expect(result.version).toBe(2)
    expect(result.mode).toBe('powerline')
    expect(result.powerlineArrow).toBe(true)
  })

  it('v1 mode:"plain" → powerlineArrow false', () => {
    const json = JSON.stringify({ version: 1, mode: 'plain', segments: [] })
    const result = deserializeConfig(json, CATALOG)
    expect(result.mode).toBe('plain')
    expect(result.powerlineArrow).toBe(false)
  })

  it('v1 缺 mode 欄 → 退 plain／powerlineArrow false', () => {
    const json = JSON.stringify({ version: 1, segments: [] })
    const result = deserializeConfig(json, CATALOG)
    expect(result.mode).toBe('plain')
    expect(result.powerlineArrow).toBe(false)
  })

  it('v1 損壞存檔（mode 非法值／segments 壞形）→ 各欄退預設＋powerlineArrow false（不整份拒收）', () => {
    const json = JSON.stringify({
      version: 1,
      mode: { nested: true },
      separator: 42,
      segments: [{ id: 'ghost' }, 42, null],
    })
    const result = deserializeConfig(json, CATALOG)
    expect(result.mode).toBe('plain')
    expect(result.powerlineArrow).toBe(false)
    expect(result.separator).toEqual({ kind: 'preset', value: '|' })
    expect(result.segments.map((s) => s.id).sort()).toEqual([...CATALOG.ids].sort())
  })

  it('version 0／3／"1" 字串／缺欄 → 完整重置（無前代 schema 可依，非 v1 專用遷移）', () => {
    for (const version of [0, 3, '1', undefined]) {
      const json = JSON.stringify({ version, mode: 'powerline', powerlineArrow: true, segments: [] })
      expect(deserializeConfig(json, CATALOG), `version=${String(version)}`).toEqual(
        defaultConfig(CATALOG),
      )
    }
  })

  it('v2 sanitize 冪等：dirty v2 存檔清洗一次後，再 serialize→deserialize 不再變形', () => {
    const dirty = JSON.stringify({
      version: 2,
      mode: 'powerline',
      separator: { kind: 'custom', value: 'x'.repeat(9) },
      powerlineArrow: 'yes', // 非布林 → false
      segments: [{ id: 'ghost', enabled: true }],
      bogusTop: true,
    })
    const once = deserializeConfig(dirty, CATALOG)
    expect(once.powerlineArrow).toBe(false)
    const twice = deserializeConfig(serializeConfig(once), CATALOG)
    expect(twice).toEqual(once)
  })

  it('v2 powerlineArrow 非布林（字串／數字／缺欄）→ false；true 保留', () => {
    for (const powerlineArrow of ['yes', 1, undefined]) {
      const json = JSON.stringify({ version: 2, mode: 'plain', powerlineArrow, segments: [] })
      expect(deserializeConfig(json, CATALOG).powerlineArrow, String(powerlineArrow)).toBe(false)
    }
    const json = JSON.stringify({ version: 2, mode: 'powerline', powerlineArrow: true, segments: [] })
    expect(deserializeConfig(json, CATALOG).powerlineArrow).toBe(true)
  })
})

describe('舊 config × 目錄變動（drop-unknown＋缺段補列）', () => {
  it('未知 id 丟棄、目錄新增段依目錄序補於末、存檔排序保留', () => {
    const old = JSON.stringify({
      version: 1,
      mode: 'plain',
      separator: { kind: 'preset', value: '|' },
      lastArrowCap: true,
      segments: [
        { id: 'legacy-gone', enabled: true, icon: false, color: { kind: 'default' } },
        { id: 'git-branch', enabled: true, icon: false, color: { kind: 'default' } },
        { id: 'model', enabled: true, icon: false, color: { kind: 'default' } },
      ],
    })
    const result = deserializeConfig(old, CATALOG)
    expect(result.segments.map((s) => s.id)).toEqual([
      'git-branch', 'model', // 存檔序保留（legacy-gone 已丟）
      'cwd', 'context-used', // 缺段依目錄序補列於末
    ])
    expect(result.segments[0]!.enabled).toBe(true)
    expect(result.segments[2]).toEqual(defaultSegmentConfig('cwd'))
  })

  it('重複 id 取首見', () => {
    const json = JSON.stringify({
      version: 1,
      segments: [
        { id: 'model', enabled: true },
        { id: 'model', enabled: false, prefix: 'dup' },
      ],
    })
    const segments = deserializeConfig(json, CATALOG).segments
    expect(segments.filter((s) => s.id === 'model')).toHaveLength(1)
    expect(segments[0]!.enabled).toBe(true)
    expect('prefix' in segments[0]!).toBe(false)
  })

  it('segments 缺欄／非陣列 → 目錄全列預設', () => {
    const json = JSON.stringify({ version: 1 })
    expect(deserializeConfig(json, CATALOG).segments).toEqual(
      CATALOG.ids.map((id) => defaultSegmentConfig(id)),
    )
  })

  it('產出恆為 catalog.ids 的排列（不多不少）', () => {
    const json = JSON.stringify({
      version: 1,
      segments: [{ id: 'ghost-a' }, { id: 'cwd' }, 42, null, { noId: true }],
    })
    const ids = deserializeConfig(json, CATALOG).segments.map((s) => s.id)
    expect([...ids].sort()).toEqual([...CATALOG.ids].sort())
    expect(ids[0]).toBe('cwd')
  })
})

describe('threshold 桶數校正（恰 10；不足補、超長截、壞桶逐桶退）', () => {
  const segWithBuckets = (buckets: unknown): string =>
    JSON.stringify({
      version: 1,
      segments: [{ id: 'context-used', enabled: true, threshold: { buckets } }],
    })

  it('8 桶 → 補 2 桶 default 至恰 10', () => {
    const eight = Array(8).fill(ansi(196))
    const th = deserializeConfig(segWithBuckets(eight), CATALOG).segments[0]!.threshold
    expect(th!.buckets).toHaveLength(10)
    expect(th!.buckets.slice(0, 8)).toEqual(eight)
    expect(th!.buckets[8]).toEqual({ kind: 'default' })
    expect(th!.buckets[9]).toEqual({ kind: 'default' })
  })

  it('12 桶 → 截斷取前 10', () => {
    const twelve = Array.from({ length: 12 }, (_, i) => ansi(i))
    const th = deserializeConfig(segWithBuckets(twelve), CATALOG).segments[0]!.threshold
    expect(th!.buckets).toHaveLength(10)
    expect(th!.buckets).toEqual(Array.from({ length: 10 }, (_, i) => ansi(i)))
  })

  it('模板陣列原樣往返（恰 10 不動）', () => {
    const th = deserializeConfig(
      segWithBuckets([...THRESHOLD_TEMPLATES.traffic.buckets]),
      CATALOG,
    ).segments[0]!.threshold
    expect(th!.buckets).toEqual(THRESHOLD_TEMPLATES.traffic.buckets)
  })

  it('壞桶逐桶退 default（未知 kind／非物件／壞 hex），好桶保留', () => {
    const mixed = [ansi(46), { kind: 'nope' }, 42, { kind: 'truecolor', hex: '#f00' }, ansi(196)]
    const th = deserializeConfig(segWithBuckets(mixed), CATALOG).segments[0]!.threshold
    expect(th!.buckets[0]).toEqual(ansi(46))
    expect(th!.buckets[1]).toEqual({ kind: 'default' })
    expect(th!.buckets[2]).toEqual({ kind: 'default' })
    expect(th!.buckets[3]).toEqual({ kind: 'default' })
    expect(th!.buckets[4]).toEqual(ansi(196))
    expect(th!.buckets).toHaveLength(10)
  })

  it('threshold 非物件／buckets 非陣列 → 整欄丟（退「無閾值」）', () => {
    for (const threshold of ['red-to-green', { buckets: 'nope' }, { template: 'traffic' }, 42]) {
      const json = JSON.stringify({
        version: 1,
        segments: [{ id: 'context-used', threshold }],
      })
      const seg = deserializeConfig(json, CATALOG).segments[0]!
      expect('threshold' in seg, JSON.stringify(threshold)).toBe(false)
    }
  })
})

describe('色值清洗（color.ts 同源）', () => {
  const segWithColor = (color: unknown, field = 'color'): string =>
    JSON.stringify({ version: 1, segments: [{ id: 'model', [field]: color }] })

  it('ansi256 越界 clamp：300→255、-5→0、小數 trunc 3.7→3', () => {
    for (const [input, expected] of [
      [300, 255],
      [-5, 0],
      [3.7, 3],
    ] as const) {
      const seg = deserializeConfig(segWithColor({ kind: 'ansi256', index: input }), CATALOG)
        .segments[0]!
      expect(seg.color).toEqual(ansi(expected))
    }
  })

  it('ansi256 index 非數字（字串／缺欄）→ 整色退 default', () => {
    for (const color of [{ kind: 'ansi256', index: '42' }, { kind: 'ansi256' }]) {
      const seg = deserializeConfig(segWithColor(color), CATALOG).segments[0]!
      expect(seg.color).toEqual({ kind: 'default' })
    }
  })

  it('壞 hex 退 default：#f00／red／#GGGGGG／裸 hex／非字串', () => {
    for (const hex of ['#f00', 'red', '#GGGGGG', 'ff0000', 42]) {
      const seg = deserializeConfig(segWithColor({ kind: 'truecolor', hex }), CATALOG)
        .segments[0]!
      expect(seg.color, String(hex)).toEqual({ kind: 'default' })
    }
  })

  it('大寫 hex 正規化為小寫保留（非拒收）', () => {
    const seg = deserializeConfig(segWithColor({ kind: 'truecolor', hex: '#AB12CD' }), CATALOG)
      .segments[0]!
    expect(seg.color).toEqual({ kind: 'truecolor', hex: '#ab12cd' })
  })

  it('未知 kind → default', () => {
    const seg = deserializeConfig(segWithColor({ kind: 'rgb', r: 1, g: 2, b: 3 }), CATALOG)
      .segments[0]!
    expect(seg.color).toEqual({ kind: 'default' })
  })

  it('fgOverride 有效保留（含 {kind:"default"} 顯式值）；無效整欄丟', () => {
    const valid = deserializeConfig(segWithColor({ kind: 'default' }, 'fgOverride'), CATALOG)
      .segments[0]!
    expect(valid.fgOverride).toEqual({ kind: 'default' })

    const invalid = deserializeConfig(
      segWithColor({ kind: 'truecolor', hex: 'bad' }, 'fgOverride'),
      CATALOG,
    ).segments[0]!
    expect('fgOverride' in invalid).toBe(false)
  })
})

describe('separator／prefix（validate.ts 驗證失敗即退預設）', () => {
  const withSeparator = (separator: unknown): string =>
    JSON.stringify({ version: 1, separator, segments: [] })

  it('preset 未知值 → 退預設 "|"', () => {
    expect(deserializeConfig(withSeparator({ kind: 'preset', value: '#' }), CATALOG).separator)
      .toEqual({ kind: 'preset', value: '|' })
  })

  it('custom 過 R（含換行／控制字元）或超長 → 退預設', () => {
    for (const value of ['a\nb', '\t', 'x'.repeat(9)]) {
      expect(
        deserializeConfig(withSeparator({ kind: 'custom', value }), CATALOG).separator,
        JSON.stringify(value),
      ).toEqual({ kind: 'preset', value: '|' })
    }
  })

  it('custom 合法（≤8 code point，含 emoji）→ 保留', () => {
    expect(deserializeConfig(withSeparator({ kind: 'custom', value: ' ⚡ ' }), CATALOG).separator)
      .toEqual({ kind: 'custom', value: ' ⚡ ' })
  })

  it('custom 帶 PUA（powerline 箭頭 U+E0B0）→ 退預設 "|"（不整份拒收）', () => {
    expect(deserializeConfig(withSeparator({ kind: 'custom', value: '\u{E0B0}' }), CATALOG).separator)
      .toEqual({ kind: 'preset', value: '|' })
  })

  it('separator 形狀不可辨（缺 value／未知 kind／非物件）→ 退預設', () => {
    for (const separator of [{ kind: 'preset' }, { kind: 'fancy', value: '|' }, '|', null]) {
      expect(deserializeConfig(withSeparator(separator), CATALOG).separator).toEqual({
        kind: 'preset',
        value: '|',
      })
    }
  })

  const withPrefix = (prefix: unknown): string =>
    JSON.stringify({ version: 1, segments: [{ id: 'model', prefix }] })

  it('prefix 合法保留；過 R（含 PUA）／超長／非字串 → 整欄丟', () => {
    expect(deserializeConfig(withPrefix('⚡M '), CATALOG).segments[0]!.prefix).toBe('⚡M ')
    // '‮evil'＝RLO bidi；'M\u{E0B0}'＝夾帶 powerline 箭頭 PUA（Important 1）。
    for (const prefix of ['a\nb', 'x'.repeat(9), 42, '‮evil', 'M\u{E0B0}']) {
      const seg = deserializeConfig(withPrefix(prefix), CATALOG).segments[0]!
      expect('prefix' in seg, JSON.stringify(prefix)).toBe(false)
    }
  })

  it('舊 config 帶 PUA 前綴 → 剔前綴、不整份拒收（重整不丟；Important 1）', () => {
    // 手改／舊版殘留／他分頁寫入的持久化 config 帶 PUA 前綴（Nerd Font glyph
    // U+E0B0）——清洗須剔除前綴（退「無前綴」）而非整份拒收，且不得讓 PUA
    // 前綴達 resolve（否則 init→toAriaLabel 擲 TypeError、整頁不可用）。
    const json = JSON.stringify({
      version: 1,
      mode: 'powerline',
      separator: { kind: 'preset', value: '›' },
      lastArrowCap: false,
      segments: [
        { id: 'model', enabled: true, icon: true, color: { kind: 'ansi256', index: 75 }, prefix: 'M\u{E0B0}' },
        { id: 'cwd', enabled: true, icon: false, color: { kind: 'default' } },
      ],
    })
    const result = deserializeConfig(json, CATALOG)
    // 整份存活：mode／separator／lastArrowCap 不因單一壞前綴被拒。
    expect(result.mode).toBe('powerline')
    expect(result.separator).toEqual({ kind: 'preset', value: '›' })
    expect(result.lastArrowCap).toBe(false)
    const model = result.segments.find((s) => s.id === 'model')!
    // segment 保留（enabled／icon／color 完好）、僅 PUA 前綴被剔。
    expect(model.enabled).toBe(true)
    expect(model.icon).toBe(true)
    expect(model.color).toEqual(ansi(75))
    expect('prefix' in model).toBe(false)
    // 產出恆為 catalog.ids 排列（重整不丟）。
    expect([...result.segments.map((s) => s.id)].sort()).toEqual([...CATALOG.ids].sort())
  })
})

describe('其餘欄位清洗', () => {
  it('mode 非法值 → plain；powerline 保留', () => {
    for (const [mode, expected] of [
      ['powerline', 'powerline'],
      ['plain', 'plain'],
      ['PLAIN', 'plain'],
      [42, 'plain'],
    ] as const) {
      const json = JSON.stringify({ version: 1, mode, segments: [] })
      expect(deserializeConfig(json, CATALOG).mode).toBe(expected)
    }
  })

  it('lastArrowCap 非布林 → true（Q1 預設收）；false 保留', () => {
    for (const [input, expected] of [
      [false, false],
      [true, true],
      ['yes', true],
      [undefined, true],
    ] as const) {
      const json = JSON.stringify({ version: 1, lastArrowCap: input, segments: [] })
      expect(deserializeConfig(json, CATALOG).lastArrowCap, String(input)).toBe(expected)
    }
  })

  it('enabled/icon 非布林 → false', () => {
    const json = JSON.stringify({
      version: 1,
      segments: [{ id: 'model', enabled: 'yes', icon: 1 }],
    })
    const seg = deserializeConfig(json, CATALOG).segments[0]!
    expect(seg.enabled).toBe(false)
    expect(seg.icon).toBe(false)
  })

  it('variant ∈ 目錄允許集保留；未知值／無 variants 之段 → 整欄丟', () => {
    const json = JSON.stringify({
      version: 1,
      segments: [
        { id: 'cwd', variant: 'basename' },
        { id: 'model', variant: 'basename' }, // model 無 variants 鍵
      ],
    })
    const [cwd, model] = deserializeConfig(json, CATALOG).segments
    expect(cwd!.variant).toBe('basename')
    expect('variant' in model!).toBe(false)

    const bad = JSON.stringify({ version: 1, segments: [{ id: 'cwd', variant: 'nope' }] })
    expect('variant' in deserializeConfig(bad, CATALOG).segments[0]!).toBe(false)
  })

  it('未知欄忽略（頂層與 segment 層皆不搬運）', () => {
    const json = JSON.stringify({
      version: 1,
      futureTopLevel: { x: 1 },
      segments: [{ id: 'model', futureField: 'x', autoFg: [1, 2, 3] }],
    })
    const result = deserializeConfig(json, CATALOG)
    expect('futureTopLevel' in result).toBe(false)
    expect('futureField' in result.segments[0]!).toBe(false)
    expect('autoFg' in result.segments[0]!).toBe(false)
  })
})
