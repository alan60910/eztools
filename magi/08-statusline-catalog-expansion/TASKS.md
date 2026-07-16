# Tasks — Statusline Builder 目錄擴充（06c）＋前置加固

> Source: PLAN.md（Rev 3）  •  Sprint: magi/08-statusline-catalog-expansion/
> 治理句（全 sprint 適用）：spike 結論若需改契約、前綴表／ASCII 替代
> 字面定案，一律回報使用者核可後才動 production 檔。

## Milestone 1: 前置加固（回歸網＋PoC）
**Goal:** 動 engine 前把回歸網鋪好：引擎邊界測試、jsdom 路線定案、CDP e2e 重建。
**Acceptance:** `npm test` 全綠（含新測試）；`npm run test:e2e` 本機可重跑（或 skip 訊息明確）；S8 PoC 報告定案 D-b 依賴形態。

- [x] 🔀 [A] T1.1 — jsdom 共存 smoke（D-d 客觀門檻）：記錄安裝前 `npm test` 基準時間 → 安裝 jsdom（devDep、exact pin）＋最小 smoke 檔（`// @vitest-environment jsdom`＋`document.createElement` 斷言）→ 全量並跑全綠、總時間 ≤ 基準 +10%、node-environment 測試輸出零變化。任一不過：回報並回退 D-d 選項 B（純函式接縫），後續 T1.4 改走 B 形。
- [x] 🔀 [B] T1.2 — `emit-ansi.test.ts` 補 `toAnsi([])` 零列文件性邊界測試（明示「全隱藏恆 `[[]]`」不變量的歸屬與理由）。
- [x] 🔀 [C] T1.3 — 多列 × `powerlineArrow=false` 真執行案補位：`multirow-golden-configs.ts` 增 config、golden 重生（僅此變因）、`pipeline.integration.test.ts` 對應 case。
- [x] T1.4 — `renderRuns` spec→DOM 測試（依 T1.1 結果走 jsdom 或純函式接縫形）：斷言 element 結構、className、run 文字與 aria 承載（bar run 的 `ariaText: ''` 斷言骨架先留 TODO 錨點，M4 補內容）。
- [x] T1.5 — S8 PoC：零新依賴 CDP 全鏈（`--remote-debugging-port` 啟 Edge → `fetch /json/version` → 內建 WebSocket → navigate → `Input.setInterceptDrags` → 合成拖曳一案）＋headed vs headless flake 率各 10 輪＋`vite preview` 自起自收——產出 sp8/REPORT.md：依賴宣告（零依賴 or 提案最小 CDP client）、執行形態（headed？逐案重啟 session？）、e2e 涵蓋清單建議（多列拖曳基本盤必收、slots 九情境擇代表）。
- [x] T1.6 — `scripts/e2e-statusline.mjs`＋`package.json` scripts 增 `test:e2e`：依 T1.5 定案重建 CDP 整合案（scratchpad cdp-*.mjs 若本機尚存作底本）；自帶瀏覽器探測→明確 skip；涵蓋清單依 T1.5 報告（回報使用者過目後定）。

## Milestone 2: Spikes（動工前置 gate——全過才進 M3）
**Goal:** 五支 spike 結論落檔，把「動工後才炸」的風險前置消化。
**Acceptance:** sp2／sp4／sp5／sp6／sp7 各有 REPORT.md；需契約修訂處已回報使用者核可並回寫 PLAN；無未決 gate。

