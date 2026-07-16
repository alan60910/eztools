# S6-T2.5 Spike 報告 — Windows 時區控制／percent-reset 真執行體制判定

- Sprint: `magi/08-statusline-catalog-expansion/`
- Task: T2.5（S6，見 `TASKS.md`／`PLAN.md` §2 S6）
- 產物根目錄：`magi/08-statusline-catalog-expansion/sp6/`
- 原時區證據檔：`sp6/original-tz.txt`（`Taipei Standard Time`）
- 執行機器：本機 Windows 11（win32），`npx vitest run` v4.1.9，Node v24.10.0，
  PowerShell 5.1.26100.8655／pwsh 7.6.3，jq 1.8.1（`magi/05-statusline-builder/sp5/tools/jq-windows-amd64.exe`）
- **不動任何 production 檔／`__golden__`**——本報告所有腳本皆放
  `sp6/probes/`，執行紀錄放 `sp6/logs/`。

## 時區操作時間軸（鐵律落地證據）

| 步驟 | 動作 | tzutil /g 結果 |
| --- | --- | --- |
| 0 | 開工記錄 | `Taipei Standard Time`（落 `sp6/original-tz.txt`） |
| 1 | 基準測試（未改時區） | `Taipei Standard Time` |
| 2 | `tzutil /s "Tokyo Standard Time"` | `Tokyo Standard Time` |
| 3 | 測試 | （TZ=Tokyo） |
| 4 | **立即還原** `tzutil /s "Taipei Standard Time"` | `Taipei Standard Time` |
| 5 | 對拍矩陣輪1（Taipei，免切換） | `Taipei Standard Time` |
| 6 | `tzutil /s "Tokyo Standard Time"` | `Tokyo Standard Time` |
| 7 | 對拍矩陣輪2 | （TZ=Tokyo） |
| 8 | **立即還原** | `Taipei Standard Time` |
| 9 | `tzutil /s "UTC"` | `UTC` |
| 10 | 對拍矩陣輪3 | （TZ=UTC） |
| 11 | **立即還原** | `Taipei Standard Time` |
| 12 | 加碼：`tzutil /s "Eastern Standard Time"`（有 DST 區，特徵化風險用） | `Eastern Standard Time` |
| 13 | DST 跳點探針 | （TZ=US Eastern） |
| 14 | **最終還原** | `Taipei Standard Time` |
| 15 | 最終確認測試（75/75 綠） | `Taipei Standard Time` |

**最終 `tzutil /g` 輸出 = `Taipei Standard Time` = 原時區**（與
`sp6/original-tz.txt` 一致）。每段實驗結束後立即執行還原，全程無「先跑
完所有實驗才還原」的違規窗口。

---

## 1. 現行體制判定（同機 oracle vs 固定字節）

### 1.1 靜態證據（讀碼）

- `tools/statusline-builder/pipeline.integration.test.ts:34`：
  > 「resets／時間斷言用 spawn 當下 TZ（不寫死時刻，三後端同機同 TZ 一致）。」
- 同檔 348–363 行，`describe.skipIf(...)('resets 後綴 — bash==ps1==oracle
  （同機同 TZ byte-exact）', ...)`：
  ```ts
  const o = oracle(config, data)
  const b = runBash(emitBash(config, CATALOG), JSON.stringify(data))
  const p = runPs1(PS1_EXE, emitPs1(config, CATALOG), JSON.stringify(data))
  expect(hexEqual(b.stdout, o)).toBe(true)
  expect(hexEqual(p.stdout, o)).toBe(true)
  // 後綴形（不寫死時刻——spawn 當下 TZ）。
  expect(strip(o)).toMatch(/^63% \(\d\d:\d\d\)$/)
  ```
  斷言標的是「三者互相一致」＋「格式樣式」，**不是**寫死的字面時刻
  （如 `'63% (16:00)'`）。
