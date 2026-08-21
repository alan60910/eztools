# S-b 垂直預算 — 結果（T1.3）

> Sprint: `magi/15-statusline-editor-layout/`　Task: T1.3（spike S-b，🔀 lane
> 並行——嚴守檔案邊界，僅寫 `spikes/s-b/` 與本檔）。
> 對照：`PLAN.md` Rev 3 §二／D2／G9／OQ-2／`spikes/S-a-RESULT.md`（捲動模型
> 已定案 M1′-a、欄遮蔽殘差已定案候選 2〔接受並量化、≤140px 容許量〕、
> `--band-h` 已定案走 ResizeObserver）；`TASKS.md` T1.3。
> 環境：Windows 11；Microsoft Edge（`C:\Program Files (x86)\Microsoft\Edge\
> Application\msedge.exe`）；CDP headless=new。

## 結論總覽

| 判定 | 結果 |
|---|---|
| **G9 可見容量門檻（主判準）** | **通過**（目錄欄可見 10 項 ≥8；列區可見 2 個完整群組 ≥2，見下方「敏感度」附註——零餘裕，且會隨捲動加深退化，非本 spike 授權範圍內的新缺陷，屬 S-a 已定案並接受的 N4 殘差同一根因） |
| **G9 輔助判準（工作欄可用高 ≥ sprint14 基準×85%）** | **通過**，且大幅超標（新版兩欄 clientHeight 皆 608px，sprint14 基準 564px×85%＝479.4px，608/564＝107.8%） |
| **OQ-2（設定欄是否需要獨立捲軸）** | **定案：不需要**（自然內容高 440px，在本任務量到的所有頂帶高度情境下〔191–320px〕皆有 40–168px 餘裕）；已知有限成長風險（條件式提示行同時顯示時＋最壞頂帶封頂同時發生的極端組合）留一句施工提醒，見下方 OQ-2 節 |
| **退階梯** | **未觸發**（G9 通過，不需要 wrapper 補償高／壓縮頁首／M2） |

**未觸發 GATE-FAIL**——本任務六項量測皆有數據，G9 兩項門檻皆通過，`spikes/s-b/`
副本内容與量測方法見下方各節。

---

## 方法說明

- **副本邊界**：`spikes/proto/` 整份複製到 `spikes/s-b/`（`m1a.html`／
  `m1b.html`／`m2.html`／`measure.mjs`／`proto.css`／`README.md`），僅在
  `spikes/s-b/` 內修改；`spikes/proto/`／`spikes/s-g/`／`spikes/s-j/`／
  `spikes/s-c/`／`spikes/s-f/`／`spikes/s-i/` 全程未寫入（見本檔末「證據」
  節 `git status --short`）。本任務只用 **m1a 臂**，`m1b.html`／`m2.html`
  複製過來但未使用（保留原樣，不受影響）。
- **兩個內容變體**（皆在 `spikes/s-b/` 內，理由見下方各自小節）：
  - `m1a.html`：**T1.1 原版預設內容量**（頂帶 3 行終端框、控制列不換行，
    `.preview-band` 實高≈191.016px，與 `:root{--band-h:192px}` 校準基準
    一致）＋ 本任務新增的 `<details open><summary>` 收合單位 mock（服務
    項目 5，落在教學帶之後、四分區之前，不影響頂帶／欄幾何）。用於
    **G9 門檻量測**與**項目 5**（兩者皆要求「預設內容量」或與 G8 收合
    典型情境對齊，見下方個別小節理由）。
  - `m1a-worst-band.html`：**最壞頂帶組態**（頂帶控制列標籤改用
    `messages.ts` 既有的「Full」變體字串製造 1280 寬換行壓力＋終端框
    5 行 powerline 風格樣本）。用於**項目 2／6**。**不**用於 G9 門檻，
    理由：`--band-h` 在本原型是固定 CSS 值（不接 JS，見
    `spikes/proto/README.md`「`--band-h` 校準紀錄」），若讓頂帶實際內容
    遠超此固定值，會使欄的 `top`／`max-height` 預算式與頂帶實際下緣脫鉤，
    量出的「可見容量」會混雜兩種變因（欄本身可用高減少＋頂帶膨脹）而
    失真，故拆成獨立檔案，兩者共用同一份 `proto.css`／`--band-h:192px`。
