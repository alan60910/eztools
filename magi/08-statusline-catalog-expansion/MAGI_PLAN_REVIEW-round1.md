# 🧠 MAGI Plan Review — Statusline Builder 目錄擴充（06c）＋前置加固

**Sprint:** magi/08-statusline-catalog-expansion/ • **Document:** PLAN.md（Rev 1）
**Round:** 1 • **Date:** 2026-07-12

## Dashboard

```
┌──────────────────────────────────────────────────────────┐
│  VERDICT: REQUEST-CHANGES（四票一致）                     │
├──────────────────────────────────────────────────────────┤
│  Mode: majority      Threshold: vote_sum > 2.0           │
│  OK weight: 4 / 4    Degraded: no                        │
├──────────────────────────────────────────────────────────┤
│  ✅ claude:fable  ✅ claude:opus                          │
│  ✅ claude:sonnet ✅ claude:haiku                         │
├──────────────────────────────────────────────────────────┤
│  🔴 Critical: 2     🟡 Important: 4                      │
│  🟢 Minority: 14    🔬 Spikes: 3                         │
└──────────────────────────────────────────────────────────┘
```

> ⚠️ 陣容揭露：本機無 gemini／codex CLI，四票均為 claude 家族多模型
> （fable-5／opus／sonnet／haiku）——同 vendor、無跨 vendor 驗證。

## Verdict
**REQUEST-CHANGES**。四位 reviewer 一致認定工程骨架扎實（現況宣稱逐條
屬實、公式／色票／run 粒度／floor 不變量與傘狀 Rev 3 零漂移、D-a／D-b／
D-c 論證合理），但 PLAN 錨定於**傘狀 Rev 3**、未與 **07 PLAN Rev 3–13
裁決軌跡對帳**，產生一個「照做必交付壞功能」的否決級缺陷（emoji 已被
真機裁決推翻）與一個護欄穿透（ps1 純 ASCII）。修正面向明確、不動大宗
形狀，預期 Rev 2 可過。

## 🔴 Critical (adopted)

### C-1. [vote: 4/4 — fable＋opus＋sonnet＋haiku] 新 5 段 glyph 錨定在已被 07 M1.5 推翻的 emoji 對照表
- Where: PLAN.md Goals（📥📤🎯🔄📆「emoji 已裁決」）＋契約來源節
- 07 PLAN Milestone 1.5（2026-07-11 使用者裁決）因**真機實測「statusline
  完全不接受 emoji」**推翻傘狀 emoji 對照表，25 段 `icon.glyph` 已全改
  英文短 token＋冒號前綴（`segments.ts:439/453/594/612`：`'model:'`／
  `'cwd:'`／`'5h:'`／`'7d:'`；`:196` 註解明文「推翻 06a 定案，見
  prefix-table.md」）。照本 PLAN 實作＝25 ASCII 前綴段＋5 emoji 段混種
  目錄，且新段在使用者真機必然渲染失敗，與自身 Verification 矛盾。
  haiku 另以「5 新 emoji 未經 S1 寬度矩陣」角度投同題。
- **連帶（fable 單票細項，併入本項修正範圍）**：Spec deltas 只「補」不
  「修」——root SPEC.md／PRD.md／TECHSTACK.md 現文「圖示採通用 emoji／
  原生 emoji 渲染」是 07 M1.5 漏宣告 delta 的遺留漂移，本次 modify 同一
  條目時應一併修正，否則死敘述再帶一輪。
- **連帶（opus 單票細項）**：「傘狀 Non-Goals 沿用（不做拖曳跨列）」為
  失效引用——07 Rev 5 已解禁跨列拖曳並出貨，措辭需改為「不變更已出貨
  的跨列拖曳語意」。
- Suggested fix: 5 新段改 ASCII 前綴體制（比照 M1.5：developer 擬
  prefix 對照表 → 使用者核可 → 才動 `segments.ts`）；契約來源節改為
  「傘狀 Rev 3＋07 PLAN Rev 3–13 裁決」並逐條清掉失效引用；三處 deltas
  的 New content 補 icon 敘述修正。

### C-2. [vote: 3/4 — fable＋opus＋sonnet] `↺`／`█`／`░` 非 ASCII 值字面未釘跳脫——穿透 emit-ps1「產出腳本純 ASCII」護欄
- Where: PLAN.md §4（bar／倒數段）；對照 `emit-ps1.ts:125-133`、07 PLAN 護欄節
- 07 已把「`.ps1` 產出純 ASCII（`[char]` 碼位跳脫）」釘為護欄（根因：
  PS 5.1 無 BOM 讀檔走 CP950 誤解析；複製貼上路徑無 BOM）。現行跳脫
  只覆蓋 **icon glyph 路徑**（`iconGlyphExpr`）；bar 的 `█░` 與倒數的
  `↺` 是**值路徑執行期建構**的新字面，PLAN 隻字未提跳脫——照寫即破
  護欄，windows byte-exact gate 失義。S4 只驗 ANSI bytes 等值，不涵蓋
  `.ps1` 原始碼編碼安全。
