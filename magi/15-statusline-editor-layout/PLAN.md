# Statusline Builder 編輯器版型重構——預覽頂帶＋目錄／列區／設定四區

> Sprint: `magi/15-statusline-editor-layout/`　•　Type: feat　•　Scale: major
> 起草：2026-07-22
> **Rev 3（2026-07-23）**：吸收 MAGI 計畫審議 round 2（核心三角，3× REQUEST-
> CHANGES）——捲動模型拆具名臂並**定案預算式為「只扣頂帶」**、G2 硬驗收明訂
> 落 e2e、skip 落點更正為 5 條、SPEC 對帳表修正三處錯分類＋補漏最承重的一句、
> D8 首繪方向回正、spike 編號全篇歸一並補兩條斷鏈。修訂處標〔R2:編號〕。
> Rev 2（2026-07-22）吸收 round 1（3 Critical／18 Important），標〔R:編號〕。
> 逐輪詳情見 `MAGI_PLAN_REVIEW.md`。

## Context

sprint 14（`magi/14-statusline-ux-round2/`，commit `5ac11d1`）剛交付三欄
終形：**左＝全域設定／中＝預覽＋產出／右＝教學帶→目錄→已選擇（同一
捲動容器）**。交付當日使用者提出直覺質疑：「segment 跟列不可以同區吧，
根本不直觀」，並給出左到右應為 **segment ｜ 列區 ｜ 全域設定**、預覽置頂
的排法。

協調者就此實證，確認質疑成立，且不只是主觀偏好——有三條可查證的缺陷：

1. **拖曳幾何失效（主因）**：右欄 DOM 序為「教學帶 → 30 段目錄（四分區）
   → 已選擇列區」共用**單一**捲動容器，故**捲動來源即移動目標**（兩者共用
   同一捲動軸）——真人執行「目錄項→某列」拖曳時多數配對無法同屏，須於
   拖曳中途捲動，正踩在 sprint14-S1／T1.2 標為高風險、Firefox 至今未實測的
   邊緣自動捲動路徑。
   e2e 的 `catalog-drag-into-row` 案之所以綠，是因為腳本在 drop 前以
   `scrollIntoView({block:'center'})` 把目標**程式化**捲進視野（且 dragOver
   後再重查一次活座標，見 `scripts/e2e-statusline.mjs` `catalogPointExpr`／
   `liPointExpr`／`dragBySelector`）——測試取得了真人取不到的優勢，綠燈
   並未背書此互動可用。sprint 14 PLAN 採「同居」的理由寫的是「拖曳短程」，
   但該推論在垂直堆疊下反轉：真正短程的是**左右並置**。
   〔R:I2〕**措辭校準**：「目錄尾段→首列群組」等少數邊界配對本可同屏，
   本缺陷的精確陳述是「捲動來源即移動目標」，而非「任何配對皆不可同屏」。
2. **版位權重倒置**：全域設定（設定完即極少互動）佔 LTR 黃金位最左，主要
   工作區被擠往右側。
3. **預覽寬度失真**：statusline 本質是一條很長的單行，現塞在約 36% 寬的
   中欄。全寬頂帶下約可容 **145–195** 等寬字元（15px／0.6em 前進寬度估算
   〔R:🟢〕），相較「預覽當最右欄」的 40–55 字元為決定性改善。

歷史面同時查證了一條**否決證據**：把預覽改放最右欄正是 sprint 09 之前的
形態，而 sprint 09 真機回饋第 4 條原話即為「即時預覽移到最上方且不被捲動
遮蔽」，其 D4 選項表明列 **B「維持三欄，僅強化右欄 sticky」→ 不符原話**而
否決；當時並記載該形態「<1100px 單欄退化即失效」。

這是本工具第三次版型改版（06b → 09 → 14 → 本批）。**本批的額外責任是把
版型原則寫成耐久契約**，以終止 churn。

## Goals & Non-Goals

**Goals**

- **G1 四區版型**：頂＝即時預覽（全寬）；下方三欄由左至右＝**segment 目錄
  ｜列區（已選擇）｜全域設定**。
- **G2 捲動所有權**：目錄欄與列區**各自獨立捲動**；預覽在編輯過程中恆可見
  ——**恆可見須以真瀏覽器機械斷言證明**（見 Verification G2 案；〔R:C1〕
  round 1 的頭號 Critical 即因缺此案而差點靜默上線，〔R2:#3-N1〕round 2 進一步
  釘死其測試層）。
- **G3 序一致性**：DOM 序＝視覺序＝Tab 序，兩斷點共用同一份 DOM 序（零 JS
  搬移、零 CSS `order`）。DOM 序＝**skip-nav → status/error → 預覽頂帶 →
  目錄 → 列區 → 設定**；<1100px 同序堆疊。
- **G4 拖曳幾何硬驗收**〔R:I2〕：「目錄項 → 目標列」**拖曳過程中不需捲動**
  ——來源與目標分屬獨立捲動容器，使用者可於按下前各自捲到位，起手後至 drop
  全程零捲動。以 e2e 硬條件編碼。
- **G5 版型判準與不變量入 SPEC**〔R:I3／R2:#2-N4〕：三層落地——**跨工具
  不變量**與**版位判準**上移 SPEC `Conventions`（受契約保護），**本批現行
  形態**留在 `Components`（可隨批次更新）。
- **G6 skip-nav 重置與補全**〔R:C3／R2:#2-N1〕：略過連結自
  `.builder-columns__settings` 提升至 `<main>` 開頭，並**由現行 3 條增為
  5 條**（新增「跳至目錄」「跳至設定」）。**協調者實證**：`index.html:272-276`
  現為 3 條、`skip-nav.dom.test.ts:107-110` 有硬斷言 `toBe(3)`，該斷言須
  同步改為 5。
- **G7 列區最寬**（使用者已定案）。
- **G8 行動版目錄可收合**：<1100px 時 segment 目錄區可收起／展開；桌面恆
  展開。機制不得改動 DOM 序（G3 契約）。
- **G9 垂直預算不得倒退**〔R:C2／R2:#1-N2,N12〕：以**可見容量**為主判準——
  1280×800 下**目錄欄初始可見 ≥8 個目錄項**且**列區可見 ≥2 個完整列群組
  （標題＋首段控件）**；輔助參考值：工作欄可用高 ≥ 同視窗下 sprint 14 實測值
  之 85%（1400×1000 基準推得約 480px，1280×800 的基準值由 S-b 實測回填，
  不沿用未實測的外推）。度量口徑：量欄容器的 `clientHeight`，於載入完成
  且 scrollY 已達穩態捲距時取值。

**Non-Goals**

- 不動 `resolve.ts`／三後端 emit／config schema——**黃金檔零 diff 應恆成立**。
- 不推翻 sprint 14 的**行為面**成果（move 鈕、樣例值、教學帶狀態機、mode
  焦點、dialog 尺寸、i18n）——原地沿用，僅隨容器搬遷。
- 不做視覺重畫、不做匯入／匯出 UI。
- 不處理 sprint 14 DRIFT 中與版面無關的殘項；例外：`--column-top` 相關條目
  由本批吸收或作廢。

## Design options considered

### 一、版型骨架（**已定案**）

| 選項 | 內容 | 評估 |
|---|---|---|
| **A（採用）** | 預覽全寬頂帶＋三欄：目錄｜列區｜設定 | 一次修復三缺陷；行動版預覽自然落第一位 |
| B | 預覽改最右欄 | **否決**：①sprint 09 原話與 D4 選項 B 已否決；②最右欄在 <1100px 沉到最底；③預覽僅約 40–55 字元 |
| C | 維持 sprint 14 現狀 | **否決**：拖曳幾何為結構性缺陷 |
| D | **最小改動版**：右欄拆上下兩個獨立捲動容器 | 技術上足以修缺陷 1，成本遠低於 A；但不修缺陷 2、3（使用者裁決的部分）。記錄以明示最小解已評估 |
| E | 僅交換右欄內部順序 | **否決（量化）**：sprint14-S1 檢核 2 實測容器 `scrollHeight` 1593px vs 1400×1000 可用高約 764px（2.1 倍）——只在輕負載成立 |

**承重不變量**〔R:I3〕：本批真正承重的是「**來源與目標分屬獨立捲動容器**」，
**不是**「左右並置」——後者是手法，其額外價值在同時修掉缺陷 2、3。

### 二、捲動與黏著模型（**Rev 3 拆具名臂＋定案預算式**）〔R2:#1-N1,N2,N4〕