- **新增量測腳本**（`spikes/s-b/` 內，比照 `proto/measure.mjs` 的零依賴
  CDP bootstrap 手法）：
  - `measure-s-b.mjs`：`--mode g9|g9-sweep|band|mobile-overhead`，量
    proto 副本（`file://`）。
  - `measure-real.mjs`：量 `npx vite preview` 服務的真實 dist
    （`http://localhost:4180/`）。
- **debug port**：9950–9969 區段（brief 指定，避免撞其他並行 spike 的
  port 區間）。
- **真實 app 量測**（項目 1／3／4）：`npm run build`（產物即 sprint 14
  交付態——工作區僅 `scripts/e2e-statusline.mjs` 有未提交改動，不影響
  `tools/statusline-builder/` 本體）→ `npx vite preview --port 4180` →
  對 `http://localhost:4180/tools/statusline-builder/` 量測，量測後已
  關閉 preview 行程（見「證據」節）。
- **捲動位置與各量測項目的關係**（重要，逐項核實）：
  - 項目 2／6（頂帶／終端框高度）：`.preview-band{max-height:40dvh}`
    是純 viewport 高度換算值，與捲動位置**無關**（band 本身
    `overflow:hidden`，不是捲動容器），故用 `scrollY=0` 量測即可，
    不影響結果。
  - 項目 5（390 寬固定開銷）：頂帶／教學帶／`<summary>` 三者在 <1100px
    皆非 sticky（教學帶／summary 為一般文件流；頂帶全斷點 sticky 但其
    `top:0` 不受目前捲動位置影響渲染高度），量測與捲動位置無關。
  - 項目 1／3／4（真實頁）：`clientHeight` 由 `max-height:
    calc(100dvh - var(--column-top))` 決定，該值與捲動位置無關（純
    CSS 換算），但仍依規範待 `Page.loadEventFired`＋額外 400ms（main.ts
    `init()`／`syncColumnTop()` 執行完成）並在穩態捲距（scrollY＝頁首高
    ＋1）下取值，兩次讀值（初載 vs 穩態）逐位元相同，見下方「證據」。
  - **G9 門檻**（rect 交集計數）：**是**捲動位置敏感——這正是 S-a 已定案
    接受的 N4 殘差本體（欄遮蔽量隨捲動加深而增加）。本任務採 S-a 既有
    「穩態」定義（`scrollY ≥ 頁首高` 的**最小**達成值，即頂帶剛好
    `rect.top===0` 的那一刻，語意上最貼近「使用者剛捲過頁首、開始閱讀」
    的自然停駐點），並額外跑一輪敏感度掃描核實穩健度，見下方 G9 節。

---

## 六項量測

### 項目 1：1280×800 真實頁首高

量法：`document.querySelector('header').getBoundingClientRect().height`，
於 `npx vite preview` 服務的真實 dist、`scrollY=0`、載入完成＋400ms 後取值
（`main.ts` 之 `syncColumnTop()` 已寫入 `--column-top`，見下方數值互相印證）。
本頁**僅一個 `<header>` 元素**（含返回連結／標題／說明句／深色模式與語言
切換鈕），無獨立的「站台頁首」與「工具頁頁首」兩層結構——故本項數字即為
`<header>` 本身高度，也等於「自頁頂至 `<main>` 內容起點」的距離
（`main.getBoundingClientRect().top === header.getBoundingClientRect().
bottom`，已於輸出中互相核對，見下方指令）。

```bash
node magi/15-statusline-editor-layout/spikes/s-b/measure-real.mjs \
  --url http://localhost:4180/tools/statusline-builder/ --viewport 1280x800
```

```
initial.headerRect.height = 236.375
initial.mainTop           = 236.375   ← 與 header 底緣逐位元相同
steady.columnTopVar       = "236px"   ← main.ts syncColumnTop() 寫入值（取整），互相印證
```

