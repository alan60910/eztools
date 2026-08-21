# S-j 軌寬與截斷 — 結果（T1.5）

> Sprint: `magi/15-statusline-editor-layout/`　Task: T1.5（spike S-j，🔀 lane
> 並行中，嚴守檔案邊界）
> 對照：`PLAN.md` §D3「軌寬（S-j 量測後定案，列區最寬）」；`TASKS.md` T1.5。
> 真實資料來源：`spikes/S-a-RESULT.md`（M1′-a 臂定案節）／
> `magi/14-statusline-ux-round2/spikes/S2-RESULT.md`（樣例值長度分佈實測
> 出處）／`tools/statusline-builder/sample-values.ts`（真實樣例值合成邏輯）
> ／`tools/statusline-builder/style.css`（現行目錄項排版）／
> `tools/statusline-builder/index.html`（目錄項 markup 結構）。
> 工作範圍：**只用 m1a 臂**，把 `spikes/proto/` 整份複製到 `spikes/s-j/`
> 後在副本上修改（目錄項換成真實樣例值文字＋真實排版），`spikes/proto/`
> 本體與其他 lane 目錄（`s-b/`／`s-c/`／`s-f/`／`s-g/`／`s-i/`）**零改動**
> （見本文件末「證據」節逐一核對）。CDP debug port：9985–9999 區段。

## 三個定案（總結）

1. **D3 軌寬定案**：`grid-template-columns: minmax(340px, 1fr) 1.6fr
   0.9fr;`（目錄欄採 `minmax(px 下限, fr)` 混合方案，列區／設定欄維持純
   `fr`）——**可直接抄進 MS2 施工**。原始候選 `1fr 1.6fr 0.9fr`
   在 1280×800（本 sprint 兩個門檻 viewport 之一）**未過門檻**（P90 級兩
   樣本截斷），加 340px 安全下限後兩個 viewport（1400×1000／1280×800）
   皆 **零截斷**（30/30 通過）、列區在所有測試組合中**恆為三欄最寬**
   （G7 上位約束不受影響）。
2. **截斷門檻通過的最小下限＝339px**（1280×800 逐 px 二分搜尋實測邊界，
   338px 仍 2/30 截斷、339px 起 0/30）；D3 採 **340px**（自然內容寬
   339.484375px 無條件進位，比照 T1.1 `--band-h` 校準慣例：寧可多留
   1px 安全餘裕，也不要因四捨五入取小值使邊界樣本被截斷）。
3. **en locale 為非阻擋性但真實存在的殘留風險**（超出本任務門檻定義的
   補充發現，見「五之 2」節）：樣例值（hint）文字本身兩 locale 長度分佈
   逐字相同，但**段名（label）英文版顯著較寬**，在 340px 下限下會使
   5/30 段截斷（含 P90 級的 `cwd`／`project-dir`）；欲達成兩 locale 皆
   零截斷需將下限提高至 **410px**（en 版自然寬度實測值，同樣兩 viewport
   驗證皆 0/30 截斷、列區仍最寬）。**本任務門檻字面（brief／PLAN 皆明文
   以 sprint 14 S2 之 zh-Hant dump 為量測基準）判定 340px 已過關**，
   410px 版本作為「雙語零截斷」的加強選項留給 MS2 施工者依 UX 優先序
   裁決（見「五」節完整取捨說明），不在本任務裁決權限內定案。

---

## 方法（真實資料取得程序）

1. **一次性唯讀 dump**（比照 `magi/14-statusline-ux-round2/spikes/
   S2-RESULT.md` 之 `s2-spike.test.ts` 手法）：於
   `tools/statusline-builder/` 建立臨時測試檔
   `s-j-spike-dump.test.ts`（**未修改**任何既有檔案），對 zh-Hant／en
   兩 locale 各呼叫一次 `getSampleValues(locale)`（`sample-values.ts`，
   逐段以單段-enabled 的 `defaultConfig(SEGMENT_CATALOG)` × FULL mock
   scenario 唯讀呼叫既有 `resolve()`）與 `segmentLabel(id, locale)`
   （`segments.ts`），`console.log` 印出 JSON 後 `npx vitest run` 執行、
   複製輸出、**刪除臨時檔**。刪除後 `git status --short` 覆核
   `tools/statusline-builder/` 目錄零殘留（見「證據」節）。
