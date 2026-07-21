# S4 — jsdom reveal 可斷言性＋樣例快取隔離（T1.5）

> Sprint: magi/14-statusline-ux-round2 • Milestone 1 Lane C • 2026-07-20
> 探測手段：臨時 vitest 檔 `tools/statusline-builder/s4-spike.test.ts`
> （jsdom env）＋fixture `s4-spike-fixture.ts`——**回報 DONE 前已刪除**。
> 原始輸出：`npx vitest run` → JSON dump（本檔數值皆抄自實測，非查文件）。
> 環境：vitest 4.1.9、jsdom 29.1.1、選擇器引擎 `@asamuzakjp/nwsapi` 2.3.9。

## 探測輸出（實跑）

### P1 — `:has()`／`:focus-visible` 選擇器支援 + getComputedStyle 級聯
```
hasQuery(':has(button)') = true          querySelector :has() 支援
hasMatches(':has(button)') = true        matches :has() 支援
:has(:focus-visible) 未聚焦 = null(false) 語法可評估、無誤
fvUnfocused = false / focusUnfocused = false
── mu.focus()（程式化）後 ──
activeIsMu = true
fvAfterFocus = true      ← 程式化 focus 即 :focus-visible=true
focusAfterFocus = true
rowHasFvAfterFocus = true ← .row:has(:focus-visible) matches 可評估且命中
rowHasFocusAfterFocus = true
computedOpacityDefault = "1"        ← getComputedStyle 未套用 stylesheet opacity:0
computedPointerEventsDefault = "auto" ← 亦未套用 pointer-events:none
```
**判讀**：jsdom 29（nwsapi 2.3.9）**支援** `:has()` 與 `:has(:focus-visible)`
於 `querySelector`/`matches`（可評估、不擲錯）。**但**：(i) 程式化 `.focus()`
即被判 `:focus-visible=true`；(ii) `getComputedStyle` **不做 stylesheet 級聯**
——`.row__move` 的 `opacity:0`/`pointer-events:none` 讀回為 `"1"`/`"auto"`。
故 dom **無法**以 computed opacity 斷言「預設收納」或「浮現」的**視覺結果**。

### P2 — 模態辨識（mouse vs keyboard focus 能否區分）
```
select：dispatch mousedown → focus → :focus-visible = false
select：dispatch keydown(Tab) → focus → :focus-visible = true
```
**判讀（關鍵，含與真機的反向差異）**：nwsapi 2.3.9 對 `:focus-visible` 有一
套**簡化啟發式**（前置 pointer 事件會壓成 false），但它**均勻套用到 select**
——這與 Chromium **相反**：
- **S3 真機（Chromium）**：select **滑鼠**點擊 → `focus-visible=true` → **會**浮現。
- **S4 jsdom**：select **滑鼠** → `focus-visible=false` → **不**浮現。

⇒ **若拿純 CSS 的「滑鼠不浮現」守衛去 jsdom 測 select，會假綠**（jsdom 顯示
不浮現、真機其實浮現）。jsdom 的 `:focus-visible` **不是真機模態的忠實模型**，
不能當模態 oracle。

### P3 — classList 斷言路徑（JS 旗標後備的 dom 可證面）
```
模擬 JS 旗標：mousedown→modality=mouse；keydown(Tab)→modality=keyboard；
             focusin 時依 modality 決定加/不加 .row--reveal
revealAfterMouse    = false   ← 滑鼠路徑：不加 reveal class
revealAfterKeyboard = true    ← 鍵盤路徑：加 reveal class
```
**判讀**：JS 旗標後備的浮現邏輯**全由 JS 事件處理器決定**，jsdom 能忠實
派發 `mousedown`/`keydown`/`focusin` 並執行 handler → **classList 兩態皆
dom 可斷言**，且**繞開** P2 的 jsdom `:focus-visible` 不忠實陷阱。

### P4 — vitest 4 模組隔離（樣例快取單例）
```
P4a 同一 it() 內 getSample('zh')×2 = 同實例、buildCount=1
P4b 第二 it()（同檔、未 reset）：buildCountBefore=1 after=1
    cacheSurvivedAcrossTests = true   ← 模組單例跨同檔各案存活（會汙染）
P4c __resetSampleCache() 後：buildCount 1→2、resetForcedRebuild = true
    ← test-only reset hook 有效，強制重建
P4d vi.resetModules()+動態 import：sameModuleObject=false、
    freshModuleResetCounter=true      ← 給全新模組（但需動態 import 重取所有引用）
```
**判讀**：vitest 4 預設隔離為**檔級**（每檔獨立環境），但**同檔各 `it()`
共享模組實例**（P4b 證實）——模組層 lazy 單例快取會跨案殘留。

