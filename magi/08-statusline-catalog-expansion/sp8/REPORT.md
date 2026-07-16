# S8 PoC 報告 — 零新依賴 CDP 全鏈 e2e harness（T1.5）

> Source: `magi/08-statusline-catalog-expansion/TASKS.md` T1.5。
> PoC 腳本：[`poc.mjs`](./poc.mjs)（可重跑：`node magi/08-statusline-catalog-expansion/sp8/poc.mjs`）。
> 本報告的 flake 數據為本機（Windows 11、Node v24.10.0、Edge 150.0.4078.65
> ／`C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`）2026-07-12
> 實際跑出的結果，非估計值；跑法與原始輸出見文末附錄。

## 結論摘要（供 T1.6 直接採用）

1. **依賴宣告：零新依賴可行。** Node ≥22（本專案 `package.json` 已釘
   `"engines": {"node": ">=22"}`）內建 global `fetch`／`WebSocket`／
   `node:child_process` 足以完成 `/json/version` handshake → CDP
   WebSocket 全鏈，不需 `chrome-remote-interface`／`puppeteer-core` 等
   任何 npm 套件。
2. **執行形態：headless(new) 為 T1.6 預設，headed 僅供人工除錯。**
   兩者正確性相同（皆 100% 成功），但 headed 模式在本機環境下**跑到第
   6 輪起、單輪耗時從 ~4.6s 跳升至 ~59.5s（約 13 倍）**，根因為 Edge
   分離出的輔助行程（如 crashpad handler）不在 `taskkill /T` 能觸及的
   親子樹內、10 輪跑完後仍有 17 個殘留 `msedge.exe` 行程——詳見
   下方「執行形態」與「已知限制與風險」。
3. **逐案重啟 browser session：延續 sprint 07 結論，本輪 26 次全新
   瀏覽器＋全新 `--user-data-dir` 執行零交叉污染、零 flake**，未在本
   PoC 重新測試「同 session 連續多次拖曳」（sprint 07 已證實不穩，此
   結論視為已定案、不重複燒 PoC 預算驗證）。
4. **T1.6 涵蓋清單建議**：多列拖曳基本盤（同列交換、跨列拖）必收；
   slots 九情境（S1–S9）建議收 **S1／S4／S9**（預算允許可加 S7）
   四案，理由與單案成本估算見下方專節。

---

## 一、依賴宣告

零新依賴確認可行，全鏈路徑如下（`poc.mjs` 逐段落地）：

```
spawn msedge.exe --remote-debugging-port=<port> --user-data-dir=<fresh>
  → fetch http://127.0.0.1:<port>/json/version   （確認 CDP 端點已起）
  → fetch http://127.0.0.1:<port>/json/list       （找 type:'page' 的目標）
  → new WebSocket(target.webSocketDebuggerUrl)     （Node ≥22 全域建構式，免 import）
  → Page.enable / Runtime.enable / Input.setInterceptDrags(true)
  → Runtime.evaluate 播種 localStorage config、驗證 DOM
  → Input.dispatchMouseEvent / Input.dispatchDragEvent 合成拖曳
```

過程中沒有任何一步需要 `ws`／`chrome-remote-interface`／
`puppeteer-core` 之類的套件；`spawn`／`spawnSync` 呼叫 `npm`
（Windows 上為 `npm.cmd`）時需要 `{ shell: true }`（純 Node
`spawn('npm.cmd', …)` 不加 `shell:true` 會直接丟 `EINVAL`，這是
Windows 對 `.cmd` 批次檔的既有限制，非本 PoC 特有問題），此舉本身
不引入套件依賴，僅是呼叫慣例。

**結論：T1.6 不需要提案任何最小 CDP client 套件，`scripts/e2e-statusline.mjs`
可直接複用 `poc.mjs` 的手寫 CDP client（`makeClient`／`connectWs` 等
~70 行）。**

## 二、執行形態

### 量測方法

