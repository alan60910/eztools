# micro-fix-2 — CSS order 視覺重排＋dialog 防禦行＋復測

> Sprint: magi/09-statusline-ux-refactor/ · 插單任務（承接 T4.4 spike 的兩項建議）
> 檔案範圍：僅 `tools/statusline-builder/style.css` ＋
> `magi/09-statusline-ux-refactor/sp1/` 工件；main.ts／index.html 為並行
> T5.5 車道，本次未動、未讀取以外的內容改動。**未 commit**。

## 摘要（先講結論）

- **改動 1（CSS order 視覺重排）已落地＋真實生效**（`mainIsFlex: true`、
  `catalogOrder: "1"`、`selectedOrder: "0"` 實測確認）：第一個列群組 header
  的 y 座標從 T4.4 原始量測的 **≈3374.6px 降到 ≈881.9px**，改善約
  **2493px**——這是一個數量級的縮小，且截圖可直接目視驗證（見下）。
- **但 PLAN 修訂後的驗收句「頂帶正下方立即可見已選擇欄起始（列群組
  標題＋首段控件起始）」在 375×667／390×844 兩個復測尺寸下仍未完全
  達標**——誠實回報：390×844 下「已選擇欄」的最頂緣（top）落入可視
  範圍（716px ≤ 844px），但括號內明確要求的「列群組標題＋首段控件
  起始」仍分別差 38px／154px 未達；375×667 下連「已選擇欄」頂緣本身
  都還在可視範圍外（716px > 667px）。**非零改善但未完全達標**，數據
  與根因見下方「二」節。
- **改動 2（dialog 防禦性 CSS）已落地＋真實驗證**：`getComputedStyle`
  實測「開啟前 `display:none`→click 開啟後 `display:block`→關閉後
  `display:none`」全數符合預期，與 Edge/Chromium 原生 `showModal()` 路徑
  零衝突。
- `npm run typecheck` exit 0；`npx vitest run tools/statusline-builder`
  **34 檔、1362 passed / 19 skipped，零迴歸**（與 T4.4 report 附近基準
  一致，style.css-only 改動如預期未觸及任何既有斷言）。

## 一、改動內容

### 1. CSS order 視覺重排（style.css，`.builder-columns__catalog`/`.builder-columns__selected` 區塊附近，`@media (min-width:1100px)` 之前新增一段 `@media (max-width: 1099.98px)`）

```css
@media (max-width: 1099.98px) {
  main {
    display: flex;
    flex-direction: column;
  }

  .builder-columns__catalog {
    order: 1;
  }
}
```

- 選用 `max-width: 1099.98px`（而非重疊寫法）與既有
  `@media (min-width: 1100px)` 精確互補、無 cascade 覆寫風險（兩段
  media range 互斥，不需依賴檔案內先後順序決勝負）。
- `main` 在 `<1100px` 原為預設 block 堆疊（DOM 序＝視覺序＝tab
  序）；改 `display:flex; flex-direction:column` 後，`order` 才可生效。
  `main` 的四個直接子節點為 `#output-status`／`#error-message`／
  `.builder-columns__catalog`／`.builder-columns__selected`（依序，見
  index.html:235/244/268/507）——**只**給 `.builder-columns__catalog`
  設 `order:1`（其餘三者維持預設 `order:0`），使排序結果為
  `output-status → error-message → selected → catalog`：兩個常駐 live
  region 的相對位置不受影響，僅「已選擇」與「目錄」兩欄互換視覺順序。
- **DOM 序刻意不動**（main.ts/index.html 本次調度禁碰、且並行 T5.5
  車道正在改這兩檔）。

**已知取捨（team-lead 要求記錄）**：CSS `order` 只影響視覺繪製順序，
不影響鍵盤 Tab 序與螢幕報讀機預設線性朗讀序（兩者皆沿 DOM 序）。本規則
生效後，行動寬度下：
- **滑鼠／觸控視覺使用者**：先看到「已選擇」欄（含已設定的列群組），
  目錄（30 段常駐清單）在其後——符合直覺、也是本次 fix 的目的。
- **鍵盤／SR 使用者**（沿 DOM 序 tab／朗讀）：仍會先走過整個目錄（30
  段常駐項）才到「已選擇」列群組——與視覺順序不一致。

這是 **WCAG 1.3.2（Meaningful Sequence）／2.4.3（Focus Order）** 已知
落差。真正修法需要搬動 DOM 節點本身（index.html），而本次調度明確
「只准改 style.css」（index.html 屬並行 T5.5 車道、禁碰）——此落差
**未修**，留待下一個可碰 index.html 的任務評估：(a) 真的搬動 DOM 節點
順序（此時「跟著視覺序即 DOM 序」最乾淨，但影響面含所有既有
`data-testid`/dom.test 對 DOM 樹結構的隱性假設，需要專門任務走一次
迴歸）、或 (b) 接受此落差並在 PLAN 上明文記錄為已知限制。

### 2. dialog 防禦性 CSS（style.css，`dialog.output-dialog::backdrop` 規則之後）

```css
dialog.output-dialog:not([open]) {
  display: none;
}
```

- 動機：完全不支援 `<dialog>` 的瀏覽器（如 iOS Safari <15.4，T4.4
  report「四」節已列相容矩陣）沒有原生 `dialog:not([open]){display:none}`
  UA stylesheet 規則——若不補，這類瀏覽器會在使用者按「產出腳本」之前
  就讓已授權樣式化的 dialog 內容以一般 block 元素之姿常駐可見。
