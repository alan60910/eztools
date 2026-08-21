# S-h 規模探測 — 結果（T1.10）

> Sprint: `magi/15-statusline-editor-layout/`　Task: T1.10（spike S-h，**排在 MS1
> 之後**，前置骨架由 S-a 定案／M1′-a 勝出臂滿足）
> 對照：`PLAN.md`「S-h 規模探測（決定里程碑切分）」／`TASKS.md` T1.10；
> `spikes/S-a-RESULT.md`「七、MS2 施工指令」（骨架施工規格來源）；
> `spikes/proto/m1a.html`＋`spikes/proto/proto.css`（M1′-a 臂原型參考）。
> 唯二改動檔：`tools/statusline-builder/index.html`／`style.css`（JS 完全
> 不接，main.ts 等一律不碰）；**兩檔量測後已 byte-for-byte 還原**，見
> 「六、還原驗證」。

## 一句話結論

以 M1′-a 骨架（頂帶升格為 `<main>` 直接子節點＋三欄收 `.builder-columns`）
只改 HTML／CSS、JS 完全不接的條件下，**測試網連動成本遠低於「整套重
寫」**：vitest 64 檔中僅 **2 檔／6 案**因直接斷言「現行骨架契約」而紅
（其餘 62 檔、1929 案，含全部拖曳／resolve／emit／i18n／色彩／閾值等邏輯
層測試皆存活），e2e 11 案（含真瀏覽器拖放）**全數存活、0 紅**——因為本
spike 嚴守「保留所有既有 id／class 節點，只搬不刪」的紀律，main.ts 與
測試網的節點查找多數走 id／data-testid，不依賴節點的父層路徑。

---

## 一、骨架手術內容摘要

依 `spikes/S-a-RESULT.md`「七、MS2 施工指令」對 M1′-a 勝出臂的規格，對
兩檔做最小代表性重排（診斷／量測目的，非最終定案）：

### `index.html`（diff --stat：348 行變動，191 insertions / 157 deletions）

1. **skip-nav 移至 `<main>` 起首節點**：原掛在左欄設定容器尾端，搬至
   `<main>` 直接子節點第一位（`skip-nav → #output-status/#error-message
   → 預覽頂帶 → .builder-columns`，符合 M1′-a 契約次序）。節點本身
   id／class／內容零變動，僅物理位置搬移。
2. **`#preview-section` 升格為 `<main>` 直接子節節**：原本是三欄 grid
   （由 `main` 本身充當）之中欄，本 task 移出至 `.builder-columns`
   wrapper 之前，成為獨立的全寬 sticky 頂帶。節點內容／id／role／屬性
   完全不變（僅搬移＋外層 CSS 規則調整，見下方 CSS 節）。
3. **新增 `.builder-columns` wrapper**（`id="builder-columns"`），僅收
   三欄：
   - `.builder-columns__settings`（`id="settings-column"`，內容＝原
     `#global-section`，零變動）
   - `.builder-columns__list.builder-columns__catalog`（`id=
     "catalog-column"`，內容＝原 `#tutorial-band-slot` ＋
     `.segment-lists` 四類分區，零變動——**新增**
     `builder-columns__catalog` class 供本 spike 的兩欄各自 sticky
     CSS 掛鉤，並列使既有 `builder-columns__list` class 名不受影響）
   - `.builder-columns__list`（`id="list-column"`，內容＝原
     `#selected-section`，零變動）
4. **實際 DOM 子序為「設定｜目錄｜列區」**，非 S-a 原文標稱的視覺序
   「目錄｜列區｜設定」——本 spike 刻意選擇**移動量最小的路徑**（settings
   與 preview 相鄰對調，僅需搬動一個區塊即可讓 preview 躍居 columns 之
   前；若改依原文視覺序需額外搬動 catalog／list 越過 settings，移動量
   加倍且不影響本次「結構重排的測試網連動成本」量測目的）。CSS
   `grid-template-columns` 已對應調整為 `0.9fr minmax(340px,1fr) 1.6fr`
   （依 DOM 實際序把 S-j 定案的三軌寬度數值精確分配給設定／目錄／列區，
   語意等價，僅左右視覺順序不同）。**MS2 正式施工時三欄 DOM 序需對齊
   S-a 原文**，本簡化不影響「連動成本下界」量測的有效性——見「五、
   下界結論」對此簡化的具體評估。
