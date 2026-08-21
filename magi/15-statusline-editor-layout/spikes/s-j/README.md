# proto/ — T1.1 共用原型骨架＋量測底座

> Sprint: `magi/15-statusline-editor-layout/`　Task: T1.1（MS1 spike 批前置）
> 對照設計契約：`PLAN.md` Rev 3 §二「捲動與黏著模型」／§D1–D3
> 真實量級錨定：`magi/14-statusline-ux-round2/spikes/S1-RESULT.md`／
> `tools/statusline-builder/index.html`／`tools/statusline-builder/style.css`

**本任務只建骨架與量測底座，不做任何門檻判定**——三臂通過／不通過、
`--band-h` 該用 CSS 原生還是 `ResizeObserver`、遮蔽殘差怎麼消解，皆留給
後續任務（T1.2 S-a／T1.3 S-b／T1.4 S-g／T1.5 S-j／T1.6 S-c）在本原型上
量測後定案。

## 檔案

```
proto.css     三臂共用樣式（臂差異一律以 body class 掛鉤區分）
m1a.html      M1′-a 臂（首選）：main 為 block；頂帶自身 sticky；僅三欄收進 .builder-columns
m1b.html      M1′-b 臂：sticky 外框 .editor 包住頂帶＋三欄
m2.html       M2 臂：app-shell，html/body 高鎖 100dvh＋overflow:hidden，三欄各自內捲
measure.mjs   CDP 量測腳本底座（零依賴，比照 scripts/e2e-statusline.mjs／
              magi/14-statusline-ux-round2/spikes/s3-run.mjs 手法）
README.md     本檔
```

不放在 `tools/` 下——vite MPA 入口自動發現只掃 `tools/*/index.html`，本
目錄不落入掃描範圍、不會進 `dist`（詳見 root `CLAUDE.md`／`SPEC.md` 「新增
工具」慣例；本原型不是新工具，是拋棄式 spike）。

## 三臂結構摘要

| 臂 | 檔案 | 結構重點 |
|---|---|---|
| M1′-a（首選臂） | `m1a.html` | `<main>` 一般 block；`skip-nav 佔位 → status 佔位 → .preview-band（`main` 直接子節點，`position:sticky;top:0`）→ .builder-columns`（`display:grid;grid-template-columns:1fr 1.6fr .9fr`，僅含三欄） |
| M1′-b | `m1b.html` | 同上但頂帶與三欄皆收進 `.editor`（`position:sticky;top:0;display:grid;grid-template-rows:auto minmax(0,1fr)`）——頂帶自身變 `position:static`，sticky 責任上移至 `.editor` |
| M2 | `m2.html` | `<html>`／`<body>` 皆 `height:100dvh;overflow:hidden`；`<main>` 亦顯式鎖 `height:100dvh`（不扣頁首）＋自身 `display:flex;flex-direction:column`；`.preview-band` 恆在頂（`position:static`，頁面本身不捲、天然恆在上）；`.builder-columns` 內三欄皆 `overflow-y:auto` 內捲；`<footer>` 因總高度（頁首＋100dvh 的 main）必然超出 body 的 100dvh 而被裁到視窗外（見下方「m2 校準紀錄」） |

三臂共用的 selector（`.preview-band`／`.col--catalog`／`.col--list`／
`.col--settings`／`header`／`footer`）在三份 HTML 皆存在且唯一，
`measure.mjs` 不需分臂寫不同查詢邏輯。

內容量級（三臂逐字相同，僅外層 wrapper 不同）：

- 頁首 mock：校準方向對齊 `sprint14-S1` 實測 dist `header` ≈236px
  @1400 寬（本原型於 1400 寬實測 ≈268px，量級接近，同款文案換行差異；
  精確校準留待 S-b 定案，見下方「已知簡化」）。
- 頂帶：標題列＋底色×2＋情境×4（單列 segmented control mock）＋產出
  腳本鈕＋固定示範時鐘說明句＋終端框（3 列 statusline 樣本文字，等寬
  字型）；整帶 `max-height:40dvh`（本原型內容量未觸頂，見下方 CSS
  說明）、終端框 `flex:1 1 auto;min-height:0;overflow:auto`。
- 目錄欄：教學帶 mock（`min-height:120px`）＋四分區標題＋30 個目錄項
  （永在 12／百分比 5／條件 10／shell-out 3，比照
  `tools/statusline-builder/segments.ts` 的真實 30 段分類與
  `messages.ts` 中文標籤），樣例值長度落在 7–33 字元（含 `工作階段
  名稱`＝33 字元、`Git 工作樹分支`＝31 字元兩個長樣本）。
