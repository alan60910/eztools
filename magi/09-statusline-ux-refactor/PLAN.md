# statusline-builder UX 重構（真機回饋批）

> Sprint 09 · Type: feat · Scale: major · Artifact: PLAN.md · Rev 2
> 承接：`magi/BACKLOG.md`「Promoted to sprints」段之 UX 重構批（promoted
> 2026-07-17），源自 `magi/08-statusline-catalog-expansion/WORKS.md`
> 2026-07-14 使用者真機驗收回報第 2–6 點。
> Rev 2（2026-07-17）：依 MAGI_PLAN_REVIEW.md round 1（7 角度、3 Critical
> ＋22 Important）全數修訂；C1–C3 對應段落見 D3／D1／D5。

## Context

sprint 08 的 T5.4 真機驗收（使用者親測，A–F 六區 PASS，產出腳本已上機使用）
帶回六項改進意見。第 1 點（無資料 `(n/a)`）已於 08 M6 當場交付；第 2–6 點經
使用者分流指示「可當後續的 sprint」進 BACKLOG，本 sprint 承接，共五個子項：

1. **分隔符改逐列設定**——現為全域單一設定（`config.ts:107`
   `BuilderConfig.separator`）；每列預設套用全域，但每列可各自覆寫。
2. **segment 每個欄位後標示預設值**——一看即知哪些欄位未改動。
3. **segment 上列改拖移**——現為左欄目錄打勾啟用（`main.ts:806-815`），
   段數一多時打勾後不知道落到哪一列。
4. **即時預覽移到最上方且不被捲動遮蔽（sticky）**；「產出腳本」收斂為
   單一按鈕——現為右欄 aside sticky（`style.css:1222-1229`，<1100px 單欄
   退化即失效），產出區共 6 顆按鈕＋3 塊 `<pre>`（bash／ps1／settings ×
   複製／下載）。
5. **i18n 語言切換（新增英文）**——現完全無 i18n 機制，
   `<html lang="zh-Hant">` 寫死；文案分佈：index.html 靜態（~50–60 條）、
   main.ts（常數表 ~17 條＋動態組句 ~50–80 處，多為帶插值樣板字串）、
   **純函式模組資料層**（segments.ts 30 段 `label`＋30 段 `icon.ariaText`、
   resolve.ts 預覽 aria 管線、row-groups.ts 播報組句、row-select.ts 列
   選項文字）——合計量級約 **210–310 條**。

工具現況（Explore 摸底＋round 1 審議交叉驗證，全部 file:line 經複核）：
`tools/statusline-builder/` 共 20 個原始檔；`main.ts` 為 2618 行單體
（DOM 組裝／事件／狀態全在此，無直接單元測試覆蓋），純函式模組
（config／resolve／emit-*／row-*）皆有測試且守「node 可測、零 DOM
import」慣例（SPEC:111-113）；迴歸網＝vitest 單元＋golden（emit 層
byte-exact）＋3 檔 jsdom dom.test＋CDP e2e 5 案（**本機限定、不進 CI**
——CI 只跑 typecheck＋vitest，此結構性事實影響本 sprint 驗證設計，
見 Verification）。

## Goals & Non-Goals

**Goals**
- G1 逐列分隔符：每列預設繼承全域，可各自覆寫（僅 plain 模式，powerline
  無分隔符語意不變；mode 切換時 `rowSeparators` 保值不清除、僅被忽略，
  比照既有 `separator` 惰性存續慣例）；三後端＋預覽 byte 級一致。
- G2 欄位預設值標示：segment 編輯列的每個欄位（列位、顯示文字、前綴、
  顯示樣式、顏色、fg 覆寫、閾值、bar）標示其預設值。
- G3 拖移入列：左欄目錄 segment 可直接拖到中欄目標列啟用；保留鍵盤可及
  的啟用路徑並補「落到第 N 列」播報（播報一律採**視覺顯示編號**，見 D3
  播報語意定案）。
- G4 版面重構：即時預覽移至頁面頂部、全斷點 sticky 不被捲動遮蔽（頂帶
  max-height 預算見 D4）；產出區收斂為單一「產出腳本」按鈕（置頂帶
  右端）；預覽區附一句常駐說明「預覽為固定示範時鐘，產出腳本執行時為
  真時鐘」（進 i18n 字串表，同時消掉 BACKLOG 對應項）。
- G5 i18n：zh-Hant（預設）／en 雙語切換，涵蓋全部 UI 可見文字與 a11y
  文案（aria-label、live region 播報），**含純函式模組資料層文案**
  （segment label／icon.ariaText／預覽 aria 管線的「重置」代換）。