**結果：236.375px**（`--column-top` 實際寫入 `236px`，四捨五入去尾）。
與 `magi/14-statusline-ux-round2/spikes/S1-RESULT.md` 實測 dist header
≈236px @1400 寬**幾乎完全一致**（1280 寬下僅 0.375px 差異）——header
內容在 1280–1400 寬區間換行結果相同，此為預期內的量級交叉驗證，非本任務
新發現。

### 項目 2：最壞組態頂帶高（5 列 powerline × 1280 寬控制列換行）

內容組態（`m1a-worst-band.html`，詳見該檔內註解）：情境／底色
segmented-mock 按鈕標籤改用 `messages.ts` 既有的「Full」變體字串（現行
產品僅用於 `title` 屬性、未綁按鈕可見文字）＋「產出腳本」鈕改用頁首
說明句同款完整措辭，**刻意**製造 1280 寬下控制列換行壓力（已以獨立
診斷腳本核實：`.preview-band__row` 四個直接子項目 top 值只出現 2 種
（289.234／283.844 為第一行，332.469／331.828 為第二行），確認真的換行
成 2 行，非量測假象）；終端框改 5 行 powerline 風格樣本文字（`white-
space:pre` ＋容器 `overflow:auto`，行內容長度只影響是否需要水平捲動、
不影響容器高度，5 行沿用 S-a 已驗證的行數基準）。

```bash
node magi/15-statusline-editor-layout/spikes/s-b/measure-s-b.mjs \
  --file m1a-worst-band.html --viewport 1280x800 --mode band
```

| | 值 |
|---|---|
| `.preview-band` 實高 | **279.78125px** |
| `max-height` 計算值（40dvh @800 高） | 320px |
| 是否封頂 | **否**（餘裕 40.21875px） |
| 終端框 `clientHeight` / `scrollHeight` | 121 / 121（無裁切，5 行完整顯示） |

對照 S-a 已測基準（同為 1280×800、5 行終端框但控制列未換行）：
231.797px。本任務新增的控制列換行壓力使頂帶再增高 **47.984px**
（279.781−231.797），與換行新增一整行控制列（含 `gap:0.6rem` 與按鈕自身
高度）的量級吻合。**即使兩種最壞因子（5 行終端框＋控制列換行）同時疊加，
1280×800 下頂帶仍未觸 40dvh 封頂**，40.22px 安全餘裕。

### 項目 3：sprint14 @1280×800 工作欄可用高（G9 基準）

量法：真實 dist、`.builder-columns__list`（右欄＝教學帶＋目錄＋已選擇
同居的單一捲動容器，即 brief 所稱「工作欄」）`clientHeight`，載入完成＋
穩態捲距（`scrollY` = 頁首高 236.375 之上取整＋1 ＝238，實際 clamp 至
166——見下方「附帶觀察」）下取值；順帶量中欄（`.preview-section`）與
左欄（`.builder-columns__settings`）供對照。同一支
`measure-real.mjs` 呼叫、同一批輸出（見項目 1 指令與原始 JSON）。

| 欄 | selector | `clientHeight` | `scrollHeight` |
|---|---|---:|---:|
| **工作欄（右，G9 基準）** | `.builder-columns__list` | **564px** | 2454px |
| 中欄（預覽） | `.preview-section` | 260px | 260px（無裁切） |
| 左欄（設定） | `.builder-columns__settings` | 472px | 517px |

**G9 基準值：564px**（`.builder-columns__list.clientHeight` @1280×800，
初載與穩態捲距兩次讀值逐位元相同，見下方「附帶觀察」）——此為 PLAN §G9
「工作欄可用高 ≥ 同視窗下 sprint 14 實測值之 85%」的**基準來源**（564×
0.85＝479.4px），取代 PLAN 原文「未實測的外推」（1400×1000 推得約
480px），本項為 1280×800 的**首次真實量測值**。

