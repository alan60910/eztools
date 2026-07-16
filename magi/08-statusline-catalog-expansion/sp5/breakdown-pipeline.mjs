/**
 * T2.4（S5）spike 輔助腳本：解析 `npx vitest run
 * tools/statusline-builder/pipeline.integration.test.ts --reporter=json
 * --outputFile=pipeline-round2.json` 產出的 JSON，依 describe 區塊彙總
 * n（case 數）／totalMs／avgMs——供 REPORT.md「單價實測」表格取數。
 *
 * 用法：node breakdown-pipeline.mjs [path-to-json]（預設 ./pipeline-round2.json）
 *
 * 非產品碼、非測試——僅本次 spike 的計時輔助工具，供覆算用。
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const jsonPath = process.argv[2] ?? join(here, 'pipeline-round2.json')
const report = JSON.parse(readFileSync(jsonPath, 'utf8'))

const groups = {}
for (const suite of report.testResults) {
  for (const t of suite.assertionResults) {
    const key = t.ancestorTitles.join(' > ')
    groups[key] ??= { n: 0, dur: 0 }
    groups[key].n += 1
    groups[key].dur += t.duration ?? 0
  }
}

let totalN = 0
let totalDur = 0
for (const [name, v] of Object.entries(groups)) {
  totalN += v.n
  totalDur += v.dur
  console.log(`${name} | n=${v.n} | totalMs=${Math.round(v.dur)} | avgMs=${Math.round(v.dur / v.n)}`)
}
console.log(`--- TOTAL --- n=${totalN} totalMs=${Math.round(totalDur)}`)
