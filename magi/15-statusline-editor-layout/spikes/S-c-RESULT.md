# S-c Tab 走查 — 結果（T1.6）

> Sprint: `magi/15-statusline-editor-layout/`　Task: T1.6（spike S-c，🔀 lane
> 並行）
> 對照：`PLAN.md` Rev 3 §G6／round-1 C3／D4 skip-nav 表；`TASKS.md` T1.6。
> 量測底座：`spikes/proto/measure.mjs`（T1.1 產出，本任務**未變更**其輸出
> 契約，亦未變更 `spikes/proto/` 本體任何檔案，`git status` 可核）。
> 原型：**副本** `spikes/s-c/`（`spikes/proto/` 整份複製而來，僅本副本
> 上修改；本任務只用 **m1a 臂**）。
> 新寫量測腳本：`spikes/s-c/tab-walk.mjs`（基於 `measure.mjs` 的 CDP
> bootstrap，量測邏輯換成鍵盤走查）。
> 基線出處：`magi/14-statusline-ux-round2/spikes/S5-RESULT.md`（「桌面
> 斷點」節，`10–16 settings（全域設定 7 個欄位）`——設定第一個欄位為
> **第 10 停點**，逐字採用此數值為 sprint14-S5 基線）。

## 結論總覽

| 項目 | 結果 |
|---|---|
| Gate（路徑 A 鍵擊數 ≤ 10×2=20） | **✅ 過關**（兩 viewport 皆 6 擊，遠低於 20） |
| Fragment-navigation focus 行為 | **✅ 生效**（Chromium：Enter 後下一次 Tab 的 `activeElement` 確實落於 `#global-section` 內，兩 viewport 一致） |
| 對 MS3 的指令 | **不需要**額外 JS focus 管理——純原生 `<a href="#global-section">` 錨點跳轉即可讓下一次 Tab 從設定欄第一個控件續走，MS3 skip-link 可維持「無 JS 攔截」的簡單實作 |

---

## 一、副本可聚焦化清點表

`spikes/s-c/m1a.html`（複製自 `spikes/proto/m1a.html`，本任務改動）各區
可聚焦元素數，與真實頁（`tools/statusline-builder/index.html`）量級對照：

| 區塊 | 副本可聚焦數 | 元素 | 真實頁對照 | 備註 |
|---|---|---|---|---|
| `<header>` | 3 | back-link `<a>`＋深色模式切換 `<button>`＋語言切換 `<button>` | 3（`back-link`／`.theme-toggle`／`.lang-toggle`，`index.html:56,65,75`） | 已由 T1.1 原型建好，本任務未改 |
| skip-nav（`<main>` 起首） | **5**（新增，本任務） | 5 條 `<a class="skip-link">`：跳至設定／跳至目錄／跳至列區／跳至預覽／跳至產出腳本 | PLAN §D4 表（新規格，現行 `index.html:272-276` 僅 3 條；本任務按 D4 目標值 5 條建置） | 原 `.skip-nav-mock` 為 `aria-hidden` 靜態占位（0 可聚焦），本任務替換為真實連結 |
| status/error live region | 0 | — | 0（`role=status`／`role=alert`，無 `tabindex`） | 維持佔位，未改 |
| 預覽頂帶控件 | 7 | 底色×2＋情境×4＋產出腳本鈕×1（`id="output-dialog-open"`，新增） | 7（`#preview-bg-group` 2 選項＋`#preview-scenario-group` 4 選項＋產出腳本鈕；`index.html:320-350`＋別處按鈕） | T1.1 原型已是真實 `<button>`，本任務僅補 `id` |
| 預覽終端框 | 1（`tabindex=0`） | `#preview-terminal-mock` | 1（`#preview-terminal` 仍為 `tabindex=0` 捲動停點，`index.html:263` 附近註解確認） | 未改 |
| 教學帶「知道了」鈕 | 1 | `.tutorial-band-mock__dismiss` | 1（`tutorial-band` dismiss 鈕，D5 遷入目錄欄頂） | 未改 |
| 目錄項（30 項，4 分區 12/5/10/3） | **30**（本任務新增可聚焦化） | 每項 1 個 `<label><input type=checkbox></label>`（比照真實頁 `.catalog-item` 結構） | 每項 1 個 checkbox（`index.html:846-853` `#catalog-item-template`） | 原為純 `<span>`，本任務改真實 checkbox；已模擬 ≥8 段密度（總量 30 遠超 8） |
| 列區（已選擇，5 組、共 21 列） | **147**（21 列 × 7 控件，本任務新增） | 每列：上移／下移／移除鈕 × 3 ＋「顯示於第 N 列」select＋「顯示樣式」select＋「顯示文字」checkbox＋「顯示長條圖」checkbox | 口徑採 sprint14-S5 基線「每列 7 個控件」（`S5-RESULT.md` 桌面斷點節逐字列出同 7 項） | **簡化聲明**：真實頁 `#segment-row-template`（`index.html:945-1029`）實際欄位更多（另含前綴 input／色選 mount×2／閾值 mount，百分比段才有），本任務比照 S5 既有口徑（7 項）而非窮舉真實模板全部欄位，屬**刻意簡化、非遺漏**——已於此列出差異，不影響 gate 判定（gate 只看路徑 A，不依賴此密度） |
| 全域設定（`#global-section`） | 6（未逐一走查完，僅需第 1 個控件） | 呈現模式 radio×2／分隔符 select／Powerline 箭頭 checkbox／末段補箭頭 checkbox／腳本路徑 input | 5 個 control-group、量級相同（隱藏的自訂分隔符 input 因 `hidden` 屬性正確排除在外） | T1.1 原型已是真實控件，本任務未改 |
| **合計（Path B 抵達設定前）** | **194** ＋ 1（抵達）＝**195** | — | PLAN 估算 76–180 | 195 略高於估算上界，主因新 5 條 skip-link 為**必要**真實聚焦停點（skip-link 若不可聚焦則機制本身失效）＋列區 7 控件口徑，見下方「路徑 B」節說明 |

