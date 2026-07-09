/**
 * S5-T2.5 黃金重生腳本（ps1 專屬）——emitPs1(canonicalConfig) → 簽入黃金
 * `tools/statusline-builder/__golden__/*.ps1`（**含檔案 UTF-8 BOM**——契約 8）。
 *
 * 用法：node scripts/golden-statusline-ps1.mjs
 * （node 24 原生 TS type-stripping；registerHooks 把 emit-ps1.ts 內
 * `./x.js` 相對 import 改寫至實存 `./x.ts`——與 sp5/expected.mjs 同招，
 * 僅限工具腳本，產品碼不用。）
 *
 * **禁在 CI 執行**（CI 不得自癒；黃金 diff 必經人審——PLAN §時序閘）。
 * canonical config 與 emit-ps1.test.ts 內同名 config **必須逐字一致**
 * （golden 測試以 emitPs1(testConfig) toEqual 黃金檔為漂移守門：兩處
 * config 若不同步，測試即紅——見 emit-ps1.test.ts 檔頭）。
 *
 * 待與 T2.4（emit-bash）統一：T2.4 lane 尚未落盤 emit-bash.ts，本腳本
 * 為 ps1 專屬；bash 黃金重生併入時可抽共用 canonical config 模組。
 */
import { registerHooks } from 'node:module'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

// ── canonical config（純資料；emit-ps1.test.ts 內須逐字同步） ──

const A = (index) => ({ kind: 'ansi256', index })
/** traffic 模板（threshold.ts THRESHOLD_TEMPLATES.traffic 之值；黃金固定參照）。 */
const TRAFFIC = { buckets: [46, 82, 118, 154, 190, 226, 220, 214, 208, 196].map(A) }
const seg = (id, over = {}) => ({ id, enabled: true, icon: true, color: { kind: 'default' }, ...over })
const cfg = (over) => ({
  version: 1,
  mode: 'plain',
  separator: { kind: 'preset', value: '|' },
  lastArrowCap: true,
  segments: [],
  ...over,
})

/** 黃金 config 集（名稱＝檔名 stem）。 */
export const CANONICAL_CONFIGS = [
  {
    name: 'plain-full',
    // plain 滿配：全 25 段啟用、icon 全開、涵蓋每個 FormatKind／null 政策；
    // 前綴 escaping 對抗案（`it's `→`''`、`$(x)`→單引號不插值）；cwd tilde；
    // rate percent-reset；context-used 掛 traffic 閾值（plain 分裂）。
    config: cfg({
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
    }),
  },
  {
    name: 'powerline-threshold',
    // powerline＋閾值＋C1：SP-5 情境 a 對應 config（中段條件隱藏＋鄰段閾值
    // bg＋cap）；powerline 箭頭交接／dash 退主色／成對 auto-fg 索引。
    config: cfg({
      mode: 'powerline',
      lastArrowCap: true,
      segments: [
        seg('model', { color: A(226) }),
        seg('session-name', { prefix: '[s]', color: A(99) }),
        seg('context-used', { threshold: TRAFFIC, color: A(240) }),
        seg('cost', { color: A(16) }),
      ],
    }),
  },
]

// ── 主流程（只在直接執行時跑；被 import 時無副作用） ──

async function main() {
  registerHooks({
    resolve(specifier, context, nextResolve) {
      if (
        specifier.startsWith('.') &&
        specifier.endsWith('.js') &&
        context.parentURL !== undefined &&
        context.parentURL.startsWith('file:')
      ) {
        const candidate = new URL(`${specifier.slice(0, -3)}.ts`, context.parentURL)
        if (existsSync(fileURLToPath(candidate))) {
          return { url: candidate.href, shortCircuit: true }
        }
      }
      return nextResolve(specifier, context)
    },
  })

  const toolDir = new URL('../tools/statusline-builder/', import.meta.url)
  const { emitPs1 } = await import(new URL('emit-ps1.ts', toolDir).href)
  const { DESCRIPTORS_BY_ID } = await import(new URL('segments.ts', toolDir).href)

  const here = dirname(fileURLToPath(import.meta.url))
  const outDir = join(here, '..', 'tools', 'statusline-builder', '__golden__')
  mkdirSync(outDir, { recursive: true })

  const BOM = Buffer.from([0xef, 0xbb, 0xbf])
  for (const { name, config } of CANONICAL_CONFIGS) {
    const script = emitPs1(config, DESCRIPTORS_BY_ID)
    const bytes = Buffer.concat([BOM, Buffer.from(script, 'utf8')])
    writeFileSync(join(outDir, `${name}.ps1`), bytes)
    console.log(`WROTE  __golden__/${name}.ps1 (${bytes.length} bytes, incl 3-byte BOM)`)
  }
}

const isMain = process.argv[1] !== undefined && process.argv[1] === fileURLToPath(import.meta.url)
if (isMain) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