**附帶觀察**：`.builder-columns__settings` 的 `clientHeight`(472)
`< scrollHeight`(517)，相差 45px，即使該欄無任何 `max-height`／
`overflow` 限制（`style.css` 對 `.builder-columns__settings` 僅有
`min-width:0` 一條規則）。診斷：`clientHeight` 反映欄自身文件流所撐開的
padding-box 高度，`scrollHeight` 額外涵蓋文件流之外仍會貢獻「內容總高度」
的部分（例如以 `position:relative`/`absolute` 定位、或負 margin 造成內容
視覺延伸出正常流框但未觸發捲動容器的子孫）。本差異**不影響**本任務任何
判定（OQ-2 直接引用 `#global-section.scrollHeight`＝440px，不經過此
wrapper 的 472/517 兩個數字），僅記錄供覆核者理解，非本任務授權範圍內
需要根治的缺陷。`initial`／`steady` 兩次讀值（`scrollY=0` vs
`scrollY=166`，見下方「捲動 clamp」）三欄 `clientHeight` 逐位元相同
（472/260/564），印證「與捲動位置無關」的方法論前提成立。

**捲動 clamp 附記**：`measure-real.mjs` 請求 `scrollTo(0, 238)`，但真實
dist 頁面此時 `maxScroll≈166`（右欄內容雖有 2454px 之高，但因其自身即為
獨立捲動容器 `overflow-y:auto`，**不**貢獻 `document.scrollHeight`，故
外層頁面可捲動距離遠小於 proto 原型），瀏覽器將捲動 clamp 在
`scrollY=166`。由於三欄 `clientHeight` 已證實與捲動位置無關（上段），
此 clamp 不影響本項數字，僅記錄供覆核者理解讀值口徑差異（proto 原型
`.builder-columns` 直接是 `<main>` 子節點且不是獨立捲動容器，故其
maxScroll 遠大於真實 dist 頁）。

### 項目 4：設定欄自然高度（定 OQ-2）

量法：真實 dist、`#global-section.scrollHeight`（自然內容高，不受任何
`max-height` 裁切——現行 sprint 14 版面對此節點無高度限制，見上方項目 3
「附帶觀察」，`clientHeight===scrollHeight===440`，與外層 wrapper 的
45px 落差無關）。

**結果：440px**。

**OQ-2 定案見下方獨立節。**

### 項目 5：390×844「頂帶＋教學帶＋summary」固定開銷（服務 G8）

量測物件：`m1a.html`（預設內容量——G8 收合開銷應反映**典型**行動版
情境，非最壞組態，故不用 `m1a-worst-band.html`）；`<summary>` mock 為
本任務新增節點（`.catalog-collapse-mock__summary`，落在教學帶之後、
四分區之前，`open` 屬性——比照 D8「HTML 出貨態寫 `open`」定案，詳見
`m1a.html` 內對應註解）。

```bash
node magi/15-statusline-editor-layout/spikes/s-b/measure-s-b.mjs \
  --file m1a.html --viewport 390x844 --mode mobile-overhead
```

| 元件 | 高度 |
|---|---:|
| 頂帶（390 寬、3 行終端框、控制列自然換行） | 301.984375px |
| 教學帶 mock | 120px |
| `<summary>` mock | 22.5px |
| **合計固定開銷** | **444.484375px** |
| 390×844 扣除固定開銷後剩餘可視高 | **399.515625px** |

頂帶數字（301.984375）與 S-a `--band-h` 穩定性實驗的 390×844／3 行基準
（301.984px）逐位元相同（同一份 `m1a.html` 內容、同一 viewport，預期
一致，交叉驗證通過）。399.516px 剩餘可視高即為 G8 收合後（`<summary>`
與頂帶固定佔用後）列區起始能否完整入視窗的可用預算——本任務僅提供此
數字供 T4.3（G8 硬驗收 e2e）與 S-f（D8 狀態機）參考，**不**在本任務
範圍內判定 G8 本身是否過關（G8 驗收案屬 MS4 T4.3，需真實列區首列群組
高度，該部分現行 sprint 14 已有真實列高數字可估算，但完整 G8 判定超出
本任務六項量測的範圍，brief 原文亦僅要求「服務 G8」，非「判定 G8」）。

### 項目 6：頂帶封頂後終端框實得高度

於項目 2 的最壞組態下，額外在 **390×844** 量一次（1280×800 未封頂，見
項目 2），確認封頂後終端框的實際可視高度：