**Non-Goals**
- 配置匯入／匯出 UI（BACKLOG 另項，本次不併入——使用者已選純 UX 重構批）。
- main.ts 全面拆模組——僅做 G5 必要的字串抽離、G3 必要的 testable seam
  抽取與 G4 必要的區塊搬移；單體債另立 sprint。
- 全站（其他四頁）i18n——僅 statusline-builder 一頁。
- CONFIG_VERSION bump（見 D1 決策）。
- 產出腳本內容（bash／ps1／settings 的程式碼與註解）不做雙語化——腳本
  輸出契約與 golden 不因 i18n 而動。
- BACKLOG「a11y 三 note」（announceGlobal 組句順序、`.segment-lists`
  可及名稱、powerline 關 bar 恢復播報）**不納入本 sprint**——與 G3/G5
  相鄰但屬既有債，避免範圍蔓延；若 G5 重寫播報文案時零成本順帶可個案
  評估，預設不做。
- BACKLOG「dragOrigin 死狀態移除」等通用強化不整案處理（G3 觸及的
  endDragCleanup 冪等化除外，見 D3）。

## Design options considered

### D1 逐列分隔符的 schema 形態

| 選項 | 內容 | 代價／風險 | 誰受益／誰受害 |
|---|---|---|---|
| **A（推薦）** | v2 內選填欄 `rowSeparators?: (SeparatorConfig \| null)[]`，`null`／缺項＝套全域 | 需明定索引基準與 reindex 維護點（見下） | 循 `row`／`bar`／`autoColor` 前例：舊碼讀新檔為有損降級（忽略欄位、退全域分隔符），不炸不重置 |
| B | bump CONFIG_VERSION 3＋結構化 `rows: RowConfig[]` | 觸發 BACKLOG 既有預警的「未知版本重置」資料損失陷阱：需 v2→v3 遷移階梯＋「v2 存檔存活」回歸測試，且任何仍讀 v2 的舊部署直接重置使用者存檔 | 結構最乾淨、未來列級設定可擴充；但成本與風險不成比例 |
| C | separator 掛在每段 `SegmentConfig`（取列首段生效） | 寄生表達：移列／刪段時語意跟著段跑 | 否決 |

**推薦 A**。以下四項為 Rev 2 依審議補實的 schema 契約，實作依此為準：

**A-1 索引基準（C2 修訂，三消費點單一口徑）**：`rowSeparators[i]` 對位
「**config 正規化後的啟用列位**」——即以全部 `enabled` 段的相異 row 值
升冪排序後的 dense 位置，與 `emit-bash.ts:872` `groupByRow`／
`emit-ps1.ts:984` `groupSegmentsByRow` 的分組序**同基準**。注意
`resolve()`（resolve.ts:618-640）現行 `.map` 迭代的是「執行期存活列」
緊縮序（分桶前已剔除死亡段，:627）——某啟用列整列執行期死亡時兩基準
分岔，**禁止**直接以 `.map` index 取覆寫。resolve 須由 `config.segments`
篩 `enabled` 重算啟用列鍵序，把每個存活渲染列映射回其啟用位再取覆寫，
確保預覽與腳本在「整列死亡＋後列有覆寫」情境仍 byte 一致。

**A-2 清洗（壞形退 null，不得複用 sanitizeSeparator 的 return 形）**：
`sanitizeSeparator`（config.ts:236-249）全失敗路徑回 `defaultSeparator()`
（＝明示 `'|'`），直接複用會把畸形項污染成明示覆寫、破壞繼承語意。
新增 `sanitizeRowSeparator(raw): SeparatorConfig | null`——`null`／
缺項／畸形一律回 `null`（繼承全域），僅結構完整者委派既有驗證核心
（preset 白名單、`validateCustomText`）。**陣列級**清洗於
`sanitizeConfig` 明訂：非陣列→欄位缺席；長度 clamp 上界（比照
`sanitizeRow` config.ts:229-234 對 `row:999999999` 的 DoS 防禦，上界取
目錄段數）；序列化前修剪尾端 `null`，全 `null`／空陣列→省略欄位
（回「全繼承」正規形，避免存檔膨脹）。

