/**
 * S5-T2.5（PLAN §產生器契約 1–12＋§格式化對等規則 ps1 面／§Verification
 * 1–3／.t23 §5,§7）：emit-ps1 產生器測試。
 *
 * 三層：
 * 1. **結構契約（跨平台）**：檔頭三行／stdin 讀入／exit-0／輸出形／PS 5.1
 *    底線（禁 `??`/`?.`/Set-StrictMode、顯式 `$null -eq`）／escaping 單引號
 *    context（`'`→`''`、`$()` 不插值）／`[double]` idiom／powerline `$ARROW`
 *    ／cap 兩態／未知 id TypeError。
 * 2. **黃金（跨平台）**：canonical config（plain 滿配／powerline+閾值+C1）→
 *    emitPs1 產出 toEqual 簽入黃金（`__golden__/*.ps1`）。**BOM 比對口徑**：
 *    黃金檔含 UTF-8 BOM（另以 Buffer 斷言首 3 bytes），文字比對時剝 BOM
 *    ＋正規化 EOL（防 autocrlf；本機 core.autocrlf=false 但防禦）；emitPs1
 *    回傳**不含 BOM**（BOM 屬檔案層職責，契約 8）。
 * 3. **端到端 byte-exact（win32-only，skipIf）**：emitPs1(config)→帶 BOM
 *    寫檔→spawn `powershell -NoProfile -ExecutionPolicy Bypass -File`（.t15
 *    生產形逐字）餵 stdin → stdout Buffer 與 `toAnsi(resolve())` byte-exact
 *    ＋exit 0。涵蓋 SP-5 a/b/c×cap 7 組合＋escaping `$()` 對抗案＋0.0029
 *    Decimal 案（證 `[double]` idiom）＋plain 滿配（非 shell-out）行為驗證。
 *    非 win32 跳過並輸出 reason。
 *
 * canonical config 與 scripts/golden-statusline-ps1.mjs 內同名 config
 * 逐字同步（golden 測試為漂移守門）。
 */
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { ColorSpec } from './color.js'
import type { BuilderConfig, SegmentConfig } from './config.js'
import { emitPs1 } from './emit-ps1.js'
import { toAnsi } from './emit-ansi.js'
import { resolve, type ResolveInput } from './resolve.js'
import { DESCRIPTORS_BY_ID, type StatusData } from './segments.js'
import { MOCK_SCENARIOS_BY_ID } from './mock-data.js'
import { THRESHOLD_TEMPLATES } from './threshold.js'

const CATALOG = DESCRIPTORS_BY_ID

// ── config 建構小工具（與 scripts/golden-statusline-ps1.mjs 逐字同步） ──