- 列區：5 個列群組（第 1–5 列），各 3–6 段列，每列含拖曳把手（⠿）／
  名稱／「顯示於第 N 列」select mock。
- 設定欄：5 個 control-group，等量現行 `tools/statusline-builder/
  index.html` `#global-section`（呈現模式 fieldset／分隔符 select＋
  自訂子欄／Powerline 箭頭 checkbox＋提示／末段補收尾箭頭 checkbox／
  settings.json 路徑 input）。
- footer mock：文案逐字比照現行站 footer（`EZTools — 所有處理皆於
  瀏覽器端完成…`＋著作權列）。

三欄皆掛 `overscroll-behavior` **hook 但先不設值**（`proto.css` 內
`.col--catalog,.col--list{ /* overscroll-behavior: contain; ← S-g
定案後掛此處 */ }`）——S-g 的變因，本任務留 class 供後續任務加。

`--band-h` 為固定 CSS 自訂屬性（`proto.css :root`），**不接 JS**——JS
維護方式（CSS 原生 vs `ResizeObserver`）是 S-a 要定案的問題，本原型不
預設答案。

## 用法

```bash
node measure.mjs --arm m1a|m1b|m2 --viewport WxH [--scrolls 0,200,400,max]
```

範例：

```bash
# S-a 桌面基準：m1a、1280×800、四個捲動取樣點
node magi/15-statusline-editor-layout/spikes/proto/measure.mjs --arm m1a --viewport 1280x800 --scrolls 0,200,400,max

# 單點快查（預設 --scrolls 即 0,200,400,max，省略即用預設）
node magi/15-statusline-editor-layout/spikes/proto/measure.mjs --arm m2 --viewport 390x844 --scrolls 0

# headed 除錯（人工看畫面）
MEASURE_HEADED=1 node magi/15-statusline-editor-layout/spikes/proto/measure.mjs --arm m1b --viewport 1280x800 --scrolls 0
```

- `--arm`：`m1a` / `m1b` / `m2`，必填。
- `--viewport`：`WxH`（如 `1280x800`），必填。
- `--scrolls`：逗號分隔的 scrollY 清單，元素為非負整數或字面值 `max`
  （`max` 於載入後依實際 `document.documentElement.scrollHeight -
  innerHeight` 動態解出，非寫死值）；省略時預設 `0,200,400,max`。
- 找不到本機 Edge/Chromium → 印錯誤訊息＋`exit 1`（本腳本是量測底座，
  找不到瀏覽器不是「這次沒東西要測」，與 `scripts/e2e-statusline.mjs`
  的「找不到即略過視為通過」語意不同，故意不同調）。
- debug port：`9800 + 隨機偏移`（見 `measure.mjs` 內 `const port =
  9800 + Math.floor(Math.random() * 150)` 旁註解——每次 CLI 呼叫皆為
  獨立 process，遞增計數器無法跨 process 共享狀態，改用「9800 起的區間
  ＋隨機偏移」避免與其他並行 spike 撞 port）。

## 輸出格式

`stdout` 印一個 JSON 物件：

```jsonc
{
  "arm": "m1a",
  "viewport": { "width": 1280, "height": 800 },
  "maxScroll": 422,           // document.documentElement.scrollHeight - innerHeight（載入後、任何捲動前量得）
  "samples": [
    {
      "requestedScroll": "0", // CLI 原始字面值（含 "max"），非解出後的數字
      "scrollY": 0,           // 捲動後實際 window.scrollY（可能因瀏覽器 clamp 或頁面不可捲而 ≠ requestedScroll，如 M2）
      "innerHeight": 800,
      "band": { "top": …, "bottom": …, "left": …, "right": …, "width": …, "height": … },      // .preview-band getBoundingClientRect()
      "catalogCol": { … },    // .col--catalog rect
      "listCol": { … },       // .col--list rect
      "settingsCol": { … },   // .col--settings rect
      "header": { … },        // header rect
      "footer": { … },        // footer rect
      "catalogScrollable": { "scrollHeight": …, "clientHeight": … }, // .col--catalog 本身可捲高度
      "listScrollable": { "scrollHeight": …, "clientHeight": … }     // .col--list 本身可捲高度
    }
    // ……每個 --scrolls 元素各一筆
  ]
}
```

rect 六欄位皆為 `getBoundingClientRect()` 直接輸出（`top`/`bottom`/
`left`/`right`/`width`/`height`，viewport 相對座標，非四捨五入）。