- `tools/statusline-builder/emit-bash.test.ts:617-624`（`combos` 端到端迴圈）：
  ```ts
  const script = emitBash(combo.config, CATALOG)
  const oracle = Buffer.from(toAnsi(resolve(combo.config, combo.scenario)), 'utf8')
  const r = runScript(script, stdin, combo.scenario.env.home, jqDir)
  expect(r.stdout.toString('hex')).toBe(oracle.toString('hex'))
  ```
  `oracle` 為**測試進程內即時呼叫** `toAnsi(resolve(...))`（TS 參考實作），
  非事先存檔的字面值。`resolve.ts` 的 `resetsAtSuffix`→`formatResetsAt`
  底層即 `new Date(epochSeconds * 1000).getHours()/.getMinutes()`——讀
  **執行當下** Node 進程所見的系統時區，與 `emit-bash.ts` 的 jq
  `strflocaltime("%H:%M")`、`emit-ps1.ts` 的
  `[DateTimeOffset]::FromUnixTimeSeconds($epoch).ToLocalTime()` 三者各自
  獨立向「當下系統時鐘／時區」取值——三者一致的前提**只需要同一台機器
  同一時刻**，與時區「切到哪個值」無關。
- `__golden__/*.ps1`／`*.sh`（`grep -n '\d\d:\d\d'` 全目錄零命中）：golden
  檔存的是**產生器吐出的腳本原始碼**（含 `Format-ResetsAt` 函式定義本身），
  不含任何寫死的 `HH:MM` 執行期字面——佐證 golden 比對層也走「腳本文字
  結構」而非「執行輸出字節」，與 percent-reset 的 oracle 判定屬同一個
  「不釘時刻」的設計脈絡。

### 1.2 實測（tzutil 切換）

| 輪次 | 系統時區 | `pipeline.integration.test.ts` 結果 |
| --- | --- | --- |
| 基準 | Taipei Standard Time（原） | **75/75 綠**（`sp6/logs/00-baseline-original-tz.txt`） |
| 切換 | Tokyo Standard Time（非本機原時區，UTC+9，無 DST） | **75/75 綠**（`sp6/logs/01-tokyo-tz.txt`） |
| 還原 | Taipei Standard Time | **75/75 綠**（`sp6/logs/02-restored-tz-confirm.txt`） |
| 收工 | Taipei Standard Time（三輪對拍矩陣＋DST 加碼後） | **75/75 綠**（`sp6/logs/03-final-restored-tz-confirm.txt`） |

**綠 → 綠 → 綠 = 同機 oracle 體制**（若為固定字節體制，切到 Tokyo 那輪
理論上會紅——因為 `resolve.ts` 產出的 oracle HH:mm 會從 Taipei 的
`20:34` 之類跳成 Tokyo 的 `21:34`，若 bash/ps1 端寫死另一組字面就會不
匹配；但此處 bash/ps1/oracle 三者都改用新時區重算，故仍一致）。

**結論：現行 percent-reset 真執行體制＝「同機 oracle」，非「固定字節」。**
即測試期由 TS 參考實作（`resolve`→`toAnsi`）在測試進程內即時算出期望值，
bash／ps1 產生的腳本各自用其平台慣用法（jq `strflocaltime`／.NET
`ToLocalTime`）向**同一台機器同一時刻**的系統時區取值，三者天然一致，
與系統時區切到什麼值無關。

---

## 2. 三後端同 epoch 對拍矩陣

### 2.1 探針設計

- 後端：PS 5.1（`powershell.exe -NoProfile -File`）／pwsh 7
  （`pwsh -NoProfile -File`）／jq `strflocaltime`
  （`magi/05-statusline-builder/sp5/tools/jq-windows-amd64.exe`）／Node
  自算（鏡像 `resolve.ts` 的 `getHours/getMinutes` idiom，延伸
  `getMonth()+1/getDate()` 求 `MM/dd`；另印 `Intl.DateTimeFormat`
  對照組）。腳本：`sp6/probes/probe-ps.ps1`／`sp6/probes/probe-node.mjs`。