- [x] 🔀 [A] T2.1 — **S7（gate）**`↺`(U+21BA)／`█`(U+2588)／`░`(U+2591) 真機 Claude Code 渲染：沿 `magi/07-.../sp3/` harness 出最小 case（`█░` 20 格＋`↺ 2h (14:30)` × {plain, powerline} × {PS 5.1, bash}）真機截圖。失守 → 回報使用者核可 ASCII 替代字面（`~`／`#`／`-` 預想），僅字面替換、4-run 形不變。
- [x] 🔀 [B] T2.2 — S2 now 注入形兩半：jq `((env.STATUSLINE_NOW_EPOCH // (now|floor))|tonumber)` 三路（未設／合法／非數字）；ps1 同三路 ×{PS 5.1, pwsh 7}，驗 `[long]$null`＝0 陷阱、釘 `[string]::IsNullOrEmpty` 顯式分支 idiom（缺席回落真時鐘、非數字不中止）。
- [x] 🔀 [C] T2.3 — S4 bar run 粒度 byte 驗證：手寫目標 ANSI bytes 依「bash／ps1 × plain／powerline」四格出案（powerline 併單元素、plain 逐 run）；補 `percent-reset × bar`、`powerline-noarrow × bar`、`auto × powerline`（arrow／noarrow）組合；auto 展開後 autoFg 對比。
- [x] 🔀 [D] T2.4 — S5 golden 規模計時：代表場景清單（全段單列／多列混排／bar 邊界 0·49·50·100·null／auto 五級＋unknown）一輪計時；超 5 分鐘預算 → 回報縮場景 vs 分 shard 由使用者裁決。
- [x] 🔀 [E] T2.5 — S6 Windows 時區：`tzutil /s` 切非 UTC 跑現有 percent-reset gate＋golden 判定現行體制（同機 oracle vs 固定字節）；三後端同 epoch `HH:MM` 對拍（PS 5.1／pwsh 7／jq／Node）；釘無 DST 時區（UTC／Asia/Taipei）＋跨月／跨年 epoch 驗 `MM/DD`；產出兩結局判定 →（a）byte-exact 釘樁形 or（b）oracle 形，TECHSTACK delta 措辭隨之定稿。
- [x] T2.6 — spike 彙整 gate：五份 REPORT 收攏、需修契約處回報使用者核可並回寫 PLAN（含 S7 字面定案、S6 結局選擇、S5 預算裁決）；PLAN 無未決 gate 才放行 M3。

## Milestone 3: 資料形狀（node 純邏輯層）
**Goal:** 30 段目錄、SegmentColor／bar 清洗、雙模板、注入面擴充全部落地且 node 可測。
**Acceptance:** `npm test`＋`npm run typecheck` 全綠；新 5 段前綴表經使用者核可；config 清洗矩陣（auto／bar／fgOverride）全覆蓋。

- [x] T3.1 — **前綴表核可 gate**：developer 依 `prefix-table.md` 風格擬新 5 段正式前綴（暫定 `in:`／`out:`／`cache:`／`r5h:`／`r7d:`）＋ariaText 對照 → 回報使用者核可後才動 `segments.ts`；核可結果回寫 prefix-table.md。
- [x] T3.2 — `segments.ts` +5 段 descriptor：`autoColor?: {palette, key?}`／`expiresAtPath?: TriPath` 型別新通道（model 段補掛 `autoColor: {palette:'model', key: .model.id 三式}`、effort 段 `{palette:'effort'}`、reset 段掛 `expiresAtPath: resets_at`）；`CurrentUsage` 具名型別；cache-hit／token-in／out 三式取值層公式（percentage 主值恆 `number | null`、分母 0→0、任一輸入欄 null→null、**不得**取節點）；`segments.test.ts` 目錄級斷言＋公式 partial-null 矩陣。
- [x] T3.3 — `SegmentCatalog` 注入面擴充：介面加 `barEligibleIds`／`autoEligibleIds`（ReadonlySet；導出依據＝`category==='percentage'`／有 `autoColor` 欄）；`SEGMENT_CATALOG` 導出實作；config.test.ts 假目錄同步；row clamp 上界 29 斷言同步。
- [x] T3.4 — `config.ts` 清洗：`SegmentColor` 型別＋`sanitizeSegmentColor(raw, allowAuto)`（先判 auto、段別限定吃 `autoEligibleIds`）；`fgOverride` 一律拒 `auto`（維持三態封閉 `sanitizeColorSpec`）；`bar?: boolean` 清洗（限 `barEligibleIds`、缺省 false）；config.test.ts 矩陣（含手改存檔 `{fgOverride:{kind:'auto'}}` 防注入案）。
- [x] 🔀 [B] T3.5 — `threshold.ts` 雙模板登記：`'limit-gradient'`＝`[244,246,247,249,250,34,34,34,220,196]`＋`'remaining-gradient'`＝逆序，進 `THRESHOLD_TEMPLATE_IDS`／`THRESHOLD_TEMPLATES`（既有 4 套不動、select 尾插）；10-tuple 常數＋走法註解比照現行；threshold.test.ts。

## Milestone 4: 引擎與三後端
**Goal:** resolve／emit-ansi／emit-bash／emit-ps1／emit-settings／mock-data 全面落地新段與 bar／auto／倒數，三後端 byte-exact。
**Acceptance:** `npm test` 全綠（resolve bar 四格 bytes＝S4 手寫值）；golden 重生 diff 僅白名單變因；ubuntu＋windows 真執行 gate 綠（斷言強度依 S6 結論）。