**A-3 Reindex 規則（使用者 2026-07-17 拍板「跟列走」＋審議修訂落點）**：
覆寫跟列走——列因前方列刪除／空列壓縮而位移時，覆寫隨列同步位移
（陣列 splice 語意）；列被刪除或清空壓縮時，其覆寫一併消滅；
**pending 空列物化成真實列＝於該啟用列位 splice 入 `null`、其後覆寫
同步後移**；UI 暫存空列（pending）不入存檔、不佔 `rowSeparators` 位。
維護落點（審議修正＋round 2 正名）：`rowSeparators` 實作為與
`rowSlots` 的 `'real'` slot **一對一的平行陣列**（main.ts:243 註解
「第 k 個 real ↔ 第 k 個渲染列」），**唯 real-slot 集合／序改變時**
splice 同步——`setSegmentEnabled`（main.ts:924 drain）、
`performRowDeletion`（:1841）、`commitSegmentMove`（:1544，含 pending
consume 物化與 bump）。**pending-only 變異點對 rowSeparators 為
no-op**——`removePendingRow`（:2465，守衛 `!== 'pending' return`）與
`wirePendingRowButton` 的 `appendPendingSlot`（:2547，末端追加）皆不動
real slot，不得照 slot index 機械 splice（slot index ≠ real index，
中間 pending 刪除會誤刪錯位覆寫）。**不得**把 reindex 延到
`applyRowNormalization`／`normalizeRows`（config.ts:381-389 是整體重導
非 splice，且 bump 先改寫 row 值會使延後重映失準）。

**A-4 三後端落點（bash＝結構改、ps1＝傳參，兩者模型相反）**：
- resolve：`resolve.ts:634-639` 逐列 join 改依 A-1 映射取
  `rowSeparators[啟用位] ?? config.separator`。
- bash（三處，結構改）：`emit-bash.ts:932` 單一 `SEP=` 宣告在**有覆寫
  時**拆逐列 `SEP_k`；`joinPlain`（`emit-bash.ts:833-853`）內部寫死的
  `$SEP` 改引 `SEP${rowSuffix}` 或改收參數；單列路徑（:952
  `joinPlain('')`）SEP 綁列 0 覆寫。
- ps1（兩呼叫點，傳參）：`joinPlain`（emit-ps1.ts:960）本就收
  separator 參數、`separatorExpr`（:937）emit 期就地展開——僅
  :1117（單列）／:1163（多列）兩呼叫點改傳逐列值，separatorExpr 零改動。
- **no-override fast path（golden 凍結前提）**：`rowSeparators` 全
  `null`／缺席時，三後端輸出與現行**逐 byte 相同**（bash 沿用單一
  `SEP=` 形），逐列展開僅於實際存在覆寫時觸發。

**Golden 策略（Rev 2 改寫，取代「全量重生」）**：既有 golden **byte
凍結當回歸鎖**——無覆寫 config 產出零 diff（plain 與 powerline 皆是；
powerline golden 8 檔零 diff 為**硬斷言**，即「powerline 無分隔符語意
不變」的機械證據）。**新增**帶 `rowSeparators` 的 golden fixture
（plain；涵蓋：某列覆寫＋某列 null 繼承、單列覆寫、custom 值含須
escape 字元），`git diff __golden__/` 預期＝**只出現新檔、零既有檔
變動**，白名單審核退化為機械斷言。另補一個帶 `scenario` 的「執行期
整列死亡＋其後列有覆寫」多列 plain 案，把 A-1 的 resolve／emit 對位
一致性釘進端到端 byte-exact。不解除 golden「禁區：不得重生」慣例。

**UI**：逐列分隔符控件置中欄各列群組 header（預設顯示「（全域）」，
可切 preset／custom 覆寫或還原繼承）；powerline 模式下比照現有
`applyModeConstraints`（main.ts:2066）停用。

### D2 預設值標示的呈現

| 選項 | 內容 | 評估 |
|---|---|---|
| **A（推薦）** | 每欄 label 後綴固定顯示「（預設：X）」 | 使用者原話「每個欄位後面都放預設值，給人一看就知道」；資訊恆在，掃視即知 |
| B | 僅在值≠預設時標「已修改」 | 資訊密度較低，且不符原話 |
| C | A＋弱化樣式：現值＝預設時該標示淡化 | A 的視覺打磨版，可在 A 落地後低成本疊加 |

**推薦 A（保留 C 為視覺選修）**。預設值權威來源：`defaultSegmentConfig(id)`
（`config.ts:128-130`）＋ descriptor 後備（variant＝`descriptor.variants[0]`
`main.ts:1204`、閾值桶 `{kind:'default'}` `main.ts:753`）。呈現文字須走 G5
字串表（「預設」一詞雙語）。落點集中在 `buildSegmentRow()`
（`main.ts:1091-1272`）與模板 `index.html:657-742`。

### D3 拖移入列的互動

| 選項 | 內容 | 評估 |
|---|---|---|
| **A（推薦）** | 左欄目錄項可拖，drop 到中欄任一列群組容器／段間 gap／暫存列＝啟用＋指定列＋指定位；**保留目錄 checkbox** 作鍵盤等效，並補落列播報 | 需新的原子路徑（見下），非純復用；checkbox 保留滿足 SPEC「拖放具鍵盤等效」不變量 |
| B | checkbox 改「加入到第 N 列」下拉 | 多一步操作、30 段 × 下拉視覺噪音大 |
| C | 移除 checkbox 只留拖曳 | 違反 a11y 不變量，否決 |