5. 未刪除任何既有 id／class 節點；僅新增 3 個 id（`builder-columns`／
   `settings-column`／`catalog-column`）與 1 個 class
   （`builder-columns__catalog`）。jsdom 解析驗證：balanced tags、無
   孤兒節點，`main` 直接子節點序＝`nav.skip-nav → #output-status →
   #error-message → #preview-section → #builder-columns（內含
   settings-column/catalog-column/list-column 三欄）→
   #segment-hidden-pool → #output-dialog`。

### `style.css`（diff --stat：147 行變動，71 insertions / 76 deletions）

1. `.preview-section`：新增 `max-height: 40dvh; overflow: hidden;`
   （頂帶整體高度預算掛頂帶自身，S-a 契約）。
2. `.preview-terminal`：移除 `max-height: 40dvh`，新增 `min-height: 0`
   （原 `min-height: 3rem` 與新 `min-height: 0` 同屬性衝突，暫讓位給
   收縮需求——後者覆蓋前者，量測後隨還原一併復位）。
3. 新增 `:root { --band-h: 200px; }`（寫死近似值，符合本 task「JS 完全
   不接」硬約束；S-a 實測範圍 150–338px，200px 取中段近似）。
4. `<1100px`／`≥1100px` 斷點的 grid／flex 掛載元素由 `main` 改為
   `.builder-columns`（main 不再是三欄 grid，因其現在還要並列容納頂帶／
   skip-nav／live region 等非欄位節點）；`#output-status`／
   `#error-message` 的 `grid-column: 1/-1` 規則隨之移除（main 已非
   grid，該規則已無意義）。
5. `.builder-columns` 軌寬：`0.9fr minmax(340px, 1fr) 1.6fr`（S-j 定案
   數值依 DOM 實際序「設定｜目錄｜列區」重新分配，語意同「目錄1fr／
   列區1.6fr／設定0.9fr」）。
6. `.builder-columns__list`／`.builder-columns__catalog` 合併掛同一組
   sticky 規則：`position: sticky; top: var(--band-h); max-height:
   calc(100dvh - var(--band-h)); overflow-y: auto; overscroll-behavior:
   contain`（S-a「單項扣除預算式」＋S-g「overscroll-behavior:contain」
   雙定案；取代原 `top:0`／`var(--column-top, 0px)`）。
   `.builder-columns__settings` 刻意不進本規則（S-b OQ-2「設定欄不設
   獨立捲動容器」）。

---

## 二、vitest 連動實測

### 基準（開工前，協調者已親跑全綠）

`64 檔 / 1935 案全綠`。

### 骨架就位後（全套件跑，未隔離）

兩次全套件跑（同一骨架、未改動任何測試檔或 main.ts）數字略有出入，因
含 timeout 型 flake：

| 跑次 | 紅檔數 | 紅案數 | 綠案數 |
|---|---|---|---|
| 第 1 次 | 3 | 7 | 1928 |
| 第 2 次 | 3 | 8 | 1927 |

### 隔離重跑判別（flake vs 真連動，依 brief 紀律執行）

對 3 個涉紅檔各自獨立重跑（`npx vitest run <file>`），並將全部 3 檔一起
重跑一次交叉驗證，結果**兩輪一致**：

| 檔案 | 獨立重跑結果 | 判定 |
|---|---|---|
| `catalog-sample-values.dom.test.ts` | 9/9 全綠（2 次重跑皆綠） | **flake**（已知列表內，`Error: Test timed out in 5000ms`，僅在全套件高負載下觸發） |
| `layout-columns.dom.test.ts` | 4 失敗／6 通過（10 案，2 次重跑數字相同、失敗案完全相同） | **真連動**（4 案），另有 1 案（`<header> 高度變動...於下次 init 反映新值`）僅在全套件跑時因 timeout 紅、隔離跑兩次皆綠 → **flake**（已知列表內「layout-columns.dom.test.ts 高負載下也偶見」） |
| `preview-band.dom.test.ts` | 2 失敗／8 通過（10 案，2 次重跑數字相同、失敗案完全相同） | **真連動**（2 案） |