round 2 發現 Rev 2 的「M1′」實為兩種**互斥**結構，且兩者的垂直預算式相同
——**M1′ 只解決 sticky 位移，不解決預算**。預算另需獨立決策，見下。

| 臂 | 結構 | 頂帶位移餘裕 | 評估 |
|---|---|---|---|
| **M1′-a（Rev 3 首選）** | `<main>` 為 block；頂帶／skip-nav／status/error 為其直接子節點；**僅三欄**收進 `.builder-columns` wrapper | 包含塊＝main content box，餘裕＝`main` 高 − 頂帶高 ≈ **550px**（1280×800 實算），黏住所需捲距 268px → **充足** | 結構最簡、只多一層 wrapper。欄的處置見 N4 消解 |
| M1′-b | sticky 外框：`.editor{position:sticky; grid-template-rows:auto minmax(0,1fr)}`，**頂帶被移入框內** | 頂帶恆在框頂 ✅，但**外框自身**的包含塊（main）高度＝外框高 → **外框 travel ≈ 0，一捲就走** | 同型缺陷升一層；且「頂帶為 `<main>` 直接子節點」的敘述失效、「只多一層 wrapper」的代價宣稱不成立 |
| M1 | 頂帶為三欄 grid 的 `grid-column:1/-1` 獨立列 | grid area 高＝自身高 → **餘裕 0，不黏** | round 1 C1；保留僅為記錄否決理由 |
| M2 | app-shell：頁面不捲 | n/a | **全站五頁統一 footer 被擠出視窗**（溢出本工具範圍）；若此臂勝出，footer 處置與對其他四頁的影響**必須升為使用者裁決** |
| M3 | 頂帶不 sticky | n/a | 否決：違反 G2 |

〔MS1 定案：OQ-1 判 **M1′-a**（S-a 三臂並列實測——M1′-b 因頂帶完整落於
視窗門檻與外框高度斷言雙雙不過而出局；M2 三個 viewport 皆 `maxScroll=0`、
footer 恆不可達，但因 M1′-a 已過關，不落入「僅 M2 過關」的自行定案例外）
——**M2 未勝出，本列「footer 處置與對其他四頁的影響須升為使用者裁決」
條款未觸發**。見 §Spike 結論回填「S-a」。〕

**預算式定案（Rev 3，關鍵修訂）**〔R2:#1-N2〕：欄的 max-height 採
**`calc(100dvh − 頂帶)` 單項扣除**，**不扣頁首**，接受初載溢出。

理由：round 2 實算揭示「扣頁首＋扣頂帶」對**所有**臂皆得 `800 − 236 − 250
≈ 314px`，離 G9 門檻更遠，且該扣除在穩態（頁首已捲離）是**憑空浪費一整個
頁首高**；單項扣除得 `800 − 250 ≈ 550px` ✅。初載溢出由 sticky 本身消解
（使用者捲過頁首即對齊），此取捨與 sprint14-S1 檢核 4 的既有裁決同型
（該批亦接受 24px 殘差）。

**欄的遮蔽殘差（N4 消解，須由 S-a 定案）**：M1′-a 下欄自身 sticky 的 travel
＝ wrapper 高 − 欄高 ＝ 0，故在頁面捲過穩態捲距後（可捲餘量＝footer＋main
底 padding），欄頂會被不透明頂帶遮住。三個候選消解手段，S-a 擇一並回填：
1. **wrapper 補償高**：`min-height: calc(100dvh − 頂帶 + var(--footer-h))`，
   使欄取得等同 footer 高的真 travel（**傾向此案**，成本最低）；
2. 接受並量化：明訂「max-scroll 處欄頭遮蔽 ≤ N px」並寫入 e2e 斷言；
3. 改採 M2（footer 處置升使用者裁決）。

〔MS1 定案：候選 1（wrapper 補償高）經數學推導＋兩輪獨立實測**證明對現行
「單項扣除」預算式數學上不可行**（`builderColumns.bottom` 於 max-scroll
時與其自身高度無關，補償高與 maxScroll 同步增長、正負相消，與
`--footer-h` 數值無關，已數學證偽）；候選 3（改採 M2）未觸發（M1′-a 已
過關，不落入「僅 M2 過關」的自行定案例外）；**採候選 2（接受並量化）**——
desktop（≥1100px）max-scroll 處欄頭遮蔽實測 134.156px（1400×1000 與
1280×800 逐位元相同），e2e 容許量定為 ≤140px；`<1100px` 不適用此殘差（欄
非 sticky，性質為自我修復的「捲動穿越」而非卡死遮蔽）。見
§Spike 結論回填「S-a」。〕

〔MS4/審查回填（2026-08-16）：候選 2 的 ≤140px 容許**適用範圍**依 MS2
真頁再量測校準為「**穩態捲距後所有取樣點**」（穩態前零容許）——遮蔽自
穩態起連續線性退化（實測斜率恰 1）、max-scroll 即上界，語意等價非鬆綁；
G2 e2e 另有「穩態點殘差 ≈0」與「劣化單調性」兩斷言把關中段。計票紀錄
見 `MAGI_CODE_REVIEW.md` 🟡-5／`DRIFT.md` B-2。〕

## Recommended approach

### D1 區域與 DOM 序（定案）

```
桌面 ≥1100px
┌────────────────────────────────────────────────────┐
│  即時預覽（全寬）＋產出腳本鈕                        │
├───────────┬──────────────────────┬─────────────────┤
│ segment   │  列區（已選擇）       │  全域設定        │
│ 目錄      │  ★最寬               │                 │
│ 獨立捲軸  │  獨立捲軸             │  （見 OQ-2）    │
└───────────┴──────────────────────┴─────────────────┘

<1100px：預覽 → 目錄 → 列區 → 設定（同序堆疊、回歸文件流）
```

- `<main>` 內完整相對序：**skip-nav → `#output-status`／`#error-message`
  → 預覽頂帶 → `.builder-columns` wrapper（三欄）**。skip-nav 置於最前以符
  「主內容開頭」語意（**非** Tab 首站——`<header>` 內恆有三個可聚焦元素在前，
  契約措辭須照此精確化）〔R:🟢〕。
- 頂帶為 `<main>` 直接子節點（M1′-a）。
- **頂帶組成（A1 定案：整包）**：標題／底色 ×2 ＋情境 ×4（既有單列緊湊
  segmented control）／產出腳本鈕／「固定示範時鐘」說明句／終端框。理由：
  底色與情境是**預覽器的檢視控制**（不入 `BuilderConfig`），須貼著被檢視物。
- **頂帶黏著（A2 定案）**：**全斷點 sticky**。行動版垂直壓力由 G8 收合吸收。
- **頂帶高度上限**〔R:I14／R2:#1-N5〕：**頂帶整體 `max-height ≤ 40dvh`**
  （sprint 09 A-1 原文契約，上限掛頂帶身上、超出由終端框內捲吸收）。
  **連帶實作指令**：現行 `.preview-terminal{max-height:40dvh}`（`style.css:1270`）
  **須撤除**，改 `flex:1 1 auto; min-height:0`，上限由頂帶統一承擔——否則
  頂帶總高＝其他內容＋40dvh，必然突破自己的上限。S-b 順帶回填「頂帶封頂後
  終端框實得高度 ≥ 3 列」。

### D2 捲動所有權（S-a 定案，預設 M1′-a）

- 目錄欄與列區各自為獨立捲動容器，`max-height: calc(100dvh − var(--band-h))`
  （單項扣除，見上方預算式定案）。
- **欄的 sticky `top` 偏移**〔R:I4〕：`top: var(--band-h)`（非 `top:0`）——
  頂帶不透明且帶 z-index，`top:0` 會使欄頂被遮，而被遮的正是 G4 的拖曳來源
  與落點。**此項對 M1′-a／M1／M2 皆適用**（Rev 2 誤將其限縮於 M1／M2）。
- **頂帶 z-index 值域**〔R2:#1-N11〕：須 **< 10**（沿用 sprint 14 的 `2`）——
  `.skip-link` 為 `z-index:10`（`style.css:146`），skip-nav 提升到 `<main>`
  開頭後，其聚焦時的絕對定位顯現位置正落在頂帶覆蓋區，頂帶若 ≥10 會蓋掉
  聚焦中的 skip-link，直接抵銷 C3 的補償。