**推薦 A**。以下為 Rev 2 依審議補實的互動契約：

**A-1 原子「enable-into-target」路徑（C1 修訂，取代「復用兩函式組合」）**：
停用段不進列群組（`row-groups.ts:34` `if (!seg.enabled) continue`），
且 `setSegmentEnabled`（main.ts:910-954）內部自呼 `commitConfig()`
（:940）並變異 `rowSlots`（:924／:935）——先 enable 再 move 會經兩段
commit，enable 中間態使 drop 捕捉的 slotIndex stale、planSegmentMove
依假來源列計算 drain/bump（空清單拖入唯一 pending、中間 pending 列
兩情境落點錯亂）。實作採：`setSegmentEnabled` 增 **defer-commit 旗標**
（只 mutate `enabled`、不動 rowSlots、不 relayout、不播報、不 focus），
由 `commitSegmentMove` 以 drop 當下的 target 直接定 row/slots 並做
**唯一一次** commit＋播報；drop 目標的 slotIndex 於同一同步事件內取用，
不跨 relayout。唯一 commit 後**仍須跑啟用側 UI 同步**——
`syncSegmentEnabledUi`（main.ts:938，左欄 checkbox 灰化）與
`syncFgOverrideDisabled`（:952，I4b 修復）——否則拖入啟用 powerline+bar
百分比段即重演 I4b（round 2 收口）。defer 模式不得改變既有單獨勾選
路徑的行為（既有啟停播報／焦點／`syncFgOverrideDisabled` 契約零變，
見 main.ts:941-953 密集註解與 Verification spike）。

**A-2 來源感知的視覺與清理**：拖曳視覺（opacity）與收尾清理現綁
`rowElements`（中欄 li，main.ts:1352/1486/1651/1681 各 drop handler）
——目錄項起手若沿用會清錯節點、目錄項卡半透明。清理邏輯依**起手來源**
（目錄 vs 中欄）分派；與「endDragCleanup 冪等共用」抽取合流（07 DRIFT
既有項，因新增第二個 dragstart 來源而被正當化——round 1 審議確認非
範圍蔓延），成為**來源感知的冪等清理**單一出口。目錄項 dragstart 須
排除 checkbox 命中區（比照中欄 `wireDragAndDrop` :1421 對 input/select/
button 的起手豁免），避免擋掉點選勾取。

**A-3 播報語意（含 BACKLOG:37 顯示編號定案）**：
- 目錄拖入播「〈段名〉**已加入**第 N 列第 M 位（共 K）」；中欄拖曳維持
  「**移至**」——`performCrossRowMove`（main.ts:1573-1586）加 origin
  參數選擇模板，文案入 G5 字串表。
- **已啟用**目錄項被拖入＝退化為純 move（與中欄拖一致，播「移至」）。
- 鍵盤 checkbox 啟用路徑補落列播報（`setSegmentEnabled` 啟用分支現
  **完全不播報**，此為新增工作非復用）：計算 clamp 落列→映射顯示編號
  →announceMove。
- **顯示編號語意定案**：所有落列播報一律採「視覺顯示編號」（經
  `slotIndexOfRealRow` 映射、與使用者眼見列號一致），**不用**凍結
  row 值——此定案同時回應 BACKLOG「重啟用 clamp 落點顯示編號與凍結
  row 值直覺不符」項的播報面（該 backlog 項本體不整案處理）。

### D4 版面重構：sticky 頂帶＋單一產出鈕

| 選項 | 內容 | 評估 |
|---|---|---|
| **A（推薦）** | 預覽抽出三欄、成**全寬 sticky 頂帶**（全斷點有效）；產出區收斂為單一「產出腳本」鈕（頂帶右端）開原生 `<dialog>`；版面變「頂帶＋左目錄＋中已選」 | 正面回應兩句原話；細部契約見下 |
| B | 維持三欄，僅強化右欄 sticky | 不符「移到最上方」原話 |
| C | A 但產出鈕在主內容區頂部 | 位置已拍板頂帶右端（2026-07-17） |

**推薦 A，產出鈕位置已拍板＝sticky 頂帶右端（2026-07-17）**。以下為
Rev 2 依審議補實的版面契約：