---

## 二、兩 viewport × 兩路徑量測

重跑指令：

```bash
node magi/15-statusline-editor-layout/spikes/s-c/tab-walk.mjs --viewport 1400x1000 --path a
node magi/15-statusline-editor-layout/spikes/s-c/tab-walk.mjs --viewport 1400x1000 --path b --max-steps 260
node magi/15-statusline-editor-layout/spikes/s-c/tab-walk.mjs --viewport 390x844   --path a
node magi/15-statusline-editor-layout/spikes/s-c/tab-walk.mjs --viewport 390x844   --path b --max-steps 260
```

### 路徑 A（skip 路徑，gate 對象）— 1400×1000

```
n=1 Tab  A      page-header-mock__back        "← 返回 EZTools"
n=2 Tab  BUTTON —                              "深色模式切換"
n=3 Tab  BUTTON —                              "EN"
n=4 Tab  A      skip-link (skip-to-settings)   "跳至設定"      insideSkipNav=true
n=5 Enter A     （送出後 activeElement→BODY，fragment 導覽已觸發，
                  document.activeElement 對非可聚焦目標的既知行為）
n=6 Tab  INPUT  （#global-section 內第一個 radio）insideGlobalSection=true
```

`arrived=true`　`totalKeystrokes=6`　`enterStepIndex=5`
`fragmentNavAssertion.insideGlobalSection = true`

### 路徑 A — 390×844

逐位元相同軌跡（`totalKeystrokes=6`、`enterStepIndex=5`、
`fragmentNavAssertion.insideGlobalSection=true`）——與桌面斷點**完全一致**
（DOM 序未因斷點切換而變動，比照 sprint14-S5 已證實的「CSS
`display:grid`→`flex` 切換不影響 Tab 走查順序」結論，見 S5-RESULT.md）。

### 路徑 B（對照，純 Tab 不用 skip）— 兩 viewport 皆 `totalKeystrokes=195`

軌跡分段摘要（兩 viewport 逐位元相同）：

```
1–3    header（返回連結／深色模式切換／語言切換）
4–8    skip-nav（5 條，依序：跳至設定／目錄／列區／預覽／產出腳本）
9–14   preview-band 底色×2＋情境×4
15     產出腳本鈕（output-dialog-open）
16     #preview-terminal-mock（tabindex=0 捲動停點）
17     教學帶「知道了」鈕
18–47  目錄欄 30 個 checkbox
48–194 列區 21 列 × 7 控件＝147
195    #global-section 內第一個控件（抵達）
```

順序單調前進、無跳躍或回頭，與 S-a-RESULT.md 記載的 DOM 序
（header→skip-nav→preview→catalog→list→settings，本 sprint 把 settings
移到最末）完全吻合。

---

## 三、Gate 判定

**Gate**：路徑 A 鍵擊數（含 Enter）≤ sprint14-S5 基線（10）× 2 ＝ 20。

| viewport | 路徑 A 總鍵擊數 | Gate（≤20） |
|---|---|---|
| 1400×1000 | 6 | **✅ 過** |
| 390×844 | 6 | **✅ 過** |

兩 viewport 皆以極大餘裕過關（6 vs 20 上限，僅約基線的 60%，甚至低於
sprint14-S5 基線本身的 10）——skip-link「排第一」的補償策略**完全抵銷**
了設定欄移至 DOM 序最末造成的 Tab 序退化，且优于原始基線（因為新
skip-nav 把「跳至設定」放在所有其他 skip-link 之前，使用者不必先掃過
目錄／列區/預覽/產出腳本四條才找到設定）。

---

## 四、Fragment-navigation focus 行為判定

**判定：生效（Chromium）。**