**真連動紅燈（確定性、非 flake）：2 檔／6 案**，逐案列出＋分類：

| 檔案 | 案名（節錄） | 失敗訊息 | 分類 |
|---|---|---|---|
| `preview-band.dom.test.ts` | `.builder-columns__catalog 已退役（T2.1 起改名 .builder-columns__settings，且目錄已搬出）` | `expect(...).toBeNull()` 收到非 null（本 spike 為兩欄各自 sticky 需要，重新啟用了 `.builder-columns__catalog` 這個舊 class 名，與此案斷言「該 class 已退役」正面衝突） | DOM 結構斷言失敗 |
| `preview-band.dom.test.ts` | `#preview-section 為 <main> 內三欄之中欄（設定→預覽→清單 DOM 序，不再是 <main> 前的獨立頂帶）` | `compareDocumentPosition` 斷言「settings 在 preview 之前」失敗（本 spike 反過來讓 preview 在 settings 之前） | DOM 結構斷言失敗 |
| `layout-columns.dom.test.ts` | `#tutorial-band-slot → .segment-lists → #selected-section 依序為 #list-column 內容` | `expect(segmentLists).not.toBeNull()` 收到 null（`.segment-lists` 已搬到新的 `#catalog-column`，不再是 `#list-column` 的子節點） | DOM 結構斷言失敗 |
| `layout-columns.dom.test.ts` | `.preview-section 本身不再帶 max-height:40dvh／overflow:hidden` | `expect(block).not.toMatch(/max-height/)` 失敗（本 spike 刻意把 40dvh 由 `.preview-terminal` 遷回 `.preview-section` 自身） | CSS 原始文字斷言失敗（同屬結構契約類） |
| `layout-columns.dom.test.ts` | `.builder-columns__list 基準規則具備 sticky／top:0／...max-height calc(100dvh - var(--column-top))` | `expect(stickyBlock).toBeDefined()` 收到 undefined（規則已改用 `var(--band-h)`，且與 `.builder-columns__catalog` 合併成單一逗號選擇器規則，測試的規則尋找邏輯落空） | CSS 原始文字斷言失敗 |
| `layout-columns.dom.test.ts` | `MAGI review 🔴-1：sticky 基準規則的字面位置歸屬 @media (min-width: 1100px) 區塊內，且不存在 media 外的無條件 sticky 基準規則` | `expect(...length).toBe(1)` 收到 0（測試對「恰有一條以 `.builder-columns__list` 為選擇器的 sticky 規則」計數，本 spike 把它併入逗號選擇器後計數邏輯落空） | CSS 原始文字斷言失敗 |

**init throw 連坐：0 案／0 檔。** 未觀察到任何測試因初始化拋錯而連坐
失敗——本 spike 全程未刪除任何既有 id／class 節點，main.ts（及其他
62 個測試檔背後可能執行的邏輯層程式碼）以 id／data-testid／class 查找
節點時，查找目標依然存在（只是換了父層容器），故不觸發任何 throw。
這是「保留所有既有 id/class 節點、只搬不刪」紀律最直接的效果：其餘
62 個測試檔（含 catalog／row-groups／resolve／emit-bash／emit-ps1／
render-preview／i18n／threshold／drag-drop／color 等）**全數存活**。

---

## 三、e2e 連動實測

### 重要前置發現：`test:e2e` 預設不重建 dist

`scripts/e2e-statusline.mjs` 只在 `dist/` **缺失**時才自動
`npm run build`；`dist/` 已存在時會印出「`dist/ already built ...
skipping build. Run npm run build manually first if you want to test a
fresh change.`」並直接沿用舊建置——若不手動先跑 `npm run build`，e2e
量測會對著**舊 dist**跑、完全量不到本次骨架改動。本任務量測時已手動
先 `npm run build`（產出反映骨架改動的 dist）再跑 `npm run test:e2e`。
此為**額外發現**，記入下方「五、下界結論」供 MS4-T4.1 執行者注意（brief
描述「會重建 dist」與實際腳本行為有出入，屬既有腳本行為、非本 spike
改動）。

### 基準（開工前）