```bash
node magi/15-statusline-editor-layout/spikes/s-b/measure-s-b.mjs \
  --file m1a-worst-band.html --viewport 390x844 --mode band
```

| | 值 |
|---|---|
| `.preview-band` 實高 | 337.59375px |
| `max-height` 計算值（40dvh @844 高） | 337.6px |
| 是否封頂 | **是**（337.59375 ≈ 337.6，差 0.00625px，四捨五入誤差內） |
| 終端框 `clientHeight` | **79px** |
| 終端框單行實高（等寬字型） | 20.390625px |
| 可視完整行數 | **79 / 20.390625 = 3.874 → 3 行完整可見（＋第 4 行局部可見 17.83px）** |

**結果：封頂後終端框實得高度可容納 ≥3 完整列（3.874 行），滿足 PLAN D1
「頂帶高度上限」段落「頂帶封頂後終端框實得高度 ≥3 列」的要求。**
（對照 1280×800：即使同樣的最壞組態，頂帶未封頂，終端框 `clientHeight
=scrollHeight=121`，5 行全數無裁切完整顯示，見項目 2。）

---

## G9 可見容量門檻判定

### 方法（rect 交集機械計數）

量測物件：`m1a.html`（**預設內容量**，理由見上方「兩個內容變體」節）、
1280×800、穩態捲距（`scrollY` = `Math.ceil(頁首高) + 1`，並以迴圈確認
`.preview-band.rect.top === 0` 才視為真正達成穩態——實測本原型
`steadyScrollY = 269`）。

**欄可視 rect** ＝ 欄自身 `getBoundingClientRect()` 與「頂帶下緣～視窗
下緣」的交集（`visibleTop = max(colRect.top, bandRect.bottom, 0)`，
`visibleBottom = min(colRect.bottom, innerHeight)`）——模擬頂帶不透明
遮蔽（比照 S-a T3 判準：欄內容 `top < 頂帶 bottom` 即視為被遮，見
`S-a-RESULT.md` 候選 2 定案）。逐項目／逐列群組 rect 若**完整**落在
欄可視 rect 內（`item.top ≥ visibleTop && item.bottom ≤ visibleBottom`，
0.5px 容差防子像素邊界抖動）才計入。

```bash
node magi/15-statusline-editor-layout/spikes/s-b/measure-s-b.mjs \
  --file m1a.html --viewport 1280x800 --mode g9
```

### 結果

| 判準 | 門檻 | 實測 | 結果 |
|---|---|---:|---|
| 目錄欄可見完整目錄項數 | ≥8 | **10**（共 30 項） | **通過**（餘裕 2 項） |
| 列區可見完整列群組數（標題＋首列控件） | ≥2 | **2**（共 5 組） | **通過（零餘裕）** |

輔助判準（見項目 3）：新版面兩欄 `clientHeight` 皆 608px（
`calc(100dvh(800) − band-h(192)) = 608`），對照 sprint14 基準
564×0.85＝479.4px → **608 ≥ 479.4，通過**，且大幅超標（107.8% of
基準，而非僅壓線通過 85% 門檻）。

### 敏感度掃描（穩健度核實，非門檻本身）

「穩態捲距」在本原型下並非單一穩定值，而是一段延續到 max-scroll
（422px）的**持續變動區間**——此即 S-a 已定案接受的 N4 殘差本體（欄
`travel≈0`，遮蔽量隨捲動加深而增加，S-a 量得 max-scroll 處遮蔽
134.156px）。本任務額外跑一輪掃描核實 G9 計數在此區間內的穩健度：

```bash
node magi/15-statusline-editor-layout/spikes/s-b/measure-s-b.mjs \
  --file m1a.html --viewport 1280x800 --mode g9-sweep
```

| `scrollY` | 目錄可見項數 | 列區可見群組數 | 欄頂-頂帶下緣（N4 遮蔽量） |
|---:|---:|---:|---:|
| 0（初載未捲） | 2 | 1 | +20（未遮蔽，欄尚在文件流未黏住） |
| 200（頁首未捲完） | 8 | 2 | +20 |
| 250 | 9 | 2 | +17.84 |
| **269（本任務採用的「穩態」起點）** | **10** | **2** | +18.84 |
| 300 | 10 | 2 | −12.16（開始遮蔽） |
| 350 | 10 | **1** | −62.16 |
| 400 | 10 | 1 | −112.16 |
| 422（max-scroll） | 10 | 1 | **−134.16**（與 S-a 實測 max-scroll 遮蔽量 134.156px 逐位元吻合，交叉驗證） |

