# 🧠 MAGI Plan Review — Statusline Builder 多列輸出＋雙欄版面＋排序語意（06b）

**Sprint:** magi/07-statusline-multirow-layout/ • **Document:** PLAN.md • **Round:** 1（本文件首輪；上游傘狀契約已雙輪審訖）

**Mode:** 面向分區（使用者指定：多方位角度開 agent、不限三票）——5 票＝
R1 多列引擎契約（opus）、R2 上游對帳（opus）、R3 排序/清單重構 UX（sonnet）、
R4 雙欄版面/a11y（sonnet）、R5 Spec deltas/驗證面（sonnet）。
採納規則：各面向審查者對自身範圍具權威性；跨面向重疊發現已語意去重
（R2×R4 的 role 誤述合併為一項）。

## Dashboard

```
┌──────────────────────────────────────────────────────────┐
│  VERDICT: REQUEST-CHANGES（窄範圍——全數為契約文字補釘）  │
├──────────────────────────────────────────────────────────┤
│  Mode: aspect-partitioned ×5      Degraded: no           │
│  R1 ❌RC   R2 ✅AWN   R3 ❌RC   R4 ❌RC   R5 ✅AWN        │
├──────────────────────────────────────────────────────────┤
│  🔴 Critical: 0   🟡 Important: 13   🟢 Notes: 8         │
│  🔬 Spike candidates: 4                                  │
└──────────────────────────────────────────────────────────┘
```

## Verdict
**REQUEST-CHANGES**（窄範圍）

五票無一推翻傘狀 Rev 3 的既裁決設計——巨觀方向（`row` 資料形狀、
`StyledRun[][]`、雙欄 grid＋sticky、雙區清單、逐列 aria）全數確認可行。
13 項 Important 全屬「可執行契約的縫隙」：措辭誤述（1 項為 shipped-reality
不準確）、受影響面漏列、關鍵機制未釘死（shell 端多列展開、節點重用原則、
row 正規化範圍）、驗收缺項。修法皆為文件修訂＋補工作項／驗收項，
無架構翻案，修訂後無須整輪再審。

## 🔴 Critical (adopted)
（無）

## 🟡 Important (adopted)

### 引擎契約（R1 範圍權威）
1. **[R1] 受影響面「完整清單」漏列 `resolve.test.ts`／`emit-ansi.test.ts`**：
   兩檔數十處直接斷言扁平 `StyledRun[]`（`resolve.test.ts:118,141,147…`、
   `emit-ansi.test.ts:22-76`），簽章改巢狀後必壞、需人工改寫，卻不在清單；
   「golden 重生僅一種變因」框架低估單元測試改寫量。
   **修法：補進清單（含 `render-preview.test.ts` 若 renderRuns 簽章變），
   Verification 註明形狀改寫非 golden 重生可涵蓋。**
2. **[R1] shell 端「執行期逐列緩衝＋空列壓縮＋逐列 cap」語意未釘**：
   現行 emitter 是單一扁平累加器（`emit-bash.ts:323-371`、
   `emit-ps1.ts:514-582`），多列 byte-exact 需執行期依 row 分組緩衝、
   過濾 runtime 全滅列、LF 只夾存活列之間、零存活退單一 reset——最難且
   最易與 oracle 分岔的路徑無落點；現行 byte-exact gate 全為單列 combo。
   **修法：契約補展開語意四步驟；Verification §1 明列「非末列 runtime
   全隱藏→無空行、LF 數正確」真執行場景。**
3. **[R1] `toAriaLabel` 簽章同步 vs 逐列 aria 模型自相矛盾**：與 `toAnsi`
   並列「簽章同步」暗示改吃 `StyledRun[][]` 回單一字串，但逐列
   `role="img"` 容器需要對單列求 label。
   **修法：明訂 toAriaLabel 維持 `StyledRun[]→string`，render-preview
   迭代 rows 逐列呼叫並自加「第 N 列：」前綴；自「簽章同步」桶移除。**