單一「多列拖曳基本盤」情境（`same-row-swap`：同列 `model`／`cost`
兩段互換順序）分別在 **headed** 與 **headless(new)** 各跑 **10 輪**，
每輪：全新 `msedge.exe` 行程＋全新 `--user-data-dir`（temp 目錄）→
seed config → `Page.navigate` → `Input.setInterceptDrags(true)` →
`mousePressed`→10 步 `mouseMoved`（`button:'left', buttons:1`）→
偵測 `Input.dragIntercepted` → `dragEnter`／二次 `dragOver`（drop 前
重查活座標，見「已知限制」）／`drop`→`mouseReleased` → `Runtime.evaluate`
程式化驗證段順序 → kill 該輪瀏覽器 → 刪 profile 目錄。

### 實測結果

| 模式 | 輪數 | 成功 | 成功率 | 平均耗時 |
|---|---|---|---|---|
| headed | 10 | 10 | **100%** | 26,621 ms（見下方離群值說明） |
| headless(new) | 10 | 10 | **100%** | 4,652 ms |

headed 原始逐輪耗時（ms）：
`4754, 4563, 4479, 4598, 4925, 4614, 59477, 59769, 59502, 59524`

前 6 輪（round headed-0..5）平均 **4,656 ms**，與 headless 幾乎持平；
**第 7 輪起（headed-6..9）耗時跳升至 ~59,500 ms、穩定維持該量級直到
批次結束**——13 輪皆判定「成功」（`Input.dragIntercepted` 仍有發
生、DOM 驗證仍通過），純粹是啟動／連線階段變慢，不是功能性 flake。

headless 全部 10 輪耗時落在 4,488–4,806 ms 區間，無趨勢性劣化。

**追加驗證（加上 `sweepOrphanEdge()` 之後、乾淨狀態下重跑 1 輪
headed）**：起手前以 `tasklist` 確認零殘留 `msedge.exe`，單獨跑 1
輪 headed `same-row-swap`，耗時 **47,374 ms**——比同一批次中第一輪
（4,754 ms）慢近 10 倍，且這次是「乾淨狀態下的第一輪」，並非累積
到第 6 輪才變慢。這筆數據**削弱**了「純粹輪次內累積殘留行程」這個
單一因果故事的完整性——headed 耗時的變異不只發生在「同一批次跑久
了」，跨次獨立執行（run-to-run）也會出現數十秒等級的離群值。較可能
的完整圖像是：headed 模式本身對本機環境（防毒即時掃描、視窗管理員
對大量新視窗的處理等）較敏感，「批次內累積」只是眾多觸發因子之一，
不是唯一因子。**這進一步強化「T1.6 預設 headless」的建議**——不只
是因為 headed 會累積變慢，是因為 headed 的耗時本身就不可預期。

批次結束後（含後續 headless 10 輪、cross-row／select-move 各 3 輪，
共 26 輪）以 `tasklist` 檢查，**仍殘留 17 個 `msedge.exe` 行程**——
即使每輪都對該輪 `child.pid` 呼叫 `taskkill /PID <pid> /T /F`。這
與耗時跳升高度吻合：headed 模式下 Chromium 會分離出不在 OS 記錄
親子樹內的輔助行程（典型如 crashpad handler，其設計目的正是「即使
父行程死亡也要存活以回報崩潰」，`/T` 依親子樹關係搜尋自然找不到
它），這些行程隨輪次累積、消耗記憶體與 handle，推測正是第 6 輪起
啟動延遲暴增的成因（未逐輪量測系統資源以完全坐實因果鏈，但時間點
高度吻合、且 headless 全程無此現象——`--headless=new` 模式產生的
輔助行程模型明顯更簡單/更少殘留）。

`poc.mjs` 已加上 `sweepOrphanEdge()`：main() 收尾時另跑一支
PowerShell 一行指令，以 command line 是否含本次 `SCRATCH_ROOT`
路徑片段（`sp8-profiles`）為準，強制關閉殘留的 `msedge.exe`（只掃
「本次 PoC 開出的」profile，不動使用者自己開著的 Edge）。小輪數
（2+2+1+1＝6 輪）驗證後 `tasklist` 確認掃尾後零殘留；未在 10+10
全量下重新驗證掃尾能否清空全部 17 個殘留（該次量測跑在加上掃尾
之前），此為殘留風險，見下方「已知限制與風險」。