**A-1 頂帶高度預算與收斂形最低規格**：頂帶 `max-height` 預算
**≤40dvh**（桌面與行動一致），內部（終端框）縱向捲動；底色／情境
控件收斂為單列緊湊形（radio 收斂成兩顆 segmented control 或等效緊湊
控件，最低規格＝單列高度內放得下「底色×2＋情境×4＋產出鈕」，細部
視覺實作時定，可出兩版截圖請使用者挑）。驗收硬條件（T4.4 spike 實測
修訂，2026-07-17）：390×844 視窗、3 列 powerline 預覽下，頂帶不超過
40dvh（實測 31.5%）且**頂帶正下方立即可見「已選擇」欄起始（列群組
標題＋首段控件）**——原措辭「至少一個完整列群組可見」經實測結構性
不可達（單段編輯列 428–520px、雙段列群組 983px，任何視窗高度皆無法
容納完整列群組），據數據放寬；配套修法＝<1100px 單欄時以 CSS order
將已選擇欄視覺提前於目錄欄（消除首列群組被 2460px 目錄欄推至
y≈3374px 的斷層）。（入真機 checklist）。

**A-2 dialog 形態定案**：dialog 內三份產物採**stacked 三區塊**（沿用
現有 output-block 結構，各含標題＋複製＋下載＋`<pre>` 檢視），**不做
分頁**——tab 元件（role=tablist／roving tabindex／方向鍵）非 `<dialog>`
原生能力，自製成本與 a11y 面不成比例，且 stacked 保留 bash/ps1 並列
對照可視性，仍滿足使用者「收斂為單一按鈕」原話。採 `showModal()`
（模態）：**明記取捨**——dialog 開啟期間頁面 inert、無法邊改 config
邊看產出碼；接受理由＝「改 config→看效果」的主迭代對象是預覽（恆在
頂帶），產出碼屬設定完成後的終端步驟。焦點管理：開啟聚焦 dialog 內
第一個可聚焦元素、關閉**顯式**還原焦點至「產出腳本」鈕（不依賴瀏覽器
自動還原，見 spike）。Esc／backdrop 關閉沿原生。**相容 fallback 定案
（T4.4 spike，2026-07-17）**：`typeof showModal` feature-detect（非
showModal 路徑＝非模態＋顯式關閉鈕）已覆蓋 Firefox <98／Safari <15.4
的「不炸、可操作」底線；另補一行防禦 CSS
`dialog.output-dialog:not([open]){display:none}`（零 `<dialog>` 實作的
舊瀏覽器無 UA 隱藏規則，防內容常駐可見）。Edge 真機實測五項全過（含
原生 Esc cancel→close→焦點還原鏈）。

**A-3 live region 與 skip-nav（SPEC 不變量修訂）**：
- `#output-status`（index.html:485，複製／下載播報）**不隨 output 區
  入 dialog**——關閉的 dialog 為 display:none，違反 SPEC.md:102「live
  region 須常駐 a11y tree」不變量。該 live region 移至 main 常駐位置
  （dialog 外），dialog 內操作照常經 `announceOutput` 播出。
- skip-nav 同步改造：「跳至產出腳本」（index.html:229 `#output-section`
  錨點）改為**聚焦「產出腳本」鈕**；「跳至預覽」改指頂帶。兩者入
  jsdom dom.test。
- 「兩個捲動停點」契約（index.html:387-389/458-459 註解：aside
  role=region tabindex=0＋#preview-terminal tabindex=0）：頂帶**接手**
  aside 的 role=region／tabindex=0 捲動停點角色，總數維持兩個（頂帶＋
  終端框），不新增不遺失。
- `#settings-path` input（index.html:179-188）**留在左側 config 區**
  不入 dialog（dialog 開啟時 `refreshOutputs` 已重算，功能無礙）。
- 頂帶 z-index 介於一般內容與 skip-link（style.css:146 `z-index:10`）
  之間，`.skip-link:focus` 仍浮於頂帶之上。

**落點**：`index.html:393-522`（#preview-section／#output-section 搬移
重組）、`style.css:1188-1263`（grid-template-areas 三斷點重排＋頂帶
sticky）、`wireOutputActions`／`refreshOutputs`／`updateDownload`
（`main.ts:1862-1898,2185-2198`）接線改掛 dialog。`.ps1` 下載帶 BOM
（`main.ts:116,1892`）原樣保留。頂帶預覽區附常駐 mock 時鐘說明一句
（見 G4）。

### D5 i18n 機制

| 選項 | 內容 | 評估 |
|---|---|---|
| **A（推薦）** | 自製零依賴字串表，**雙層架構**（見下） | 符合零 runtime 依賴體制；字串抽離是 main.ts 單體債第一鏟 |
| B | 引入 i18n 函式庫 | 違反零依賴體制，否決 |
| C | 雙份靜態頁（`en/` 子路徑） | 動態文案仍需字串表＝兩套機制並存，否決 |

**推薦 A**。以下為 Rev 2 依審議補實的機制契約：

