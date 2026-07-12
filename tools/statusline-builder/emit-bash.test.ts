/**
 * S5-T2.4（magi/05-statusline-builder/PLAN.md §Verification 1/2/3）：
 * emit-bash 三層驗證——
 *   1. **黃金比對**（node，每-commit 迴歸主力）：`emitBash(config)` ===
 *      簽入 `__golden__/<name>.sh`（`toEqual(readFileSync)`；重生僅經
 *      `scripts/golden-statusline.mjs`／`npm run golden:update`，禁 CI／
 *      禁 snapshot API）。config 單一來源＝statusline-golden-configs.ts。
 *   2. **結構／契約斷言**（node）：jq 缺件守衛條件 emit、exit-0 不變量
 *      （禁 set -e、shell-out 防禦包裹、結尾 exit 0）、`printf '%s'` 負向
 *      不變量（使用者文字不進格式位）、escaping 單引號 context。
 *   3. **端到端 byte-exact**（真跑 bash＋jq；skipIf 環境缺件並輸出
 *      reason）：`emitBash(config)` 產出腳本真跑 → stdout 與
 *      `toAnsi(resolve(config, scenario))` byte-exact。含 SP-5 a/b/c×cap、
 *      滿配、escaping、CJK basename/tilde、dash 三態、全隱藏/空鏈。
 */
import { spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { delimiter, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import type { ColorSpec } from './color.js'
import type { BuilderConfig, SegmentConfig } from './config.js'
import { toAnsi } from './emit-ansi.js'
import { emitBash, JQ_MISSING_HINT, type SegmentDescriptorCatalog } from './emit-bash.js'
import { MOCK_SCENARIOS_BY_ID, type MockScenarioId } from './mock-data.js'
import { resolve } from './resolve.js'
import { DESCRIPTORS_BY_ID } from './segments.js'
import { THRESHOLD_TEMPLATES } from './threshold.js'
import {
  GOLDEN_CASES,
  type ByteExactScenario,
} from '../../scripts/statusline-golden-configs.js'
import { MULTIROW_GOLDEN_CASES } from './multirow-golden-configs.js'

const CATALOG: SegmentDescriptorCatalog = DESCRIPTORS_BY_ID

// ── 1. 黃金比對 ──

const goldenPath = (name: string): string =>
  fileURLToPath(new URL(`./__golden__/${name}.sh`, import.meta.url))

describe('黃金比對（emitBash === __golden__/*.sh）', () => {
  it.each(GOLDEN_CASES.map((c) => [c.name, c] as const))(
    '%s',
    (name, testCase) => {
      const script = emitBash(testCase.config, CATALOG)
      const golden = readFileSync(goldenPath(name), 'utf8')
      // 失敗＝審 diff、勿盲目重生（npm run golden:update 僅供刻意變更後）。
      expect(script).toEqual(golden)
    },
  )

  it('黃金檔皆 LF、無 CR（Unix 可執行前提）', () => {
    for (const { name } of GOLDEN_CASES) {
      const bytes = readFileSync(goldenPath(name))
      expect(bytes.includes(0x0d), `${name} 含 CR`).toBe(false)
    }
  })
})

// MAGI code review 2026-07-11 Important #2（Fix 2）：4 個 multirow golden
// 先前僅由 T3.3 人審產出（scripts/golden-statusline.mjs／
// golden-statusline-ps1.mjs 各自 inline 定義），未被本檔黃金比對迴圈覆蓋
// ——emit 回歸不會轉紅。config 單一來源已收攏至 multirow-golden-configs.ts
// （bash／ps1 共用），此處補一個純 emit（不牽 bash 真執行）常駐比對迴圈。
describe('黃金比對（多列，emitBash === __golden__/multirow-*.sh；Fix 2）', () => {
  it.each(MULTIROW_GOLDEN_CASES.map((c) => [c.name, c] as const))('%s', (name, testCase) => {
    const script = emitBash(testCase.config, CATALOG)
    const golden = readFileSync(goldenPath(name), 'utf8')
    expect(script).toEqual(golden)
  })
})

// ── 局部 config 建構 helper（結構斷言＋byte-exact 額外組合用） ──

const A = (index: number): ColorSpec => ({ kind: 'ansi256', index })

function segT(id: string, over: Partial<SegmentConfig> = {}): SegmentConfig {
  return { id, enabled: true, icon: false, color: { kind: 'default' }, ...over }
}

function cfgT(mode: BuilderConfig['mode'], cap: boolean, segments: SegmentConfig[]): BuilderConfig {
  return {
    version: 2,
    mode,
    separator: { kind: 'preset', value: '|' },
    lastArrowCap: cap,
    powerlineArrow: mode === 'powerline',
    segments,
  }
}

function mockScen(id: MockScenarioId): ByteExactScenario {
  const base = MOCK_SCENARIOS_BY_ID[id]
  return { data: JSON.parse(JSON.stringify(base.data)), shell: base.shell, env: base.env }
}

// ── 2. 結構／契約斷言 ──

describe('產生器契約（結構斷言）', () => {
  const jqConfig = cfgT('plain', true, [segT('model', { color: A(226) }), segT('cost')])
  const jqScript = emitBash(jqConfig, CATALOG)

  it('契約 1/7/9：input=$(cat)、ESC=$\\033、結尾 exit 0、無 set -e', () => {
    expect(jqScript).toContain('input=$(cat)')
    expect(jqScript).toContain("ESC=$'\\033'")
    expect(jqScript.trimEnd().endsWith('exit 0')).toBe(true)
    expect(jqScript).not.toMatch(/^\s*set -/m)
  })

  it('契約 2：有 jq 消費段 → emit `command -v jq` 守衛＋提示＋exit 0', () => {
    expect(jqScript).toContain('command -v jq')
    expect(jqScript).toContain(JQ_MISSING_HINT)
  })

  it('契約 2/10：純 shell-out config → 不 emit jq 守衛', () => {
    const clockOnly = cfgT('plain', true, [segT('clock', { color: A(33) })])
    const script = emitBash(clockOnly, CATALOG)
    expect(script).not.toContain('command -v jq')
    expect(script).not.toContain(JQ_MISSING_HINT)
    expect(script.trimEnd().endsWith('exit 0')).toBe(true)
  })

  it('契約 9：shell-out 段防禦包裹 `2>/dev/null || true`', () => {
    const shellCfg = cfgT('plain', true, [
      segT('git-branch'),
      segT('git-dirty'),
      segT('clock'),
    ])
    const script = emitBash(shellCfg, CATALOG)
    expect(script).toContain('git branch --show-current 2>/dev/null || true')
    expect(script).toContain('git status --porcelain 2>/dev/null || true')
    expect(script).toContain('date +%H:%M 2>/dev/null || true')
  })

  it('契約 6 負向：所有 printf 皆 `printf \'%s\'`（使用者文字不進格式位）', () => {
    const escCfg = GOLDEN_CASES.find((c) => c.name === 'escaping')!.config
    for (const script of [jqScript, emitBash(escCfg, CATALOG)]) {
      expect(script.match(/printf (?!'%s')/g)).toBeNull()
      expect(script).toContain(`printf '%s' "$out"`)
    }
  })

  it('契約 6：使用者前綴／自訂分隔符走單引號 context（`\'`→`\'\\\'\'`）', () => {
    const escScript = emitBash(GOLDEN_CASES.find((c) => c.name === 'escaping')!.config, CATALOG)
    // custom separator `'` → SEP=''\'''
    expect(escScript).toContain("SEP=''\\'''")
    // prefix `'$(x)` → '\''$(x)'（$(…) 在單引號 context 不展開）
    expect(escScript).toContain("'\\''$(x)'")
  })

  it('未知 segment id → TypeError（對齊 resolve；config 應先清洗）', () => {
    const bad = cfgT('plain', true, [segT('no-such-segment')])
    expect(() => emitBash(bad, CATALOG)).toThrow(TypeError)
  })

  it('全停用 config → 空鏈骨架（仍 printf/exit 0）', () => {
    const empty = cfgT('plain', true, [])
    const script = emitBash(empty, CATALOG)
    expect(script).toContain('texts=()')
    expect(script).toContain(`printf '%s' "$out"`)
    expect(script.trimEnd().endsWith('exit 0')).toBe(true)
  })
})

// ── D1 gating（powerlineArrow × lastArrowCap 四組合） ──

describe('D1 gating（powerlineArrow × lastArrowCap，emit-bash）', () => {
  const segs = [segT('model', { color: A(226) }), segT('git-dirty', { color: A(196) })]
  const pa = (lastArrowCap: boolean, powerlineArrow: boolean): BuilderConfig => ({
    ...cfgT('powerline', lastArrowCap, segs),
    powerlineArrow,
  })

  it.each([true, false])(
    'powerlineArrow=false（lastArrowCap=%s 無效）：無 ARROW 變數、無段間箭頭、無 cap 區塊、每段 value 補右側空格',
    (lastArrowCap) => {
      const script = emitBash(pa(lastArrowCap, false), CATALOG)
      expect(script).not.toContain('ARROW=')
      expect(script).not.toContain('$ARROW')
      expect(script).not.toContain('if [ "$n" -gt 0 ]; then') // cap 區塊專屬結構
      // 每段 value 尾綴一格空白：一般段 "$v "、dirty 段字面 '<icon>*<pad>'。
      expect(script).toContain('"$v "')
      expect(script).toContain("'* '") // git-dirty：head=''、字面 '*'+pad → '* '
    },
  )

  it.each([true, false])(
    'powerlineArrow=true（lastArrowCap=%s）：有 ARROW 變數、cap 區塊依 lastArrowCap、value 無 padding',
    (lastArrowCap) => {
      const script = emitBash(pa(lastArrowCap, true), CATALOG)
      expect(script).toContain('ARROW=')
      expect(script).toContain('$ARROW')
      expect(script.includes('if [ "$n" -gt 0 ]; then')).toBe(lastArrowCap)
      expect(script).not.toContain('"$v "')
    },
  )

  it('padding 只在 powerline＋powerlineArrow=false 生效；plain 模式不受影響', () => {
    const plainScript = emitBash(cfgT('plain', true, segs), CATALOG)
    expect(plainScript).toContain('"$v"')
    expect(plainScript).not.toContain('"$v "')
  })
})

// ── T3.1 多列：emit 期依 row 分組 → 執行期四步展開（PLAN §shell 端執行期展開語意） ──

describe('多列（T3.1：emit-bash 執行期四步展開，結構斷言）', () => {
  const twoRowPlain = cfgT('plain', true, [
    segT('model', { color: A(226), row: 0 }),
    segT('cost', { color: A(220), row: 1 }),
  ])
  const script = emitBash(twoRowPlain, CATALOG)

  it('步驟 1：逐列緩衝——各列各自宣告獨立陣列變數（texts_N/fgs_N/segstart_N），依列序 emit', () => {
    const idxTexts0 = script.indexOf('texts_0=()')
    const idxTexts1 = script.indexOf('texts_1=()')
    expect(idxTexts0).toBeGreaterThan(-1)
    expect(idxTexts1).toBeGreaterThan(-1)
    expect(idxTexts0).toBeLessThan(idxTexts1)
    expect(script).toContain('fgs_0=()')
    expect(script).toContain('fgs_1=()')
    // plain 模式：segstart_N（無 bgs_N，powerline 專屬）。
    expect(script).toContain('segstart_0=()')
    expect(script).toContain('segstart_1=()')
    expect(script).not.toContain('bgs_0=()')
    // 單列扁平變數（texts=()／不帶列尾碼）不應出現在多列腳本。
    expect(script).not.toMatch(/\btexts=\(\)/)
  })

  it('步驟 2：runtime 空列過濾——依各列存活計數（n_N）條件性收進 outs，不吐空行', () => {
    expect(script).toContain('outs=()')
    expect(script).toContain('if [ "$n_0" -gt 0 ]; then outs+=("$out_0"); fi')
    expect(script).toContain('if [ "$n_1" -gt 0 ]; then outs+=("$out_1"); fi')
  })

  it('步驟 3：存活列以 LF 串接、reset 恆在 LF 之前（各列 out_N 本身已含尾端 reset）', () => {
    expect(script).toContain('out_0+="${ESC}[0m"')
    expect(script).toContain('out_1+="${ESC}[0m"')
    expect(script).toContain(`out+=$'\\n'`)
  })

  it('步驟 4：零存活列退化——outs 為空時 out 直接賦值單一 SGR reset', () => {
    expect(script).toContain('if [ "${#outs[@]}" -eq 0 ]; then')
    expect(script).toContain('out="${ESC}[0m"')
  })

  it('段落順序正確：逐列緩衝（texts_0…texts_1）先於逐列 join（out_0…out_1）、join 先於過濾＋LF 串接', () => {
    const buffer0 = script.indexOf('texts_0=()')
    const buffer1 = script.indexOf('texts_1=()')
    const join0 = script.indexOf('out_0=""')
    const join1 = script.indexOf('out_1=""')
    const filter = script.indexOf('outs=()')
    expect(buffer0).toBeLessThan(buffer1)
    expect(buffer1).toBeLessThan(join0)
    expect(join0).toBeLessThan(join1)
    expect(join1).toBeLessThan(filter)
  })

  it('列內分隔符只作用於該列緩衝：SEP 插入條件式各自引用該列 segstart_N（不跨列）', () => {
    expect(script).toContain('[ "${segstart_0[$i]}" = "1" ]')
    expect(script).toContain('[ "${segstart_1[$i]}" = "1" ]')
    expect(script).not.toContain('[ "${segstart[$i]}" = "1" ]')
  })

  it('列內 cap 只作用於該列緩衝（powerline＋cap）：cap 區塊各自引用該列 bgs_N/n_N', () => {
    const twoRowPowerline = cfgT('powerline', true, [
      segT('model', { color: A(226), row: 0 }),
      segT('cost', { color: A(220), row: 1 }),
    ])
    const psScript = emitBash(twoRowPowerline, CATALOG)
    expect(psScript).toContain('if [ "$n_0" -gt 0 ]; then')
    expect(psScript).toContain('if [ "$n_1" -gt 0 ]; then')
    expect(psScript).toContain('${bgs_0[$((n_0 - 1))]}')
    expect(psScript).toContain('${bgs_1[$((n_1 - 1))]}')
    expect(psScript).not.toContain('if [ "$n" -gt 0 ]; then')
  })

  it('三列 config：非連續 row 值（5,0,2）壓縮為 3 個緩衝區塊（texts_0/_1/_2），無 texts_3', () => {
    const threeRow = cfgT('plain', true, [
      segT('model', { color: A(226), row: 5 }),
      segT('cost', { color: A(220), row: 0 }),
      segT('duration', { color: A(45), row: 2 }),
    ])
    const s = emitBash(threeRow, CATALOG)
    expect(s).toContain('texts_0=()')
    expect(s).toContain('texts_1=()')
    expect(s).toContain('texts_2=()')
    expect(s).not.toContain('texts_3=()')
  })

  it('產出腳本 no-CR（plain／powerline 皆同，既有慣例沿用）', () => {
    expect(script.includes('\r')).toBe(false)
    const psScript = emitBash(
      cfgT('powerline', true, [
        segT('model', { color: A(226), row: 0 }),
        segT('cost', { color: A(220), row: 1 }),
      ]),
      CATALOG,
    )
    expect(psScript.includes('\r')).toBe(false)
  })

  it('契約 6/9 維持：printf \'%s\' "$out"、結尾 exit 0', () => {
    expect(script).toContain(`printf '%s' "$out"`)
    expect(script.trimEnd().endsWith('exit 0')).toBe(true)
  })
})

describe('單列退化（T3.1：emit 期分組壓縮為 1 列 → 扁平結構逐位元組不變）', () => {
  it('同 row 顯式值與缺 row（隱式 0）皆視為單列：不 emit 任何多列標記，且兩者產出逐位元組相同', () => {
    const sameRowExplicit = cfgT('plain', true, [
      segT('model', { color: A(226), row: 0 }),
      segT('cost', { color: A(220), row: 0 }),
    ])
    const noRow = cfgT('plain', true, [segT('model', { color: A(226) }), segT('cost', { color: A(220) })])
    for (const cfg of [sameRowExplicit, noRow]) {
      const s = emitBash(cfg, CATALOG)
      expect(s).toContain('texts=()')
      expect(s).not.toMatch(/texts_\d/)
      expect(s).not.toContain('outs=()')
      expect(s).not.toMatch(/out_\d/)
    }
    // 分組鍵 `seg.row ?? 0` 同構：顯式 row:0 與缺 row 產出逐位元組相同。
    expect(emitBash(sameRowExplicit, CATALOG)).toEqual(emitBash(noRow, CATALOG))
  })

  it('單一啟用段亦視為單列（0 或 1 個分組桶皆走扁平路徑）：不 emit 多列標記', () => {
    const single = cfgT('plain', true, [segT('model', { color: A(226) })])
    const s = emitBash(single, CATALOG)
    expect(s).not.toMatch(/texts_\d/)
    expect(s).not.toContain('outs=()')
  })

  it('黃金比對套件（既有 GOLDEN_CASES，皆單列 config）已於本檔頂部驗證逐位元組不變；此處另證扁平路徑未洩漏多列標記', () => {
    for (const { name, config } of GOLDEN_CASES) {
      const s = emitBash(config, CATALOG)
      expect(s, `${name} 不應含多列標記`).not.toMatch(/texts_\d/)
    }
  })
})

// ── 3. 端到端 byte-exact（真跑 bash＋jq） ──

type RealExec = { ok: true; bash: string; jqDir: string | undefined } | { ok: false; reason: string }

function detectBash(): string | undefined {
  const cands: (string | undefined)[] = [process.env.SP5_BASH]
  if (process.platform === 'win32') {
    cands.push(
      'C:\\Users\\alan6\\scoop\\apps\\git\\current\\bin\\bash.exe',
      'C:\\Program Files\\Git\\bin\\bash.exe',
    )
  } else {
    cands.push('/usr/bin/bash', '/bin/bash')
  }
  return cands.find((p): p is string => p !== undefined && p !== '' && existsSync(p))
}

function detectRealExec(): RealExec {
  const bash = detectBash()
  if (bash === undefined) return { ok: false, reason: 'Git Bash 不存在（SP5_BASH 可指定；PATH 上的 bash 可能為 WSL 不可用）' }
  if (process.platform === 'win32') {
    const jqBin = fileURLToPath(
      new URL('../../magi/05-statusline-builder/sp5/tools/jq-windows-amd64.exe', import.meta.url),
    )
    if (!existsSync(jqBin)) return { ok: false, reason: `jq-windows-amd64.exe 不存在（${jqBin}）` }
    const dir = mkdtempSync(join(tmpdir(), 'sl-jq-'))
    copyFileSync(jqBin, join(dir, 'jq.exe'))
    return { ok: true, bash, jqDir: dir }
  }
  const probe = spawnSync('jq', ['--version'])
  if (probe.status !== 0) return { ok: false, reason: '系統 jq 不在 PATH（非 win32 leg）' }
  return { ok: true, bash, jqDir: undefined }
}

const REAL_EXEC = detectRealExec()
const scriptDir = REAL_EXEC.ok ? mkdtempSync(join(tmpdir(), 'sl-sh-')) : ''
let scriptSeq = 0

/** 移除 env 中所有大小寫變體的 path 鍵後設單一 PATH（Windows env 大小寫不敏）。 */
function withPath(env: NodeJS.ProcessEnv, newPath: string): NodeJS.ProcessEnv {
  for (const k of Object.keys(env)) {
    if (k.toLowerCase() === 'path') delete env[k]
  }
  env.PATH = newPath
  return env
}

/**
 * `strictPath`＝true 時 PATH **嚴格等於** `jqDir`（不附加系統 PATH）——
 * 供「PATH 無 jq」的負向情境使用（契約 2），對齊呼叫端「PATH 僅空目錄」
 * 的測試語意；預設 false 維持一般 byte-exact combo 現行行為（`jqDir` 前
 * 綴系統 PATH，令 `cat` 等一般工具仍可用）。環境洩漏修復：本機系統 PATH
 * 含 scoop jq shim，非嚴格模式下「emptyDir＋系統 PATH」會意外命中系統
 * jq，令契約 2 假陰性通過真輸出分支而非提示分支（sp5 時代機器無此洩漏，
 * 僥倖通過）。bash 以絕對路徑 spawn、不依賴 PATH 尋找自身，嚴格 PATH 下
 * `cat` 亦缺（`command -v jq` 之前的 `input=$(cat)` 找不到 `cat`、失敗但
 * 非致命——無 `set -e`，input 空、無害），僅 `command -v jq` 找不到 jq→
 * 印 JQ_MISSING_HINT、exit 0，與契約 2 語意一致。
 */
function runScript(
  script: string,
  stdinJson: string,
  home: string,
  jqDir: string | undefined,
  strictPath = false,
): { status: number | null; stdout: Buffer; stderr: string } {
  if (!REAL_EXEC.ok) throw new Error('runScript called without real-exec')
  const scriptPath = join(scriptDir, `sl-${scriptSeq++}.sh`)
  writeFileSync(scriptPath, script) // emitBash 已 LF、無 BOM
  // MSYS_NO_PATHCONV：Git Bash（win32 leg）呼叫原生 jq.exe 時，MSYS 執行期
  // 會把看似 Unix 路徑的引數（tilde 的 `--arg home /home/alan`）改寫成 Windows
  // 路徑，令 jq 內 $home ≠ mock home、tilde 前綴比對失敗。真 POSIX 目標無此
  // 轉換；設此旗標令 win32 測試 leg 與 POSIX 引數傳遞等價（非 win32 上為無害
  // 空操作）。bash 本身的 $HOME 不受影響（env 變數不經引數轉換）。
  let env: NodeJS.ProcessEnv = { ...process.env, HOME: home, MSYS_NO_PATHCONV: '1' }
  if (jqDir !== undefined) {
    env = withPath(env, strictPath ? jqDir : jqDir + delimiter + (process.env.PATH ?? ''))
  }
  const r = spawnSync(REAL_EXEC.bash, [scriptPath], { input: Buffer.from(stdinJson, 'utf8'), env })
  return {
    status: r.status,
    stdout: r.stdout ?? Buffer.alloc(0),
    stderr: (r.stderr ?? Buffer.alloc(0)).toString('utf8'),
  }
}

interface ByteExactCombo {
  name: string
  config: BuilderConfig
  scenario: ByteExactScenario
}

/** byte-exact 組合＝黃金（有 scenario）＋cap 兩態＋c powerline＋CJK＋dash 三態＋空鏈。 */
function buildByteExactCombos(): ByteExactCombo[] {
  const combos: ByteExactCombo[] = []
  for (const c of GOLDEN_CASES) {
    if (c.scenario !== undefined) combos.push({ name: c.name, config: c.config, scenario: c.scenario })
  }
  const byName = (n: string) => GOLDEN_CASES.find((c) => c.name === n)!
  // cap 兩態（powerline 黃金翻 lastArrowCap）。
  for (const n of ['sp5-a-powerline', 'sp5-b-powerline', 'powerline-rich']) {
    const c = byName(n)
    combos.push({
      name: `${n}-nocap`,
      config: { ...c.config, lastArrowCap: !c.config.lastArrowCap },
      scenario: c.scenario!,
    })
  }
  // c 情境 powerline 兩態（EARLY：prefix＋icon 段 value null → 整段剔除）。
  for (const cap of [true, false]) {
    combos.push({
      name: `sp5-c-powerline-${cap ? 'cap' : 'nocap'}`,
      config: cfgT('powerline', cap, [
        segT('model', { color: A(226) }),
        segT('session-name', { prefix: '[s]', icon: true, color: A(99) }),
        segT('cost', { color: A(16) }),
      ]),
      scenario: mockScen('early-null'),
    })
  }
  // CJK 路徑：basename（反斜線 regex）＋tilde（home≠前綴 passthrough）。
  combos.push({
    name: 'basename-cjk',
    config: cfgT('plain', true, [segT('cwd', { variant: 'basename', color: A(45) })]),
    scenario: mockScen('windows-cjk'),
  })
  combos.push({
    name: 'tilde-cjk',
    config: cfgT('plain', true, [segT('cwd', { variant: 'tilde', color: A(45) })]),
    scenario: mockScen('windows-cjk'),
  })
  // dash 三態（rate-7d 無閾值）：數值（FULL 21%）／dash（conditional-absent 缺 rate_limits）。
  combos.push({
    name: 'pct-nothreshold',
    config: cfgT('plain', true, [segT('rate-7d', { color: A(99) })]),
    scenario: mockScen('full'),
  })
  combos.push({
    name: 'dash-nothreshold',
    config: cfgT('plain', true, [segT('rate-7d', { color: A(99) })]),
    scenario: mockScen('conditional-absent'),
  })
  // 全隱藏 → 空鏈（plain／powerline 皆單一 reset）。
  combos.push({
    name: 'all-hidden-plain',
    config: cfgT('plain', true, [segT('session-name', { color: A(99) })]),
    scenario: mockScen('conditional-absent'),
  })
  combos.push({
    name: 'all-hidden-powerline',
    config: cfgT('powerline', true, [segT('session-name', { color: A(99) })]),
    scenario: mockScen('conditional-absent'),
  })
  // 空 config（0 段）→ 空鏈。
  combos.push({
    name: 'empty-config',
    config: cfgT('plain', true, []),
    scenario: mockScen('full'),
  })
  // resets 後綴（percent-reset variant）：三後端同 idiom（jq strflocaltime／
  // ps1 Format-ResetsAt／oracle resetsAtSuffix），同機同 TZ byte-exact。FULL
  // five_hour.resets_at=1783497600（number）→ ` (HH:mm)`；斷言不寫死時刻，
  // 只比對 oracle（spawn 當下 TZ 計）。涵蓋 plain 無閾值／powerline 交接／
  // plain 閾值分裂（後綴隨值色）／dash+後綴正交（used=null→'-- (HH:mm)'）。
  const TRAFFIC = THRESHOLD_TEMPLATES.traffic
  combos.push({
    name: 'rate-reset-plain',
    config: cfgT('plain', true, [segT('rate-5h', { variant: 'percent-reset', color: A(99) })]),
    scenario: mockScen('full'),
  })
  combos.push({
    name: 'rate-reset-powerline',
    config: cfgT('powerline', true, [
      segT('model', { color: A(226) }),
      segT('rate-5h', { variant: 'percent-reset', color: A(99) }),
    ]),
    scenario: mockScen('full'),
  })
  combos.push({
    name: 'rate-reset-threshold',
    config: cfgT('plain', true, [
      segT('rate-5h', {
        variant: 'percent-reset',
        prefix: 'R',
        icon: true,
        color: A(214),
        threshold: TRAFFIC,
      }),
    ]),
    scenario: mockScen('full'),
  })
  // dash+後綴正交：used_percentage=null（→ '--'）但 resets_at 仍為 number。
  const dashReset = mockScen('full')
  dashReset.data.rate_limits!.five_hour!.used_percentage = null
  combos.push({
    name: 'rate-reset-dash',
    config: cfgT('plain', true, [segT('rate-5h', { variant: 'percent-reset', color: A(99) })]),
    scenario: dashReset,
  })
  // Important 3（CR4）＋SP-0 拆段：對稱「全段」真執行案——鏡像 emit-ps1.test.ts。
  // 把 22 個非 shell-out stdin 段放一個 config，對 {full, windows-cjk, early-null} 三
  // 情境 byte-exact 比對 toAnsi(resolve())。worktree 為唯一手寫 jq fallback
  // （`.workspace.git_worktree // .worktree.name`），本案驗兩路徑：full 走
  // workspace.git_worktree、windows-cjk 走 worktree.name；worktree-branch（SP-0
  // 拆段新增，`.worktree.branch`）於 full／windows-cjk 皆有值、early-null 缺席剔段。
  const segF = (id: string, over: Partial<SegmentConfig> = {}): SegmentConfig =>
    segT(id, { icon: true, ...over })
  const fullBehaviorConfig = cfgT('plain', true, [
    segF('model', { color: A(75) }),
    segF('cwd', { variant: 'tilde', prefix: '@' }),
    segF('project-dir'),
    segF('output-style'),
    segF('version', { prefix: 'v' }),
    segF('cost', { color: A(220) }),
    segF('duration'),
    segF('lines-changed'),
    segF('context-size'),
    segF('thinking'),
    segF('context-used', { threshold: TRAFFIC, prefix: "it's " }),
    segF('context-remaining'),
    segF('rate-5h', { variant: 'percent-reset' }),
    segF('rate-7d', { variant: 'percent-reset' }),
    segF('session-name', { prefix: '$(x)' }),
    segF('effort'),
    segF('vim-mode'),
    segF('agent-name'),
    segF('pr'),
    segF('repo'),
    segF('worktree'),
    segF('worktree-branch'),
  ])
  for (const sid of ['full', 'windows-cjk', 'early-null'] as const) {
    combos.push({ name: `full-behavior/${sid}`, config: fullBehaviorConfig, scenario: mockScen(sid) })
  }
  // T3.1（非必須，額外真跑信心）：兩列 config 真執行對 oracle byte-exact；
  // 全景多列場景（三列、非末列全滅、全列全滅）留待 T3.3
  // pipeline.integration，本任務單元測試已把展開結構釘住（見上方描述區塊）。
  combos.push({
    name: 'two-row-plain',
    config: cfgT('plain', true, [
      segT('model', { color: A(75), row: 0 }),
      segT('cost', { color: A(220), row: 1 }),
    ]),
    scenario: mockScen('full'),
  })
  combos.push({
    name: 'two-row-powerline',
    config: cfgT('powerline', true, [
      segT('model', { color: A(75), row: 0 }),
      segT('cost', { color: A(220), row: 1 }),
    ]),
    scenario: mockScen('full'),
  })
  return combos
}

// skip 時輸出 reason（PLAN §CI skipIf 不變量：skip 須有理由；本測本機在則跑，
// CI ubuntu/windows leg 亦應為假——恆真死測由 T2.7 harness 的 meta 斷言把關）。
it('端到端 byte-exact 環境自述', () => {
  if (!REAL_EXEC.ok) {
    console.warn(`[emit-bash] 端到端 byte-exact 跳過：${REAL_EXEC.reason}`)
  } else {
    console.warn(
      `[emit-bash] 端到端 byte-exact 啟用：bash=${REAL_EXEC.bash} jqDir=${REAL_EXEC.jqDir ?? '(系統 PATH)'}`,
    )
  }
  expect(true).toBe(true)
})

describe.skipIf(!REAL_EXEC.ok)('端到端 byte-exact（bash＋jq 真執行）', () => {
  const jqDir = REAL_EXEC.ok ? REAL_EXEC.jqDir : undefined
  const combos = buildByteExactCombos()

  it.each(combos.map((c) => [c.name, c] as const))('%s', (_name, combo) => {
    const script = emitBash(combo.config, CATALOG)
    const oracle = Buffer.from(toAnsi(resolve(combo.config, combo.scenario)), 'utf8')
    const stdin = JSON.stringify(combo.scenario.data)
    const r = runScript(script, stdin, combo.scenario.env.home, jqDir)
    expect(r.status, `非零 exit；stderr=${r.stderr}`).toBe(0)
    // hex 比對＝可讀 diff；byte-exact 命中 oracle（emit-ansi.toAnsi）。
    expect(r.stdout.toString('hex')).toBe(oracle.toString('hex'))
  })

  it('契約 2：jq 缺件（PATH 無 jq）→ 提示字串＋exit 0', () => {
    const config = cfgT('plain', true, [segT('model', { color: A(226) })])
    const script = emitBash(config, CATALOG)
    const emptyDir = mkdtempSync(join(tmpdir(), 'sl-nojq-'))
    // PATH 僅空目錄（strictPath＝true，不附加系統 PATH——見 runScript 文件：
    // 本機系統 PATH 含 scoop jq shim，非嚴格模式會意外命中而假陰性通過）：
    // command -v jq 找不到（cat 亦缺 → input 空、無害），走提示分支。
    const r = runScript(script, JSON.stringify(mockScen('full').data), '/home/x', emptyDir, true)
    expect(r.status).toBe(0)
    expect(r.stdout.toString('utf8')).toBe(JQ_MISSING_HINT)
  })
})