`11/11 通過`（含 MS0 新增第 11 案 `viewport-probe-1280x800`）。

### 骨架就位＋重建 dist 後

`11/11 通過`——**0 紅**。逐案列出（皆 PASS）：

| 案 id | 案名 | 結果 |
|---|---|---|
| `same-row-swap` | 同列交換拖曳（基本盤） | PASS |
| `s1-cross-row-drain` | S1：跨列拖 drain | PASS |
| `s4-select-into-middle-pending` | S4：select 排空後再 select 指派進中間 pending | PASS |
| `s9-delete-pending-renumber` | S9：刪除 pending 後真實列編號重排 | PASS |
| `s7-drag-drain-reload` | S7：drag drain 後 reload | PASS |
| `catalog-drag-into-row` | T6.1：目錄拖入指定列 | PASS |
| `output-dialog-esc-focus-return` | T6.1：產出 dialog 開→複製→Esc 關→焦點還原 | PASS |
| `color-variant-override-survives-drag` | T3.1：色＋variant 覆寫 × 真 DnD 存活 | PASS |
| `tutorial-band-does-not-block-drag` | T4.2：教學帶不擋拖曳 | PASS |
| `mode-switch-scroll-position-stable` | T4.2：mode 切換捲動位置不變 | PASS |
| `viewport-probe-1280x800` | S-d：viewport 探針 | PASS |

**為何全數存活**：11 案的斷言主體是**行為**（拖放是否成功搬動節點、
焦點是否還原到指定按鈕、捲動位置是否不變）與**穩定錨點**
（`data-testid`／`id`），不依賴節點的父層路徑或欄位所屬——main.ts init
本身不因骨架重排而拋錯（同 vitest 節「init throw 連坐 0」），故互動
邏輯照常運作。唯一涉及幾何的 `viewport-probe-1280x800` 案，其斷言僅為
「`#preview-section` 寬度 >0 且 `rect.right` 未超出 1280 視窗寬」的寬鬆
健檢，並非 S-a 定案的 140px 遮蔽容許量／40dvh 封頂等精確數值斷言（那些
屬 `spikes/S-a-RESULT.md`「七、MS2 施工指令」第 4 條，規劃給 **T2.6**
新增，目前套件裡尚不存在）——故本次量測「巧合地」測不到這條路徑上的
連動，見下方「五」節的重要限定。

---

## 四、二輪降噪重跑

**未觸發**：`npm test` 首輪即可清楚歸因（3 檔可辨識、多數失敗訊息明確
指向具體斷言行；非「init throw 導致全紅無法歸因」情境），依 brief
紀律「僅當輪 A 呈全紅無法歸因時執行」，本任務不需要第二輪降噪重跑。

---

## 五、測試網連動成本下界結論（供 MS2–T2.4／MS4–T4.1 校準）

1. **連動成本下界遠低於「整套重寫」**：vitest 64 檔中僅 **2 檔／6 案**
   因骨架重排而紅，其餘 62 檔／1929 案（含全部邏輯層與多數 DOM 互動層
   測試）**意外倖存**；e2e 11 案**全數倖存**。粗估 MS2–T2.4（真實骨架
   施工後的測試修復）工作量下界＝改寫 2 個契約測試檔內的 6 條斷言（非
   刪除，是把「現行骨架」的斷言內容換成「新骨架」的等價敘述），而非
   大規模回歸。
2. **必然要改的測試（具體點名）**：
   - `tools/statusline-builder/preview-band.dom.test.ts`——`T2.1 三欄
     版面：舊 wrapper 退役` 與 `T2.1 三欄版面：結構與 DOM 序` 兩個
     describe 區塊內的斷言，需要整段改寫為 M1′-a 骨架下的新契約
     （頂帶是 `<main>` 直接子節點、不在三欄 grid 內；三欄改為
     目錄／列區／設定）。
   - `tools/statusline-builder/layout-columns.dom.test.ts`——`T2.2 右欄
     內容序`／`T2.1 40dvh 高度預算掛載點`／`T2.2 右欄容器 CSS 契約`
     三個 describe 區塊需同步改寫（右欄拆兩欄後「內容序」斷言邏輯需
     整個重寫成「兩個獨立欄」的版本；40dvh 掛載點斷言方向反轉；sticky
     CSS 契約斷言需改抓 `var(--band-h)` 與（若採本 spike 的合併選擇器
     寫法）逗號選擇器規則）。