### 建議

**T1.6 預設 headless(new)**：正確性與 headed 相同、無累積性劣化、無
需清理殘留視窗、不干擾操作者前景畫面。headed 僅保留為人工除錯用的
可選開關（如 `E2E_HEADED=1` 環境變數），且註明「連續跑超過 ~5-6 輪
建議中途或跑後檢查 `tasklist`／跑 `sweepOrphanEdge` 類清尾」。

**逐案重啟 session：維持 sprint 07 結論，每案全新瀏覽器。** 本 PoC
26 輪全新 session 執行零交叉污染，是這份 100% 成功率的前提之一
（未反向測試「同 session 連續兩次拖曳」——sprint 07 已用真實案例
證實不穩，不再重複燒此 PoC 的預算驗證同一件事）。以本 PoC 實測的
單輪耗時（drag 類 ~4.5–4.7s、select 類 ~2.9s，headless）估算，一個
5–6 案的核心迴歸集全新 session 逐案重啟總耗時約 **20–30 秒**，CI
可接受，不需要引入「同 session 多次操作」的複雜度與其已知不穩定性
來換取速度。

## 三、伺服器生命週期做法

```
npm run build          # 一次性；REPO_ROOT 下 spawnSync（Windows 需 shell:true）
npm run preview &      # spawn，同上；stdout/stderr 合併掃描
  → 剝除 ANSI escape（vite 彩色輸出把 "http://localhost:" 與埠號／
    尾斜線用顏色碼斷開，如 "http://localhost:\x1b[1m4173\x1b[22m/\x1b[39m"，
    正則若不先 strip 會永遠 match 不到、逾時——本 PoC 除錯時踩過這個
    坑，見 poc.mjs stripAnsi()）
  → 正則擷取 "Local:   http://localhost:<port>/" 取得實際 baseUrl
    （vite preview 預設埠 4173 被占用時會自動找下一個可用埠，本腳本
    無需自己處理埠衝突——只需正確解析它印出的實際 URL）
...（全部輪次跑完）...
taskkill /PID <npm-pid> /T /F     # 收掉 npm→vite 整條行程樹
sweepOrphanEdge()                 # 清尾本次 PoC 開出的殘留 msedge.exe
rmSync(SCRATCH_ROOT)              # 清 profile 暫存目錄
```

statusline-builder 頁面路徑固定為 `<baseUrl>/tools/statusline-builder/`
——雖然 `vite.config.ts` 設 `base: './'`（相對路徑），但 `vite preview`
本身以 dist 根目錄為 server root，`/tools/statusline-builder/index.html`
的相對資源路徑（`./assets/...`）由瀏覽器依當前文件 URL 正確解析，
與 base 設定無衝突，本 PoC 建置＋起 preview 後直接 `curl` 驗證過
（`200`，頁面正確渲染）。

## 四、T1.6 涵蓋清單建議

### 多列拖曳基本盤（必收，已在本 PoC 驗證）

| 情境 | 說明 | 實測成功率 | 實測平均耗時（headless） |
|---|---|---|---|
| 同列交換 | 同一列相鄰兩段拖曳互換順序 | 10/10（headed）＋10/10（headless） | 4,652 ms（headed 前 6 輪 4,656 ms 同量級） |
| 跨列拖（來源列排空） | 末列唯一段拖到前一列，來源列自動收攏、不留空占位（來源列僅一段、非中間空列插入情形） | 3/3（headless） | 4,538 ms |

