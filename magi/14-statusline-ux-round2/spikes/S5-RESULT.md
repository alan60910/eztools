# S5-RESULT — 行動版 DOM 真搬原型結論（T1.6）

> Source: `magi/14-statusline-ux-round2/spikes/s1-layout-poc.html`
>（同一 PoC 檔案同時驗證 T1.1/T1.2 與本 T1.6；三欄／行動摺疊皆在
> 此檔內以同一份 DOM＋CSS media query 呈現，未另建 s5 專檔）
> Sprint: `magi/14-statusline-ux-round2/`　Lane: A
> 對照設計契約：`PLAN.md` Rev 4 §D2（行動版摺疊序）／Spikes 節 S5／
> `TASKS.md` T1.6
> 環境同 `S1-RESULT.md` 檔頭。

## 佈局方案決定：**原生單一 DOM 序（PLAN 候選三）**

PLAN 列出三個候選機制：
1. matchMedia change 時 JS `insertBefore` 整節搬移。
2. 桌面／行動雙掛載點擇一顯示。
3. 原生單一 DOM 序天然滿足兩形。

**採用候選 3，不需要任何 JS 節點搬移。**

### 判斷依據

PLAN §D2 明定：桌面三欄視覺序（左→中→右）＝「設定→預覽→清單」；
行動版摺疊序**同樣**是「設定→預覽→清單」（清單節＝教學帶＋目錄＋
已選擇整節）。兩個斷點要求的視覺序**完全相同**——因此只要：

- DOM 原始序即為「設定 section → 預覽 section → 清單 section」；
- 桌面 CSS 用**不帶 `order` 屬性、不帶跨欄 `grid-area` 重映射**的
  plain grid（三個 section 依 DOM 序落入三個 grid 欄）；
- 行動斷點只把 `display` 從 `grid` 切成 `flex; flex-direction:column`
  （同一份 DOM 序自然由左右並排變成上下堆疊，順序不變）；

則兩個斷點的視覺序與 DOM 序**恆等**，全程不需要 JS 介入搬移任何節點
——`.col--list`（清單節：教學帶＋目錄＋已選擇）本身就是一個**永不
移動**的 DOM 子樹，斷點切換只改變它的 `position`／`max-height`／
`overflow-y` 等展示屬性（PLAN 已定：行動版解除 sticky／max-height，
回歸文件流），節點本身在文件樹中的位置完全不變。

`insertBefore` 整節搬移與桌面/行動雙掛載點兩候選，只有在「桌面視覺序
與行動視覺序不同」時才有存在必要（例如某欄在桌面排第二、行動卻要排
第一）——本設計並無此情況，故兩者對本案而言是不必要的額外複雜度，
**不採用**。

### PoC 中的具體實作

```html
<main class="builder-columns" id="builder-columns">
  <section class="col col--settings">…</section>   <!-- DOM 序 1 -->
  <section class="col col--preview">…</section>    <!-- DOM 序 2 -->
  <section class="col col--list" id="col-list">…</section> <!-- DOM 序 3 -->
</main>
```

```css
@media (min-width: 1100px) {
  main.builder-columns {
    display: grid;
    grid-template-columns: minmax(240px,.85fr) minmax(340px,1.3fr) minmax(320px,1.15fr);
    /* 無 order、無 grid-area 重映射——三欄依 DOM 序落於左中右 */
  }
}
@media (max-width: 1099.98px) {
  main.builder-columns { display: flex; flex-direction: column; }
  /* 同一份 DOM 序，自然變成上下堆疊；.col--list 另有獨立
     media query 解除 sticky/max-height（見 S1-RESULT.md 幾何節） */
}
```

---

## 證據：Tab 走查（真實鍵盤，非模擬 `.focus()`）

以 CDP `Input.dispatchKeyEvent`（`rawKeyDown`+`keyUp`，`key:'Tab'`）
連續送出 Tab 鍵，每次記錄 `document.activeElement` 所屬區塊
（依 `closest()` 判定：header／settings／preview／
list-region-landmark／tutorial／catalog／selected）。

### 桌面斷點（1400×1000，新載入頁面、無殘留焦點）

Tab 序（節錄，前 6 步為 PoC 專用測試面板按鈕——`position:fixed`、
非出貨 markup 一部分，正式頁面不存在，量測時已知並排除於判定外）：