- Suggested fix: §4 釘死 `[char]0x21BA`／`0x2588`／`0x2591` idiom；
  `emit-ps1.test.ts` 補「產出腳本恆純 ASCII」機械化回歸斷言（隱性
  不變量升級為測試把關）。

## 🟡 Important (adopted)

### I-1. [vote: 3/4 — fable＋opus＋sonnet] jsdom＝新 devDependency 且逆轉「vitest 無 jsdom」明文慣例，未宣告
- 至少 5 處原始碼註解明文「本專案 vitest 無 jsdom」為刻意決策（純函式
  接縫慣例）；jsdom 引入＝新增依賴＋新增 vitest environment 設定，PLAN
  無「新依賴」節（傘狀／07 皆有此節先例），TECHSTACK **Test framework**
  段無 delta（06a 有逐筆記錄 devDependency 增刪的對帳慣例）。
- Suggested fix: PLAN 補「新依賴」節＋TECHSTACK Test framework delta；
  或改沿用純函式接縫（再拆規格函式）並在 Design options 論證二擇一。

### I-2. [vote: 3/4 — sonnet＋opus＋fable] [deltas] `npm run test:e2e` 對 root CLAUDE.md Run/test commands 未裁決
- CLAUDE.md 現僅列 dev／build／preview／test 四行；`test:e2e` 屬本機
  限定、需瀏覽器、不進 CI 的新 gate，是「設計隱含但未宣告的專案級文件
  衝擊」。有 `typecheck`／`verify:dist` 未列的免列先例可循，但應明文
  裁決（列入 vs 明文豁免），不可默認。
- Suggested fix: deltas 補一筆 CLAUDE.md（建議列入並註明「本機限定、
  需 Edge/Chromium、不進 CI」），或明文豁免。

### I-3. [vote: 3/4 — fable＋opus＋sonnet] `SegmentCatalog` 注入面缺段別資訊——bar／auto 段別限定無乾淨實作路徑
- `sanitizeSegment` 只持有 id；`SegmentCatalog` 僅 `{ids, variantsById}`
  （`config.ts:28-33`），且 config.ts 檔頭明文不依賴 segments.ts。
  「bar 限百分比段」「auto 限 model/effort 段」要嘛硬編 id 清單（row
  clamp 刻意避開的反模式），要嘛擴充注入面——PLAN 未宣告此型別變更。
- Suggested fix: 擴充 `SegmentCatalog`（如 `categoryById` 或
  `barEligibleIds`／`autoEligibleIds`，由 `SEGMENT_CATALOG` 供給），
  列入 §3 型別契約與 In-scope；config.test.ts 假目錄同步。

### I-4. [vote: 3/4 — opus＋haiku＋fable] bar「靜態 4-run」的 null／suffix／padding 邊界不成立
- (1) **null**：`joinRow` 對每 run 無條件 emit reset＋色序列，null 與否
  執行期才知——bash/ps1 必須執行期分支「4-run bar ／ 1-run dash」，
  「emit 期定筆數」宣稱破功，run 形狀需明文；(2) **`percent-reset` ×
  bar**：` (14:30)` 後綴掛哪個 run 未釘（現行 `valueText + suffix` 同
  run）；(3) **powerline 無箭頭右 padding** 落點未指定；(4) 填格式無
  下界（負值防禦 `max(0, …)`）；head 空時 4-run 恆定形未明文。任一在
  三後端分歧即 byte-exact 必炸，且直接影響 S4 手寫目標 bytes 的形。
- Suggested fix: 釘死 run 4＝`' ' + pct% + suffix + pad` 單一運算式、
  填格＝`max(0, min(20, floor(pct/5)))`、null 走執行期分支退單 run、
  head 空仍佔位；S4 補 `percent-reset×bar`、`powerline-noarrow×bar`
  兩組合。

## 🟢 Minority（未過票，保留供裁決）

1. [2/4 F＋O] **D-c「無資料損失路徑」措辭過強**——實為有損可接受降級
   （舊碼寫回丟 auto／bar），且嚴格優於 bump（bump 觸發舊碼整份重置
   `config.ts:259`）；改措辭、結論不變。
2. [2/4 O＋S] **auto 配色需 `model.id`，tri-path 現僅帶 `display_name`**
   ——需第二取值通道（如 `colorKey?: TriPath`，`resetsAt` 先例）或明文
   改 display_name 比對；未擇一實作者必分岔。
3. [2/4 S＋H] **auto 清洗型別安全／順序**：`fgOverride` 一律不得收
   `auto`（否則可能污染 SGR 出 `undefined` 字面）；id 檢查須在
   `sanitizeColorSpec` 之前或另立 `sanitizeSegmentColor(raw, allowAuto)`。
