/**
 * T2.4（S5）spike 輔助腳本：獨立量測 PowerShell 5.1（`powershell`）與
 * pwsh 7（`pwsh`）的 process 冷啟成本——spawn 形態逐字比照
 * `pipeline.integration.test.ts` 的 `runPs1()`（`-NoProfile
 * -ExecutionPolicy Bypass -File <script>`），排除腳本邏輯本身，隔離
 * 「process 啟動」與「腳本執行」兩者成本。
 *
 * 用法：node probe-coldstart.mjs（於本機 Windows 執行；6 輪，首輪可能
 * 含額外 OS 快取 warm-up 成本，故另計「去首輪」平均）。
 *
 * 非產品碼、非測試——僅本次 spike 的計時輔助工具，供覆算用。
 */
import { spawnSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const dir = mkdtempSync(join(tmpdir(), 'sl-coldstart-'))
const scriptPath = join(dir, 'mini.ps1')
writeFileSync(scriptPath, 'Write-Output "hi"\n')

function probe(exe, label, rounds = 6) {
  const runs = []
  for (let i = 0; i < rounds; i++) {
    const t0 = Date.now()
    const r = spawnSync(exe, ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath])
    const dt = Date.now() - t0
    runs.push(dt)
    console.log(`${label} run ${i}: ${dt}ms (status=${r.status})`)
  }
  const avgAll = Math.round(runs.reduce((a, b) => a + b, 0) / runs.length)
  const avgSkipFirst = Math.round(runs.slice(1).reduce((a, b) => a + b, 0) / (runs.length - 1))
  console.log(`${label} avg(all)=${avgAll}ms avg(skip-first)=${avgSkipFirst}ms`)
  return { runs, avgAll, avgSkipFirst }
}

probe('powershell', 'PS 5.1')
probe('pwsh', 'pwsh 7')

rmSync(dir, { recursive: true, force: true })