跨列拖情境開發過程中踩到一個真實 harness bug，值得記錄（也是「已知
限制」的一部分）：**3 列版面下，某段的完整控件列（row-select／icon
checkbox／前綴輸入／變體／色票／閾值編輯器）疊起來遠超過任何合理
固定 viewport**（本 PoC 3 列情境下 `document.documentElement.scrollHeight`
達 2718px，而 `Emulation.setDeviceMetricsOverride` 給的 1000px
viewport 完全不夠）。最初實作直接以 `getBoundingClientRect()` 算拖曳
起訖點，落在視窗外、`elementFromPoint` 回 `null`，`dragstart` 完全
沒觸發（`Input.dragIntercepted` 為 0、頁面事件探針也是空陣列）。修法
：drop 前先對目標元素呼叫
`element.scrollIntoView({ block: 'center', behavior: 'instant' })`
**且必須用 `behavior:'instant'`**——用預設或 CSS `smooth` 捲動的話，
同一次 `Runtime.evaluate` 內緊接著讀到的 `getBoundingClientRect()`
仍是捲動前的舊值（捲動動畫是非同步的）。加上此修法後 cross-row-drain
重跑 3/3 全過。**T1.6 的座標計算 helper 必須內建這個
`scrollIntoView(instant)` 前置步驟**，否則任何 ≥3 列的情境天生不穩
（不是 flake，是系統性必敗，只是本 PoC 用小樣本剛好都踩到才發現）。

### slots 九情境（S1–S9，底本見 sprint 07 scratchpad `cdp-slots.mjs`）擇代表

九情境驗的是「位置制暫存列 slots」機制（`row-slots.ts`，T5.14，已於
`cf1cb7d` 合併進主線）：

- S1／S2：drag 使某列排空 → 原地保留為空占位列（非消失、非移到列尾）
- S3：select 指派到已存在的空占位列（落列尾）
- S4：select 先排空一列（變 pending）、再把另一段用 select 指派**進
  這個中間 pending slot**（插入語意最刁鑽——真實列在中間插入、其後
  真實列全部編號 +1）
- S5：移除鈕清空整列（唯一段）→ 列直接消失、不留 pending
- S6：新增兩個暫存列、刪除第一個 → 剩一個、編號重排
- S7：drag drain 後重新整頁（reload）→ pending 序列化往返正確
- S8：先 select drain、再把另一段 select 進中間 pending（drag 版
  S4，但用 drag 完成排空）
- S9：drain 後刪除**中間**的 pending → 其後真實列編號重排

九案彼此高度重疊在同一組底層不變量（`planSegmentMove` 純函式，已有
node 單元測試覆蓋組合矩陣——見 `row-slots.test.ts`），e2e 層真正該
補的是**純函式測不到的部分**：瀏覽器原生 DnD 事件鏈是否真的觸發到
這條邏輯、DOM 是否真的按 slots 結果重繪、`<select>` option 是否正確
增刪。基於此，建議 T1.6 收：

1. **S1**（drag 排空、保留空占位列）——多列拖曳基本盤已收的
   cross-row-drain 即為 S1 的近親案例（唯一段拖離、來源列收攏），
   若 T1.6 想省一案可以直接讓 cross-row-drain 順便斷言「原列變
   empty placeholder 而非消失」升級成 S1 本尊，不必分開兩案。
2. **S4**（select 指派進中間 pending）——插入語意最刁鑽的一案，
   純函式測試涵蓋不到「使用者連續兩次 select 操作」這種跨步驟真實
   互動序列，最值得留一支 e2e 案守住。
3. **S9**（刪除中間 pending、編號重排）——刪除路徑與新增／指派路徑
   是兩條獨立程式碼路徑，S1/S4 都測不到它。
4.（預算允許再加）**S7**（drag drain 後 reload）——序列化往返是
   S1–S9 裡唯一牽涉 `localStorage` round-trip 的情境，值得留一案
   防止「DOM 態正確但存檔格式漏欄位」這類問題。

S2／S3／S5／S6／S8 建議**不收 e2e**：S2 與 S1 對稱、S3 與 S4 的
「落列尾」分支被 S4 間接覆蓋、S5／S6 是純點擊操作（無 DnD 原生事件
風險，已被 `row-slots.test.ts` 的純函式測試充分覆蓋）、S8 是 S4 的
drag 版本（drag 建立 pending 的可靠性已被「多列拖曳基本盤」驗證，
不必為同一件事再測一次）。