- [x] T4.1 — `resolve.ts`（上半）：`ResolveInput.now`＋mock 情境 now 消費；`expiresAtPath` 通用死值規則（`isValueDead` 後追加，零 id 特判）；倒數段顯示格式兩套階梯（全 floor、過期 hide）；resolve.test.ts（含 cache-hit 全 0→`0%` resolve 層斷言）。
- [x] T4.2 — `resolve.ts`（下半）：bar 4-run（run4＝`' '+pct%+suffix+pad` 單一運算式、填格 `max(0,min(20,floor(pct/5)))`、null 退單 run、threshold undefined 退段主色、head 空佔位）；auto 展開（palette 查表＋autoFg 對展開後 index）；filled／empty run `ariaText:''`＋倒數段 `↺` ariaText 顯式代換；檔頭「powerline 恆單 run」不變量改寫；resolve.test.ts bytes＝S4 目標值。
- [x] 🔀 [A] T4.3 — `emit-bash.ts`：bar 累加器（plain 四元素＋`segstart 1/0/0/0`；powerline 併單元素）；倒數全 jq（`strflocaltime`＋`STATUSLINE_NOW_EPOCH` S2 idiom）；auto case 平行陣列（emit 期預算、執行期查表、`case "$id" in claude-*-*)` 大小寫敏感前綴）；dash 分派改 `nullPolicy` 驅動（`emitOther` 增 dash 分支）；tokens 整數縮寫；emit-bash.test.ts。
- [x] 🔀 [B] T4.4 — `emit-ps1.ts`：同構落地（bar 併單元素／plain 沿閾值分裂先例；`[char]0x21BA/0x2588/0x2591` 串接值建構式；`DateTimeOffset`＋`InvariantCulture`——**順修 `Format-ResetsAt`**；epoch `IsNullOrEmpty` 分支；auto 用 `-clike`／`StartsWith` 禁 `-match`；dash 分派同 T4.3）；emit-ps1.test.ts 補「引擎自產字面純 ASCII」機械化斷言（排除註解行＋使用者 prefix 通道）＋文化不變性斷言。
- [x] 🔀 [C] T4.5 — `emit-settings.ts` `needsRefreshInterval` 補 reset-5h／reset-7d 條件＋測試；`mock-data.ts` 補 cache 兩欄＋四欄全 0＋partial-null 矩陣＋各情境固定 `now` 欄（`resets_at` 改 now 相對值）＋mock-data.test.ts。
- [x] T4.6 — 整合收攏：`pipeline.integration.test.ts` 擴 case（bar×倒數×auto 同列、`auto × powerline`）；golden 全量重生＋逐檔審 diff（白名單：新段＋Format-ResetsAt 順修）；CI 時區釘樁依 S6 結局 (b) 取消（workflows 零改動，PLAN Rev 4）；ubuntu＋windows 真執行 gate 綠。

## Milestone 5: UI＋deltas＋驗收
**Goal:** 30 段目錄可操作、bar／auto／模板 UX 落地、專案級文件 deltas 實改、全 gate 收攏。
**Acceptance:** 手動驗收清單全過（含 7 列複刻）；四份專案級文件與 Spec deltas 宣告一致；`npm test`／`typecheck`／`build+verify:dist`／`test:e2e` 全綠。

- [x] T5.1 — 目錄 UI 30 段＋bar checkbox：百分比段限定顯示；切開時僅 `threshold===undefined` 寫入預設模板並同步 `templateSelect.value`；已有自訂桶保留＋提示；powerline 下 fgOverride 停用＋提示；三處提示皆經常駐 live region 播報。
- [x] T5.2 — auto 配色選項（model／effort 段限定 UI）＋`percent-reset` variant × reset 段同列並開重複提示（live region）；index.html／style.css 對應。
- [x] T5.3 — `render-preview.ts`：bar／倒數／auto 預覽（情境 now、同源展開）；T1.4 的 bar `ariaText` 斷言補完；render-preview 測試全綠。
- [x] T5.4 — `fixtures/` 落 7 列複刻配置 JSON＋手動驗收：bar＋數值＋倒數同列、`context-remaining` 逆序模板顏色方向、倒數段真機 Claude Code 渲染、auto 預覽 vs 產出腳本一致、SR 播報三處——結果記 WORKS.md，發現契約缺口即回報。
- [x] T5.5 — Spec deltas 實改：root SPEC.md（Components icon 修正＋06c 敘述＋Status 段）、CLAUDE.md（Run/test commands 增 `test:e2e`）、magi/PRD.md（Goals icon 修正＋能力半句）、magi/TECHSTACK.md（Framework/runtime emoji 措辭修正＋Test framework jsdom/test:e2e＋Deployment 依 S6 定稿）——與 PLAN 宣告逐條對帳。
- [x] T5.6 — 全 gate 終驗：`npm test`／`npm run typecheck`／`npm run build && npm run verify:dist`／`npm run test:e2e` 全綠；數字錨點抽驗（49%→9 格、50%→10 格、100%→20 格、負值→0 格；分母 0→`0%`；過期→隱藏；`1234`→`1.2k`）；TASKS 全勾後交 `/magi:review-code`。