**A-1 雙層架構（C3／純模組依賴方向修訂）**：
- `messages.ts`（**純核心**）：零 DOM、零 localStorage——typed message
  key、兩語言字典、`t(locale, key, params)`；插值訊息用函式（如
  `moveAnnounce(n,m,k)`）。**兩語言字典 implement 同一 `Messages` TS
  介面**（函式訊息簽章共用），使 `npm run typecheck` 承擔插值 arity／
  placeholder parity，key 集合相等的 meta 案專守存在性。
- `i18n-dom.ts`（DOM-facing）：`data-i18n`／`data-i18n-attr` 套用器、
  localStorage `eztools-statusline-builder-lang`（循 06a
  `eztools-<scope>-<name>` 慣例；既有 config key 冒號式為
  grandfathered，兩者並存屬 SPEC 允許）、`<html lang>` 同步、切換鈕。
- **純函式模組經 locale／t 注入取得文案**（不 import i18n-dom）：抽離
  清單明列 `row-groups.ts`（formatMoveAnnouncement）、`row-select.ts`
  （:68-73「第 N 列（新列）」選項文字，round 1 前漏列）、`resolve.ts`
  （:429「重置」代換＋:435 headAria 管線——`ResolveInput` 增 locale／
  注入 t，`toAriaLabel` 同步）、`segments.ts`（30 段 `label`＋30 段
  `icon.ariaText` 改 message key 或由 messages 字典以 segment id 查表；
  `segments.ts:248`「中文，不受本次變更影響」註解同步修正）。四模組
  維持「node 可測、零 DOM import」不變量。

**A-2 資料層文案裁決（C3）**：segment `label`／`icon.ariaText`／預覽
aria 的「重置」**全部納入 en**——G5「aria-label 翻轉」驗收以此為準。
en 翻譯由協調者起草、真機 checklist 設「en 介面抽查」區由使用者把關
語意品質（「Tokens 輸入」「7 日限額重置倒數」等領域詞彙）。

**A-3 template clone 時序**：7 個 `<template>`（index.html:566-963）
內文案不在主文件樹，啟動期套用器掃不到。定案：**每個 clone 點
（buildSegmentRow／createColorPicker／buildThresholdEditor／列群組
建構等）clone 後即對子樹套用翻譯**；閾值 6 模板名趁抽離收斂為單一
message key（消除 index.html:948-956 與 main.ts:137-144 雙寫），
`<option>` 文字由 t() 填入。情境名的渲染權威來源＝靜態 HTML radio
label（mock-data.ts `label` 為非渲染副本，加註不列入 i18n 面）。

**A-4 語言切換重繪策略**：切換時依序——(1) 套用器重跑主文件樹
`[data-i18n]`；(2) **rebuild 中欄 segment rows**（重跑一次性 aria/
label 賦值最可靠的路徑）＋刷新 row-select 選項——切換由語言鈕觸發、
焦點在鈕上不在段列，rebuild **不涉段列焦點保全**（round 2 釘死，
免誤讀）；(3) 強制 preview 重 resolve 一次（刷新逐列 aria-label）；
(4) `<html lang>` 翻轉；(5) 以**切換後語言**播報新語言名稱
（2026-07-17 拍板），承載節點＝既有常駐 `#global-live-status`
（`announceGlobal`，全域設定類播報歸它，round 2 指定）。
`ResolveInput.locale` 標**選填、預設 zh-Hant**——M1 golden PoC 與既有
resolve 呼叫點不因 M5 導入而破裂。

**量級**：五類合計 ~210–310 條——靜態 ~50–60、常數表 ~17、動態組句
~50–80、aria 兩態、**資料層段目錄（label 30＋ariaText 30）**。插值
樣板須改參數化訊息函式，非純鍵值搬移。**排程放最後一個 milestone**
（M1–M4 會改文案，先做會雙寫）。

### 執行順序（milestone 雛形，/magi:tasks 再細切）

M1 逐列分隔符（schema＋reindex 平行陣列＋三後端＋列群組 UI＋golden
新 fixture）→ M2 預設值標示 → M3 拖移入列（enable-into-target 原子
路徑＋來源感知清理＋播報＋**data-testid 上錨**）→ M4 版面重構（sticky
頂帶＋dialog＋live region／skip-nav 改造）→ M5 i18n（雙層架構＋抽離
四純模組＋en 翻譯＋切換）→ M6 收尾（e2e 新案＋真機驗收 checklist）。

排序理由（Rev 2 修正）：M1 先行因它唯一動 config schema 與三後端契約，
golden 越早定形越穩。**data-testid 上錨併 M3**（拖入本就改
segment-row DOM；動到哪個節點就在該 milestone 補錨，避免「結構
selector 已壞、錨點未上」空窗）——e2e 既有 5 案全在中欄，真正逼改
selector 的是 M3（DOM 改動）與 M5（heading 文字），**非 M4**（只搬
preview/output，不碰中欄）；M4 對測試的實際衝擊是整頁 boot 的 jsdom
案若斷言舊 output 版面需同步改。M5 壓軸吃下前四個 milestone 的最終
文案。spike 排程：D1 reindex 組合矩陣 spike 於 M1 定 schema 時先跑
（早於 golden 定形）；defer-commit 契約 spike 於 M3 開工首日。