3. **意外倖存的測試（具體點名一類）**：任何走 `id`／`data-testid`
   查找節點、且**不**對節點的父層路徑／欄位歸屬下斷言的測試——包含但
   不限於：segment 目錄／已選擇清單的邏輯測試（`row-groups`／
   `catalog-*`／`selected-*` 系列）、`resolve.ts`／`emit-bash.ts`／
   `emit-ps1.ts`／`render-preview.ts` 等純邏輯層測試、i18n／`threshold`／
   `color`／拖放行為系列 DOM 測試、以及全部 11 個 e2e 案。這是本 spike
   「保留所有既有 id/class 節點、只搬不刪」紀律的直接效果，**不是
   偶然**——只要 MS2 正式施工時同守此紀律，此倖存比例可預期重現。
4. **重要限定（避免下界被誤讀為「上界」）**：
   - 本次量測是對**現有**測試網的連動成本，不含 MS2 施工時**同時新增**
     的測試（如 `spikes/S-a-RESULT.md` 規劃給 T2.6 的「140px 遮蔽容許
     量」「40dvh 封頂」等精確幾何斷言，或 T2.3 的 ResizeObserver
     行為測試）——這些新測試届時要「從無到有」寫，其工作量不在本次
     量測範圍內，**不可**把「e2e 0 紅」誤讀為「MS2 幾何相關測試工作量
     為零」。
   - 本 spike 的 DOM 序簡化（「設定｜目錄｜列區」而非 S-a 原文「目錄｜
     列區｜設定」）若在 MS2 被真正採用原文視覺序，`preview-band.dom.
     test.ts`「結構與 DOM 序」一案的具體斷言內容（誰在誰前面）需按
     實際採用的視覺序撰寫，但**紅／綠與紅案數量本身不受此簡化影響**
     ——無論哪種視覺序，該案斷言的「舊序」都會與「新序」不符而紅，
     差別僅在斷言改寫後「新序」字面內容不同，工作量估計不變。
   - **額外發現**：`npm run test:e2e` 預設不重建 `dist/`（見「三」節），
     MS4–T4.1（或任何後續 e2e 驗收）執行者若忘記在改動 statusline-
     builder 原始碼後手動 `npm run build`，會對著舊 dist 跑出**假綠**
     （量不到任何原始碼改動），此為現有腳本既有行為，建議 MS4 驗收
     SOP 明文提醒此步驟（非本 task 修復範圍，記錄供後續任務參考）。

---

## 六、還原驗證

### 兩檔還原（自 scratchpad 備份 byte-for-byte 複製回原路徑）

```bash
$ git diff --stat tools/statusline-builder/index.html tools/statusline-builder/style.css
# (無輸出 — 零差異，兩檔逐位元還原)
```

### 開工快照 vs 收工快照比對

開工（本任務開始前）：

```
 M scripts/e2e-statusline.mjs
?? magi/15-statusline-editor-layout/
```

收工（本任務結束後）：

```
$ git status --porcelain
 M scripts/e2e-statusline.mjs
?? magi/15-statusline-editor-layout/
```

**逐行相同**——`scripts/e2e-statusline.mjs` 的既有未提交改動（非本任務
所為，本任務全程未觸碰此檔）與 `magi/15-statusline-editor-layout/`
未追蹤目錄（含本檔新增的 `spikes/S-h-RESULT.md`）為僅有差異，與開工前
完全一致。

### 回歸基準確認

- `npm test`：`Test Files 64 passed (64)` / `Tests 1935 passed (1935)`
  ——回全綠基準。
- `npm run build`：成功（`dist/tools/statusline-builder/index.html`
  等產物已用還原後的原始碼重新產出，洗掉本次 spike 遺留在 dist 的
  骨架痕跡）。
- `npm run test:e2e`：`11/11 passed`——回基準（含 dist 已用乾淨原始碼
  重建，確保後續任何人跑 e2e 不會殘留本次 spike 的建置產物）。