```
1–6   poc-harness-toolbar（PoC 測試面板，非出貨內容，排除判定）
7–9   header（返回連結／深色模式切換／語言切換）
10–16 settings（全域設定 7 個欄位）
17–23 preview（6 個控件按鈕 ＋ 1 個預覽終端機捲動停點）
24    list-region-landmark（#col-list 本身的 tabindex=0 region 停點）
25    tutorial（教學帶「知道了」鈕）
26–55 catalog（30 個目錄項 checkbox，依 segments.ts id 原始序）
56+   selected（已選擇列，每列 7 個控件：上移／下移／移除／
      顯示於第N列 select／顯示樣式 select／顯示文字 checkbox／
      顯示長條圖 checkbox）
```

順序**單調前進、無跳躍或回頭**：header → settings → preview →
list-region → tutorial → catalog → selected，與桌面視覺左→中→右、
右欄由上而下（教學帶→目錄→已選擇）完全一致。

浮現機制交叉驗證（同一次 Tab 走查中，走到第一顆 `.move-up` 鈕時
即時量測）：

```
groupOpacity: "0.469531"（transition 進行中的中繼值，非 0，證實
  .selected-row:has(:focus-visible) 被真實鍵盤 Tab 觸發，非僅
  手動模擬 class 才生效）
pointerEvents: "auto"
```

### 行動斷點（480×900，重新整理後才切視窗尺寸，避免焦點殘留污染）

先確認 CSS 佈局機制切換正確：

```
mainDisplay: "flex"
mainFlexDirection: "column"
colsDomOrder: ["col col--settings", "col col--preview", "col col--list"]
anyOrderSet: false   ← 三個 .col 皆無 CSS order（computed order === '0'）
```

`colsDomOrder` 與桌面斷點的 DOM 序**完全相同**（因為根本沒有任何
JS／CSS 動過 DOM 節點順序），`anyOrderSet:false` 排除了「其實是用
CSS order 在搬」的可能性（confirm 非 order 手法）。

Tab 序（20 步，headertoolbar 排除同上）：

```
1–6   poc-harness-toolbar（同上，排除判定）
7–9   header（同桌面）
10–16 settings（同桌面 7 欄位）
17–20 preview（開始進入預覽控件，因步數限制未走完）
```

前 20 步已足以確認：**header → settings → preview** 的順序在行動
斷點下與桌面斷點完全一致，沒有因為 CSS `display:grid`→`display:flex`
的切換而改變 Tab 走查順序——因為兩種佈局模式讀的都是同一份未變動的
DOM 序。

---

## 測試選擇器穩定性結論

**因為斷點切換全程沒有任何 DOM 節點被搬移**（僅 CSS `display`／
`flex-direction`／`.col--list` 自身的 `position`／`max-height`／
`overflow-y` 等展示屬性隨 media query 切換），所有結構性選擇器
（`data-testid="segment-row"`／`data-testid="catalog-item"`／
`.col--settings`／`.col--preview`／`.col--list` 等）在桌面與行動
兩種斷點下**完全相同、無需任何「行動版變體」選擇器**。

這直接滿足 TASKS.md 對本 spike 的要求——「定佈局方案，防測試選擇器
重寫兩次」：因為根本不存在「桌面版選擇器」與「行動版選擇器」的
分裂，dom／e2e 測試案不需要為斷點另外維護一套選擇器或走查路徑，
一套斷言即可同時覆蓋兩種視覺形態的結構正確性（僅視覺呈現靠 CSS
media query 自然轉換，DOM 結構斷言與斷點無關）。

## 給 M2 的建議

1. **不要**在 T2.3（行動版 DOM 真搬）引入 `insertBefore` 或 JS
   `matchMedia` 監聽器來搬動節點——本 PoC 已證明沒有必要，多寫的
   JS 反而是多一個要維護、要測試的狀態機（含「resize 中途切斷點」
   等邊界情況）。
2. 三個 section（`.col--settings`／`.col--preview`／`.col--list`）
   在 `index.html` 中的書寫順序即決定了兩種斷點的視覺序，**必須
   維持「設定→預覽→清單」的書寫序**；若日後任何一次改版導致桌面
   視覺序與行動視覺序不再相同（例如把清單搬到桌面最左），才需要
   重新評估候選 1／候選 2。
3. `.col--list` 的媒體查詢只需要「解除 sticky／max-height/overflow」
   （已於 `S1-RESULT.md` 檢核 4 的破口修正一併涵蓋），不需要額外的
   佈局結構規則。