## Open questions

（round 1 前五題已於 2026-07-17 由使用者拍板；Rev 2 依審議新增的
實作層決策由協調者依審議建議定案，均已寫入正文——**無殘留 open
question**）

使用者拍板（2026-07-17）：
1. 逐列覆寫**跟列走**（splice 語意）→ D1 A-3。
2. 產出鈕置 sticky 頂帶右端 → D4。
3. 切換語言後以「切換後」語言播報；不做真機 SR 實聽 → D5 A-4、
   Verification。
4. e2e 穩定錨點立 `data-testid` 慣例（授權協調者定）→ Spec deltas、
   Verification；Rev 2 補：上錨時機併 M3、序數斷言走 `data-row-index`。
5. 預覽 mock 時鐘說明納入 G4 → G4／D4。

協調者定案（Rev 2，依 round 1 審議建議）：
6. `rowSeparators` 索引綁**啟用列位**、resolve 做存活列→啟用位映射
   （C2）→ D1 A-1。
7. 拖入採 **defer-commit 原子路徑**（C1）→ D3 A-1。
8. 預覽 aria 管線走 **locale／t 注入**，資料層文案（label／ariaText／
   「重置」）**納入 en**（C3）→ D5 A-1／A-2。
9. dialog 採 **stacked 三區塊（不做分頁）＋showModal（明記 inert
   取捨）**；`#output-status` 常駐 dialog 外 → D4 A-2／A-3。
10. golden 改「**既有凍結＋新增帶覆寫 fixture**」策略 → D1。
11. 落列播報一律採**視覺顯示編號** → D3 A-3。

## Spec deltas

### root `SPEC.md`
- **Section: Components（statusline-builder 段）** — modify
  Why: 版面拓撲、逐列分隔符、拖移入列、i18n 皆為該工具的架構級能力
  變更；現文「三欄滿版版面（…右＝即時預覽＋產出腳本 sticky）、斷點
  3→2→1 欄退化」（SPEC.md:54-57）交付後即不實。
  New content: **改寫版面拓撲子句**——刪除／取代「右＝即時預覽＋產出
  腳本 sticky」「斷點 3→2→1 欄退化」，換為「全寬 sticky 預覽頂帶
  （≤40dvh、內部捲動）＋左目錄＋中已選雙欄；產出以單一按鈕開
  `<dialog>`（stacked 三產物）收斂」；並補「逐列分隔符覆寫（v2 選填欄
  `rowSeparators`，缺項退全域，索引綁啟用列位）、目錄拖移入列
  （checkbox 鍵盤等效保留）、zh-Hant／en 雙語字串表（純核心／DOM
  套用器雙層）」。
- **Section: Conventions** — modify
  Why: 新立 e2e 穩定錨點慣例（2026-07-17 拍板；Rev 2 擴充文字斷言
  禁令）。
  New content: 補一條「互動工具關鍵節點以 `data-testid` 提供 e2e 穩定
  錨點，e2e selector 一律走錨點、不依賴 DOM 結構路徑；**斷言亦不得
  依賴 i18n 可見文字，位置／序數類斷言走 `data-*` 序數屬性（如
  `data-row-index`）**」。
- **Section: Status** — modify
  Why: sprint 09 交付摘要照慣例落 Status 段。
  New content: 新增 sprint 09 交付段落（交付時由 /magi:commit 落地）。

### root `CLAUDE.md`
(none)

### magi/`PRD.md`
- **Section: Goals（statusline 產生器 bullet）** — modify
  Why: 產品能力新增（Rev 2 收斂為產品層語彙，版面／單鈕細節由 SPEC
  Components 承載）。
  New content: 該 bullet 補「逐列分隔符覆寫、拖移編排、雙語介面
  （zh-Hant／en）」。

### magi/`TECHSTACK.md`
- **Section: Framework / runtime（statusline-builder bullet）** — modify
  Why: i18n 採零依賴自製字串表，屬技術棧層級的作法宣告（維持零 runtime
  npm 依賴不變量）。
  New content: 該 bullet 補「i18n 為自製零依賴字串表（zh-Hant／en，
  純核心 messages＋DOM 套用器雙層，純函式模組以 locale 注入）」。

## Verification