const A = (index: number): ColorSpec => ({ kind: 'ansi256', index })
const TRAFFIC = THRESHOLD_TEMPLATES.traffic
const seg = (id: string, over: Partial<SegmentConfig> = {}): SegmentConfig => ({
  id,
  enabled: true,
  icon: true,
  color: { kind: 'default' },
  ...over,
})
const cfg = (over: Partial<BuilderConfig>): BuilderConfig => {
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

// canonical config（icon 全開＝seg 預設 true）
const PLAIN_FULL: BuilderConfig = cfg({
  mode: 'plain',
  separator: { kind: 'preset', value: '|' },
  segments: [
    seg('model', { color: A(75) }),
    seg('cwd', { variant: 'tilde', prefix: '@' }),
    seg('project-dir'),
    seg('output-style'),
    seg('version', { prefix: 'v' }),
    seg('cost', { color: A(220) }),
    seg('duration'),
    seg('lines-changed'),
    seg('context-size'),
    seg('thinking'),
    seg('context-used', { threshold: TRAFFIC, prefix: "it's " }),
    seg('context-remaining'),
    seg('rate-5h', { variant: 'percent-reset' }),
    seg('rate-7d', { variant: 'percent-reset' }),
    seg('session-name', { prefix: '$(x)' }),
    seg('effort'),
    seg('vim-mode'),
    seg('agent-name'),
    seg('pr'),
    seg('repo'),
    seg('worktree'),
    seg('worktree-branch'),
    seg('git-branch'),
    seg('git-dirty'),
    seg('clock'),
  ],
})

const POWERLINE_THRESHOLD: BuilderConfig = cfg({
  mode: 'powerline',
  lastArrowCap: true,
  segments: [
    seg('model', { color: A(226) }),
    seg('session-name', { prefix: '[s]', color: A(99) }),
    seg('context-used', { threshold: TRAFFIC, color: A(240) }),
    seg('cost', { color: A(16) }),
  ],
})

// powerline＋powerlineArrow:false（MAGI code review Important #8 修復；與
// scripts/golden-statusline-ps1.mjs 內同名 config 逐字同步）：v2 預設模式
// 的完整黃金 byte 覆蓋——lastArrowCap:true 但 powerlineArrow:false → cap
// 全面無效（收尾箭頭區塊恆不 emit，證 cap 值本身不影響輸出）。段組合：
// context-used（threshold）＝閾值桶陣列段；rate-5h（無 threshold）＝dash
// 政策段；session-name／git-branch＝2 個 icon-enabled 段（pad＋emoji
// codepoint 跳脫＋無箭頭三者共存於單一 fixture）。
const POWERLINE_NOARROW: BuilderConfig = cfg({
  mode: 'powerline',
  powerlineArrow: false,
  lastArrowCap: true,
  segments: [
    seg('model', { color: A(226) }),
    seg('session-name', { prefix: '[s]', color: A(99) }),
    seg('context-used', { icon: false, threshold: TRAFFIC, color: A(240) }),
    seg('rate-5h', { icon: false, color: A(99) }),
    seg('git-branch', { color: A(46) }),
  ],
})

const GOLDENS: ReadonlyArray<{ name: string; config: BuilderConfig }> = [
  { name: 'plain-full', config: PLAIN_FULL },
  { name: 'powerline-threshold', config: POWERLINE_THRESHOLD },
  { name: 'powerline-noarrow', config: POWERLINE_NOARROW },
]

// ── 1. 結構契約（跨平台） ──

describe('檔頭與框架（契約 1／8／9）', () => {
  const script = emitPs1(POWERLINE_THRESHOLD, CATALOG)

  it('檔頭 Input/Output 雙編碼行＋$e（契約 8）', () => {
    expect(script).toContain('[Console]::InputEncoding = [System.Text.UTF8Encoding]::new($false)')
    expect(script).toContain('[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)')
    expect(script).toContain('$e = [char]27')
  })

  it('stdin 讀入 ReadToEnd | ConvertFrom-Json（契約 1）', () => {
    expect(script).toContain('[Console]::In.ReadToEnd()')
    expect(script).toContain('ConvertFrom-Json')
  })

  it('輸出 [Console]::Out.Write($out)＋結尾顯式 exit 0（契約 9）', () => {
    expect(script).toContain('[Console]::Out.Write($out)')
    expect(script.trimEnd().endsWith('exit 0')).toBe(true)
  })

  it('回傳不含 BOM（BOM 屬檔案層職責，契約 8）', () => {
    expect(script.charCodeAt(0)).not.toBe(0xfeff)
    expect(script.startsWith('#')).toBe(true)
  })
})

describe('PS 5.1 底線（禁 ?:/??/?. 、不得 Set-StrictMode、顯式 $null）', () => {
  const scripts = GOLDENS.map((g) => emitPs1(g.config, CATALOG))

  it('無 `??`／`?.`／`?:` 三元／Set-StrictMode', () => {
    for (const s of scripts) {
      expect(s).not.toContain('??')
      expect(s).not.toContain('?.')
      expect(s).not.toMatch(/Set-StrictMode/)
    }
  })

  it('null 判定顯式 $null -eq／$null -ne', () => {
    for (const s of scripts) {
      expect(s).toMatch(/\$null -(eq|ne) /)
    }
  })
})

describe('escaping（契約 6：單引號 context、$() 不插值）', () => {
  it("使用者前綴 ' → '' 雙寫（走單引號）", () => {
    const script = emitPs1(cfg({ segments: [seg('model', { icon: false, prefix: "a'b" })] }), CATALOG)
    expect(script).toContain("'a''b'")
  })

  it('$() 前綴嵌於單引號字面、非雙引號（不插值）', () => {
    const script = emitPs1(cfg({ segments: [seg('model', { icon: false, prefix: '$(x)' })] }), CATALOG)
    expect(script).toContain("'$(x)'") // 單引號緊鄰 payload
    expect(script).not.toContain('"$(x)') // 絕不落雙引號 context
  })

  it('backtick 前綴走單引號字面（不觸發 PS escape）', () => {
    const script = emitPs1(cfg({ segments: [seg('model', { icon: false, prefix: '`n' })] }), CATALOG)
    expect(script).toContain("'`n'")
    expect(script).not.toContain('"`n')
  })
})

describe('[double] 轉型 idiom（Decimal 陷阱；格式化對等規則）', () => {
  it('cost helper 帶 [double]$c 轉型', () => {
    const script = emitPs1(cfg({ segments: [seg('cost', { icon: false })] }), CATALOG)
    expect(script).toContain('[math]::Floor([double]$c * 10000)')
  })

  it('百分比取值帶 [double]$v／[double]$p（於 $null 判定之後）', () => {
    const script = emitPs1(cfg({ segments: [seg('context-used', { icon: false, threshold: TRAFFIC })] }), CATALOG)
    // null 判定在前、[double] 轉型在 else 分支（不誤殺 null）
    expect(script).toMatch(/if \(\$null -eq \$v\)[\s\S]*\} else \{[\s\S]*\$p = \[double\]\$v/)
  })
})

describe('mode 分歧與 cap 兩態', () => {
  it('powerline 印 $ARROW；plain 不印', () => {
    expect(emitPs1(POWERLINE_THRESHOLD, CATALOG)).toContain('$ARROW = [string][char]0xE0B0')
    expect(emitPs1(PLAIN_FULL, CATALOG)).not.toContain('$ARROW')
  })

  it('lastArrowCap true → 收尾箭頭區塊；false → 無', () => {
    const capOn = emitPs1(POWERLINE_THRESHOLD, CATALOG)
    const capOff = emitPs1({ ...POWERLINE_THRESHOLD, lastArrowCap: false }, CATALOG)
    expect(capOn).toContain('if ($n -gt 0) {')
    expect(capOff).not.toContain('if ($n -gt 0) {')
  })

  it('plain 閾值段：桶色作 fg 陣列＋head/value 分裂（精確結構由黃金鎖）', () => {
    // context-used（default 色＋prefix "it's "）→ head 非空 → head/value 兩 run
    const script = emitPs1(PLAIN_FULL, CATALOG)
    expect(script).toContain('$Th0Fg = @(') // plain 桶色作 fg 陣列
    expect(script).toContain("it''s") // head run 前綴 escaping（'→''）
    // head 非空（prefix "it's "）→ head run 後補 reset 起 value run（分裂證據）；
    // head 空時此 reset 不補（見 pipeline.integration bare-head byte-exact 回歸鎖）。
    expect(script).toContain('$s += "$e[0m"')
  })

  it('未知 segment id → TypeError（programmer error）', () => {
    expect(() => emitPs1(cfg({ segments: [seg('not-a-segment')] }), CATALOG)).toThrow(TypeError)
  })
})

// ── D1 gating（powerlineArrow × lastArrowCap 四組合） ──

describe('D1 gating（powerlineArrow × lastArrowCap，emit-ps1）', () => {
  const segs = [seg('model', { icon: false, color: A(226) }), seg('cost', { icon: false, color: A(16) })]
  const pa = (lastArrowCap: boolean, powerlineArrow: boolean): BuilderConfig => ({
    ...cfg({ mode: 'powerline', lastArrowCap, segments: segs }),
    powerlineArrow,
  })

  it.each([true, false])(
    'powerlineArrow=false（lastArrowCap=%s 無效）：無 $ARROW、無段間箭頭迴圈、無 cap 區塊、每段 value 尾綴空白',
    (lastArrowCap) => {
      const script = emitPs1(pa(lastArrowCap, false), CATALOG)
      expect(script).not.toContain('$ARROW')
      expect(script).not.toContain('if ($n -gt 0) {')
      // 每段 value 顯示運算式尾綴 `+ ' '`（padLit）。
      expect(script).toContain(`+ ' '`)
    },
  )

  it.each([true, false])(
    'powerlineArrow=true（lastArrowCap=%s）：有 $ARROW、cap 區塊依 lastArrowCap、value 無 padding',
    (lastArrowCap) => {
      const script = emitPs1(pa(lastArrowCap, true), CATALOG)
      expect(script).toContain('$ARROW = [string][char]0xE0B0')
      expect(script.includes('if ($n -gt 0) {')).toBe(lastArrowCap)
      expect(script).not.toContain(`+ ' '`)
    },
  )

  it('padding 只在 powerline＋powerlineArrow=false 生效；plain 模式不受影響', () => {
    const plainScript = emitPs1(cfg({ mode: 'plain', segments: segs }), CATALOG)
    expect(plainScript).not.toContain(`+ ' '`)
  })
})

// ── icon glyph 純 ASCII escape（S1／T1.2 裁決） ──

describe('icon glyph 純 ASCII escape（T1.2 契約）', () => {
  it('astral glyph（🤖 模型）：[char]::ConvertFromUtf32 escape、無原始 emoji bytes', () => {
    const script = emitPs1(cfg({ segments: [seg('model', { icon: true })] }), CATALOG)
    expect(script).toContain('[char]::ConvertFromUtf32(0x1F916)')
    expect(script).not.toContain('🤖')
  })

  it('BMP glyph（⌛ 工作時長）：[char]0xHEX escape（跟隨既有 $ARROW idiom），非 ConvertFromUtf32', () => {
    const script = emitPs1(cfg({ segments: [seg('duration', { icon: true })] }), CATALOG)
    expect(script).toContain('[char]0x231B')
    expect(script).not.toContain('ConvertFromUtf32(0x231B)')
    expect(script).not.toContain('⌛')
  })

  it('多 codepoint glyph（⌨️ Vim 模式，U+2328+U+FE0F）：兩個 [char] escape 以 + 相接', () => {
    const script = emitPs1(cfg({ segments: [seg('vim-mode', { icon: true })] }), CATALOG)
    expect(script).toContain('[char]0x2328 + [char]0xFE0F')
    expect(script).not.toContain('⌨')
  })

  it('icon 全開：每一段 icon.glyph 字面皆不出現於產出腳本（僅留檔頭中文註解等非 icon 內容）', () => {
    // 注意：整份腳本仍含檔頭中文註解（非 icon 內容，不受本契約約束）；
    // pure-ASCII 保證的範圍僅「icon glyph」本身——逐段斷言其字面缺席。
    const script = emitPs1(PLAIN_FULL, CATALOG)
    for (const s of PLAIN_FULL.segments) {
      if (!s.icon) continue
      const glyph = CATALOG[s.id as keyof typeof CATALOG].icon.glyph
      expect(script, `${s.id} 的 icon.glyph（${glyph}）不應以字面出現`).not.toContain(glyph)
    }
  })
})

// ── 分隔符 preset 純 ASCII escape（MAGI code review Important #7 修復） ──

describe('分隔符跳脫（preset ›/·，Important #7 修復）', () => {
  it("preset '›'（U+203A）：emit 腳本內分隔符運算式純 ASCII、無原始字面", () => {
    const script = emitPs1(
      cfg({ segments: [seg('model', { icon: false }), seg('cost', { icon: false })], separator: { kind: 'preset', value: '›' } }),
      CATALOG,
    )
    expect(script).toContain('[char]0x203A')
    expect(script).not.toContain('›')
  })

  it("preset '·'（U+00B7）：emit 腳本內分隔符運算式純 ASCII、無原始字面", () => {
    const script = emitPs1(
      cfg({ segments: [seg('model', { icon: false }), seg('cost', { icon: false })], separator: { kind: 'preset', value: '·' } }),
      CATALOG,
    )
    expect(script).toContain('[char]0xB7')
    expect(script).not.toContain('·')
  })

  it('preset 分隔符純 ASCII（|、空白）：退化為單一 psSingleQuote 呼叫（行為與修復前零差異）', () => {
    const pipeScript = emitPs1(
      cfg({ segments: [seg('model', { icon: false })], separator: { kind: 'preset', value: '|' } }),
      CATALOG,
    )
    expect(pipeScript).toContain(`+ '|' }`)
    const spaceScript = emitPs1(
      cfg({ segments: [seg('model', { icon: false })], separator: { kind: 'preset', value: ' ' } }),
      CATALOG,
    )
    expect(spaceScript).toContain(`+ ' ' }`)
  })

  it("custom 分隔符混 ASCII＋非 ASCII（'a›b'）：ASCII 段落單引號、非 ASCII 逐 codepoint 跳脫、以 + 相接", () => {
    const script = emitPs1(
      cfg({ segments: [seg('model', { icon: false })], separator: { kind: 'custom', value: 'a›b' } }),
      CATALOG,
    )
    expect(script).toContain(`'a' + [char]0x203A + 'b'`)
    expect(script).not.toContain('›')
  })
})

const goldenPath = (name: string): string => fileURLToPath(new URL(`./__golden__/${name}.ps1`, import.meta.url))
const stripBom = (s: string): string => (s.charCodeAt(0) === 0xfeff ? s.slice(1) : s)
const normEol = (s: string): string => s.replace(/\r\n/g, '\n')

describe('黃金檔（emitPs1 產出 == 簽入 __golden__/*.ps1）', () => {
  it.each(GOLDENS)('$name：文字 toEqual（剝 BOM＋正規化 EOL）', ({ name, config }) => {
    const golden = normEol(stripBom(readFileSync(goldenPath(name), 'utf8')))
    expect(normEol(emitPs1(config, CATALOG))).toEqual(golden)
  })

  it.each(GOLDENS)('$name：檔案首 3 bytes ＝ UTF-8 BOM（EF BB BF；契約 8）', ({ name }) => {
    const bytes = readFileSync(goldenPath(name))
    expect([bytes[0], bytes[1], bytes[2]]).toEqual([0xef, 0xbb, 0xbf])
  })

  // R2 Note（MAGI code review 對稱缺口）：bash 側黃金已有無 CR 斷言
  // （emit-bash.test.ts:53-56），ps1 側先前缺對稱——normEol 剝 CRLF 後
  // toEqual 比對無法抓 CRLF 回歸（正規化後兩者字面相同）。此處補上，
  // BOM 3 bytes（EF BB BF）本身不含 0x0D，不干擾判定。
  it.each(GOLDENS)('$name：黃金檔皆 LF、無 CR（對稱 emit-bash.test.ts 契約）', ({ name }) => {
    const bytes = readFileSync(goldenPath(name))
    expect(bytes.includes(0x0d), `${name} 含 CR`).toBe(false)
  })
})

// ── 3. 端到端 byte-exact（win32-only；skipIf 非 win32 並輸出 reason） ──

const IS_WIN = process.platform === 'win32'
const BOM = Buffer.from([0xef, 0xbb, 0xbf])

interface E2ECase {
  id: string
  config: BuilderConfig
  data: StatusData
  input: ResolveInput
}

function runPs1(script: string, stdin: string, extraEnv: Record<string, string> = {}): {
  status: number | null
  stdout: Buffer
  stderr: string
} {
  const dir = mkdtempSync(join(tmpdir(), 'ezps1-'))
  const file = join(dir, 'statusline.ps1')
  writeFileSync(file, Buffer.concat([BOM, Buffer.from(script, 'utf8')]))
  try {
    const r = spawnSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', file], {
      input: Buffer.from(stdin, 'utf8'),
      env: { ...process.env, ...extraEnv },
      maxBuffer: 1024 * 1024,
    })
    return {
      status: r.status,
      stdout: r.stdout ?? Buffer.alloc(0),
      stderr: (r.stderr ?? Buffer.alloc(0)).toString('utf8'),
    }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

// ── SP-5 a/b/c×cap 7 組合（照 sp5/expected.mjs 字面重建） ──

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T
const FULL = MOCK_SCENARIOS_BY_ID.full
const EARLY = MOCK_SCENARIOS_BY_ID['early-null']

function sp5Cases(): E2ECase[] {
  const scenarioA = (): { data: StatusData; segments: SegmentConfig[] } => {
    const data = clone(FULL.data)
    delete data.session_name
    data.context_window.used_percentage = 100
    return {
      data,
      segments: [
        seg('model', { icon: false, color: A(226) }),
        seg('session-name', { icon: false, color: A(99) }),
        seg('context-used', { icon: false, threshold: TRAFFIC, color: A(240) }),
      ],
    }
  }
  const scenarioB = (): { data: StatusData; segments: SegmentConfig[] } => {
    const data = clone(FULL.data)
    data.rate_limits!.five_hour!.used_percentage = null
    data.cost.total_cost_usd = 0.5
    return {
      data,
      segments: [
        seg('model', { icon: false, color: A(226) }),
        seg('rate-5h', { icon: false, color: A(240), threshold: TRAFFIC }),
        seg('cost', { icon: false, color: A(16) }),
      ],
    }
  }
  const scenarioCPlain = (): { data: StatusData; segments: SegmentConfig[] } => ({
    data: clone(EARLY.data),
    segments: [
      seg('model', { icon: false }),
      seg('session-name', { prefix: '[s]', icon: true, color: A(99) }),
      seg('cost', { icon: false }),
    ],
  })
  const scenarioCPowerline = scenarioCPlain

  const build = (
    mode: BuilderConfig['mode'],
    cap: boolean,
    make: () => { data: StatusData; segments: SegmentConfig[] },
    id: string,
  ): E2ECase => {
    const { data, segments } = make()
    const config = cfg({ mode, lastArrowCap: cap, segments })
    const base = make === scenarioCPlain ? EARLY : FULL
    return { id, config, data, input: { data, shell: base.shell, env: base.env } }
  }

  return [
    build('powerline', true, scenarioA, 'a-cap'),
    build('powerline', false, scenarioA, 'a-nocap'),
    build('powerline', true, scenarioB, 'b-cap'),
    build('powerline', false, scenarioB, 'b-nocap'),
    build('plain', true, scenarioCPlain, 'c-plain'),
    build('powerline', true, scenarioCPowerline, 'c-pl-cap'),
    build('powerline', false, scenarioCPowerline, 'c-pl-nocap'),
  ]
}

// escaping 對抗案（$() / ' 前綴走單引號；byte-exact 證不插值）
function escapingCase(): E2ECase {
  const data = clone(FULL.data)
  const config = cfg({
    mode: 'plain',
    segments: [
      seg('model', { icon: false, prefix: '$(1)' }),
      seg('cwd', { icon: false, variant: 'full', prefix: "a'b" }),
    ],
  })
  return { id: 'escaping', config, data, input: { data, shell: FULL.shell, env: FULL.env } }
}

// 0.0029 Decimal 案（[double] idiom：三後端同得 $0.0028）
function decimalCase(): E2ECase {
  const data = clone(FULL.data)
  data.cost.total_cost_usd = 0.0029
  const config = cfg({ mode: 'plain', segments: [seg('cost', { icon: false })] })
  return { id: 'decimal-0.0029', config, data, input: { data, shell: FULL.shell, env: FULL.env } }
}

// 分隔符 preset 跳脫 byte-exact（Important #7 修復；證逐 codepoint escape
// 只改「原始碼」bytes，runtime 輸出與 oracle 一致——'›'/'·' 兩組 preset）。
function separatorPresetCases(): E2ECase[] {
  const build = (value: '›' | '·'): E2ECase => {
    const data = clone(FULL.data)
    const config = cfg({
      mode: 'plain',
      separator: { kind: 'preset', value },
      segments: [seg('model', { icon: false }), seg('cost', { icon: false })],
    })
    return { id: `separator-preset/${value}`, config, data, input: { data, shell: FULL.shell, env: FULL.env } }
  }
  return [build('›'), build('·')]
}

// plain 滿配（非 shell-out 21 段）× 3 情境行為驗證（USERPROFILE=情境 home）
function fullBehaviorCases(): Array<E2ECase & { home: string }> {
  const nonShellOut = PLAIN_FULL.segments.filter(
    (s) => !['git-branch', 'git-dirty', 'clock'].includes(s.id),
  )
  const config = cfg({ mode: 'plain', separator: { kind: 'preset', value: '|' }, segments: nonShellOut })
  return (['full', 'windows-cjk', 'early-null'] as const).map((sid) => {
    const scen = MOCK_SCENARIOS_BY_ID[sid]
    const data = clone(scen.data)
    return {
      id: `full-behavior/${sid}`,
      config,
      data,
      input: { data, shell: scen.shell, env: scen.env },
      home: scen.env.home,
    }
  })
}

describe.skipIf(!IS_WIN)('端到端 byte-exact（win32；powershell 真執行）', () => {
  it.each(sp5Cases())('SP-5 $id：stdout == toAnsi(resolve()) ＋exit 0', (c) => {
    const script = emitPs1(c.config, CATALOG)
    const expected = Buffer.from(toAnsi(resolve(c.config, c.input)), 'utf8')
    const r = runPs1(script, JSON.stringify(c.data))
    expect(r.status, `stderr=${r.stderr}`).toBe(0)
    expect(r.stdout.equals(expected), `\nexpected ${expected.toString('hex')}\nactual   ${r.stdout.toString('hex')}`).toBe(true)
  })

  it('escaping $()／\' 前綴 byte-exact（證走單引號非雙引號）', () => {
    const c = escapingCase()
    const script = emitPs1(c.config, CATALOG)
    const expected = Buffer.from(toAnsi(resolve(c.config, c.input)), 'utf8')
    const r = runPs1(script, JSON.stringify(c.data))
    expect(r.status, `stderr=${r.stderr}`).toBe(0)
    expect(r.stdout.equals(expected), `\nexpected ${expected.toString('hex')}\nactual   ${r.stdout.toString('hex')}`).toBe(true)
  })

  it('0.0029 Decimal 案 byte-exact（證 [double] idiom＝$0.0028）', () => {
    const c = decimalCase()
    const script = emitPs1(c.config, CATALOG)
    const expected = Buffer.from(toAnsi(resolve(c.config, c.input)), 'utf8')
    // 前置：oracle 確為 $0.0028（Decimal 未轉型會得 $0.0029）
    expect(expected.toString('utf8')).toContain('$0.0028')
    const r = runPs1(script, JSON.stringify(c.data))
    expect(r.status, `stderr=${r.stderr}`).toBe(0)
    expect(r.stdout.equals(expected), `\nexpected ${expected.toString('hex')}\nactual   ${r.stdout.toString('hex')}`).toBe(true)
  })

  it.each(separatorPresetCases())('$id：preset 分隔符跳脫 byte-exact（runtime 輸出與 oracle 一致，證跳脫只改原始碼 bytes）', (c) => {
    const script = emitPs1(c.config, CATALOG)
    const expected = Buffer.from(toAnsi(resolve(c.config, c.input)), 'utf8')
    const r = runPs1(script, JSON.stringify(c.data))
    expect(r.status, `stderr=${r.stderr}`).toBe(0)
    expect(r.stdout.equals(expected), `\nexpected ${expected.toString('hex')}\nactual   ${r.stdout.toString('hex')}`).toBe(true)
  })

  it.each(fullBehaviorCases())('$id：plain 滿配（非 shell-out）byte-exact', (c) => {
    const script = emitPs1(c.config, CATALOG)
    const expected = Buffer.from(toAnsi(resolve(c.config, c.input)), 'utf8')
    const r = runPs1(script, JSON.stringify(c.data), { USERPROFILE: c.home })
    expect(r.status, `stderr=${r.stderr}`).toBe(0)
    expect(r.stdout.equals(expected), `\nexpected ${expected.toString('hex')}\nactual   ${r.stdout.toString('hex')}`).toBe(true)
  })
})

it('端到端跳過 reason（非 win32）', () => {
  if (!IS_WIN) {
    console.warn('emit-ps1 端到端於非 win32 跳過：需 powershell.exe（Windows PowerShell 5.1）；windows CI leg 覆蓋')
  }
  expect(true).toBe(true)
})