- 4 個 epoch（UTC 定義，見 `sp6/probes/run-matrix.sh`）：

  | case | epoch（秒） | UTC ISO |
  | --- | --- | --- |
  | 一般值 general | 1784118896 | 2026-07-15T12:34:56Z |
  | 跨月邊界 monthBoundary | 1769902200 | 2026-01-31T23:30:00Z |
  | 跨年邊界 yearBoundary | 1767223800 | 2025-12-31T23:30:00Z |
  | DST 轉換點附近 dstNear | 1772955000 | 2026-03-08T07:30:00Z（美東春季調快跳點 07:00 UTC 之後） |

- 3 個時區設定：本機原時區（Taipei Standard Time）、Tokyo Standard Time
  （非本機原時區、UTC+9、無 DST）、UTC。

### 2.2 結果矩陣（`%m/%d %H:%M`）

| epoch case | Taipei（原） | Tokyo | UTC |
| --- | --- | --- | --- |
| general | `07/15 20:34`（四後端全同） | `07/15 21:34`（四後端全同） | `07/15 12:34`（四後端全同） |
| monthBoundary | `02/01 07:30`（四後端全同，**日期已跨月**） | `02/01 08:30`（四後端全同） | `01/31 23:30`（四後端全同，未跨月） |
| yearBoundary | `01/01 07:30`（四後端全同，**已跨年**） | `01/01 08:30`（四後端全同） | `12/31 23:30`（四後端全同，未跨年） |
| dstNear | `03/08 15:30`（四後端全同） | `03/08 16:30`（四後端全同） | `03/08 07:30`（四後端全同） |

四後端＝PS 5.1／pwsh 7／jq `strflocaltime`／Node 自算；`plain` 與
`invariant`（`InvariantCulture`）兩種 PS `ToString` 呼叫在本機 `zh-TW`
文化下輸出**完全相同**（見 §4.2）。

**逐格完整輸出**：`sp6/logs/matrix-01-original-taipei.txt`／
`matrix-02-tokyo.txt`／`matrix-03-utc.txt`。

**對拍分岔：零**——12 個矩陣格（3 時區 × 4 epoch）、每格 4 後端（含 PS
plain／invariant 兩式共 5 組讀值），**全數逐字元一致**，包含跨月／跨年
邊界（`MM/DD` 隨時區位移而不同、但四後端對同一時區給出的 `MM/DD`
彼此一致）與 DST 附近 epoch（在無 DST 目標時區下不產生跳變）。

### 2.3 加碼：pin 真 DST 時區的風險特徵化

為直接驗證任務點名的「DST 轉換點」風險，額外（不影響上述三時區矩陣、
獨立一輪、事後立即還原）將系統時區切到 **`Eastern Standard Time`**
（美東，會觀察 DST），對 2026-03-08 春季調快瞬間（07:00 UTC）前後各
30 分鐘的兩個 epoch 對拍（`sp6/probes/run-dst-check.sh`，紀錄於
`sp6/logs/matrix-04-dst-risk-eastern.txt`）：

| epoch | UTC | 四後端讀值 |
| --- | --- | --- |
| beforeJump（1772951400） | 2026-03-08T06:30:00Z | `03/08 01:30`（EST，四後端全同） |
| afterJump（1772955000） | 2026-03-08T07:30:00Z | `03/08 03:30`（EDT，四後端全同，正確跳過 02:xx） |

四後端連在**真的有 DST** 的時區下，對「春季調快」這種無歧義的單向跳點，
仍然逐字元一致（`02:00–02:59` 被正確跳過、無任何後端算成
`02:xx`）。這代表 Windows 系統層（tzutil 設定的 registry TZ 規則）、
.NET `TimeZoneInfo`、jq 底層 C runtime 的 `localtime()`、Node 的 ICU
時區資料，在**近期（2026 年）美東 DST 規則**上是一致的——本機環境未
觀測到「.NET vs IANA tzdata 版本落差」導致的分岔（若要系統性驗證歷史
久遠或未來 DST 規則變更的邊界，需另外對拍多個年份，超出本次 spike 範圍，
列為 backlog）。