- **`overscroll-behavior` 適用範圍由 S-g 定案**〔R:I13〕：兩欄若都掛
  `contain`，在 D3 比例下佔約 74% 寬度，滾輪停於其上不連鎖捲動頁面——會封死
  「捲過頁首使頂帶黏住」的必要動作。
  〔MS1 定案：**兩欄皆掛 `contain`**（組態 O1）——1280×800 九宮格 3 組態
  ×2 狀態可捲命中面積 77.8–100% 全數 ≥30% 門檻，PLAN 原文「未達 30% →
  不得同時掛 contain」的禁止條件**未觸發**；死區精確侷限於「該欄已捲到底
  ＋游標停於該欄」交集（9 點中 2 點），其餘 77.8% 面積與鍵盤側皆有替代
  路徑。見 §Spike 結論回填「S-g」。〕
- 設定欄預設不設捲動容器；由 S-b 判定是否需要（OQ-2）。
  〔MS1 定案：**不需要**——`#global-section` 自然高 440px，在本任務量到的
  全部頂帶高度情境（191–320px）下皆有 40–168px 正餘裕。見 §Spike 結論
  回填「S-b」。〕
- **捲動停點契約須重定**〔R:🟢〕：sprint 14 收斂為「停點總數＝1」並有機械
  斷言（`preview-band.dom.test.ts` 驗 `[role="region"][tabindex="0"]` 為 0）。
  新版面容器變 2–3 個，須明文裁定新停點總數與歸屬並更新該斷言。注意
  Chromium 新版會為「無可聚焦子節點的捲動容器」自動加停點，不帶
  `role="region"`，現有斷言抓不到。
- <1100px：全部解除 sticky／max-height，回歸文件流。

### D3 軌寬（S-j 量測後定案，列區最寬）

初始候選 `目錄 1 : 列區 1.6 : 設定 0.9`（`minmax(0, Nfr)`）。約束兩條：
(a) 列區最寬（使用者定案）；(b)〔R:🟡〕**目錄欄寬須容納 P90 樣例值不截斷**
——sprint 14 S2 量得樣例值 7–33 字元，本批把目錄單獨壓到 1fr 會提高截斷率。
〔R2:#2-N6〕此約束原無 spike 承接，Rev 3 新增 **S-j**。

〔MS1 定案：`grid-template-columns: minmax(340px, 1fr) 1.6fr 0.9fr;`——原始
候選 `1fr 1.6fr 0.9fr` 於 1280×800（本 sprint 兩必測 viewport之一）**未過
門檻**（P90 級 `cwd`／`project-dir` 兩樣本截斷，實得寬 334px vs 過關邊界
339px，差 5px）；加 340px 安全下限（339.484375px 自然寬無條件進位）後兩
viewport 皆 0/30 截斷、列區恆最寬（G7 不受影響）。en locale 段名較寬、
雙語零截斷需下限 410px，留 MS2 依 UX 優先序裁決，非本任務裁決範圍。見
§Spike 結論回填「S-j」。〕

### D4 skip-nav 重置與補全（G6）〔R:C3／R2:#2-N1〕

- **提升**：nav 自 `.builder-columns__settings` 移至 `<main>` 開頭。若 S-a
  定案使 nav 成為 grid item，比照 `#output-status` 明式指名 `grid-column: 1/-1`
  並附層疊歸屬斷言。
- **五條落點**（現行 3 條 ＋ 新增 2 條）：

  | # | 連結 | 落點 | 備註 |
  |---|---|---|---|
  | 1 | 跳至設定（新增） | `#global-section`（`index.html:121` 已存在） | 補償 G3 的 Tab 序退化；**排第一以降低鍵擊數**〔R2:#1-N6〕 |
  | 2 | 跳至目錄（新增） | `#catalog-section`（**新增 id**，掛收合容器**外層**） | 不掛 `<summary>`——該元素桌面可能隱藏且為原生可聚焦元素會奪焦，與其餘落點「僅捲動不奪焦」慣例不一致 |
  | 3 | 跳至列區 | `#selected-section` | 沿用 |
  | 4 | 跳至預覽 | `#preview-section` | 沿用 |
  | 5 | 跳至產出腳本 | `#output-dialog-open` | 沿用 |

- **`scroll-margin-top` 為硬需求**〔R:I9〕：全寬不透明 sticky 頂帶固定於
  `top:0`，片段導覽會把目標捲到 scrollport 頂端＝正好進遮蔽帶。所有錨點落點
  須加 `scroll-margin-top`（綁 `--band-h`）。repo 內 `tools/`／`src/` 目前
  **零** `scroll-margin`／`scroll-padding` 使用，須新立。
- 新增兩個 i18n 鍵（`ui.skipToCatalog`／`ui.skipToSettings`），雙語齊備。
- **測試連動**〔R2:#2-N1〕：`skip-nav.dom.test.ts:107-110` 的
  `.skip-link` 計數斷言 **3 → 5**。

### D5 附掛遷移（純位置變更，行為不變）

| 元件 | sprint 14 位置 | 本批位置 | 備註 |
|---|---|---|---|
| 教學帶 | 右欄頂 | **目錄欄頂** | dismiss 狀態機／key／sentinel 不動 |
| 產出腳本鈕 | 中欄預覽節內 | **頂帶右端** | 回復 sprint 09 拍板位置 |
| 已選擇列群組／列 header 控件 | 右欄下半 | 列區 | 結構不變 |
| 目錄 compact 列 | 右欄中段 | 目錄欄 | 渲染邏輯不動 |

### D6 `--band-h` 與 `--column-top` 體制〔R:C1／R2:#1-N1〕

Rev 3 預算式改為單項扣除後，所需變數為**頂帶高度 `--band-h`**（欄的
`max-height`、`top`、`scroll-margin-top` 三處共用），**不再需要頁首高度**
——sprint 14 的 `--column-top` 體制連同其 DRIFT 條目**作廢**（非修復）。

`--band-h` 的維護方式由 S-a 定案，兩選項：
- **CSS 原生**（傾向）：若 S-a 證實 M1′-a 下可用 `grid-template-rows` 或
  容器查詢等純 CSS 手段取得等效效果，則無需 JS 量測，D6 整節作廢。
  〔MS1 定案：**此傾向不成立，判定走 RO**——頂帶高度有兩條獨立變動軸
  （終端框列數 1–5：桌面 81.6px／行動 76.4px 範圍；viewport 寬度造成的
  控制列換行：行動寬僅 1 行內容已比桌面校準值高出 69.2px），CSS 原生固定
  值無論如何校準必然在「遮蔽」與「G9 級浪費」間二選一，且 CSS 無原生機制
  可讓 sticky 欄的 `top` 動態繫結另一 sibling 的即時高度。見 §Spike 結論
  回填「S-a」。〕
- **`ResizeObserver`**：若需 JS 量測，須滿足三條防護：
  1. **迴圈抑制**：回呼內 `requestAnimationFrame` 延後寫入＋四捨五入去重；
     變數掛 `main` 或欄本身而非 `:root`；必要時 `scrollbar-gutter: stable`
     切斷「捲軸→寬度→頁首換行→高度」回饋路徑。
  2. **jsdom 承接**〔R:🟢〕：jsdom 無 `ResizeObserver`／`matchMedia`，而
     `tools/statusline-builder/` 下有 **17 個測試檔**以 `await import('./main.js')`
     啟動 `init()`，裸用會整批 ReferenceError；repo 無 vitest `setupFiles`
     掛點。接線須採**特徵偵測**（比照 `src/theme.ts` 對 `matchMedia` 的惰性
     ＋try/catch 慣例）；S-e 定案。
     〔MS1 定案：**複合形**——(1) RO 建構與 `.observe()` 一律包在特徵偵測
     守衛內（比照 `src/theme.ts`，早退＋try/catch）；(2) **一次性同步初始
     寫入，獨立於 RO 回呼**（比照現行 `syncColumnTop()` 模式——純守衛跳過
     或純 no-op stub 皆會使 jsdom 下 `--band-h` 恆缺席，T2.4 測不到初始
     值）；(3) 新增 vitest setupFiles 共用 stub（僅 jsdom 生效、可觸發）
     補強備用，供進階 spy 斷言，非強制起手式。探針裸插實測 17 檔／82 案
     紅，定案修法後 17 檔全綠。見 §Spike 結論回填「S-e」。〕
  3. **可觀測性**：Chromium 對 RO 迴圈會丟 `ResizeObserver loop completed…`
     window error，現行 e2e harness **未監聽 `Runtime.exceptionThrown`**，
     測不出來——若採此路徑，harness 須補該監聽。

### D7 層疊紀律（sprint 14 🔴-1 規約強制）