### 上游對帳＋預覽 a11y（R2/R4 交叉印證，vote 2/5）
4. **[R2+R4] 預覽框 role 誤述「維持 `role="group"`」——現況是 `role="img"`**
   （`index.html:322` 靜態＋`render-preview.ts:159` 每次 render 無條件覆寫）：
   傘狀原文為「**改** group」，摘錄弱化成「維持」＝字面上「不用動」，
   恰與所需改動相反；照做會 img 巢 img（img 為葉節點角色，子代被 AT
   忽略），直接破壞逐列導覽＝06b 驗收 blocker。
   **修法：回改「由 06a 現況 `role="img"` 改為 `role="group"`」；
   Recommended approach 第 5 項明列雙層重構工作（靜態 role＋固定
   aria-label／renderRuns 外 group 內逐列 img／`[[]]` 時
   EMPTY_PREVIEW_LABEL 掛哪層＋單元測試）。**

### 雙欄版面（R4 範圍權威）
5. **[R4] `#error-message`／skip-nav 的 grid 歸屬未言明**：`<main>` 首子
   節點是 `role="alert"` 的 `#error-message`（index.html:72），「只加兩個
   wrapper」下若不顯式 `grid-column: 1 / -1`，auto-placement 會把兩欄
   塞錯位。**修法：D3 補 error-message 跨欄＋skip-nav 併左欄一句。**
6. **[R4] 斷點 1100px 與全站 `max-width:960px` 交互未檢視**
   （`src/style.css:203-210`）：≥960px 時 `<main>` 恆 960px，雙欄每欄僅
   ≈430px——`.threshold__buckets`（statusline style.css:704-708）每行
   剩 1 桶、10 桶編輯器高度暴增，抵銷「同時看到設定與預覽」訴求；
   1008–1100px 區間容器已達最大寬卻仍單欄。
   **修法：明文處理交互（放寬本頁 max-width 或註明刻意取捨）；
   Verification 補「雙欄下展開閾值編輯器檢查可用性」。**
7. **[R4] 右欄捲動容器巢狀既有雙軸捲動 `output-block__code`**
   （style.css:824-836，已 `tabindex="0"`＋縱橫雙捲）：外縱捲＋內雙捲
   巢狀後方向鍵落點瀏覽器不一，SR 瀏覽模式風險。
   **修法：SR 抽測補「聚焦 output 區驗證方向鍵捲動落點」一條；
   不一致時再議替代機制。**

### 排序/清單重構 UX（R3 範圍權威）
8. **[R3] 「重渲染」未界定節點身份存續**：現行 moveSegment 刻意
   `insertBefore` 搬既有節點＋顯式 `focus()`（main.ts:639-660）；若被
   理解為銷毀重建，焦點掉失＋閾值編輯器展開態（純 DOM 態）重置＋重綁
   6+ 組監聽。**修法：釘死「重渲染」＝節點重用＋insertBefore/appendChild
   重定位，絕不銷毀重建；移動後顯式 re-focus。**
9. **[R3] 啟停切換跨容器搬移 `<li>` 未定**：現行 enable 只切 class
   （main.ts:496-504），雙區清單下變成最高頻的跨容器搬移操作。
   **修法：同節點重用原則；驗收補「連續切換 N 次焦點/checked 不受影響」。**
10. **[R3] 列群容器生命週期缺工作項**：現行四類是靜態標記
    （index.html:229-251），列群容器數量隨列增刪動態變化，
    template／建立銷毀／重編號／`<li>` 安全轉移全未列。
    **修法：Recommended approach 補明確子項。**
11. **[R3] row 寫回正規化範圍未定＋select 刷新循環/空轉風險**：
    serializeConfig 是裸 JSON.stringify、清洗只在讀取（config.ts:93-95）；
    「每次寫回正規化」需在 commitConfig 改寫記憶體 row，其分組範圍必須
    與 resolve() 完全一致，且不能讓改顏色也觸發全體 select 重刷。
    **修法：釘死正規化範圍＝resolve() 同一組存活段；row 相關 UI 同步
    僅於分組實際變動時重跑。**
12. **[R3] 重新啟用帶舊 row 值的段，落點未定義**：`row` 持久且與
    `enabled` 正交——回上次列？回列 1？依陳舊值分桶？此為核心場景卻
    只有「從空白建列」入驗收。**修法：補行為敘述＋驗收案例，與 #11
    的正規化裁決一致。**

### Spec deltas（R5 範圍權威）
13. **[R5][deltas] 列群組地標/標題結構缺席，隱性觸碰 SPEC a11y 不變量
    未申報**：現行四類各為 `<section aria-labelledby>`＋`<h2>`，正是
    SPEC Conventions「大量項目須有 skip 機制」的落地；改依列分組後
    若無等效結構，SR 失去分組跳轉——恰為 SR 抽測 blocker 最可能
    踩雷處。**修法：明訂每個列群組維持等價地標/標題；Verification §2
    補「逐列標題/群組可跳達」；若刻意不補，deltas 或 Open questions
    顯式記錄取捨。**