---

## 3. jq 在 Windows 上的本地化時區來源實證

任務要求查證 jq `strflocaltime` 在 Windows 上讀哪個時區來源——系統
`tzutil` 設定，還是 `TZ` 環境變數？實測（`TZ=<值> bash -c '... | jq -r
".epoch | strflocaltime(...)"'`，系統 tzutil 全程維持 `Taipei Standard
Time`、epoch=1784118896／UTC 2026-07-15T12:34:56Z）：

| `TZ` 環境變數 | jq 輸出 `%m/%d %H:%M` | 判讀 |
| --- | --- | --- |
| （未設定） | `07/15 20:34` | 讀系統 tzutil（Taipei, UTC+8） |
| `UTC0`（POSIX 固定偏移格式） | `07/15 12:34` | **生效**（UTC+0） |
| `EST5`（POSIX 固定偏移格式） | `07/15 07:34` | **生效**（UTC-5） |
| `JST-9`（POSIX 固定偏移格式，注意號誌反向） | `07/15 21:34` | **生效**（UTC+9） |
| `UTC`（裸字，仍屬 POSIX 慣用別名） | `07/15 12:34` | **生效**（UTC+0） |
| `Asia/Tokyo`（IANA 區域名） | `07/15 20:34` | **未生效**——退回系統 tzutil（Taipei） |
| `''`（空字串） | `07/15 20:34` | 未生效——退回系統 tzutil（Taipei） |
| `garbage-nonsense`（不可解析字串） | `07/15 13:34` | 未生效但也非「安全退回」——底層 C runtime 對不可解析字串的容錯行為不可預期（**不可依賴**） |

**結論**：這支 win64 portable jq（底層走 Windows C runtime 的
`_tzset()`/`localtime()`）**只認得 POSIX 傳統格式**（`STD[+-]offset`
或 `STD offset DST offset,rule`，例如 `EST5`、`UTC0`、`JST-9`），
**不認得 IANA 區域名稱**（`Asia/Tokyo`、`Asia/Taipei` 等）——給
IANA 名稱時**靜默忽略、退回系統 `tzutil` 設定**，不會報錯也不會用
UTC 兜底。對不可解析字串的行為則不可預期（見 `garbage-nonsense` 一列），
**不建議**以此類值作為任何「刻意不設 TZ」的替代手段。

**對兩結局判定的直接影響**：Ubuntu leg 若日後用
`TZ=Asia/Taipei`（IANA 格式，glibc 原生支援）釘樁，**同一招在 Windows
leg 對 jq 無效**——必須改用 `TZ=CST-8`（POSIX 固定偏移，號誌反向）這種
格式，或乾脆用 `tzutil /s`（系統層級，PS／jq 都吃得到、格式統一，
無需分別記兩套 TZ 語法）。若選 (a) byte-exact 結局，**windows leg 的
"時區釘樁" 必須用 `tzutil`，不能沿用 ubuntu 慣用的 `TZ=Asia/Taipei`
env var 語法**——兩平台語法不對稱是選 (a) 時必須顯式處理的額外複雜度。

---

## 4. DST 風險結論、兩結局判定與建議

### 4.1 DST 風險結論

- 目標釘樁候選（`UTC`／`Asia-Taipei` 對應 Windows `Taipei Standard
  Time`）**皆無 DST**（Taiwan 自 1979 年後未再實施夏令時間；UTC 定義上
  無 DST）——選其一釘樁即整族消滅「同一 epoch 因 DST 規則版本落差
  （.NET registry vs IANA tzdata）而算出不同 `HH:MM`」的分岔可能性。