- 成對規則一律以 `@media` 包裹保證層疊方向（禁止依賴源序）。
- 測試禁用「規則存在性」比對，一律採**歸屬斷言**。
- 〔R:I16〕**`mediaBlockRange` 須最小強化**（掃描前剝除 `/* … */` 註解，或
  明訂「本批新增／修改的 media 區塊註解禁止內嵌孤立 `{`／`}`」為可機械檢查
  的規則）。〔R2:#2-N8〕**指派里程碑：MS2 出口條件之一**。

### D8 行動版目錄收合（G8）

- **生效範圍**：僅 <1100px；≥1100px 恆展開。
- **收合單位**：整個 segment 目錄區為單一收合單位；四類分區既有 landmark／
  標題結構不變。收合時分區地標離開 a11y tree 為原生 `<details>` 的**預期
  語意**，不另加 live region 播報（`<summary>` 原生即播報 expanded／collapsed；
  自行補播報節點反而違反「live region 須常駐」既有不變量）〔R:🟢〕。
- **單一謂詞（硬性）**〔R:I6〕：**收合 ⟺ `localStorage.getItem(KEY) === '1'`
  且視窗 <1100px**；key 缺失、`getItem` 擲錯、任意怪值一律**展開**
  （fail-open 方向與「首訪不得把核心功能藏起來」一致）。key 字面值定為
  **`eztools-statusline-builder-catalog-collapsed`**〔R2:#2-I6 nit〕、sentinel
  `'1'`，與謂詞三者以**單一常數出口**匯出（比照 `tutorial-band.ts`），並比照
  `tutorial-band.test.ts` 要求三情境各一斷言。
- **首繪方向（Rev 3 回正）**〔R2:#1-N7〕：HTML 出貨態**寫 `open`**，由 JS
  僅在「<1100px 且謂詞為收合」時收起。**理由（推翻 Rev 2 的反轉）**：Rev 2
  比照教學帶採「HTML 不寫 open、JS 才展開」，但兩者失敗態不可類比——教學帶
  的失敗態是「少一條提示」，目錄的失敗態是「**核心功能消失**」；且與桌面態
  處置（`summary{display:none}`）相乘後，JS 未執行／init 擲錯時桌面會得到
  「details 未 open ＋ 無展開把手」＝30 段目錄永久不可達，正面違反本節自己的
  fail-open 立論。回訪者的塌陷閃動改以「HTML 帶 `open` ＋ 一條
  `@media(max-width:1099.98px)` 初載暫抑樣式，由 JS 於 init 移除標記」處理。
  **S-f 須斷言「JS 失效態下目錄可達」**。
- **持久化的觸發來源（硬性）**〔R:I7〕：`details.open = true` 的**程式化**
  設值同樣會派發 `toggle`，與使用者點擊無法由事件本身可靠區分。故持久化
  **只由使用者意圖來源**觸發（`<summary>` 的 click／keydown，或 toggle handler
  以 `matchMedia('(max-width: 1099.98px)').matches` 為守衛＋程式化寫入期間的
  抑制旗標）。否則跨斷點強制展開會靜默清除使用者的行動版偏好。
- **桌面態硬條件**〔R:I8〕：≥1100px 時 `<summary>` **不得為 Tab 停點、不得
  可點擊，且 a11y 播報狀態須與可見狀態一致**。純 CSS 強制展開路徑因 `open`
  仍為 `false` 會使 **a11y tree 說謊**，且可靠做法倚賴 `::details-content`
  （Chrome 131／Safari 18.4／Firefox 139）**晚於 TECHSTACK「evergreen 近兩年」
  下緣**，**原則上不列入候選**；預設走 `matchMedia` 切 `open` ＋
  `@media(min-width:1100px){summary{display:none}}` 配套。
- **樣式基礎工**〔R:🟢〕：`tools/`／`src/` 對 `details`／`summary` **零規則**
  ——預設三角標記、`list-style`、`:focus-visible` 焦點環、深／淺主題對比、
  `prefers-reduced-motion` 全需從零建立，須計入工作量。
- **`.segment-lists__hint` 歸屬**〔R:🟢〕：定案**留在收合區外**（與 summary
  緊鄰），使收合態仍可見。
- 教學帶不納入收合區（維持目錄欄頂）。已知取捨：行動版收起後會形成「教一個
  來源已收起的互動」，且帶＋summary 兩層固定開銷削弱 A3 效果——**S-b 須量測
  390×844 下「頂帶＋教學帶＋summary」的固定開銷**〔R2:#2-N6 斷鏈修復〕，
  確認列區可用高度仍達 G8 硬驗收。

〔MS1 定案：D8 狀態機於獨立原型上機械驗證 **11/11 PASS**（六序列＋機制
比較＋a11y＋JS 失效態＋防閃動）——本節設計成立。**推薦持久化機制 (a)
summary-only**（只掛 `<summary>` click／keydown，不接 `toggle`，天生免疫
「程式化 toggle 也會被誤判為使用者互動」的風險，不需要抑制旗標）。過程中
發現兩個原文未明寫、MS3 施工前務必落實的平台坑：①防閃動暫抑樣式須搭配
**`<noscript>` 逃生門**（同範圍、同選擇器、後於原規則覆寫）——否則 JS
完全失效時行動版目錄會被暫抑樣式永久壓成 0 高度，正面牴觸本節 fail-open
承諾；②`<summary>` click 後讀取翻轉後的 `details.open` 須用
`setTimeout(0)`／`requestAnimationFrame`（建議雙 rAF），`queueMicrotask`
會讀到翻轉前的舊值。**S-f 坑 1 語意校準**：S-f 原文「30 項目錄須為靜態
HTML 才守得住 fail-open」一語，於真實 app 的語意需校準——真實目錄清單本為
JS 動態渲染（非本 spike 原型刻意採用的靜態骨架），fail-open 在真實 app
實際覆蓋的是「`init()` 半路擲錯」情境（教學帶等既有靜態骨架仍可達），
並非「停用 script 時 30 段目錄項完整可見」（真實清單本身仍需 JS 才能
渲染內容，此為既有、非本批新增的限制，不牴觸本節 fail-open 承諾字面）。
見 §Spike 結論回填「S-f」。〕

## Spikes（實作前必跑，結論回填本檔）

**每個 spike 皆須有通過門檻或定案輸出，不得只有量測動詞**〔R:I11〕。
跨 sprint 引用一律加前綴（`sprint14-S1` 等）以免與本批 S-a…S-j 混淆
〔R2:#1-N8〕。S-a／S-b／S-g 共用同一具新版面骨架原型。

- **S-a 頂帶與欄的黏著幾何（最高優先，決定捲動模型）**〔R2:#1-N3 門檻改寫〕
  ：M1′-a／M1′-b／M2 三臂並列，於 1400×1000／1280×800／390×844 於
  scrollY ∈ {0, 200, 400, max} 各取樣。**通過門檻（語意式，與模型無關）**：
  (1) 每一取樣點頂帶**完整落在視窗內**（`rect.top ≥ 0 && rect.bottom ≤
  innerHeight`）且 `height > 0`；(2) 於穩態（scrollY ≥ 頁首高＋main padding，
  若可達）時 `rect.top === 0`；(3) 每一取樣點兩欄 `rect.top ≥ 頂帶 rect.bottom`
  ——**若 max-scroll 處不成立，須回填遮蔽量並依 D2 的三個候選手段擇一**。
  另對外框臂（M1′-b）加斷言：欄容器 `scrollHeight > clientHeight`（確實成為
  捲動容器）且外框 `rect.height ≤ 宣告上限 + 1px`〔R2:#1-N10〕。
  **產出：捲動模型定案＋`--band-h` 維護方式定案（CSS 原生 vs RO）。**
  〔MS1 回填：門檻過（M1′-a）／不過（M1′-b，T1 頂帶完整落視窗門檻與外框
  斷言雙敗）。定案＝**M1′-a**；欄遮蔽殘差＝**候選 2**（桌面 max-scroll
  遮蔽 134.156px，e2e 容許 ≤140px；候選 1 數學證偽）；`--band-h`＝
  **ResizeObserver**（CSS 原生傾向不成立，桌面 81.6px／行動 76.4px 變動
  範圍）。見 `spikes/S-a-RESULT.md`。〕