4. [2/4 S＋O] **閾值新模板未與既有 4 套登記系統整合**：
   `ThresholdTemplateId` 字面值／登記方式／select 同步（bar 預設寫入時
   `templateSelect.value` 同步）未定；「244→250 漸亮」5 桶取樣未列全
   10 個具體 index（現行模板皆 10-tuple 常數為 golden 單一事實來源）。
5. [2/4 F＋O] **bar 相關 a11y 未釘**：filled／empty run 未顯式
   `ariaText: ''` 會讓 20 個方塊字進列 aria-label（非 PUA、機械
   enforcement 擋不住）；模板寫入／自訂桶保留／fgOverride 停用三處提示
   未接 SPEC「批次／狀態切換經常駐 live region」不變量。
6. [2/4 O＋S] **CDP「收編」措辭與資產狀態**：cdp-*.mjs 僅存 scratchpad
   未簽入 repo（協調者註：本機 session scratchpad 尚存，可作底本，但
   「收編」實質仍近重建）；Vite dev/preview server 啟停歸屬、raw CDP
   零依賴 vs puppeteer 類新依賴未定案。
7. [1/4 O] **`deploy.yml` 也跑 `npm test`**（windows-test job＋build
   job ubuntu）——時區／env 釘樁只改 test.yml 會讓 merge main 後部署
   gate 紅；In-scope 與 TECHSTACK delta 應補 deploy.yml。
8. [1/4 O] **Verification 漏傘狀 06c 明訂的「複刻使用者現役 7 列配置」
   真機驗收**（fixtures 落檔＋bar＋數值＋倒數同列＋逆序模板顏色方向）
   ——唯一能抓「逆序模板裝反」的關卡。
9. [1/4 F] **reset-7d 的 ps1 `MM/dd`／`HH:mm` 為 .NET 文化敏感格式符**
   （`/`／`:` 是 culture placeholder）——非 en-US 機器三後端分岔；應
   `InvariantCulture`，順修既有 `Format-ResetsAt`。
10. [1/4 S] **reset 過期隱藏超出現行 nullPolicy 框架**（`isValueDead`
    為純值形判定）——通用 `expiresAt?: TriPath` 標記 vs id 特判，機制
    形狀未定。
11. [1/4 H] **cache-hit 個別欄位 null（partial null）行為未定義**＋
    全 0 案的測試層級（mock vs resolve）未指明。
12. [1/4 H] **TECHSTACK delta 過早承諾 S6 結論**；Verification 未預協定
    S6 兩種結局（byte-exact vs oracle）的分岔。
13. [1/4 O] **S6 未涵蓋 DST**——釘樁時區建議選無 DST 區（UTC／
    Asia/Taipei）整族消滅；對拍 epoch 集補跨月／跨年點驗 `MM/DD`。
14. [1/4 H] **SPEC Conventions 未宣告 SegmentColor 相容性契約**
    （CONFIG_VERSION 2 穩定性與 auto 清洗降級路徑）。

## 🔬 Spike candidates

- **[opus＋sonnet（haiku 同族）] S7（建議升為動工前置 gate）：`↺`／
  `█`／`░` 真機 Claude Code 渲染**——07 真機證據強到推翻整張 emoji 表；
  這三個非 ASCII 字元從未真機驗過（sp3 案例不含），失守則 bar／倒數
  顯示形＋4-run＋S4＋golden 全重來。Validation：沿 sp3 harness 出最小
  case（`█░` 20 格＋`↺ 2h (14:30)` × {plain, powerline} × {PS 5.1,
  bash}）真機截圖，成本 <30 分鐘。
- **[fable＋opus＋sonnet] S8 候選：CDP e2e 可行性 PoC**——零新依賴
  （Node 內建 WebSocket＋`/json/version`）能否完成 launch→navigate→
  `Input.setInterceptDrags`→合成拖曳全鏈；headed vs headless flake 率
  （10 輪計數）；Vite server 啟停歸屬。據此定 D-b 執行形態與依賴宣告。
- **[sonnet] jsdom 共存相容性**——per-file `@vitest-environment jsdom`
  與既有全 node-environment 測試（明文零 DOM 假設）同池執行無洩漏、
  `npm test` 時間無明顯增加；不通過則回退純函式接縫路線。

## Untested paths（reviewer 點名）
- `.ps1` 產出「純 ASCII」現為隱性不變量，無機械化測試（C-2 修法內含）。
- 倒數段文化不變性（`InvariantCulture`）無單元斷言（minority 9）。

## Round／triage 註記（§7.5）
Round 1。兩個 Critical 均屬**契約內容修訂**（glyph 體制改對帳＋跳脫
條款補釘），不動大宗架構；Important 四項皆 PLAN 層補宣告／補定案。
分類為「需修訂後再確認」而非「架構重來」——建議 PLAN Rev 2 修訂後
跑一輪聚焦式 round 2（或由使用者裁決直接進 /magi:tasks）。