## `--band-h` 校準紀錄

`proto.css` 的 `--band-h` 依 T1.1 brief 指示「載入後量 `.preview-band`
`offsetHeight` 校準」（本底座改用等價的 `getBoundingClientRect().height`，
CDP 量測既有慣例）：

```bash
$ node magi/15-statusline-editor-layout/spikes/proto/measure.mjs --arm m1a --viewport 1280x800 --scrolls 0
# samples[0].band.height = 191.015625
```

無條件進位取 **192px** 寫入 `:root{--band-h:192px}`（寧可欄的
`top`／`max-height` 預留量比實際頂帶高度略寬，也不要因四捨五入取小值
使欄頂被頂帶蓋住零點幾像素）。三臂共用同一數值（頂帶內容三臂逐字
相同，僅外層 wrapper 不同；M2 頂帶不進 sticky／max-height 計算，此值
對 M2 三欄無實質作用）。

**此值僅為本原型的校準基準，非出貨定案**——真實 `tools/
statusline-builder/` 落地時，頂帶內容（i18n 文案／實際控件寬度）會使
高度略有差異，且 S-a 尚未定案 `--band-h` 該用 CSS 原生手段或
`ResizeObserver` 動態維護（D6）。

## 驗證證據

### m1a × 1280×800 × scrolls 0,200,400,max（主要驗收案）

```
$ node magi/15-statusline-editor-layout/spikes/proto/measure.mjs --arm m1a --viewport 1280x800 --scrolls 0,200,400,max
{
  "arm": "m1a",
  "viewport": { "width": 1280, "height": 800 },
  "maxScroll": 422,
  "samples": [
    { "requestedScroll": "0",   "scrollY": 0,   "band": { "height": 191.015625, "width": 1265 }, "catalogCol": { "width": 334, "height": 608 }, "listCol": { "width": 534.390625, "height": 608 }, "settingsCol": { "width": 300.609375, "height": 468.203125 }, "header": { "height": 267.84375 }, "footer": { "height": 87.375 } },
    { "requestedScroll": "200", "scrollY": 200, "band": { "height": 191.015625 }, "header": { "top": -200 } },
    { "requestedScroll": "400", "scrollY": 400, "band": { "top": 0, "height": 191.015625 }, "header": { "top": -400 } },
    { "requestedScroll": "max", "scrollY": 422, "band": { "top": 0, "height": 191.015625 }, "header": { "top": -422 } }
  ]
}
```

（above 為節錄摘要；完整逐欄輸出見本檔 commit 附帶的終端紀錄，或直接
重跑上方指令複現——JSON 為 deterministic，同臂同 viewport 同 scrolls
應得到位元級相同結構。）

四個取樣點皆為合法 JSON、六個 rect（`band`／`catalogCol`／`listCol`／
`settingsCol`／`header`／`footer`）在每一取樣點 `width > 0 && height >
0`。`scrollY=0→200→400` 為線性捲動（`header.top` 同步遞減），
`scrollY=400` 與 `requestedScroll:"max"`（解出值 422）皆已達
`maxScroll`（422），故兩者 `scrollY` 分別 clamp 為 400／422（瀏覽器
對超過 `maxScroll` 的捲動請求本就會 clamp，`400 < 422` 故第三點仍照
數值本身捲動、非 clamp；此為 CDP `Runtime.evaluate` 內 `window.
scrollTo` 的真實回饋值，非本腳本推算）。

**附帶觀察（非本任務判定範圍，供後續 S-a 參考，已於 `proto.css` 加
註解）**：`catalogCol`/`listCol` 在本取樣中 `top` 隨捲動線性遞減、
未在 `top:var(--band-h)`（192px）處卡住——這正是 `PLAN.md` §二 N4
「M1′-a 下欄自身 sticky 的 travel ＝ wrapper 高 − 欄高 ＝ 0」預判的
現象（本原型 `.col--catalog`/`.col--list` 的 `max-height` 剛好等於
`.builder-columns` 單列 grid row 的可用高度，欄本身撐滿整個 grid
cell，天生無「卡住空間」）。此為 T1.1 骨架忠實重現 PLAN 已知預判的
證據，不代表原型有誤；欄遮蔽殘差消解手段由 S-a（T1.2）擇一定案。

### m1b spot-check（scrollY=0 與 max 各一點）