- **S-b 垂直預算與固定開銷（決定 G9）**：量 (1) 1280×800 的頁首高度；
  (2) **最壞組態頂帶高度**（5 列 powerline × 1280 寬控件換行）；(3) 以現行
  dist 量 **sprint 14 @1280×800 的工作欄可用高**作為 G9 的基準值
  〔R2:#2-N10〕；(4) 設定欄自然高度（定 OQ-2）；(5) 390×844 下「頂帶＋教學帶
  ＋summary」固定開銷（服務 G8）；(6) 頂帶封頂後終端框實得高度。
  **通過門檻＝G9 的可見容量判準**（目錄 ≥8 項、列區 ≥2 個完整列群組）。
  未達即依序退：wrapper 補償高／壓縮頁首（**升使用者裁決**）／M2。
  〔MS1 回填：**門檻過**——目錄可見 10≥8（餘裕 2）、列區可見 2≥2（零餘裕，
  `scrollY≥350` 起退化為 1，與 S-a 已接受的 N4 同根因，非新缺陷）；輔助
  判準 608px≥479.4px（sprint14 基準 564px×85%）大幅超標。**退階梯未觸發**
  （不需要 wrapper 補償高／壓縮頁首升裁決／M2）。OQ-2 定案＝設定欄不設
  獨立捲軸（自然高 440px）。見 `spikes/S-b-RESULT.md`。〕
- **S-c Tab 走查（決定 C3 補償是否足夠）**：比照 sprint14-S5 手法以 CDP
  `Input.dispatchKeyEvent` 送真 Tab，於 1400×1000 與 390×844、載入 ≥8 段
  啟用 seed。**通過門檻（Rev 3 定義起算點）**〔R2:#1-N6／#3-4〕：**自頁面
  載入起**，抵達設定第一個控件所需**鍵擊數（含 Enter）≤ sprint14-S5 基線
  （設定＝第 10 停點）的 2 倍**；並斷言「Enter 後下一次 Tab 的 `activeElement`
  落在 `#global-section` 內」。WebKit 對 sequential focus navigation starting
  point 的歷史不穩列入誠實聲明。
  〔MS1 回填：**門檻過**——兩 viewport 皆 6 擊（含 Enter）≤ 20 上限；
  Chromium fragment navigation focus starting point **實證生效**（Enter
  後下一次 Tab 落 `#global-section` 內），MS3 skip-link 維持零 JS 純錨點
  實作；純 Tab 對照路徑 195 停點。WebKit 誠實聲明已入 RESULT。見
  `spikes/S-c-RESULT.md`。〕
- **S-d e2e harness 逐案 viewport（MS0 前置，須在版面手術之前完成）**
  〔R:I10〕：現行 `scripts/e2e-statusline.mjs:347`（`--window-size`）與
  `:1049`（`setDeviceMetricsOverride`）**雙處硬編 1400×1000**、10 案共用。
  加 `testCase.viewport` 欄位，既有 10 案帶原值跑一輪確認全綠不變，再加
  1280×800 空殼案驗證座標與 `elementFromPoint` 行為。**產出＝harness 可逐案
  設定 viewport 且既有案零迴歸。**
  〔MS1 回填：**門檻過**——既有 10 案零迴歸＋新增第 11 案
  `viewport-probe-1280x800`（三斷言：viewport 尺寸／已知元素 rect／
  `elementFromPoint` 命中，皆通過）常駐保留為迴歸哨兵；11/11 passed，
  54464ms，exit 0。見 `spikes/S-d-RESULT.md`。〕
- **S-e jsdom 承接 RO／matchMedia（僅需 JS 量測時）**〔R:🟢〕：在 `init()`
  插一行 `new ResizeObserver(()=>{})` 跑 `npm test` 記錄紅燈檔數；比較「特徵
  偵測守衛」與「新增 vitest `setupFiles` 共用 stub」兩修法。**產出＝定案修法。**
  〔MS1 回填：**不適用「過／不過」門檻，為修法定案型 spike**——裸插探針
  紅燈 17 檔／82 案（`ReferenceError`）；定案＝複合形（特徵偵測守衛為主＋
  一次性同步初始寫入獨立於 RO 回呼＋setupFiles stub 補強備用），修法後
  17 檔全綠。見 `spikes/S-e-RESULT.md`。〕
- **S-f D8 狀態機跨斷點**〔R:I7／I8／R2:#1-N7〕：斷點切換 ×〈使用者收合／
  展開〉× 重載的六種序列，**斷言 localStorage 只在使用者於 <1100px 互動時
  改變**；測桌面 `<summary>` 的 Tab 停點、可點擊性、播報一致性；**並斷言
  「JS 失效態（停用 script）下桌面目錄仍可達」**。
  〔MS1 回填：**門檻過**——11/11 PASS（六序列＋機制比較＋a11y＋JS 失效態＋
  防閃動）；推薦機制 (a) summary-only；坑：`<noscript>` 逃生門、讀值須
  setTimeout(0)/雙 rAF。S-f 坑 1 語意校準見 §D8 就地註記。見
  `spikes/S-f-RESULT.md`。〕
- **S-g 頁面可捲命中面積（決定 D2 的 contain 範圍）**〔R:I13／R2:#2-N7 補
  門檻〕：1280×800 九宮格逐點 dispatch `mouseWheel` 記錄 `window.scrollY` 是否
  改變，算出可捲面積佔比；另測焦點分別落於各區時 Space／PageDown 的捲動標的。
  **通過門檻＝可捲命中面積 ≥30%，未達即判「不得同時對兩欄掛 `contain`」。**
  〔MS1 回填：**門檻過**——3 組態（O1 兩欄 contain／O2 皆 auto／O3 僅列區
  contain）×2 狀態全數 ≥30%（最低 77.8%，O2/P2 甚至 100%）。定案 D2＝
  **O1（兩欄皆 contain）**，禁止條件未觸發。見 `spikes/S-g-RESULT.md`。〕
- **S-h 規模探測（決定里程碑切分）**〔R:I15／R2:#1-N9 改排程〕：以 **S-a
  勝出臂**的骨架只改 index.html／style.css（JS 完全不接），跑 `npm test` 與
  `npm run test:e2e`，記錄紅燈檔數與案數＝測試網連動成本下界。**排在 MS1
  之後**（其前置骨架由 S-a 定案）。
  〔MS1 回填：**不適用「過／不過」門檻，為規模探測型 spike**——vitest 真
  連動紅 2 檔／6 案（`preview-band.dom.test.ts`＋`layout-columns.dom.
  test.ts`，皆結構契約斷言，其餘 62 檔／1929 案倖存）；e2e 11/11 全綠、
  0 紅。附帶發現：e2e harness 見既存 dist 不重建，須先 `npm run build`
  （已於 Verification 節就地註記）。見 `spikes/S-h-RESULT.md`。〕
- **S-i 跨欄拖曳**〔R2:#2-N7 補定案輸出〕：HTML5 DnD 自目錄欄拖至列區（兩者
  為各自獨立的捲動容器，此幾何為新引入）。驗 (a) dragenter／dragover／drop
  跨容器正常；(b) 插入指示定位正確；(c) 列區內目標列捲出視野時的邊緣自動
  捲動；(d) 拖曳中來源欄是否誤觸自身捲動。**定案輸出**：若 (c) 顯示 Chromium
  邊緣自動捲動會在拖曳中觸發，則 G4 的「三者 scrollTop 不變」斷言須改為容許
  ±N px 並回填本檔。
  〔MS1 回填：(a)(b) 三輪一致 PASS；(c) **確認觸發**——安全帶 offset ≥24px
  三輪、所有樣本皆 0（唯一零例外區間），offset ≤12px 強烈觸發（<1 秒衝頂
  `maxScrollTop`，~700–780px/s，無 overshoot／回彈），16–24px 交界帶存在
  環境敏感的不可預期性；(d) 來源欄自身邊緣同受觸發，但不跨容器外溢。
  **G4 定案：容許量 ±2px（實質嚴格 0）＋座標全程與兩欄容器邊緣保持 ≥40px
  安全帶**，不採寬鬆容許量路線。見 `spikes/S-i-RESULT.md`。〕
- **S-j 軌寬與樣例值截斷（Rev 3 新增，決定 D3）**〔R2:#2-N6 斷鏈修復〕：
  量三欄自然內容寬度與 P90 樣例值在候選比例下的截斷率。**通過門檻＝目錄欄
  寬容納 P90 樣例值不截斷**；未達則調整比例（列區最寬為不可讓步的上位約束）。
  〔MS1 回填：原始候選 `1fr 1.6fr 0.9fr` 於 1280×800 **未過門檻**（2/30
  P90 級截斷，差 5px）；定案 D3＝`minmax(340px, 1fr) 1.6fr 0.9fr`（過關
  邊界 339px 二分搜尋實測，取整＋1px 安全餘裕），兩 viewport 皆 0/30
  截斷、列區恆最寬。見 `spikes/S-j-RESULT.md`。〕