## 🟢 Minority / Notes
- [R1] `toAnsi([])` 語意翻轉（單一 reset→空字串）：新失效邊界靠 resolve
  恆回 `[[]]` 維繫——補「resolve 回傳長度恆 ≥1」斷言＋emit-ansi 檔頭
  不變量與測試字面同步改 `[[]]`。
- [R1] `defaultSegmentConfig` 產生的段無 `row`（`row?: number`）：resolve
  分組鍵須明訂 `seg.row ?? 0`（或 default 一併寫入 row:0），否則無存檔
  預設與清洗後 config 列分佈可能不一致。
- [R2] clamp「上限 29→現行 24」重述經核忠實（公式逐字一致，數值校正
  對齊現役 25 段目錄）；可補半句杜絕與傘狀交叉誤讀，非必須。
- [R3] 跨列拖放「吸附回原列並播報」需新的 accept-then-revert 邏輯
  （現行是 dragover 早退無 drop 事件，main.ts:612-618）——工作分解標註差異。
- [R5] 真機 smoke 未指定沿用 S3 spike 的設定——明訂重用 `sp3/` 同一組
  設定換真環境重跑。
- [R5] Verification 未驗「除兩個新停點外其餘 tab 序不變」的迴歸宣稱。
- [R5] Goal 4（golden diff 僅一種變因）無對應驗收條目——顯式註明由
  code review 逐檔 diff 把關。
- [R5] 兩項既有 Open questions（DRIFT C 收整、S3 尾隨換行分支）留待
  現階段裁決屬合理，不阻斷 /magi:tasks。

## 🔬 Spike candidates
- [R1] **shell 多列 join byte-exact（中間列 runtime 全滅）**：逐列緩衝＋
  執行期壓縮＋逐列 cap 易與 oracle 分岔。Validation：三列 config（一條
  非末列全 null）emitBash/emitPs1 真跑 hex 對比 `toAnsi(resolve(...))`，
  含全滅退 `[[]]` 案——可落為 CI 面測試任務（沿用既有 runner），
  不必真機。
- [R3] **排序/搬移重渲染的焦點與展開態保留**：若契約已釘死「節點重用＋
  insertBefore」（Important #8），此 spike 可降級為驗收項；未釘死才需原型。
- [R5] **`<option>` 原地更新的焦點/選取保存跨瀏覽器行為**：「從空白建
  7 列」流程每加一列全體 select 刷新一次，最頻繁的即時 DOM 更新路徑。
  Validation：最小 repro 於 Chrome/Firefox/Edge 一輪。
- [R5] **雙欄 sticky＋`100dvh` 跨瀏覽器**：CSS 佈局無法被 npm test 覆蓋。
  Validation：可降級為 Verification 手動清單的瀏覽器矩陣註記。

## Untested paths（審查者標記）
- shell 端多列展開的真執行路徑（現行 gate 全單列 combo）— R1
- 雙欄斷點附近寬度／閾值編輯器展開高度 — R4
- 巢狀捲動的鍵盤方向鍵落點 — R4

## 各票驗證亮點（非僅目測）
- R1 逐一開檔核對 resolve.ts/emit-bash.ts/emit-ps1.ts/emit-ansi.ts 現行
  join 結構與兩個測試檔的扁平形狀斷言行號。
- R2 對傘狀 06b 每一章節逐條對帳＋06a shipped 事實引用逐一開檔核實
  （printf 形／Write 形／padding 形／CONFIG_VERSION／harness 檔名），
  並查證 DRIFT.md:25-26 與 BACKLOG.md:53-56 的 C 項收整無衝突。
- R3 對照 main.ts 現行 moveSegment 的 insertBefore＋focus() 註解與
  serialize/sanitize 分工（config.ts:93-95）。
- R4 實測 index.html DOM 順序（error-message 首位）＋全站 960px 上限
  與 threshold buckets 的 minmax 參數推算欄寬退化。
- R5 開檔核對四份 living docs 現況、golden harness 機制與傘狀 deltas
  的 06a/06b/06c 份額切分。