```
$ node magi/15-statusline-editor-layout/spikes/proto/measure.mjs --arm m1b --viewport 1280x800 --scrolls 0
→ band.height=191.015625（與 m1a 逐字相同，僅外層 .editor 包裹不同）

$ node magi/15-statusline-editor-layout/spikes/proto/measure.mjs --arm m1b --viewport 1280x800 --scrolls max
→ maxScroll=422；scrollY=422；band.top=-154.15625（band 已捲出視窗上緣，
  未卡住——對照 PLAN.md §二「M1′-b：外框 travel ≈ 0，一捲就走」，本
  原型忠實重現此預判，同上，非本任務判定範圍）
```

### m2 spot-check（scrollY=0）

```
$ node magi/15-statusline-editor-layout/spikes/proto/measure.mjs --arm m2 --viewport 1280x800 --scrolls 0
→ maxScroll=0（html/body 皆 overflow:hidden，document 層級不可捲——見下方
  「m2 校準紀錄」）
→ footer.top=1067.84375 > innerHeight(800)：footer 落在視窗外、不可捲達
  （M2 定義「footer 自然被擠出視窗」的直接量測證據）
→ catalogCol/listCol/settingsCol 三欄 height 皆為 564.984375（align-items:
  stretch，三欄一致拉伸滿 main 內剩餘高度，三欄皆可各自 overflow-y:auto
  內捲）
```

### 三臂 × 三 viewport 全清單 width/height>0 驗證（rect 六項×9 組合＝54 項）

對 `{m1a,m1b,m2} × {1400x1000,1280x800,390x844}`（`--scrolls 0`）逐一
確認 `band`／`catalogCol`／`listCol`／`settingsCol`／`header`／`footer`
六個 rect 皆 `width>0 && height>0`——9 組合全數 `OK`（本任務執行紀錄，
可用上方「用法」節的指令逐一重跑複現，非一次性截圖證據）。

## m2 校準紀錄（app-shell footer 擠出效果，實作過程踩坑記錄）

M2 首版實作曾誤用 `body{display:flex;flex-direction:column}` 排列
`header`／`main`／`footer`：flex 子項預設 `flex-shrink:1`，即使
`main` 宣告 `height:100dvh`，瀏覽器仍會把它當 flex-basis 起點、依
`body` 剩餘空間把 `main` **縮小**塞入（`footer` 因此正常可見，完全
不會重現「footer 被擠出視窗」的 M2 定義代價）。改為 `body` **不用
flex**（一般 block 正常流），`main` 的顯式 `height:100dvh` 才不受
手足擠壓，`header` 高度＋`main` 的 `100dvh` 必然超出 `body` 本身的
`100dvh`，`footer` 隨之落在裁切範圍外。

另外，僅鎖 `body{overflow:hidden}` 不足以讓 `window.scrollTo()` 失效
——document／viewport 層級的捲動仍可運作（`html` 預設 `overflow:
visible` 時，常見的「overflow 由 body 傳播至 viewport」認知在本例未
生效，`window.scrollTo` 仍可移動 `scrollY`）；須 `html` 自身也顯式
`overflow:hidden`，兩層皆鎖後 `window.scrollTo()` 才真正失效
（`scrollY` 恆為 0，如上方 m2 spot-check 所示）。兩處踩坑與修正皆已
寫入 `proto.css` 對應規則旁的註解，供後續任務／覆核者對照。

## 已知簡化（拋棄式 spike，非出貨等級）

- `skip-nav`／`status`／`error` 為視覺隱藏的**靜態佔位節點**（非可運作
  的 landmark 或 live region），D4 五條 skip 連結、真實 a11y 屬性留待
  MS2/MS3 落地時處理，不在本任務範圍。
- 無深/淺主題切換、無 i18n、無鍵盤/拖曳互動 JS——本原型純靜態 HTML/CSS，
  供 CDP 量幾何用，不含任何 `<script>`。
- 頁首 mock 高度未精確校準到 236px（本原型於 1400 寬實測 ≈268px，與
  `sprint14-S1` 實測 dist header 236px 同量級但非逐位元相同）——本任務
  brief 僅要求「校準到 ~236px」量級對齊，精確頁首高度非本任務門檻
  （S-b／T1.3 垂直預算量測會再校準）。
- `<1100px` 摺疊為極簡單欄堆疊（`.builder-columns{grid-template-columns:
  1fr}`＋解除 catalog/list 欄 sticky），非 MS3 D8 定案的「目錄可收合」
  完整行動版設計——僅避免窄視窗下三欄互相擠壓到無法閱讀，390×844 viewport
  的驗收僅要求六個 rect `width>0`（已滿足），非行動版 UX 驗收。