### 單案成本估算（依 PoC 實測的三種操作原型換算，headless）

本 PoC 實測了三種操作原型的單輪耗時（headless、含全新瀏覽器啟動＋
seed＋navigate＋操作＋驗證＋teardown 全程）：

| 操作原型 | 實測耗時 | 樣本數 |
|---|---|---|
| 單次 drag（同列或跨列皆同量級） | ~4.5–4.7 s | 13（10 same-row-swap + 3 cross-row-drain） |
| 單次 select-move | ~2.85–2.94 s | 3 |

S1–S9 的每一案由 1–2 個這類原型操作組成，換算：

| 情境 | 組成 | 成本估算（依實測原型換算，非直接量測） |
|---|---|---|
| S1 | 1× drag | ~4.5–4.7 s（**已直接實測**，非換算） |
| S4 | 2× select | ~5.5–6 s（單次 select ~2.9s，兩次操作間還有一次額外 `Runtime.evaluate` 快照，估 +0.2–0.5s） |
| S9 | 1× select-drain + 1× click 刪除 | ~3.5–4 s（click 操作比 select 更輕量，估比純 select-move 案略低） |
| S7 | 1× drag + 1× reload | ~5.2–5.5 s（drag 基礎 4.5–4.7s + reload 固定 ~700ms delay） |

四案合計（若全收）**約 18–20 秒**；三案（S1/S4/S9）**約 13–15 秒**
。加上「多列拖曳基本盤」的同列交換與跨列拖（若不與 S1 合併另計，
各 ~4.6s），T1.6 完整拖曳／slots 相關 e2e 迴歸集總耗時預估落在
**20–30 秒**區間（headless、逐案重啟 session），CI 可接受。

## 五、已知限制與風險

1. **`taskkill /T /F` 對 Chromium 分離行程無效**——headed 模式下
   實測 10 輪後仍殘留 17 個 `msedge.exe`。已在 `poc.mjs` 加
   `sweepOrphanEdge()`（PowerShell `Get-CimInstance` 依 command line
   關鍵字強制關閉）作為收尾保險，但**只在小輪數（6 輪）驗證過掃尾
   後零殘留**，未在 10+10 全量、17 殘留的規模下重新驗證掃尾能否
   一次清空——T1.6 落地時建議把這步驟當一等公民（不是事後補救），
   並考慮每輪都做一次輕量掃尾而非只在批次結尾做一次，避免中途累積
   拖慢後續輪次（本 PoC 觀察到的「第 6 輪起單輪耗時暴增 13 倍」現象
   極可能就是這個累積效應）。
2. **耗時暴增的確切因果鏈未完全坐實、且不只是批次內累積**——除了
   10 輪批次內「第 6 輪起跳升」的時間相關性之外，追加驗證發現**乾淨
   狀態下單獨跑 1 輪 headed 也可能耗時 47 秒**（見上方「執行形態」
   追加驗證段落），代表 headed 耗時變異的成因比「單純累積殘留行程」
   更複雜（推測與本機防毒即時掃描／視窗管理員行為有關，但未逐輪量測
   CPU／記憶體／handle 數或停用防毒對照組來直接證明）。**結論不變
   （T1.6 預設 headless）、但不應把「累積殘留行程」當作 headed 變慢
   的唯一或完整解釋**——若 T1.6 日後仍需支援 headed 除錯模式，應
   對耗時抱持「本質上不可預期、可能是數秒也可能是近一分鐘」的預期，
   而非只設一個小倍數的 timeout。
3. **本 PoC 只驗證了「同列相鄰互換」與「單段跨列拖曳排空」兩種幾何
   ，S1–S9 完整九案未逐一實作／實測**——涵蓋清單建議的成本估算是
   依「drag 原型」「select 原型」兩種已實測操作換算組合出的，S4／
   S7／S9 本身的實際耗時與程式化驗證邏輯留給 T1.6 落地時撰寫、非
   本 PoC 直接交付。