**跨引擎誠實聲明**〔R:#2〕：本機無 Firefox、Windows 開發機無 Safari，Edge 與
Chrome 同引擎非異質樣本。凡標「跨引擎」的驗收（S-f 的 `<details>` 行為、
S-i(c) 的 Firefox 自動捲動、S-c 的 WebKit focus starting point）**一律降級為
Chromium 實測＋規範／compat data 查核**，並預設走風險較低的路徑；真異質引擎
證據列入第三輪真機驗收。

## Milestones〔R:I15／R2:#2-N8〕

里程碑改用 **MS** 前綴以避開捲動模型的 M1／M2 命名〔R2:#1-N8〕。

| # | 內容 | 出口條件 |
|---|---|---|
| **MS0 前置** | S-d（harness viewport） | harness 可逐案 viewport 且既有 10 案零迴歸 |
| **MS1 Spike** | S-a／S-b／S-g／S-j（同一原型）→ 捲動模型與軌寬定案；S-c；S-f；S-i；S-e（若 S-a 定案需 JS 量測）；S-h（S-a 定案後） | S-a／S-b／S-c／S-g／S-j 五個門檻皆過；`--band-h` 維護方式定案；結論回填本檔 |
| **MS2 版面手術** | index.html 結構（四區＋wrapper＋skip-nav 提升）＋style.css 兩斷點改寫＋版面 dom 案同步＋D7 `mediaBlockRange` 強化＋**SPEC Conventions delta**（不依賴任何 spike 結論，前移至此） | `npm test` 綠（版面 dom 案）；**G2 桌面案於 e2e 到位**（獨立 gate，非 `npm test` 範疇）；層疊歸屬斷言到位 |
| **MS3 收合與可及性** | D8 全套＋D4 五條 skip＋`scroll-margin-top`＋i18n 雙鍵＋`skip-nav.dom.test.ts` 計數 3→5 | 收合六項情境綠；i18n 巡檢綠；Tab 序回歸基準寫入 |
| **MS4 e2e 與簿記** | 既有 10 案校準（含案 9／案 10 改寫）＋G4／G8 新案＋SPEC Components／TECHSTACK／BACKLOG delta | e2e 全綠；黃金檔零 diff ×2 |

**順序約束**：MS0 未過不得進 MS1，MS1 未過不得進 MS2——順序倒置會使紅燈
無法歸因（版面 vs harness vs 模型）。**工作量提示**：表面積不小於 sprint 14
（該批 25 task／5 milestone）。

## Open questions

- **OQ-1（S-a／S-b 定案）**：M1′-a／M1′-b／M2 三擇一。若判 M2 勝出，
  **footer 處置與對其他四頁的連帶影響須升為使用者裁決**。
  〔MS1 定案：判 **M1′-a**；M2 未勝出，本條升裁決條款**未觸發**。見
  §Spike 結論回填「S-a」。〕
- **OQ-2（S-b 定案）**：設定欄是否需要獨立捲軸。〔R2:#2-N6 統一裁決者〕
  〔MS1 定案：**不需要**（自然高 440px，餘裕 40–168px）。見 §Spike 結論
  回填「S-b」。〕
- **OQ-3（已消解）**：<1100px 摺疊序定為「預覽→目錄→列區→設定」；原代價
  由 D8 收合＋D4 skip 連結雙重緩解。
- **OQ-4（已併入 D2）**：頂帶 z-index 與欄 `top` 偏移——已明訂，不再開放。
- **OQ-5**：是否把 D8 的持久化旗標抽為與 `tutorial-band.ts` 共用的小工廠
  （repo 內同構第四次複製）——本批傾向**不抽**（避免過早抽象化），須在
  DRIFT 留痕供下一批評估。

## Spec deltas

### root `SPEC.md`
- **Section: Conventions** — add〔R:I3／C3／R2:#2-N4,N5〕
  Why: 版型原則屬**跨工具不變量**，放進單一工具那顆已 48 行、按 sprint 逐次
  疊寫的 Components bullet 正是上一批 🟡-6 得以藏身一整輪的結構成因。
  New content: 三句——
  1. **拖放編排可用性不變量**：「來源與目標須分屬獨立捲動容器，**可用性不得
     依賴程式化捲動**；拖曳過程中不得要求捲動」。
  2. **skip 落點快照謂詞**〔R2:#2-N5 改寫〕：「`<main>` 內每個頂層分區於
     skip-nav 須有對應落點」——原擬「任一分區於 DOM 序**被降位**時須有落點」
     為 **diff 相對謂詞**（需知道前一版狀態才能求值），無法對單一版本機械
     檢查；改為快照謂詞後可由 dom 案直接驗，並註明本句為 `SPEC.md:145`
     「大量項目須有 skip 機制」的**特化**（前者以量觸發、本句以結構觸發）。
  3. **版位判準**〔R2:#2-N4，補 G5 承諾但 Rev 2 未落實的部分〕：「互動所需
     的共視元素不得以捲動換取共視；低頻互動面板取視覺權重最低位；核心產出
     恆佔最大可視寬度」——供未來新增區塊（如 BACKLOG 的匯入／匯出 UI）據以
     推導，而非照抄結論。
  **排程**：本節不依賴任何 spike 結論，**前移至 MS2 出口條件**〔R2:#2-N8〕。
- **Section: Components** — modify
  Why: statusline-builder 的版面**形態**於本批全面改寫。
  New content: 分兩層書寫並顯式標記——「不變量（變更需重議）」引用上述
  Conventions 條目；「現行形態（sprint 15，可調整）」描述四區配置、DOM 序、
  頂帶 ≤40dvh 與全斷點 sticky、**skip-nav 五條落點**、`<1100px` 目錄可收合
  （含 key 字面值 `eztools-statusline-builder-catalog-collapsed`、sentinel
  `'1'` 與完整謂詞，比照 sprint 14 對教學帶 key 的落名先例）、**新的捲動
  停點總數與歸屬**（`add`，見下方對帳表）。

  **改寫前後契約條目對帳表**〔R:I5／R2:#2-R2-1,N2,N3〕——Rev 3 修正 round 2
  查出的三處錯分類與一處漏列：

  | 現行句 | 處置 | 說明 |
  |---|---|---|
  | `:57`「**三欄版面**」標題語、`:58-60`「頂帶降級入中欄…」 | **drop** | 形態整段汰除 |
  | **`:61-62`「右＝教學帶→目錄→已選擇**同一捲動容器**（sticky、單一捲動、內捲不連鎖外頁）」** | **drop（最承重）** | 〔R2:#2-N3〕Rev 2 **漏列**。本批全部立論（Context 缺陷 1／G4／Conventions 新不變量）都是為了消滅「同一捲動容器」——漏列它即 🟡-6 鏡像原樣復發 |
  | `:63`「至**右欄**已選擇清單目標列」 | **replace** | 正是 sprint 14 🟡-6 的同一句 |
  | `:69-71`「行動版摺疊序＝設定→預覽→清單…右欄 sticky 解除」 | **replace** | 新摺疊序 |
  | `:72`「鈕隨預覽居**中欄**」 | **replace** | 改頂帶右端 |
  | `:59-60`「40dvh 高度預算現掛**終端框** max-height、非頂帶自身」 | **replace**（Rev 2 誤標 keep） | 〔R2:#2-R2-1〕與本檔 D1「上限移回頂帶」**反向**；照 keep 施工會產出互斥條文 |
  | 「overscroll 不連鎖」 | **pending S-g**（Rev 2 誤標 keep） | 〔R2:#2-N2a〕適用範圍待 spike 定案，不得預先標 keep |
  | 「捲動停點判定」 | **add**（Rev 2 誤標 keep） | 〔R2:#2-N2b〕SPEC 全文從未有停點條目（現存於 index.html 註解與 dom 斷言）；標 keep 是幻影條目 |
  | role=region 隨遷／`#output-status` 常駐 dialog 外／落列播報採視覺顯示編號／已選擇依渲染列分組的地標與標題結構 | **keep**（四條） | 經 round 2 逐條回查 SPEC 確認仍屬實 |

  順手項〔R:🟢／R2:#2-N11〕：`SPEC.md:156`「e2e 全 **7** 案為現行活例」計數
  已過時（實為 10，本批再加），改為不帶計數的措辭並註明「案數以
  `scripts/e2e-statusline.mjs` 的 `CASES` 陣列為單一事實來源」。

### root `CLAUDE.md`
(none)——不新增工具、不改建置／測試指令、不動入口頁主題 inline script。

### magi/`PRD.md`
(none)——版面重排屬呈現層，低於 PRD 能力條目粒度（沿用 sprint 14 判例）。