2. zh-Hant 30 段樣例值逐字比對 `S2-RESULT.md` 全段表——**完全一致**
   （`resolve.ts`／`mock-data.ts` 自 S2 以來未變動樣例合成結果），確認
   真實資料來源正確。
3. 全量 label＋樣例值文字（兩 locale）用於：(a) 計算長度分佈與 P90／max
   代表樣本；(b) 寫入 `spikes/s-j/m1a.html` 目錄欄 30 項（取代 T1.1 骨架
   的虛構占位文字），排版逐項比照真實 `style.css`
   `.catalog-item`／`.catalog-item__label`／`.catalog-item__name`／
   `.catalog-item__hint` 規則（見 `spikes/s-j/proto.css` 對應規則旁註
   解——移除原骨架誤用的等寬字體＋固定 `min-width:8ch`，改為
   `margin-left:auto` 吃剩餘寬度的真實佈局公式）。
4. 新寫量測腳本 `spikes/s-j/measure-width.mjs`（CDP 基礎設施複製自
   `measure.mjs`，`measure.mjs` 本身零改動）：以 `Runtime.evaluate`
   在執行期覆寫 `.builder-columns` 之 `gridTemplateColumns`（候選比例或
   `max-content max-content max-content` 兩種模式），逐目錄項機械判定
   `hintEl.scrollWidth > hintEl.clientWidth + 0.5px` 是否截斷，彙總
   截斷率／欄實得寬／列區是否仍最寬。

---

## 一、長度分佈與 P90／max 代表樣本

真實 dump（zh-Hant／en，`getSampleValues`＋`segmentLabel`）：**hint（樣例
值）文字兩 locale 逐字元相同**（合成邏輯與 locale 無關的技術值，如路徑／
數字／百分比），僅 **label（段名）隨 locale 改變**、且英文 label 普遍
較寬（見下方「補充」節實測）。

| 統計量 | 值（兩 locale 相同） |
|---|---|
| n | 30 |
| min | 7 字元 |
| P50 | 11 字元 |
| **P90** | **26 字元** |
| max | 33 字元 |

**P90＋級代表樣本（len ≥ 26，含 max）**——本任務量測的核心測試對象：

| id | label（zh-Hant） | len | hint（真實 `getSampleValue`） | 自然寬（scrollWidth，`--natural` 量測） |
|---|---|---:|---|---:|
| project-dir（max） | 專案目錄 | 33 | `proj: /home/alan/projects/eztools` | 206px |
| cwd | 目前目錄 | 32 | `cwd: /home/alan/projects/eztools` | 206px |
| worktree-branch | Git 工作樹分支 | 27 | `wtbr: wt-feature-statusline` | 162px |
| session-name | 工作階段名稱 | 26 | `sess: sprint-05-statusline` | 150px |

（全 30 段完整長度／自然寬表見本文件「證據」節重跑指令輸出，此處僅列
P90＋級。）

---

## 二、三欄自然內容寬（`--natural`＝`max-content max-content max-content`）

**與 viewport 無關**（1280×800／1400×1000 實測逐位元相同，因 CSS
intrinsic sizing 不受容器可用寬度影響——見下表兩 viewport 皆同一數
值），零截斷（30/30 sanity check 通過，確認量測本身無誤）。

| 欄 | 自然寬（zh-Hant） | 自然寬（en，補充量測） | 驅動因素 |
|---|---:|---:|---|
| 目錄欄（`.col--catalog`） | 339.484375px | 410.03125px | 最長 hint（`cwd`／`project-dir`，206px）＋checkbox＋name＋padding；en 版因 label 較寬而更高 |
| 列區（`.col--list`） | 313.5625px | （未測，樣例值＋控件與 locale 無關） | 單列最寬 `.segment-row-mock` scrollWidth＝297px |
| 設定欄（`.col--settings`） | 374.40625px | （未測） | 最寬 `.settings-group-mock` scrollWidth＝374px |