**判讀**：目錄欄項數判準（≥8）在 `scrollY≥200` 全程穩健通過（8→10，
單調不減）。**列區群組判準（≥2）僅在 `scrollY∈[200,~320]`（穩態起點
附近）成立，`scrollY≥350` 起退化為 1（不足）**——與目錄欄項數判準的
穩健表現不同調。根因與 S-a 的 N4 分析完全同一個（欄 `travel≈0`，
`--band-h` 固定值下欄的 sticky 位置隨捲動持續漂移、非真正「卡住」），
**非本任務新發現的獨立缺陷**，S-a 已就此根因做出候選 2（接受並量化，
`≤140px` 容許量）的專案級定案，不屬本任務裁決範圍。

**本任務判定**：依 brief 定義的「穩態捲距」（頂帶剛黏住的最小捲動值，
語意上最貼近使用者剛捲過頁首、開始閱讀的自然停駐點）量測，G9 兩項
門檻在此點**皆通過**，判 G9 **通過**。但列區群組判準**零餘裕**且已知
會隨使用者繼續往下捲而退化——此風險已如實記錄於此，供協調者評估是否
需要在 T2.6（e2e）或 MS2 落地時額外核實真實列高（本原型列高
`47.375px`／組為 mock 近似值，非真實 `tools/statusline-builder/` 列高，
真實列可能因色選/百分比控件而略高，需在 MS2 落地後以真實 DOM 覆核）。

---

## OQ-2 定案：設定欄是否需要獨立捲軸

**定案：不需要**（維持 D2 預設——設定欄不設 `max-height`／捲動容器）。

| 頂帶高度情境（1280×800） | 可用預算（100dvh−頂帶） | 設定欄自然高（440px）餘裕 |
|---|---:|---:|
| 預設（3 行終端框，`--band-h` 校準值 192px） | 608px | **+168px** |
| 最壞（5 行＋控制列換行，未封頂，279.781px） | 520.219px | **+80.219px** |
| 理論封頂上限（40dvh，320px） | 480px | **+40px** |

在本任務量到的**全部**頂帶高度情境下（191–320px 範圍），設定欄自然
內容高（440px，來自真實 dist `#global-section.scrollHeight`，項目 4）
皆有正餘裕（40–168px），**不會**溢出「若比照目錄／列區欄套用同一單項
扣除預算式」的可用高度——故不需要為設定欄額外設定獨立捲軸。

**已知有限成長風險（非阻斷，留一句施工提醒）**：`#global-section` 現行
440px 為**當前 DOM 狀態**（`separator-custom-field`／
`powerline-no-boundary-hint` 兩個條件式子節點目前皆 `hidden`）。若使用者
操作觸發**兩者同時顯示**（選「自訂分隔符」且同時符合「全段預設色＋
powerline＋無箭頭」提示條件），內容高度可能再增加約 60–140px（估計值，
未實測——本任務範圍只涵蓋預設狀態的自然高度，觸發條件式內容展開後的
高度變化屬另一個量測任務，不在本次六項量測授權範圍內），在此情境**疊加**
最壞頂帶封頂（480px 預算）時，440+140＝580px 將超出 480px 預算 100px。
此為**理論上限的極端疊加**（同時觸發兩個條件式提示行 **且** 同時觸發
40dvh 頂帶封頂），機率低，**不**建議現在就為此預先加防禦性
`overflow-y:auto`（增加不必要的視覺/測試面）；若 MS2 落地後真機覆核發現
此極端組合確實會溢出視窗，屆時補一條與目錄／列區同款的
`max-height:calc(100dvh - var(--band-h)); overflow-y:auto` 即可，成本低、
可延後決策。

---

## 對 MS2 的施工參數