## 測試分層表（D1 行為守衛 → dom 可證 or e2e）

前提：**D1 已定案採 JS 模態旗標後備**（見 S3-RESULT 選型結論）。下表**併列**
純 CSS 假設下的層別，佐證選型對測試網的收益。

| D1 行為守衛 | 純 CSS `:has(:focus-visible)` | **JS 旗標後備（定案）** | 依據 |
|---|---|---|---|
| **預設收納**（opacity:0） | **e2e**（jsdom getComputedStyle 不級聯；dom 僅能驗結構標記存在） | **dom**：驗初始 `row` **無** `.row--reveal` class（結構）；視覺 opacity 仍 e2e/真機 | P1 |
| **鍵盤浮現** | **e2e**（dom 只能驗 `matches(':has(:focus-visible)')` 可評估，但 jsdom 任何 focus 皆 visible＝弱訊號、非真證） | **dom**：`keydown(Tab)`+`focusin`→斷言加 `.row--reveal` | P1/P3 |
| **滑鼠不浮現（常駐回歸案）** | **e2e 必須**（jsdom 模態不忠實、對 select 假綠——P2 vs S3） | **dom**：`mousedown`+`focusin`→斷言**未**加 `.row--reveal`（select/checkbox/button 各一） | P2/P3 |
| **還焦延續**（move 重渲染＋程式化 focus） | **e2e**（jsdom always-visible-on-focus＝trivially true、無訊號） | **dom**：旗標仍 keyboard 時 re-append+`focusin`→class 延續（旗標式免疫、確定性） | P3 |
| **收納鈕點擊 no-op** | dom 可驗 handler 未觸發（click count），但**視覺穿透**（pointer-events）屬 e2e | 同（與觸發機制無關） | S3 |
| **浮現零躍動**（rect 不變） | **e2e/真機**（jsdom 無 layout 幾何） | 同 | S3 已於真機證實 |

**結論一句**：採 JS 旗標後備後，D1 四大浮現守衛（預設收納／鍵盤浮現／
**常駐滑鼠不浮現**／還焦延續）**皆可落 dom 層以 classList 斷言**；純視覺面
（computed opacity／rect 幾何）仍歸 e2e/真機。若誤採純 CSS，此四守衛幾乎
全數被逼上 e2e，且「滑鼠不浮現」若硬放 jsdom 會**假綠**（P2）。這直接支撐
PLAN Verification「D1 常駐回歸：滑鼠點擊列內控件不加 reveal class（S4 定層
後歸 dom 或 e2e）」→ **歸 dom**。

## 樣例快取隔離建議

**採 test-only reset hook（D2′ 候選 A），dom 案 `beforeEach` 呼叫。**

依據（全屬 P4 實測）：
- **必要性**：vitest 4 同檔各 `it()` **共享模組單例**（P4b `cacheSurvivedAcrossTests=true`）
  ——樣例快取（模組層 lazy per-locale 單例）會跨案殘留、汙染「切語言後
  hint／已加入態連動」等案。**必須顯式隔離**。
- **reset hook 有效**（P4c `resetForcedRebuild=true`）：單一 `__resetSampleCache()`
  即強制下次 `getSample` 重建；`beforeEach` 一行、零 ceremony。
- **對比「強制 locale 重算」**：翻語言只讓**另一** locale 條目失效、當前
  locale 條目仍殘留（除非來回切），較脆且把測試耦合到 i18n 內部——**不建議**。
- **對比 `vi.resetModules()`**：確可給全新模組（P4d `freshModuleResetCounter=true`），
  但需**動態 import** main.ts 並重取所有引用，對現有以靜態 import 為主的 dom
  測試網不切實際——**不建議**作為常規隔離手段。

⇒ **實作面（M3/T3.2）**：樣例快取模組層 lazy 單例須**匯出 `__resetSampleCache`
（或等義 test-only hook）**；相關 dom 案 `beforeEach` 呼叫之。

## 附註
- 臨時檔 `s4-spike.test.ts`＋`s4-spike-fixture.ts` 已於回報前刪除；本 sprint
  正式測試網不含此二檔。
- P1 另證 jsdom 29 已支援 `:has()`（nwsapi 2.3.9 fork），對未來若有純
  結構性 `:has()` 選擇器斷言（非 `:focus-visible` 模態）之 dom 案為利多——
  但**不改變**本 spike 對「模態守衛歸 JS 旗標＋dom」的結論。