**逐 px 二分搜尋邊界**（1280×800，`grid-template-columns: <N>px 1.6fr
0.9fr`，僅變動目錄欄固定 px 值）：

| 目錄欄固定寬 | 截斷數／30 | 備註 |
|---:|---:|---|
| 334px | 2（`cwd`／`project-dir`，client=203.0 vs scroll=206） | 原始候選 `1fr 1.6fr 0.9fr` 於此 viewport 之實得寬 |
| 335px | 2 | |
| 336px | 2（client=204.0） | |
| 337px | 2（client=205.0） | |
| 338px | 2（client=205.0，僅差 1px） | |
| **339px** | **0** | **精確過關邊界** |

（自然寬量測 339.484375px 與二分搜尋邊界 339px 互相印證，僅子像素捨入
差異，符合預期。）

---

## 三、候選比例掃描矩陣

兩個門檻 viewport（1400×1000／1280×800）逐一測試，`grid-template-columns`
以 `Runtime.evaluate` 於執行期動態覆寫（不依賴多份 HTML/CSS 檔案）。
「截斷」欄格式＝`截斷數/30`；「列區最寬」欄＝該取樣點 `listCol.width ≥
catalogCol.width && listCol.width ≥ settingsCol.width`。

| 候選 | viewport | 目錄欄 px | 列區 px | 設定欄 px | 截斷 | 列區最寬 |
|---|---|---:|---:|---:|---:|:---:|
| `1fr 1.6fr 0.9fr`（PLAN 初始候選） | 1280×800 | 334.00 | 534.39 | 300.61 | **2/30**（`cwd`／`project-dir`，P90 級） | ✅ |
| `1fr 1.6fr 0.9fr` | 1400×1000 | 368.28 | 589.25 | 331.45 | 0/30 | ✅ |
| `1.1fr 1.5fr 0.8fr` | 1280×800 | 378.20 | 515.73 | 275.06 | 0/30 | ✅ |
| `1.1fr 1.5fr 0.8fr` | 1400×1000 | 417.02 | 568.69 | 303.30 | 0/30 | ✅ |
| `1.2fr 1.5fr 0.75fr` | 1280×800 | 406.59 | 508.27 | 254.14 | 0/30 | ✅ |
| `1.2fr 1.5fr 0.75fr` | 1400×1000 | 448.34 | 560.44 | 280.20 | 0/30 | ✅ |
| **`minmax(340px, 1fr) 1.6fr 0.9fr`（D3 定案）** | **1280×800** | **340.00** | **530.55** | **298.45** | **0/30** | **✅** |
| **`minmax(340px, 1fr) 1.6fr 0.9fr`** | **1400×1000** | **368.28** | **589.25** | **331.45** | **0/30** | **✅** |

**判讀**：`1:1.6:0.9` 原始候選在 1280×800（本 sprint 兩必測 viewport
之較窄者）以些微差距（334px 實得 vs 339px 門檻，差 5px）未過關，僅
`cwd`／`project-dir` 兩個 P90 級樣本截斷（各僅溢出 3px）；`1400×1000`
本身已過關（該 viewport 可用寬度較大，`1fr` 換算後目錄欄天然超過
339px 門檻）。純調整 fr 比例的兩個變體（`1.1:1.5:0.8`／`1.2:1.5:0.75`）
在兩個 viewport 皆過關，但**犧牲了更多列區／設定欄寬度**（列區在
`1.2:1.5:0.75`／1280×800 降到 508.27px，較原候選少 26px）；`minmax(340px,
1fr) 1.6fr 0.9fr` 混合方案僅在**窄 viewport 需要時**啟用下限（1280×800
下目錄欄被墊高至 340px，多出的寬度由列區／設定欄依原 fr 比例**微幅**
分攤——列區僅少 3.84px、設定欄僅少 2.16px，遠小於純比例調整的犧牲量），
在 1400×1000 因目錄欄天然已超過 339px 門檻、下限不生效，**完全維持
PLAN 原始候選的比例與寬度**（368.28／589.25／331.45，與純 `1fr 1.6fr
0.9fr` 逐位元相同）。