1. **`--band-h` 靜態 CSS fallback 初值**：沿用 S-a／T1.1 既有校準值
   **192px**（3 行終端框、桌面寬控制列不換行的基準，`spikes/proto/
   README.md`「`--band-h` 校準紀錄」）——本任務未發現需要調整此初值的
   理由（本任務新增的「最壞組態」量測，其目的是驗證封頂安全餘裕，不是
   重新校準 fallback 初值本身；RO 首次量測結果會立即覆寫此值，
   fallback 僅服務 JS 執行前的極短暫首繪視窗，見 S-a-RESULT.md「七、
   MS2 施工指令」第 3 條，本任務結論與其一致、不重複定案）。
2. **40dvh 封頂的實效值**：
   - 1280×800：**320px**（＝40%×800，純算術，`dvh` 單位不受
     scrollbar-gutter 等因素影響，MS2 可直接信任 CSS `40dvh` 本身，
     不需要 JS 校正這個特定數字）。**本任務新增的最壞組態（5 行
     powerline＋控制列換行）在此寬度下仍不會觸頂**（實高 279.781px，
     餘裕 40.219px）——即使桌面寬控制列因未來內容增長而換行，40dvh
     上限仍有安全邊際，不需要調整上限公式本身。
   - 390×844：**337.6px**（＝40%×844）。本任務證實**確實會被觸頂**
     （最壞組態實高 337.59375px，與計算值幾乎相等），且封頂後終端框
     仍保有 **3.874 行**（clientHeight 79px ÷ 單行高 20.390625px）
     的可視空間，滿足 PLAN D1「頂帶封頂後終端框實得高度 ≥3 列」的
     既定要求——**40dvh 上限公式本身不需要調整**，現行公式在觸頂情境
     下仍能保障最低可用性。
3. **G9 兩項門檻對 MS2 落地後的覆核提醒**：目錄欄項數判準（≥8）在
   本任務的敏感度掃描下全程穩健（`scrollY≥200` 恆 ≥8）；列區群組判準
   （≥2）**零餘裕且會隨捲動加深退化至 1**（同一 N4 根因，S-a 已定案
   接受）。MS2 真實列高與本原型 mock 列高（47.375px／組）可能有出入
   （真實列可能因色選/百分比覆寫控件而略高），**建議 MS2 落地後以真實
   DOM 重跑一次本任務同款 rect 交集計數**，確認 G9 列區判準在真實內容
   下依然通過（本任務僅能保證原型 mock 內容下的數字，不能代表真實
   `tools/statusline-builder/` 列高下的最終結果）。
4. **OQ-2**：設定欄維持不設獨立捲動容器（見上方 OQ-2 節），MS2
   `#global-section` 相關規則不需新增 `max-height`/`overflow-y`。

---

## Proto 保真度敏感度註記

- **頁首 mock 268px vs 真實值 236.375px**（S-a-RESULT.md「六、原型保真度
  敏感度註記」已就 S-a 三項定案逐一核實無影響；本任務為此落差的
  **精確校準來源**——項目 1 已實測真實值為 236.375px，非 S-a 沿用的
  「~236px」概略值，兩者僅 0.375px 差異，量級一致）。本任務的六項量測
  中，**項目 2／5／6（proto 頂帶／終端框幾何）與頁首高度完全獨立**——
  `.preview-band{max-height:40dvh}` 是純 viewport 高度換算，不涉及頁首
  精確值；**項目 1／3／4 直接量真實 dist**，不受 proto 頁首 mock 誤差
  影響。故頁首 mock 的 268px vs 236.375px 落差對本任務任何判定
  **均無影響**（與 S-a 的結論同型）。