4. **`≥3` 列版面必須先 `scrollIntoView({behavior:'instant'})` 再取
   座標**，否則系統性失敗（見上方「多列拖曳基本盤」段落）——這不是
   flake，是任何多列（尤其 3 列以上）e2e 案的必要前置步驟，T1.6 的
   座標 helper 若漏了這步，日後新增涉及≥3 列的案例會全部莫名其妙地
   卡在「`Input.dragIntercepted` 從未發生」。
5. **headed 視窗雖挪至螢幕外（`--window-position=2400,50`）減少視覺
   干擾，但仍會短暫佔用前景焦點／工作列**——若使用者在 PoC 執行期間
   操作機器，headed 輪次仍可能造成輕微干擾；headless 完全無此問題，
   這也是建議預設 headless 的理由之一。
6. **本 PoC 建置一次 dist 後即重複使用**（未逐輪重建），與 T1.6 實際
   CI 流程（通常先 `npm run build` 一次、後續全部 e2e 案共用同一份
   `dist`）一致，非額外風險，僅記錄此假設供對照。

## 附錄：原始輸出（10+10 全量 flake 測，含 cross-row／select-move 各 3 輪）

```
[poc] Edge found: C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe
[poc] preview ready at http://localhost:4173

=== Flake measurement: same-row-swap × headed × 10 ===
[poc] round headed-0 ... PASS (4754ms)
[poc] round headed-1 ... PASS (4563ms)
[poc] round headed-2 ... PASS (4479ms)
[poc] round headed-3 ... PASS (4598ms)
[poc] round headed-4 ... PASS (4925ms)
[poc] round headed-5 ... PASS (4614ms)
[poc] round headed-6 ... PASS (59477ms)
[poc] round headed-7 ... PASS (59769ms)
[poc] round headed-8 ... PASS (59502ms)
[poc] round headed-9 ... PASS (59524ms)

=== Flake measurement: same-row-swap × headless(new) × 10 ===
[poc] round headless-0 ... PASS (4610ms)
[poc] round headless-1 ... PASS (4576ms)
[poc] round headless-2 ... PASS (4594ms)
[poc] round headless-3 ... PASS (4783ms)
[poc] round headless-4 ... PASS (4597ms)
[poc] round headless-5 ... PASS (4777ms)
[poc] round headless-6 ... PASS (4488ms)
[poc] round headless-7 ... PASS (4675ms)
[poc] round headless-8 ... PASS (4806ms)
[poc] round headless-9 ... PASS (4618ms)

=== Coverage cost sample: cross-row-drain × headless(new) × 3 ===
[poc] round crossrow-0 ... PASS (4524ms)
[poc] round crossrow-1 ... PASS (4474ms)
[poc] round crossrow-2 ... PASS (4615ms)

=== Coverage cost sample: select-move × headless(new) × 3 ===
[poc] round selectmove-0 ... PASS (2896ms)
[poc] round selectmove-1 ... PASS (2914ms)
[poc] round selectmove-2 ... PASS (2848ms)

=== SUMMARY ===
[
  { "label": "headed/same-row-swap", "total": 10, "pass": 10, "avgMs": 26621, "symptoms": [] },
  { "label": "headless/same-row-swap", "total": 10, "pass": 10, "avgMs": 4652, "symptoms": [] },
  { "label": "headless/cross-row-drain", "total": 3, "pass": 3, "avgMs": 4538, "symptoms": [] },
  { "label": "headless/select-move", "total": 3, "pass": 3, "avgMs": 2886, "symptoms": [] }
]
```

（此次 10+10 全量跑在加上 `sweepOrphanEdge()` 收尾機制**之前**；
`tasklist` 事後檢查發現 17 個殘留 `msedge.exe`，已手動清除。加上
`sweepOrphanEdge()` 後以 2+2+1+1 輪小樣本重新驗證，收尾後
`tasklist` 確認零殘留——但如「已知限制」第 1 點所述，未在同等 17
殘留規模下重新驗證。）