---

## 四、門檻判定

依 brief：「通過門檻＝目錄欄容納 P90 樣例值不截斷；未達則調整比例（列區
最寬為不可讓步的上位約束）」。

| 候選 | 1400×1000 | 1280×800 | 兩者皆過？ | 列區恆最寬？ |
|---|:---:|:---:|:---:|:---:|
| `1fr 1.6fr 0.9fr` | ✅ | ❌（2/30） | **否** | ✅ |
| `1.1fr 1.5fr 0.8fr` | ✅ | ✅ | 是 | ✅ |
| `1.2fr 1.5fr 0.75fr` | ✅ | ✅ | 是 | ✅ |
| **`minmax(340px, 1fr) 1.6fr 0.9fr`** | ✅ | ✅ | **是** | ✅ |

原始候選 `1:1.6:0.9` **未過門檻**（1280×800 兩個 P90 級樣本截斷）。三個
「過門檻」候選中，`minmax(340px, 1fr) 1.6fr 0.9fr` **對列區／設定欄寬度
的犧牲最小**（僅在窄 viewport 需要時啟用下限，寬 viewport 完全不影響、
逐位元維持 PLAN 原始候選比例）——採此案定案，見下節。

---

## 五、D3 定案

### 1. 定案值（可直接抄進 MS2 施工）

```css
.builder-columns {
  grid-template-columns: minmax(340px, 1fr) 1.6fr 0.9fr;
  /* 目錄 : 列區 : 設定 = 1 : 1.6 : 0.9（PLAN 初始候選比例不變）；
     目錄欄加 340px 安全下限，防窄 viewport（≥1100px 斷點下緣附近）
     P90 級樣例值（cwd／project-dir，33/32 字元）觸發 ellipsis 截斷。
     340px＝自然內容寬 339.484375px 無條件進位（S-j 實測，見
     spikes/S-j-RESULT.md），僅在目錄欄純 fr 換算寬度 < 340px 時生效，
     1400×1000 等寬 viewport 不受影響（維持逐位元相同的原始候選寬度）。
     列區（1.6fr）仍為三欄最寬——G7 上位約束在所有測試組合中皆成立。 */
}
```

取捨說明：`minmax(px, fr)` 混合方案 vs 純調整 fr 比例——後者（如
`1.2:1.5:0.75`）簡單、無 `minmax()` 語法，但**在寬 viewport 也永久犧牲
列區寬度**（即使目錄欄早已遠超過截斷門檻，仍固定多吃走列區/設定欄的
份額）；混合方案**僅在窄 viewport 真正需要時**才動用下限，寬 viewport
完全不受影響、忠實保留 PLAN 團隊已定案的視覺比例意圖。

### 2. en locale 補充發現（非本任務門檻範圍，供 MS2 裁量）

樣例值（hint）文字本身與 locale 無關（技術值），**但段名（label）英文
版顯著較�wide**，在真實排版下 hint 可用寬度＝`item 寬 − padding −
checkbox − gap − label 寬 − gap`——label 越寬，hint 剩餘空間越窄。實測：

| 候選 | viewport | locale | 截斷 | 截斷 id |
|---|---|---|---:|---|
| `minmax(340px,1fr):1.6:0.9` | 1280×800 | en | 5/30 | `cwd`／`project-dir`／`worktree-branch`／`reset-5h`／`reset-7d` |
| `minmax(340px,1fr):1.6:0.9` | 1400×1000 | en | 3/30 | `worktree-branch`／`reset-5h`／`reset-7d` |
| `minmax(410px,1fr):1.6:0.9` | 1280×800 | en | **0/30** | — |
| `minmax(410px,1fr):1.6:0.9` | 1400×1000 | en | **0/30** | — |