### magi/`TECHSTACK.md`
- **Section: Framework / runtime** — modify〔R:I1，round 1 最高票 6/7〕
  Why: 現行基線句只有 **CSS 槽位**，本批可能引入 **JS 平台 API**，無處可掛。
  New content: 基線句拆兩段——「CSS 基線…」與「JS 平台 API 基線…」；後者
  視 S-a 定案補入 `ResizeObserver`（僅 JS 量測路徑需要；CSS 原生路徑不引入）。
  `matchMedia` 為既有（`src/theme.ts` 已用），非新增。
  **原生 HTML 元素的處置**〔R2:#2-N9〕：`<details>`／`<summary>` 既非 CSS 亦非
  JS API。沿 `<dialog>` 先例（sprint 09 引入、從未進 TECHSTACK）**定案為
  「原生元素不入 TECHSTACK」**，該句僅作為 Why 的理由，不進 New content。
  **回填時機**：S-a 定案後（＝MS1 結束）即回填，不等 MS4〔R2:#2-N8〕。

## Verification

- `npm test` 全綠＋`npm run typecheck`。
- 〔MS1 回填（MS4 SOP 提醒，S-h 附帶發現）：`scripts/e2e-statusline.mjs`
  見既存 `dist/` 只印警告不重建——任何驗 statusline-builder 改動的 e2e
  跑批前**須先手動 `npm run build`**，否則會靜默測到舊 dist（假綠）。見
  `spikes/S-h-RESULT.md` §三。〕
- **黃金檔零 diff ×2**——本批不應觸及 emit 鏈，出現 diff 即誤傷訊號。
- **測試層歸屬（Rev 3 明訂，硬性）**〔R2:#3-N1〕：**G2 硬驗收與 skip 落點
  可見性兩案須以 e2e（真瀏覽器 CDP）編碼，不得以 jsdom `dom.test.ts` 實作。**
  理由：`layout-columns.dom.test.ts:11-12` 自身文件已載明「jsdom 無真實 layout
  引擎，`getBoundingClientRect()` 恆回全零矩形」，而 C1 的病灶是純 CSS sticky
  包含塊行為、**無對應 JS 邏輯可 stub**——若落 dom 層，唯一做法是把 mock 值
  寫死成「應該對」的答案＝恆真斷言，完全測不到 C1。**本批宣稱要終止的失效
  模式，不得在補救措施裡復發。**
- **G2 硬驗收（e2e）**：1400×1000 與 1280×800 下，於 scrollY ∈ {0, 200, 400,
  max} 各取樣，斷言頂帶完整落在視窗內且穩態時 `rect.top === 0`；同案斷言
  兩欄 `rect.top ≥ 頂帶 rect.bottom`（容許量依 S-a 回填）。
- **G4 硬驗收（e2e）**〔R:I2〕：語意＝「**拖曳過程中**不需捲動」。1400×1000
  與 1280×800、固定 seed（≥3 列／≥8 段啟用）、**種子釘死目錄尾段**（如
  shell-out 分區）→ 非首列；允許拖曳**前**對兩欄各 `scrollTop` 設定一次
  （非 `scrollIntoView`），起手後至 drop **全程斷言 `window.scrollY`／目錄欄
  `scrollTop`／列區 `scrollTop` 三者不變**（容許量依 S-i 回填）、`toPointExpr`
  只求值一次；以 `document.elementFromPoint` 命中驗證取代 rect 落界斷言。
  〔MS4/審查回填（2026-08-16）：baseline→dragstart 另容許**一次性有界
  跳動** ≤ 執行期實測「目標列之上列群組長高總量」＋2px——成因＝
  `is-segment-dragging` 命中區擴張（sprint14 T5.11 既有設計，S-i 原型
  量不到），另設 64px 單群組量級天花板防 CSS 回歸連動放大；起手後至
  drop 各階段與 drop 後回歸維持 ±2px 嚴格。見 `MAGI_CODE_REVIEW.md`
  🟡-3／`DRIFT.md` B-3。〕
- **G8 行動版收合硬驗收（e2e）**：390×844、頂帶 sticky 生效下，目錄收合後
  **列區起始完整落在視窗內**；教學帶顯示／已 dismiss **兩種前置態都要驗**。
- **G9 垂直預算**：由 S-b 承接，回填實測值與可見容量判準結果。
- **Tab 序回歸基準**〔R:C3〕：S-c 產出的「設定區起始停點序號」與「自載入起
  抵達設定的鍵擊數」寫入版面 dom／e2e 案（Tab 序屬純 DOM 結構與 focus 順序，
  jsdom 可有效測試，無假綠疑慮）。
- **skip 落點可見性（e2e）**〔R:I9／R2:#1-N11〕：跳轉後落點 rect **不與頂帶
  rect 相交**（1400×1000 與 390×844 各一）；並斷言**聚焦中的 skip-link 本身**
  未被頂帶遮蔽（`elementFromPoint` 命中該連結）。
- 版面 dom 案：四區 DOM 序、欄歸屬、捲動容器數量與**停點總數新契約**、
  skip-nav 位於 `<main>` 開頭且**五條落點 id 皆存在**（機械斷言）、**層疊
  歸屬斷言**（D7，含 `mediaBlockRange` 強化後版本）；目錄收合**六項情境**
  〔R2:#3-N3 計數統一〕（收合／展開／持久化／桌面恆展開／跨斷點強制展開後
  持久化值不變／localStorage 擲錯 fail-open）。
- **既有測試改寫清單**〔R2:#2-N1／#3-5〕：
  - `skip-nav.dom.test.ts:107-110` `.skip-link` 計數 **3 → 5**
  - `preview-band.dom.test.ts` 捲動停點斷言 → 新契約值
  - e2e 案 10 `caseModeSwitchScrollStable`：後備分支硬編 `#list-column` 且註解
    明載「唯一捲動容器」語意，新版面此語意消滅——**id 改指列區欄**（欄 id
    於 MS2 定案後回填本清單）
  - e2e 案 9 `caseTutorialBandDoesNotBlockDrag`：教學帶移至目錄欄後與列區內
    拖曳已互不重疊，**會退化為恆真**——改測「目錄欄內拖曳於教學帶在場時不受
    阻」，或承認與 G4 新案重疊而退場
- i18n 巡檢綠（`ui.skipToCatalog`／`ui.skipToSettings`／收合 `<summary>` 文案
  雙語齊備、零 `console.warn`）。
- 真機驗收（第三輪）併入既有 BACKLOG 條目，本批不擋。

## 簿記

- `magi/BACKLOG.md`「statusline-builder 第三輪真機驗收批（sprint 14 版面
  終形）」條目須註記**部分失效**，並附**逐條對照表**（失效／保留／改寫／
  新增），比照 sprint 14 對 sprint 09 條目的處理方式。
- sprint 14 DRIFT 的 `--column-top` 相關條目於本批**作廢**（Rev 3 預算式改為
  單項扣除後不再需要頁首高度變數）。
- **S-a 定案後（MS1 結束）即回填 TECHSTACK delta**，不等 MS4。
- OQ-5（持久化旗標小工廠）留痕入 DRIFT 供下一批評估。

## Spike 結論回填（MS1 出口，2026-08-15）

> T1.11 收尾簿記。以下逐 spike 回填門檻判定、定案一句話、關鍵數字，
> 結論以各自 `spikes/S-x-RESULT.md` 為準；本節與正文各處的〔MS1 定案／
> MS1 回填〕就地短註記互相呼應，正文原句不刪不改。
>
> **裁決檢查（先行聲明）**：升裁決條件**皆未觸發**——OQ-1 判
> **M1′-a**（非 M2，M2 未勝出）；S-b 的 G9 門檻**通過**（未觸壓縮頁首
> 退階梯）。本輪 MS1 出口**無待使用者裁決事項**。

### S-a 頂帶與欄的黏著幾何（`spikes/S-a-RESULT.md`）

- **門檻判定**：M1′-a 過（T1 4/4、T2 達成、T3 除 max-scroll 兩點外過，
  該兩點依候選 2 量化接受）；M1′-b 不過（T1 頂帶捲出視窗、外框超出宣告
  上限 66–2913px）；M2 三門檻字面全過但不落入「僅 M2 過關」的自行定案
  例外（footer 恆不可達，代價升裁決條款未觸發）。
- **定案一句話**：捲動模型＝**M1′-a**；欄遮蔽殘差＝**候選 2（接受並
  量化）**；`--band-h`＝**ResizeObserver**（CSS 原生傾向不成立）。