- §2.2／§2.3 實測（含真正 pin 到有 DST 的 `Eastern Standard Time` 並
  對準春季調快瞬間前後）顯示：**在本機環境下，四後端連對真實 DST
  轉換都零分岔**——DST 本身在「同機同時刻」前提下並不會造成四後端
  互相不一致；DST 真正的風險點是**「golden／assertion 若寫死某個
  HH:MM 字面，其正確性隱含依賴『golden 建立當下的 DST 狀態』，跨日期
  執行（尤其橫跨 DST 切換日）會失準」**——但這只會在**固定字節**體制
  下發生；現行的**同機 oracle**體制天生免疫（oracle 與 bash/ps1 永遠
  用同一台機器「執行當下」重算，DST 規則版本一致與否不影響三者互相
  一致，只影響「與人類直覺期望的絕對時刻」是否一致，而測試從不斷言
  絕對時刻）。
- §3 之 jq IANA-name 不支援發現，進一步降低「pin 到某個 DST 區」的可
  操作性——即使真要選 DST 區釘樁，windows leg 也難以用簡單的 `TZ` env
  var 達成跨平台一致語法，須用 `tzutil`。**選無 DST 區釘樁（若走結局
  a）可同時規避 DST 語意風險與（部分）jq TZ 來源不對稱問題**——非
  DST 區底下不需要在意 jq 是否正確套用 DST 規則，只需確認固定偏移
  正確即可。

### 4.2 附帶發現：.NET 文化敏感格式符（PLAN.md round-1 review #9 已知項）

`emit-ps1.ts:264` 現行 `Format-ResetsAt` 呼叫 `$t.ToString('HH:mm')`
**未帶 `CultureInfo`**——`.NET` 自訂格式字串中 `/`／`:` 是「文化佔位符」
（`DateSeparator`／`TimeSeparator`），非必然等於字面 `/`／`:`。本機
`zh-TW` 文化下 `Get-Culture` 顯示 `DateSeparator=[/]`／
`TimeSeparator=[:]`（見 §2 探針 `sp6/probes/probe-ps.ps1` 的
plain／invariant 對照組，本機兩者輸出**完全相同**）——**本機環境未
重現此風險**，但這是機器 locale 相關、非時區相關的獨立分岔源，
**PLAN.md 與 code review round-1 #9 已判定為已知風險並已預先決定修法
（`ToString(..., [CultureInfo]::InvariantCulture)`，順修
`Format-ResetsAt`）**——本 spike 僅補一筆本機實證（風險真實存在、只是
本機 locale 恰好未觸發），不改變既有裁決，也不在本次範圍內動
production 檔修正。

### 4.3 兩結局判定

**判定：結局 (b) 同機 oracle。**

理由：
1. **現行體制本來就是 (b)**（§1 靜態讀碼＋tzutil 綠→綠→綠實測雙重
   確認），沒有「現行已是 byte-exact、要不要改」的既存包袱，維持現狀
   即為最小改動。
2. **(b) 已被 60 組讀值零分岔實證覆蓋**（§2：12 矩陣格 × 5 讀值 = 60；
   §2.3 加碼 DST 真轉換 2 格 × 4 讀值 = 8；合計 68 組零分岔），涵蓋一般
   值／跨月／跨年／DST 附近／真實 DST 跳點五種情境、三種目標時區＋一種
   額外 DST 特徵化時區——證據強度足以支撐「不需額外釘時區」的結論。