**結構性前提（Rev 2 明列）**：CI（test.yml）只跑 typecheck＋vitest；
`npm run test:e2e`（CDP）為**CI 外人工 gate**、本機限定。故 M3／M4 的
可迴歸斷言須優先下推到 vitest／jsdom 層，e2e 保留為原生行為（真拖曳、
native dialog）的本機終驗，並列為交付前置。

- **單元／golden（`npm test` 全綠）**：
  - 測試計數不變量（Rev 2 取代「1454 只增不減」）：**per-CI-leg
    pass/skip 狀態無迴歸**（ubuntu bash leg、windows bash+ps1 leg 各自
    基準；1454 僅本機三後端滿載參考值）＋任何既有案的改寫／刪除須在
    commit 訊息列明理由、對應能力不得失去測試。
  - config：`sanitizeRowSeparator`（壞形退 null、非陣列退化、長度
    clamp、尾端 null 修剪、全 null 省略）；v2 舊存檔（無此欄）讀取
    存活；reindex 三型正反案**明列**——刪中間列（上方留、下方降位）、
    空列壓縮（該列覆寫消滅）、移列 swap（覆寫跟列走）＋pending 物化
    插入案；`normalizeRows` 對位案。
  - reindex 組合矩陣 spike 案（比照 row-slots.test.ts 風格）：隨機
    操作序列後斷言「非 null 覆寫恆黏使用者指派的視覺列」。
  - resolve：啟用位映射（含「整列執行期死亡＋後列覆寫」案）；缺項退
    全域；powerline 忽略 rowSeparators。
  - emit-bash／emit-ps1：逐列 SEP 正反案；**既有 golden 全數 byte
    凍結**（含 powerline 8 檔零 diff 硬斷言）＋新增帶覆寫 fixture
    （見 D1 golden 策略）＋整列死亡端到端案。
  - i18n：兩字典 implement 同一 `Messages` 介面（typecheck 罩 arity）
    ＋key 集合 meta 案；四純模組注入後 node 測試全綠。
- **jsdom dom.test（新增）**：預設值標示渲染與「值＝預設」判定；
  **enable-into-target seam 直測**（「enable at row N pos M」核心邏輯
  抽為不依賴 drag event 的函式——空清單／中間 pending／真實列三情境；
  drag 事件本身歸 e2e）；defer-commit 模式「不 commit、不播報、不
  focus」斷言＋既有單獨勾選路徑行為零變；checkbox 啟用落列播報文案；
  語言切換三面向翻轉（`<html lang>`／可見文字／aria-label，含 clone
  實例與 rebuild 後的段列）；dialog **手動**焦點邏輯（開→聚焦 dialog
  內首元素、關→還原產出鈕；native focus trap／Esc 歸 e2e——jsdom 不
  實作）；skip-nav 新語意；live region 常駐位置。
- **`npm run typecheck`、`npm run build && npm run verify:dist`** 全綠。
- **CDP e2e（`npm run test:e2e`，本機人工 gate）**：既有 5 案改走
  `data-testid` 錨點（M3 併行上錨）＋序數斷言改 `data-row-index`
  （去除「第 N 列」i18n 文字比對）＋快照擴充納入**每列 separator
  覆寫狀態**；新增「目錄拖入指定列」「產出 dialog 開→複製→Esc 關→
  焦點還原」至少 2 案。
- **真機驗收 checklist**（比照 08 T5.4-CHECKLIST 另立文件）：五子項
  各一區＋窄視窗（390×844）「頂帶 ≤40dvh 且下方至少一完整列群組
  可見」目視＋en 介面抽查區（翻譯品質把關）＋「本機 e2e 全綠」為交付
  前置。不列 SR 實聽項（使用者拍板不做真機 SR 驗收；播報正確性由
  jsdom 案自動化覆蓋）。

## Spike plan（依 round 1 審議，排程見執行順序）

1. **M1 開工首日**：reindex 複合列操作組合矩陣（property-based 風格）
   ——早於 golden 定形。
2. **M1**：bash 無覆寫 byte-preserving（sha1 比對現有 multirow golden）
   ＋「整列死亡」resolve/emit 對位 PoC（真執行 stdout vs
   `toAnsi(resolve())`）。
3. **M3 開工首日**：defer-commit 改造不破既有啟停契約（跑既有
   dom.test＋新增 defer 斷言）；enable-into-target 三情境 PoC。
4. **M4**：sticky 頂帶 mobile 高度預算實量（375×667／390×844）；
   `<dialog>` showModal 焦點還原／Esc 相容矩陣（Chromium／Firefox／
   WebKit，含 feature-detect fallback 決策——iOS Safari <15.4 無
   showModal）。
5. **M5 開工首日**：messages.ts 純核心拆分 PoC（四純模組改注入後
   node 測試全綠）；template clone 翻譯時序 jsdom 案。