- **關鍵數字**：桌面 max-scroll 遮蔽 134.156px（1400×1000 與 1280×800
  逐位元相同，e2e 容許 ≤140px）；頂帶高度變動範圍桌面 81.6px
  （150.234–231.797px）、行動 76.4px（261.203–337.594px）；候選 1
  （wrapper 補償高）兩輪實測 maxScroll 增加但 `cat.top@max` 完全不變，
  數學證偽。
- **審查後補充（2026-08-16）**：≤140px 容許適用範圍再校準為「穩態後
  所有取樣點」——見 §二 N4 的〔MS4/審查回填〕就地註記與
  `scripts/e2e-statusline.mjs` 檔頭 T2.6 節。

### S-b 垂直預算與固定開銷（`spikes/S-b-RESULT.md`）

- **門檻判定**：G9 主判準過（目錄可見 10≥8、列區可見 2≥2）；G9 輔助判準
  過且大幅超標；OQ-2 定案。
- **定案一句話**：G9 **通過**（列區判準零餘裕，`scrollY≥350` 起退化為
  1，同源於 S-a 已接受的 N4 殘差，非新缺陷）；OQ-2＝**設定欄不設獨立
  捲軸**。
- **關鍵數字**：1280×800 真實頁首 236.375px；目錄可見 10 項／列區可見
  2 組；輔助判準 608px（新兩欄 clientHeight）≥ 479.4px（sprint14 基準
  564px×85%，107.8%）；設定欄自然高 440px（餘裕 40–168px）；最壞頂帶
  組態 1280×800 未封頂（279.781px，餘裕 40.22px）／390×844 封頂
  （337.594px≈337.6px，終端框仍得 3.874 行）。
- **carry-forward**：MS2 落地後須以真實 DOM 列高覆核 G9 列區判準（本
  spike 為 mock 列高 47.375px／組）；OQ-2 理論超預算（兩條件式提示行
  同顯＋最壞頂帶封頂疊加，約超 100px）情境留待真機覆核，不預先加捲軸。

### S-c Tab 走查（`spikes/S-c-RESULT.md`）

- **門檻判定**：Gate 過（路徑 A 鍵擊數兩 viewport 皆 6 ≤ sprint14-S5
  基線 10×2＝20）。
- **定案一句話**：Chromium fragment navigation focus starting point
  **實證生效**——MS3 skip-link 維持零 JS 純錨點實作，不需要攔截式
  `preventDefault()+focus()` 寫法。
- **關鍵數字**：路徑 A 6 擊（含 Enter）；路徑 B（純 Tab 對照）195 停點；
  WebKit 對 sequential focus navigation starting point 的歷史不穩，已列
  誠實聲明，未實測。

### S-d e2e harness 逐案 viewport（`spikes/S-d-RESULT.md`，MS0 前置）

- **門檻判定**：過——既有 10 案零迴歸＋新增第 11 案三斷言全過。
- **定案一句話**：harness 可逐案設定 viewport；`viewport-probe-1280x800`
  **永久保留**為逐案 viewport 機制的常駐迴歸哨兵。
- **關鍵數字**：11/11 passed，總耗時 54464ms，exit 0。

### S-e jsdom 承接 RO（`spikes/S-e-RESULT.md`）

- **門檻判定**：不適用「過／不過」型門檻（修法定案型 spike）——裸插探針
  紅燈；兩修法皆可單獨令探針轉綠，但各有測不到「RO 回呼本身行為」的
  取捨。
- **定案一句話**：**複合形**——特徵偵測守衛（比照 `src/theme.ts`）為主
  ＋一次性同步初始寫入（獨立於 RO 回呼，比照 `syncColumnTop()` 模式）＋
  vitest setupFiles stub 補強備用（供進階 spy 斷言）。
- **關鍵數字**：探針裸插紅燈 17 檔／82 案（`ReferenceError`，與 PLAN
  「17 個測試檔」數字吻合）；定案修法後 17 檔全綠（`npm test`
  1935/1935，唯一殘留為既知環境負載型 timeout flake）。

### S-f D8 狀態機跨斷點（`spikes/S-f-RESULT.md`）

- **門檻判定**：過——11/11 PASS（六序列＋機制比較＋a11y＋JS 失效態＋
  防閃動）。
- **定案一句話**：D8 設計成立；持久化機制推薦 **(a) summary-only**（只掛
  `<summary>` click／keydown，不接 `toggle`，天生免疫程式化寫入誤判）。
- **關鍵數字**：11/11 PASS；兩個平台坑——防閃動須配 `<noscript>` 逃生門
  （否則 JS 失效態下行動版目錄被暫抑樣式永久壓 0 高度）、讀翻轉後
  `open` 須用 `setTimeout(0)`／雙 `requestAnimationFrame`（`queueMicrotask`
  讀到舊值）。
- **S-f 坑 1 語意校準**（本任務新增）：原文「目錄項須為靜態 HTML 才守得住
  fail-open」於真實 app 的語意已就地校準於正文 §D8——真實目錄本為 JS
  渲染，fail-open 實際覆蓋的是「`init()` 半路擲錯」情境（教學帶等既有
  靜態骨架仍可達），並非「停用 script 下目錄項完整可用」；此為既有、
  非本批新增的限制，不牴觸 D8 fail-open 承諾字面。

### S-g 頁面可捲命中面積（`spikes/S-g-RESULT.md`）

- **門檻判定**：過——3 組態×2 狀態共 6 組合全數 ≥30%（最低 77.8%）。
- **定案一句話**：D2＝**兩欄皆掛 `overscroll-behavior: contain`**（組態
  O1）；PLAN 原文「未達 30% → 不得同時掛 contain」的禁止條件未觸發。
- **關鍵數字**：O1 P1/P2 皆 77.8%；O2（皆 auto）P1 77.8%／P2 100.0%；
  O3（僅列區 contain）P1 77.8%／P2 88.9%；死區侷限於「該欄已捲到底＋
  游標停於該欄」交集（9 點中 2 點，22.2%）。

### S-h 規模探測（`spikes/S-h-RESULT.md`，排在 MS1 之後）

- **門檻判定**：不適用「過／不過」型門檻（規模探測型 spike）——量測連動
  成本下界。
- **定案一句話**：測試網連動成本遠低於「整套重寫」——vitest 真連動紅
  **2 檔／6 案**（其餘 62 檔／1929 案倖存）；e2e **0 紅**（11/11 全數
  倖存）。
- **關鍵數字**：`preview-band.dom.test.ts`（2 案）＋`layout-columns.dom.
  test.ts`（4 案）需改寫，與 T2.4 預劃吻合；e2e 11/11 PASS。
- **附帶發現（已回填 Verification 節）**：`scripts/e2e-statusline.mjs`
  見既存 `dist/` 不重建，驗 statusline-builder 改動前須先手動
  `npm run build`，否則測到舊 dist（MS4 SOP）。

### S-i 跨欄拖曳（`spikes/S-i-RESULT.md`）

- **門檻判定**：(a)(b) 過（三輪一致 PASS）；(c) 確認觸發，需量化定案；
  (d) 過（誤捲風險存在但不跨容器外溢）。
- **定案一句話**：**G4 容許量定案為 ±2px（實質嚴格 0）＋座標全程與兩欄
  容器邊緣保持 ≥40px 安全帶**；不採「放寬容許量」路線（觸發後位移量與
  任何合理容許量不成比例）。
- **關鍵數字**：安全帶 offset ≥24px 三輪、所有樣本皆 0（零例外）；
  offset ≤12px 於 run4/run6 <1 秒內衝頂 `maxScrollTop`（本例 618px）；
  約 700–780px/s、無 overshoot／回彈；16–24px 交界帶存在環境敏感的不可
  預期性（run5 異常）。

### S-j 軌寬與樣例值截斷（`spikes/S-j-RESULT.md`）

- **門檻判定**：原始候選 `1fr 1.6fr 0.9fr` 於 1280×800 **未過**（2/30
  P90 級截斷）；`minmax(340px, 1fr) 1.6fr 0.9fr` **過**（兩 viewport 皆
  0/30）。
- **定案一句話**：D3＝**`grid-template-columns: minmax(340px, 1fr) 1.6fr
  0.9fr`**；列區恆為三欄最寬（G7 不受影響）。
- **關鍵數字**：P90＝26 字元、max＝33 字元（zh-Hant，`cwd`／
  `project-dir` 為代表樣本）；截斷過關邊界＝339px（逐 px 二分搜尋實測，
  取 340px＝進位＋1px 餘裕）；en locale 段名較寬，雙語零截斷需下限
  410px（非本任務裁決範圍，留 MS2 依 UX 優先序裁決）。