en locale 目錄欄自然寬實測＝**410.03125px**（兩 viewport 相同，量測
方式同「二」節）。若要「zh-Hant／en 兩 locale 皆零截斷」，下限須提高
至 **410px**（`minmax(410px, 1fr) 1.6fr 0.9fr`）——410px 版本在兩個
viewport 皆驗證列區仍最寬（1280×800：列區 485.75px；1400×1000：
562.55px，皆 > 目錄欄與設定欄）。

**本任務未採 410px 為定案值**，理由：(a) brief／PLAN §D3 明文以
「sprint 14 S2 量得樣例值 7–33 字元」（zh-Hant dump）為量測基準，字面
門檻已由 340px 達成；(b) en 版 label 較寬屬**目錄項排版本身**的潛在
改善空間（如 label 加 `overflow-wrap`／限制顯示行數／字級微調），非
單純軌寬能完全消解的問題——把安全下限直接拉高到 410px 會讓 zh-Hant
使用者（本站預設 locale）在窄 viewport 永久多讓出 70px 給目錄欄（即使
從不切到英文），是否值得這個代價需要 UX 判斷，超出本 spike 的量測授權
範圍。**留給 MS2 施工者依實際雙語使用比例裁決**：採 340px（zh-Hant 優
先，本任務定案值）或 410px（雙語零截斷保守版）。

---

## 六、行動版（390×844，供 MS3 參考）

`<1100px` 斷點下 `.builder-columns{grid-template-columns:1fr}`（三欄
單欄堆疊），無「比例」問題，但欄寬本身更窄（390×844 下三欄實得寬皆
327.00px，含 wrapper padding／單欄無 gap）：

| locale | 截斷 | 截斷 id |
|---|---:|---|
| zh-Hant | **0/30** | — |
| en | **5/30** | `cwd`／`project-dir`／`worktree-branch`／`reset-5h`／`reset-7d` |

zh-Hant 恰好壓線通過（327px 僅比 339px 桌面門檻窄 12px，但因行動寬單欄
無需與列區/設定欄分寬，反而比桌面窄 viewport 的候選比例掃描更寬裕）；
en 版與桌面同款截斷組合（同一批 label 較寬的段落）。**此為預期內現象
（單欄無比例可調、327px 已是最大可用寬度），非本任務裁決範圍**——MS3
落地行動版目錄可收合（D8）時，若採 en locale 仍建議一併檢視這 5 段的
排版（例如允許 hint 換行、或縮短 label）。

---

## 七、已知簡化 / 局限

- 列區（`.col--list`）／設定欄（`.col--settings`）的自然寬量測沿用
  T1.1 骨架既有的 mock 內容量級（5 個列群組、5 個 control-group，已於
  T1.1 校準等量現行 `tools/statusline-builder/index.html`），本任務
  **未**進一步逐控件比對真實 `style.css` 排版（僅目錄項比照，見brief
  範圍——brief 僅要求「你的副本目錄項要比照這個排版量截斷才有效」，
  未要求列區/設定欄同等精修）。
- 339px 逐 px 二分搜尋邊界僅在 1280×800 執行（1400×1000 該 viewport
  下純候選已大幅過關，無需二分搜尋精確邊界）。
- en locale 檢查為**目錄項名稱**替換後量測（真實 `segmentLabel(id,
  'en')` 輸出，見「方法」節 dump 證據），未涉及頁首／頂帶／列區/設定欄
  文案的 en 版本（後者不影響 `.builder-columns` 三欄寬度分配，僅目錄
  欄內容量隨 locale 變動）。
- 本任務所有量測皆在 **m1a 臂**（brief 明定範圍）；`--band-h`／捲動
  黏著等幾何與本任務欄寬定案無交互影響（軌寬僅涉及 `grid-template-
  columns`，與 `position:sticky`／`max-height` 之 `top`/`max-height`
  計算式為正交維度）。

---

## 八、證據

### 檔案邊界核對

```bash
$ git status --short --untracked-files=all -- magi/15-statusline-editor-layout/spikes
```