依據：`fragmentNavAssertion.insideGlobalSection === true`（兩 viewport
一致）——Enter 觸發原生 `<a href="#global-section">` 錨點跳轉後，
`document.activeElement` 立即變回 `BODY`（`#global-section` 本身是純
`<div>`、無 `tabindex`，非可聚焦元素，故不會被瀏覽器直接設為
`activeElement`，此為預期行為，非缺陷）；但瀏覽器內部的 **sequential
focus navigation starting point** 確實被設為該錨點目標——緊接著的**下一次
Tab**（步驟 6）正確落在 `#global-section` 內的第一個可聚焦後代元素
（`<input type="radio">`，全域設定「呈現模式」欄位第一個選項），而非
從文件開頭重新走訪、也非停在 `BODY`／`skip-link` 原地不動。

**對 MS3 的指令**：**不需要**改走 JS focus 管理。`<a href="#global-section">`
搭配**零 JS**（本副本 `m1a.html` 全檔無 `<script>` 標籤，`跳至設定`
連結未掛任何 `click` handler，純原生 fragment navigation）即可讓鍵盤
使用者「Enter 後續按一次 Tab」直達設定欄第一個控件，MS3 實作「跳至設定」
可維持與現行 `index.html:272-276` 其餘 skip-link 相同的極簡模式（純
`<a href="#id">`，不需要比照
`wireSkipToOutput`／`#preview-terminal` 那種需要 `preventDefault()` +
`el.focus()` 的攔截式寫法）。

---

## 五、誠實聲明

- **本量測僅涵蓋 Chromium**（`measure.mjs`／`tab-walk.mjs` 共用的
  `EDGE_CANDIDATES` 探測清單僅含 Edge／Chrome／Chromium 執行檔路徑，本機
  環境亦無 Safari／WebKit 引擎可測，見 `tab-walk.mjs` 瀏覽器探測節）。
- **WebKit 對 sequential focus navigation starting point 歷史上行為不穩**：
  WebKit／Safari 對「片段導覽跳到非可聚焦元素後，下一次 Tab 是否從該
  元素接續」這件事，長期與 Chromium／Firefox 的實作不完全一致（歷史上
  WebKit 曾在此情境下把 focus 起點重置回文件開頭或不更新起點，而非採用
  目標元素接續）——本 spike **未**對 WebKit 實測，MS3 若需支援 Safari
  使用者，**建議**在正式導入前針對 Safari／WebKit 額外手動或以
  BrowserStack 等外部服務覆核一次此路徑，不可直接假設本結果（Chromium）
  可外推至 WebKit。本專案其餘 e2e 測試（`scripts/e2e-statusline.mjs`）
  同樣僅覆蓋本機 Edge/Chromium，此為既有、非本任務新增的覆蓋範圍限制。

---

## 六、證據

```bash
$ git status --short magi/15-statusline-editor-layout/
?? magi/15-statusline-editor-layout/
```

（整個 sprint 目錄自 T1.1 起即未追蹤；`spikes/proto/` 本體未被本任務
改動，`spikes/s-b/`／`spikes/s-f/`／`spikes/s-i/` 等其他 lane 目錄同樣
未被觸碰。）

本任務實際改動／新增範圍：

- 新增 `spikes/s-c/`（`spikes/proto/` 整份複製）：
  - `m1a.html`：skip-nav 佔位換真實 5 條連結＋落點 id
    （`#global-section`／`#catalog-section`／`#selected-section`／
    `#preview-section`／`#output-dialog-open`）＋目錄項／列區列補真實
    可聚焦控件（checkbox／button/select，見「一、清點表」）。
    `m1b.html`／`m2.html` 為複製後**未改動**（本任務只用 m1a 臂）。
  - `proto.css`：新增 `.skip-nav`／`.skip-link` 規則（比照
    `tools/statusline-builder/style.css`）＋新控件的最小樣式。
  - `measure.mjs`：複製後**未改動**（沿用其 CDP bootstrap 供
    `tab-walk.mjs` 參考，未 import）。
  - `tab-walk.mjs`：本任務新寫，鍵盤走查量測腳本（見腳本檔頭註解）。
- 新增 `spikes/S-c-RESULT.md`（本檔）。

重跑 4 組合（2 viewport × 2 路徑，`exit=0` 全數成功，JSON 皆為合法輸出）：

```bash
for vp in 1400x1000 390x844; do
  node magi/15-statusline-editor-layout/spikes/s-c/tab-walk.mjs --viewport "$vp" --path a
  node magi/15-statusline-editor-layout/spikes/s-c/tab-walk.mjs --viewport "$vp" --path b --max-steps 260
done
```

輸出摘要（4 組合逐一列出 `arrived`／`totalKeystrokes`）：

| viewport | path | arrived | totalKeystrokes |
|---|---|---|---|
| 1400×1000 | a | true | 6 |
| 1400×1000 | b | true | 195 |
| 390×844 | a | true | 6 |
| 390×844 | b | true | 195 |