## Milestone 6: 無資料呈現與重置後綴升級（真機回饋追加）
**Goal:** 使用者真機首用即撞到的兩處呈現缺陷一次修正——百分比段無資料標記，與 percent-reset 後綴升級為倒數形。
**Acceptance:** `npm test`／`typecheck`／`build+verify:dist`／`test:e2e` 全綠；三後端 byte-exact（resolve.ts 為 oracle）；golden 重生 diff 僅本里程碑白名單變因。

> **契約（使用者 2026-07-14 拍板，見 WORKS.md 同日條目）**
> - **C1 百分比無資料標記**：`nullPolicy:'dash'` **且** `category==='percentage'` 且主值 null → 顯示 `(n/a)`（新常數，取代 `DASH_TEXT`）。token-in／token-out（dash 但 `category:'always'`）**維持 `--`**——閘門走 category，不得改全域 `DASH_TEXT`、不得 id 特判。不套閾值色（沿契約 3）。
> - **C2 bar×null 不再退單 run**：`bar && category==='percentage'` 時**不論主值是否 null 皆走 4-run**（`resolve.ts:374` 的 `&& !isDash` 撤除）。null → filled=0、`░`×20、run4＝` (n/a)` ＋後綴＋pad；bucket 退段主色（isDash 時 threshold 本就為 null）；fgOverride 停用維持；filled／empty run 的 `ariaText:''` 維持。
> - **C3 percent-reset 後綴升級**：` (HH:mm)` → 倒數形——rate-5h 用 `formatResetCountdown5h`（` ↺ Xh (HH:MM)`）、rate-7d 用 `formatResetCountdown7d`（` ↺ Xd (MM/DD HH:MM)`）。以 descriptor 欄驅動（`resetsAt` 增 countdown kind 欄），**禁 id 特判**。`resets_at` null 或已過期（`now >= resets_at`）→ 後綴 `''`（沿倒數段 hide 規則）。`resetsAtSuffix` 因此需要 `now`。
> - **C4 aria**：後綴含 `↺` → 沿倒數段慣例代換「重置」（使用者 prefix 通道字面不代換）。
> - **C5 now 注入閘門**：percent-reset 變體現在需要 `now` → ps1 `nowInjectionLines` 閘門由「有倒數段」擴為「有倒數段 **或** 有 percent-reset 變體的 rate 段」；bash 每段內聯 `$now` 沿 S2 idiom。
> - **C6 refresh interval**：`emit-settings.ts` `needsRefreshInterval` 補 percent-reset 變體條件（畫面含倒數即需刷新）。

- [x] T6.1 — **oracle 層**（`segments.ts`＋`resolve.ts`）：C1 `NA_TEXT` 常數＋category 閘門；C2 bar×null 走 4-run；C3 `resetsAt` descriptor 增 countdown kind 欄＋`resetsAtSuffix(v, now, kind)` 升級（null／過期→`''`）；C4 後綴 `↺` aria 代換；`segments.test.ts`／`resolve.test.ts` 補案（bar×null 四 run bytes、bar 關×null `(n/a)`、token 段仍 `--`、percent-reset 5h／7d 兩形、過期→無後綴）。
- [x] 🔀 [A] T6.2 — `emit-bash.ts` 同構：`(n/a)` dash 分派 category 閘門；bar×null 四元素（`segstart 1/0/0/0`）／powerline 併單元素；percent-reset 後綴改倒數 jq pipeline（沿 `jqResetCountdown5h/7d` 與 S2 `$now` idiom）；emit-bash.test.ts。
- [x] 🔀 [B] T6.3 — `emit-ps1.ts` 同構：同上＋C5 now 注入閘門擴充；`↺`／`░` 續走 `[char]0x21BA`／`[char]0x2591`（引擎自產字面純 ASCII 機械化斷言不得破）；emit-ps1.test.ts。
- [x] T6.4 — 整合收攏：C6 `emit-settings.ts`＋測試；`pipeline.integration.test.ts` 補案（bar×null、percent-reset 倒數後綴 ×{plain,powerline}）；golden 全量重生＋逐檔審 diff；全 gate 終驗（`npm test`／`typecheck`／`build+verify:dist`／`test:e2e`）。