3. **(a) byte-exact 的落地成本明顯較高且有額外分岔源**：
   - windows leg 需要 `tzutil /s`（系統層級、需確認 GitHub Actions
     windows runner 執行權限與相容性，本 spike 未驗證 CI 環境下
     `tzutil` 的可執行性，屬新增未知數）；ubuntu leg 慣用 `TZ` env var
     （§3 證實 windows 上的 jq 對 IANA 格式 `TZ` 值不生效）——**兩平台
     無法共用同一種「設環境變數」語法**，需分別維護 `tzutil` 與
     `TZ`，增加 CI 腳本的認知負擔與未來漂移風險。
   - 若改寫死字面（`'63% (16:00)'` 之類），一旦 06c 倒數段落地
     `MM/DD HH:MM` 格式，golden／assertion 需要為特定 `STATUSLINE_NOW_EPOCH`
     ＋特定釘樁時區手算並寫死正確值，人工計算 DST／閏年／跨月錯誤風險
     取代了現在自動重算的 oracle，反而**引入**新的人為出錯面。
   - `STATUSLINE_NOW_EPOCH`（S2 已定案的注入機制）本身仍可能因其他原因
     （倒數段 `diff = resets_at - now` 的確定性需求）需要釘樁，但那與
     「是否需要額外釘 `TZ`/`tzutil` 才能讓 `HH:MM` byte-exact」是兩個
     正交問題——本 spike 只回答後者：**不需要**。
4. 沒有找到任何要求切換到 (a) 的驅動力（現行測試綠、無 CI flake 紀錄、
   §2/§2.3 未發現任何分岔案例）。

### 4.4 TECHSTACK delta 措辭建議（供 PLAN.md §Recommended approach /
    TECHSTACK.md Deployment 條目定稿引用）

> Windows leg 的 percent-reset／倒數段（reset-5h／reset-7d）本地時刻
> 斷言沿用現行「同機 oracle」模式（TS 參考實作與 bash／ps1 產出腳本於
> 同一測試進程、同一時刻執行期即時重算並互相比對，不寫死 `HH:MM`／
> `MM/DD` 位元組）——經 3 組時區（本機原時區／Tokyo Standard
> Time／UTC）× 4 個含跨月／跨年／DST 邊界的 epoch × 4 後端（PS 5.1、
> pwsh 7、jq、Node）共 68 組讀值零分岔實測驗證（`magi/08-statusline-catalog-expansion/sp6/REPORT.md`），
> `test.yml`／`deploy.yml` **不需**額外釘 `tzutil`／`TZ` 環境變數；
> `STATUSLINE_NOW_EPOCH`（S2 既定機制）之取捨維持獨立評估、與本項無關。

---

## 附錄：產物清單

```
sp6/original-tz.txt                          — 原時區證據（Taipei Standard Time）
sp6/logs/00-baseline-original-tz.txt          — 基準測試（原時區，75/75 綠）
sp6/logs/01-tokyo-tz.txt                      — Tokyo 時區測試（75/75 綠）
sp6/logs/02-restored-tz-confirm.txt           — 還原後確認（75/75 綠）
sp6/logs/03-final-restored-tz-confirm.txt     — 全部實驗結束、最終還原後確認（75/75 綠）
sp6/logs/matrix-01-original-taipei.txt        — 三後端×4 epoch 對拍（原時區）
sp6/logs/matrix-02-tokyo.txt                  — 三後端×4 epoch 對拍（Tokyo）
sp6/logs/matrix-03-utc.txt                    — 三後端×4 epoch 對拍（UTC）
sp6/logs/matrix-04-dst-risk-eastern.txt       — DST 加碼探針（Eastern Standard Time）
sp6/probes/probe-node.mjs                     — Node 探針（自算 + toLocaleString 對照）
sp6/probes/probe-ps.ps1                       — PS 探針（plain + InvariantCulture 對照）
sp6/probes/run-matrix.sh                      — 主矩陣驅動腳本
sp6/probes/run-dst-check.sh                   — DST 加碼驅動腳本
```

所有探針腳本為 spike 專用、不進 production／不進 `npm test`；`tzutil`
操作全程使用 `MSYS_NO_PATHCONV=1` 前綴（Git Bash 會把 `/g`／`/s` 誤譯為
`G:/`／`S:/` 路徑，此為環境雷區記錄，非結論一部分）。