- 對已支援瀏覽器（含 Chromium `showModal()` 原生路徑）：本規則與原生
  UA 規則同義，`[open]` 屬性存在時 `:not([open])` 不命中、無副作用——
  已用真實 Edge 實測 `getComputedStyle` 驗證（見下方「三」節）。

## 二、復測數據（PLAN 修訂驗收句）

腳本：`magi/09-statusline-ux-refactor/sp1/t44b-retest.mjs`（沿用
T4.4 `t44-measure.mjs` 的 CDP 基建；本次改動後 `npm run build` 已重跑，
對新 dist 快照量測）。Seed 與 T4.4 相同（3 列 powerline、每列 2 段）。

| Viewport | 頂帶 ≤40dvh？ | 已選擇欄 top (px) | 列群組 heading top (px) | 首段控件 top (px) | 已選擇欄起始可見？ | 標題＋首段起始可見？ |
|---|---|---|---|---|---|---|
| 375×667 | ✅ PASS（40.0%） | 716.3（＞667） | 881.9（＞667） | 997.9（＞667） | ❌ 差 49px | ❌ 差 215–331px |
| 390×844 | ✅ PASS（31.5%） | 716.3（≤844） | 881.9（＞844） | 997.9（＞844） | ✅ PASS | ❌ 差 38–154px |

對照 T4.4 原始數據（第一個列群組 top 曾為 **3374.6px**，兩尺寸皆同）：
**本次改善至 881.9px，縮小約 2493px**——order 重排確實把「已選擇」欄
從目錄（2460.7px 高的 30 段清單＋全域設定）之後拉到緊接頂帶之後，但
390×844 下距離「標題＋首段控件」完整可見仍差 38–154px、375×667 下差距
更大（215–331px，因該尺寸連頂帶本身都已頂到 40dvh 上限，可用高度更少）。

**根因（本次未修，僅記錄）**：「已選擇」欄本身在列群組之前還有：
`#segment-move-status`（sr-only live region，實質 0 高度）＋一段可見的
排序操作說明文字（`<p class="segment-section__desc">`「排序方式：滑鼠
可按住段卡...」兩行，index.html:531-534）＋「＋新增一列」按鈕
（`#add-pending-row`，index.html:544-546）——這三者＋間距合計約
**166px**（`881.9 − 716.3`），是 order 重排後仍殘留的「已選擇欄起始」
到「列群組標題」之間的固定成本。**若要進一步縮小此 166px**，可能方向
（供未來任務評估，本次不擅自實作）：說明文字改摺疊（`<details>`）或
移入 `aria-describedby`／tooltip、或行動寬度下縮短其可見文字——**本次
調度僅要求「CSS order＋dialog 防禦行＋復測」三項，未授權此類額外
改動，故僅記錄不實作**。

### 截圖（`t44b-*.png`，與 T4.4 原截圖同一 seed、同一捲動位置 0，可直接對照）

- `t44b-mobile-375x667.png`：頂帶後緊接可見「排序方式：...」說明文字
  （已選擇欄內容），**不再看到**目錄分類清單——視覺重排肉眼可確認生效。
- `t44b-mobile-390x844.png`：同上，且畫面最底緣已可見「＋新增一列」
  按鈕頂端一小部分。

原始數據：`t44b-retest-raw.json`（同目錄）。

## 三、dialog 防禦性 CSS 真實驗證

同一復測腳本內加測（Edge headless，`getComputedStyle` 讀計算後樣式，
非僅屬性檢查）：

| 階段 | `#output-dialog` 計算後 `display` |
|---|---|
| 開啟前（無 `open` 屬性） | `none`（本次新規則生效，之前無此規則時未驗證過計算值，理論上瀏覽器原生 UA 規則本就會給同值——本次是**新增一條同義的作者規則**，確認不衝突） |
| click 開啟後（`showModal()` 原生路徑） | `block` |
| 關閉後 | `none` |

三階段皆符合預期，與 T4.4 report「Edge/Chromium 實測」五項行為（開啟／
Esc／backdrop／關閉鈕／焦點還原）互不衝突（本次未重跑該五項，因
`dialog.output-dialog:not([open])` 規則不改變 JS 行為、只補一條純 CSS
規則，風險面單純）。

## 四、Gate 結果

- `npm run build`：✓ built in 160ms，exit 0。
- `npm run typecheck`：exit 0（`tsc --noEmit` 兩個 tsconfig 皆過）。
- `npx vitest run tools/statusline-builder`：**34 test files passed，
  1362 passed／19 skipped（1381 total），exit 0**——style.css-only
  改動如預期對既有 dom.test／golden 零影響（jsdom 不計算 CSS
  layout/visibility，本次改動的兩條規則皆不影響任何既有斷言路徑）。

## 結論

- 改動 1／2 皆已落地＋以真實 Edge 瀏覽器驗證行為符合預期。
- 改動 1 大幅縮小差距（≈2493px）但**未讓 PLAN 修訂驗收句在 375×667／
  390×844 兩尺寸下完全轉綠**——誠實回報差距（38–331px，隨尺寸與判定
  嚴格程度而異）與根因（已選擇欄自身的說明文字＋新增列按鈕，共
  ~166px 固定成本），未擅自追加改動範圍外的修法。
- 改動 2 零風險落地＋驗證通過。
- 已知取捨（CSS order 視覺序 vs DOM/tab/AT 朗讀序落差）已記錄，未修
  （需碰 index.html，非本次授權範圍）。

DONE（兩項改動已落地＋驗證；復測數據顯示大幅改善但未完全達標，已
如實記錄差距與根因，未逾越「只改 style.css」的授權範圍去追加修法）。