## Milestone 7: review-code 收尾（commit 前必修）
**Goal:** 多方位審議（7 角度）判 REQUEST-CHANGES；把 1 Critical＋5 Important＋隨手 N1 收掉，其餘 16 項 Note 已入 DRIFT.md → BACKLOG。
**Acceptance:** `npm test`／`typecheck`／`build+verify:dist`／`test:e2e` 全綠；三類垃圾檔不入庫且 `.gitignore` 固化；`git status` 乾淨可交 `/magi:commit`。
> 判準：`MAGI_CODE_REVIEW.md`＋`DRIFT.md`（2026-07-15，7 角度合議＋協調者親驗）。

- [x] T7.1 — **倉庫衛生（協調者自理）**：commit 排除 `magi/05-.../sp5/tools/jq-windows-amd64.exe`（1MB 二進位、面板裁定不入）＋`magi/06-.../.xreview-prompt.md`＋`magi/08-.../.xreview-prompt.md`；`.gitignore` 固化 `magi/**/tools/*.exe`＋`**/.xreview-prompt.md`。（C1／I1）
- [x] 🔀 [A] T7.2 — 文件對帳：README auto 配色改「06c 已交付」（刪「目前無 `{kind:'auto'}`」）；`CLAUDE.md`／`TECHSTACK.md` 刪 `--passWithNoTests`；「25 段」統一 30（`segments.ts:23`／`index.html:242` 分佈 12/5/10/3）；移除「暫 stub」字樣（`segments.ts:66/685/910`）；file:line 漂移三筆改符號引用（`main.ts:986`／`emit-ps1.ts:850-851`）；TASKS.md C6 註記「已涵蓋」。（I2／N6／N7／N8／N9／C6 文字）
- [x] 🔀 [B] T7.3 — `fixtures.test.ts` 去環境耦合：`git-branch` 為非決定論欄位（真執行讀當下 repo branch，oracle 讀 mock 'DEV'），現靠當前分支＝DEV 巧合。改法：把 `git-branch` 一併納入 `maskClock` 遮罩（或 runner 釘受控 temp repo cwd，或真執行版停用 git-branch 段）——使任何分支／CI detached 皆綠。（I3）
- [x] 🔀 [C] T7.4 — `main.ts` a11y 兩修：(1)`syncFgOverrideDisabled` 迴圈加 `seg.enabled` 閘（停用段不入停用集、不播報）；(2)`init()` 末端 `refreshOutputs()` 後靜默 seed `duplicateResetPairIds`（載入既有重複＝已知、不播報，之後僅轉場播）。各補 DOM 測試。（I4／I5）
  - **I4b（修 I4 引入的回歸）**：加 `enabled` 閘後，`setSegmentEnabled` 重新啟用 powerline+bar 段時 fgOverride picker 停在過期停用態 → `setSegmentEnabled` 於 `commitConfig()` 後補靜默 `syncFgOverrideDisabled()`（棄用回傳）＋DOM 回歸案。
  - **I4c（同族第二進入點）**：`performRowDeletion`（整列刪除）繞過 `setSegmentEnabled`、同樣繞過收斂 → 同補靜默 `syncFgOverrideDisabled()`＋DOM 回歸案。grep 證停用段僅此二進入點，家族收尾。
- [x] 🔀 [D] T7.5 — `segments.ts:499` `computeCacheHitPercentage` `usage === null` → `== null`（對齊內層欄位守衛、jq/ps1 鏡像、檔案 `v == null` 慣例；消除缺席 `current_usage` → 解構 undefined 崩潰的 oracle/mirror 分岔）＋補「缺席 current_usage → null」測試。（N1）
- [x] T7.6 — M7 終驗：全 gate 綠＋`git status` 三類垃圾檔確認不在待提交集；TASKS 全勾後交 `/magi:commit`（sprint 模式，帶 DRIFT.md）。