`spikes/proto/*`（6 檔）與其他 lane 目錄（`s-b/`／`s-c/`／`s-f/`／
`s-g/`／`s-i/`，皆為並行 lane 既有輸出，本任務執行期間全程未以
Read 以外之工具開啟）皆僅為既有未追蹤內容（本任務零改動，未曾以
Write/Edit 呼叫觸及）；本任務新增/修改僅限：

- `spikes/s-j/`（整份複製自 `spikes/proto/` 後修改）：
  - `proto.css`：目錄項系列規則（`.catalog-item-mock` 等）改版比照真實
    `style.css`（見「方法」節 3）。
  - `m1a.html`：目錄欄 30 項名稱／樣例值換真實資料＋checkbox mock＋
    `data-segment-id`；檔頭新增 S-j 說明註解。`m1b.html`／`m2.html`
    為複製後**未修改**（brief「只用 m1a 臂」，其餘兩臂原封不動留存
    供覆核比對，不影響本任務判定）。
  - 新增 `measure-width.mjs`（本任務量測腳本，`measure.mjs` 為複製後
    未修改的原始底座）。
- `spikes/S-j-RESULT.md`（本檔）。

### 唯讀 dump 清理證據

```bash
$ npx vitest run tools/statusline-builder/s-j-spike-dump.test.ts --reporter=verbose
 ✓ tools/statusline-builder/s-j-spike-dump.test.ts > S-j spike dump（一次性，跑完即刪） > dump zh-Hant／en 全量 label＋樣例值
 Test Files  1 passed (1)
      Tests  1 passed (1)

$ rm tools/statusline-builder/s-j-spike-dump.test.ts
$ git status --short   # tools/statusline-builder/ 零殘留
 M scripts/e2e-statusline.mjs
?? magi/15-statusline-editor-layout/
```

（`scripts/e2e-statusline.mjs` 之既有未提交改動非本任務所為，本任務
全程未開啟該檔，見 sprint 起始 `git status` 快照。）

### 重跑量測指令（複現本文件全部數據）

```bash
cd magi/15-statusline-editor-layout/spikes/s-j

# 自然內容寬（--natural，viewport 無關，兩個測過皆同值）
node measure-width.mjs --viewport 1280x800 --natural
node measure-width.mjs --viewport 1400x1000 --natural
node measure-width.mjs --viewport 1280x800 --natural --locale en

# 候選比例掃描（兩個門檻 viewport）
for vp in 1280x800 1400x1000; do
  node measure-width.mjs --viewport "$vp" --columns "1fr 1.6fr 0.9fr" --label "1:1.6:0.9"
  node measure-width.mjs --viewport "$vp" --columns "1.1fr 1.5fr 0.8fr" --label "1.1:1.5:0.8"
  node measure-width.mjs --viewport "$vp" --columns "1.2fr 1.5fr 0.75fr" --label "1.2:1.5:0.75"
  node measure-width.mjs --viewport "$vp" --columns "minmax(340px, 1fr) 1.6fr 0.9fr" --label "D3-final"
done

# en locale 補充（同一候選，替換段名為真實 en label）
node measure-width.mjs --viewport 1280x800 --columns "minmax(340px, 1fr) 1.6fr 0.9fr" --locale en
node measure-width.mjs --viewport 1280x800 --columns "minmax(410px, 1fr) 1.6fr 0.9fr" --locale en

# 行動版單欄堆疊
node measure-width.mjs --viewport 390x844 --columns "1fr" --label "mobile-stack"
node measure-width.mjs --viewport 390x844 --columns "1fr" --label "mobile-stack" --locale en

# 逐 px 二分搜尋邊界（1280×800）
for px in 334 335 336 337 338 339; do
  node measure-width.mjs --viewport 1280x800 --columns "${px}px 1.6fr 0.9fr" --label "floor-${px}px"
done
```

全部組合皆 `exit=0`，JSON 為合法輸出，本文件各表數據逐一對應上述指令
之實際執行結果（非手算推估）。