- **最壞頂帶組態的合成性質**（`m1a-worst-band.html`，本任務新增，
  非既有 proto 內容）：控制列換行壓力測試使用的按鈕標籤（`messages.ts`
  既有的「Full」變體字串）**目前並未綁定在真實產品的按鈕可見文字上**
  （真實產品綁定的是較短的「Short」變體，見 `messages.ts:580-587`／
  `813-824`，目前 1280 寬下不會換行）——這是刻意構造的「若控制列內容
  未來增長」壓力情境，**非**對現行真實產品的忠實重現。本任務已於項目 2
  結果中明確標註此性質，MS2 或未來 spike 若需要更貼近真實產品的頂帶
  壓力測試（例如真的改動 `main.ts` 綁定 Full 變體、或新增其他控制項），
  應在真實 `tools/statusline-builder/` 上重新量測，不應直接引用本任務
  279.781px 這個數字作為真實產品的出貨保證值——本任務數字的用途僅是
  「證明 40dvh 上限公式本身有餘裕」，不是「證明真實產品目前的頂帶高度
  就是 279.781px」。
- **G9 列區 mock 列高（47.375px／首列控件）非真實列高**：已於「MS2
  施工參數」節第 3 條註明，此處不重複。

---

## 證據

```bash
$ git status --short
 M scripts/e2e-statusline.mjs   # 既有未提交改動（非本任務改動，本任務未觸碰此檔）
?? magi/15-statusline-editor-layout/   # 整個 sprint 目錄未追蹤（T1.1 起新增）
```

本任務實際改動／新增範圍：

- 新增 `magi/15-statusline-editor-layout/spikes/s-b/`（`proto/` 整份
  複製＋修改）：
  - `m1a.html`：新增 `<details open><summary>` 收合單位 mock（服務
    項目 5），頂帶／終端框內容維持 T1.1 原版預設值（未變更）。
  - `m1a-worst-band.html`：新檔，`m1a.html` 的最壞頂帶組態變體（僅頂帶
    區塊不同，三欄與其餘結構逐字相同）。
  - `m1b.html`／`m2.html`／`proto.css`／`README.md`／`measure.mjs`：
    整份複製自 `proto/`，本任務未修改（`m1b.html`／`m2.html` 本任務
    未使用）。
  - `measure-s-b.mjs`：新檔，proto 副本量測腳本（`g9`／`g9-sweep`／
    `band`／`mobile-overhead` 四種 mode）。
  - `measure-real.mjs`：新檔，真實 dist 量測腳本。
- 新增 `magi/15-statusline-editor-layout/spikes/S-b-RESULT.md`（本檔）。
- **未寫入** `spikes/proto/`／`spikes/s-g/`／`spikes/s-j/`／`spikes/s-c/`／
  `spikes/s-f/`／`spikes/s-i/`（僅 Read，未 Write/Edit，見上方 git
  status 佐證——這些路徑未在 untracked 變更之外產生任何 diff）。

`npm run build`＋`npx vite preview --port 4180` 產物用於項目 1／3／4，
量測完成後已終止 preview 行程（非長駐服務，未留下背景 process）。

重跑本任務全部量測（依序）：

```bash
# 項目 2（1280×800，未封頂）／項目 6 前半
node magi/15-statusline-editor-layout/spikes/s-b/measure-s-b.mjs \
  --file m1a-worst-band.html --viewport 1280x800 --mode band

# 項目 6（390×844，封頂）
node magi/15-statusline-editor-layout/spikes/s-b/measure-s-b.mjs \
  --file m1a-worst-band.html --viewport 390x844 --mode band

# 項目 5
node magi/15-statusline-editor-layout/spikes/s-b/measure-s-b.mjs \
  --file m1a.html --viewport 390x844 --mode mobile-overhead

# G9 門檻（項目對應 PLAN §G9）
node magi/15-statusline-editor-layout/spikes/s-b/measure-s-b.mjs \
  --file m1a.html --viewport 1280x800 --mode g9

# G9 敏感度掃描
node magi/15-statusline-editor-layout/spikes/s-b/measure-s-b.mjs \
  --file m1a.html --viewport 1280x800 --mode g9-sweep

# 項目 1／3／4（需先 npm run build && npx vite preview --port 4180）
node magi/15-statusline-editor-layout/spikes/s-b/measure-real.mjs \
  --url http://localhost:4180/tools/statusline-builder/ --viewport 1280x800
```

六個指令全數 `exit=0`（無瀏覽器／CDP 錯誤），JSON 皆為合法輸出，數據見
本文件「六項量測」「G9 可見容量門檻判定」各節逐位元對應。
