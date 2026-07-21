# Statusline Builder UX 第二輪真機回饋批——版面重排、move 鈕收斂、dialog 加大、mode 焦點修正、目錄樣例值、拖曳教學

> Type: feat  •  Scale: major  •  Created: 2026-07-19  •  Rev 4（2026-07-20，
> 併入 round-2 MAGI 5 票審議全部採納項＋使用者二項追裁；Rev 3 同日
> 併 round-1 全部採納項＋四項重裁）
> Source: 使用者真機使用回饋六項（第一輪＝sprint 09）

## Context

使用者實際使用 statusline-builder 後的第二輪回饋，六項全屬 UX／版面
層（引擎、emit、config 契約零觸碰）。其中兩項有既有病史對應：#4 的
「點 mode 跳走」實錘為 `handleModeChange` 尾端 `segmentListsEl.focus()`
（main.ts:2734-2735；該函式**確有** `announceGlobal` 播報，round-1
協調者實證——D4 前提成立）；#1 的 move 鈕在程式註解明載為**鍵盤等效**
路徑（main.ts:1435），拿掉有 a11y 回退風險，需設計取捨。

**現行版面基線（HEAD 實況，round-1 實證修正）**：預覽為 `<main>`
**之前的全寬 sticky 頂帶**（`.preview-section`，max-height 40dvh、
role=region＋tabindex=0 捲動停點、產出鈕在頂帶右端），`<main>` 內為
**雙欄** grid（左＝目錄＋全域設定｜右＝已選擇清單）；09 T4.1 起原三欄
`.builder-columns__aside` 已退役。本批版面工作＝**頂帶降級搬入中欄**
（使用者裁決，2026-07-20），非「sticky 沿用」——skip-nav 落點、
region 捲動停點契約、preview-band／skip-nav 測試面全數牽動。

## Goals & Non-Goals

### Goals
1. **#1 move 鈕收斂**：滑鼠使用者介面不再顯示上/下移鈕（拖曳已足），
   但**保留鍵盤排序路徑**——機制＝`.row:has(:focus-visible)` 整列
   浮現（見 D1，2026-07-20 重裁）。
2. **#2＋#5 版面重排**：三欄——左＝全域設定；中＝**預覽＋產出鈕**
   （頂帶降級入欄、欄內 sticky）；右＝**目錄 compact 列＋已選擇清單
   同居**（單一捲動容器：教學帶→目錄→已選擇，2026-07-20 追裁）；
   目錄列改 compact 形「☐ 段名＋樣例值＋已加入態」（例：
   `☐ 模型 Fable 5`／`☑ 模型 已加入`）；行動版摺疊序 DOM 真搬——
   **micro-fix-3 就此收斂**（09 遞延清單對應子項本批勾銷，防行動版
   工程遞延時靜默失聯）。
3. **#3 產出 dialog 加大**：`width: min(90vw, max(640px, 55vw), 72rem)`
   ＋`max-height: min(85dvh, 60rem)`（72rem 上限為 2026-07-20 追裁，
   僅約束超寬幕；一般桌面行為與原裁決同）。
4. **#4 mode 切換不跳走**：刪 `segmentListsEl.focus()` 兩行；SR 播報
   由既有 `announceGlobal` 承擔（已實證存在）。
5. **#6 拖曳教學**：segment 欄頂帶簡易教學——一句說明＋純 CSS/SVG
   拖曳動畫示意（可關閉、localStorage 記憶）。

### Non-Goals
- 不動三後端 emit／resolve／oracle／黃金檔（產出腳本 byte 不變；
  黃金檔零 diff＝**emit 契約護欄**——config 資料形不變與 DOM 行為
  回歸由測試網另行覆蓋，黃金檔不背書後兩者）。
- 不動 config 資料形（`row`／欄位皆原樣；純 render 層）。
- 不改 09 真機驗收批的歸檔文件（BACKLOG 對帳動作見 Recommended
  approach 步驟 6）。
- 不引入外部資源（教學動畫用 inline CSS/SVG，維持零請求不變量）。

## Design options considered

### D1. move 鈕收斂形式（#1，a11y 張力核心）——已重裁
- **A 全移除**：鍵盤／SR 使用者失去列內排序唯一路徑——不採。
- **B′ 整列浮現（S3 實測定型，2026-07-20 回填）：JS 模態旗標＋
  `.row--reveal` class**：預設 move 鈕群視覺收納，鍵盤導航進列時
  整列鈕群成對浮現、滑鼠／指標互動不浮現。機制＝document 層
  keydown（導航鍵）→旗標=鍵盤、mousedown/pointerdown→旗標=滑鼠，
  focusin 依旗標對列切 `.row--reveal`。原純 CSS
  `:has(:focus-visible)` 經 S3 於 Edge/Chrome 150 實測有**兩處滑鼠
  模態破口**而棄用：(1) select 滑鼠點擊即 `:focus-visible` 浮現；
  (2) 列內 **prefix 文字輸入**（index.html:881）任何 focus 皆浮現
  ——round-2「無文字輸入」盤點有誤（實為 button×3／select×2／
  checkbox×2／text×1，協調者已複核更正）。JS 旗標對「move 重渲染
  ＋程式化還焦」天然免疫（S3 (d) 實測浮現延續）、jsdom classList
  全數可證（S4）。SR 使用者 aria-label 原樣可達。收納態**不可
  命中**（round-2 裁定、S1/S3 實測通過）：`opacity: 0 +
  pointer-events: none`——佔位零躍動、留 Tab 序（Tab 直達鈕本身
  即浮現）；`visibility: hidden` 經實測確認**不需**。「點擊收納鈕
  原位置無效果」與「浮現態於右欄捲動容器內不被裁切」皆 S1 實測
  通過。
- **C 收進 kebab 選單**：對鍵盤族多一步——不採。
- 行動版備忘：iOS tap 不落焦點、觸控 DnD 體感差，move 鈕是觸控實質
  排序路徑——第三輪真機驗收加 touch 排序檢核；若不可達，後備＝
  行動斷點 move 鈕恆顯 media query 例外（本批先不做，待真機證據）。

既有 move 鈕 dom 測試：**行為斷言保留**（moveSegment 語意不變）；
選擇器與視覺態斷言隨改，另補「預設收納、focus-visible 浮現」class
斷言＋一條**常駐**「滑鼠點擊列內控件不加 reveal class」回歸案
（round-1 🔴2 的行為守衛不只靠一次性 Spike；S4 已定層：JS 旗標路徑
classList 全數 dom 可證，**常駐案落 dom 層**）。斷言分層見 Spike
結論回填。

### D2. 版面重排（#2＋#5 連動）——基線已修正、欄位歸屬已全裁決
現行＝頂帶＋雙欄（見 Context）。**裁決（2026-07-20）：頂帶降級入
中欄**，照回饋 #5「中後段可以放預覽」做滿三欄終形：

- **左欄**＝全域設定（模式／分隔符／路徑等，自現雙欄左側抽出全域
  區塊）。
- **中欄**＝預覽＋產出鈕（自頂帶降級；欄內 `position: sticky; top: 0`
  維持捲動可見）。**頂帶契約遷移**：role=region 隨遷；捲動停點改
  **條件式**（round-2）——外層預覽節點**僅在自身仍為捲動容器時**
  保留 tabindex=0（停點總數 2：預覽節點＋ .preview-terminal），
  否則僅留 role=region、停點降為 1（.preview-terminal 單點）；
  skip-nav 落點改指中欄預覽；40dvh 高度預算改為中欄內預覽終端框的
  max-height 預算（終端框內部捲動不變）。
- **右欄**＝**目錄＋已選擇清單同居**（2026-07-20 追裁）：右欄本身
  為**單一捲動容器**（`position: sticky; top: 0; max-height: 100dvh;
  overflow-y: auto; overscroll-behavior: contain` 防內捲到底連鎖
  捲頁），內容由上而下＝**教學帶→目錄 compact 列→已選擇清單**，
  全數在文件流內——教學帶 dismiss 後高度自然回收（round-1「calc
  預算過期」問題就此消解，無需高度預算式）。同居理由：拖曳短程
  （目錄項→清單列同一容器）、與 S1／e2e 拖曳文本一致；互動模型
  不變（勾選加入＋列控件照舊，非合併元件）。**初載（scrollY=0、
  sticky 未黏住前）欄底超出視窗恰為頁首高度**（round-2 幾何複核
  屬實）：S1 加「初載欄底可達性」檢核；破口後備＝
  `max-height: calc(100dvh − var(--column-top))`（頁首高度靜態，
  變數可行）。
- **行動版（<1100px）**：摺疊序＝設定→預覽→清單（**清單節＝教學
  帶＋目錄＋已選擇**同節搬移；DOM 真搬，Tab/SR 序＝視覺序；
  micro-fix-3 就此收斂）；行動版斷點**不套**右欄 sticky／max-height
  基準規則、天然回歸文件流（防嵌套捲動陷阱）。（2026-07-21 review
  🔴-1 修訂：原「media query 內解除」覆寫機制因層疊源序失效——基準
  規則後出恆勝——改為基準規則以 `@media (min-width: 1100px)` 包裹；
  規約化：基準／解除成對規則須以 media 包裹（或源序：解除在後）保證
  層疊方向，並以源序／歸屬斷言鎖定，禁用「規則存在性」比對。）
- 目錄列 compact 形：未啟用＝`☐ <段名> <樣例值>`（淡化純文字）；
  已啟用＝`☑ <段名> 已加入`（點名展開既有互動不變）。
- 已知風險（Spike S1 統驗）：中欄 sticky×右欄 sticky+內捲的複合
  行為；拖曳目標在內捲容器捲出視野時的邊緣自動捲動（Firefox 歷史
  上不觸發內層容器）——保底方案＝拖曳進行中 JS 捲動補償。

### D2′. 樣例值來源機制（round-1 🟡-4/-5 收斂＋round-2 補強）
- **來源**：`resolve()` 只渲染 enabled 段（實證），既有 preview 鏈
  對未啟用段產不出 run——樣例值採**合成來源**：**逐段以單段-enabled
  的預設 config 呼叫既有 `resolve()`（唯讀呼叫、不改 resolve）**
  × FULL mock scenario，取該段 `toAnsi` 前的純文字；合成 config
  明定 **`mode: 'plain'`**（樣例取純文字、避開 powerline pad／
  arrow 呈現差異）。**per-locale 快取**（模組層 **lazy** 單例、
  語言切換時失效重算）；合成整批以 **try/catch** 包裹——擲錯則
  fallback 至 default-hint、不阻斷 init。快取為模組單例：暴露
  **test-only reset hook**，相關 dom 案 beforeEach 呼叫（測試
  隔離；或明文「樣例斷言前強制觸發 locale 重算」擇一，S4 定層時
  一併定）。
- **精度**：樣例反映**段預設形**、非使用者現行設定（目錄是選單不
  是預覽——沿裁決 4 精神；附帶效益：使用者 prefix 等自訂文字不入
  目錄，注入面歸零於源頭）。
- **fallback**：resolve 為空的段顯示該段 default-hint descriptor
  文案（locale 相依、走 i18n）；shell-out／value-dead 段同此路。
  30 段逐段形檢由 **Spike S2** 先行 dump 確認單一 compact 版式可
  容納（長度／控制碼殘留／emoji 寬度）。
- **DOM 落點**：樣例值一律 `textContent` 寫入，**禁走
  `instantiateTemplate` token／innerHTML 通道**（該通道為 innerHTML
  替換機制，main.ts:589——防範日後樣例來源變更時的注入面）；dom
  案補一條含 `<`／`&` 文字的注入回歸斷言。
- **i18n 接線**：樣例值中 locale 相依成分（hint fallback／「已加入」
  態）為**動態產生文字**，不在 sprint 13 巡檢器可視範圍（已知盲
  區）——語言切換事件觸發目錄列重渲染（重建快取），並補 dom 案
  「切語言後目錄 hint／已加入文字連動」。

### D3. dialog 尺寸（#3）——含追裁
`width: min(90vw, max(640px, 55vw), 72rem)`＋`max-height:
min(85dvh, 60rem)`。72rem 上限僅約束超寬幕（3440px 下由 1892px 收
斂至 1152px），一般桌面（≤2094px）行為與 55vw 裁決完全相同；行動版
90vw 主導不變。dvh vs svh：行動版工具列收合時 dvh 動態改變、dialog
高度可能微跳——接受此 tradeoff（與既有頂帶 40dvh 精度一致），不改
svh。

### D4. mode 切換焦點（#4）
**A 移除 focus 移轉（維持）**：刪 `segmentListsEl.setAttribute(
'tabindex','-1')`＋`.focus()` 兩行；SR 回饋由 `handleModeChange` 既
有 `announceGlobal` 承擔（round-1 協調者實證：該呼叫存在且訊息含
模式名＋連帶停用清單）。radio 保持焦點（瀏覽器預設），零跳動。
驗證斷言分層（round-1 🟡-11＋round-2 補正向）：jsdom 的 scroll 為
no-op、「無 scroll 呼叫」空洞——有效斷言＝(a) dom 層**正向**
`expect(document.activeElement).toBe(radioEl)`＋具名 spy
`vi.spyOn(segmentListsEl, 'focus')` 不被呼叫＋live-region 播報訊息
斷言；(b) e2e 層切 mode 前後 `window.scrollY` 不變（activeElement
同斷言選配）。

### D5. 拖曳教學（#6）——狀態機單一謂詞定稿
- **A 純 CSS/SVG 動畫示意（維持）**：segment 欄頂帶一列：抓取圖示
  ＋一句「拖曳段名可排序與移列」＋迷你動畫（SVG 方塊沿虛線位移
  keyframes loop，`prefers-reduced-motion` 停格）；SVG 為靜態簽入
  inline、**裝飾性**：`aria-hidden="true"`＋`focusable="false"`，
  語意由文案句承載；配色走 **`currentColor`／既有主題 CSS 變數**
  （深淺主題跟隨，入 S1 檢核）。「知道了」鈕 dismiss。
- **狀態機（round-2 單一謂詞定稿，取代 Rev 3 雙句）**：
  **顯示 ⟺ 讀值 ≠ `'1'`**（key 缺失、讀取失敗、怪值皆顯示，
  fail-open）；dismiss 寫入 `'1'` 後永久隱藏。無其他觸發條件、無
  第二判準句。
- **localStorage 體制（round-1 🟡-6）**：key＝
  `eztools-statusline-builder-drag-tutorial`（循 SPEC key 慣例
  `eztools-<scope>-<name>`，與既有 `eztools-theme`／
  `eztools-statusline-builder-lang`／config key 無碰撞）；sentinel
  **定死 `'1'`**、隨 key 一併寫入 SPEC delta；**e2e seed 步驟引用
  同一常數**（防測試網與實作漂移）；讀寫皆 try/catch best-effort
  （比照 `persist()` 成文慣例）；不入 BuilderConfig。

## Recommended approach

實作面（全在 `tools/statusline-builder/`；root `src/` 不動——教學帶
用既有主題 CSS 變數，入口頁 inline theme script 零觸碰）：

1. **Spike 先行**（半天級，見 Spikes 節）：S1 複合版面 PoC＋S2 樣例
   值 dump＋S3 `:has(:focus-visible)` 控件矩陣——三者結論回填本檔
   後才動工（S4/S5 可與實作併行）。
2. **index.html＋style.css**：三欄 grid（D2 終形）；頂帶降級入中欄
   （skip-nav 落點、region／條件式停點隨遷）；右欄同居結構（教學帶
   →目錄→已選擇，單一捲動容器）；行動版 DOM 真搬＋高度解除；
   dialog 尺寸（D3）；move 鈕收納＋`:has(:focus-visible)` 浮現
   （D1-B′，收納態 opacity+pointer-events）；教學帶結構（D5）。
3. **main.ts**：`handleModeChange` 刪 focus 兩行（D4）；樣例值合成
   來源（逐段單段-enabled resolve）＋per-locale 快取（含 test-only
   reset hook）＋目錄列 compact 渲染（D2′，textContent 落點）；教學
   dismiss 接線（D5 狀態機、sentinel 常數）。
   **本步完成後立即跑一次黃金檔零 diff**（早偵測 resolve 鏈耦合），
   不等收尾終驗。
4. **messages.ts＋i18n**：教學文案、樣例 hint fallback、「已加入」
   態、aria 描述——雙語齊備＋掛標；動態產生文字另設語言切換重渲染
   接線（D2′）。
5. **測試網連動**（本批最大工作量）：版面選擇器更新（preview-band
   ／skip-nav 案隨頂帶遷移改寫）；move 鈕行為案保留＋視覺態 class
   斷言＋常駐滑鼠不浮現回歸案；mode 焦點案（D4 斷言分層，含正向
   activeElement）；目錄 compact 形＋注入回歸＋語言連動案（樣例
   快取 beforeEach 重置）；教學 dismiss／記憶／localStorage 拋錯／
   怪值案（單一謂詞斷言；beforeEach 清 key 隔離）；reduced-motion
   停格版面穩定性案；e2e 8 案選擇器與座標校準——**「dismiss 教學
   帶（或 seed key＝同一 sentinel 常數）」列為全案明文前置步驟**＋
   「教學帶不擋拖曳」**無條件**回歸案。
6. **簿記收口**：BACKLOG 兩動作——「09 真機驗收批」條目內
   micro-fix-3 子項勾銷註記＋該條目過時面註記（版面重排使 A/C/F 區
   部分項目失效）；均於本批 commit 前完成。
7. **黃金檔零 diff 終驗**（emit 契約護欄；步驟 3 已先跑一次）。

## Open questions（已全數裁決）

第一輪（2026-07-19 拍板）：
1. ~~D1-B 浮現機制＝整列 focus-within~~（**已被 round-1 審議推翻，
   見追裁 1'**）。
2. **D3 尺寸**＝`min(90vw, max(640px, 55vw))`＋`max-height:
   min(85dvh, 60rem)`（vh→dvh 一併修正）。
3. **行動版摺疊序**＝設定→預覽→清單＋micro-fix-3 本批做掉（DOM
   真搬）。
4. **樣例值精度**＝純文字淡化（目錄是選單不是預覽）。
5. **教學帶時機**＝dismiss 前顯示＋localStorage 記憶（獨立 key）。

第二輪追裁（2026-07-20 拍板，依 round-1 MAGI 審議）：
1'. **D1 機制改 `.row:has(:focus-visible)`**（focus-within 對滑鼠
    點擊同樣成立、牴觸回饋 #1——經協調者實證後重裁）。
2'. **D2 頂帶降級入中欄**（現行基線＝頂帶＋雙欄；照回饋 #5 做滿
    三欄終形）。
3'. **D3 追加 72rem 寬上限**（僅約束超寬幕）。
4'. **流程**＝Rev 3 修訂後跑第二輪 review。

第三批追裁（2026-07-20 拍板，依 round-2 MAGI 審議）：
1''. **目錄歸右欄、與已選擇清單同居**（單一捲動容器：教學帶→目錄
     compact 列→已選擇清單）。
2''. **流程**＝Rev 4 直接進 `/magi:tasks`，**不跑第三輪 review**
     （round-2 無架構級發現、全屬文件級修訂，遞減報酬）。

## Spikes（實作前驗證，round-1/2 審議合併）

- **S1 複合版面 PoC**：三欄終形靜態原型（真 30 段假資料＋可 dismiss
  教學帶＋目錄同居右欄）——驗中欄 sticky×右欄 sticky 單捲動容器
  複合行為、內捲不連鎖（overscroll-behavior）、dismiss 後清單自動
  長高、**初載（scrollY=0）右欄底端可達性**（破口→
  `calc(100dvh − var(--column-top))` 後備）、move 鈕浮現在捲動容器
  內不被裁切、**點擊收納鈕原位置無效果**、SVG 教學動畫深淺主題跟隨
  （currentColor／CSS 變數）、**Chromium/Firefox 各驗一次「拖目錄
  項到欄底捲出視野的列」**（邊緣自動捲動；Firefox 破口則定 JS 捲動
  補償）。**時箱拆分**：跨瀏覽器拖曳子項允許溢出半天預算、不阻塞
  S2/S3。
- **S2 樣例值 dump**：逐段以單段-enabled 預設 config × FULL mock 跑
  resolve（同 D2′ 正式機制），dump 30 段 toAnsi 前文字，逐段檢空值
  ／長度／shell-out／控制碼殘留／emoji 寬度，確認 compact 版式可
  容納＋定 fallback 面。
- **S3 `:has(:focus-visible)` 跨瀏覽器——按控件類別矩陣**：對
  button／checkbox／select 逐類實測（Chromium/Firefox/Edge），
  四斷言：滑鼠點不浮現／Tab 進列浮現／浮現零躍動／**鍵盤 move
  （重渲染＋程式化還焦）後浮現態延續**；外加「點擊收納鈕原位置
  無效果」。select 滑鼠模態為已知變異點——矩陣結果決定是否全面
  啟用 JS keydown/mousedown 模態旗標後備（旗標式對 move 還焦天然
  免疫、jsdom 可測，為選型加分項）。
- **S4 jsdom reveal 可斷言性**：確認 dom 層對 D1-B′ 能證到哪
  （class／attribute 斷言；能否辨滑鼠模態——決定常駐「滑鼠不浮
  現」回歸案落 dom 或 e2e），剩餘由 e2e 扛——測試分層先定再動工。
- **S5 行動版 DOM 真搬原型**：斷點欄序 reorder＋Tab 序走查（清單節
  ＝教學帶＋目錄＋已選擇整節搬移），先定佈局方案再動測試選擇器
  （防選擇器重寫兩次）。

### Spike 結論回填（2026-07-20，M1 完成；證據見 spikes/S*-RESULT.md）

- **S1**：七項檢核 6 通過；「初載欄底可達性」**破口實錘**（1400×1000
  下欄底超出 292px≈頁首高）→ **啟用既定後備 `max-height:
  calc(100dvh − var(--column-top))`**，`--column-top` 由 JS 於 load
  後依實際頁首高一次性寫入 CSS 變數（非寫死常數；PoC 殘 24px 來自
  padding-bottom，可併入預算或接受）。教學帶 dismiss 高度自然回收
  成立；注意教學帶樣式勿以高於 `[hidden]` 的 specificity 覆寫
  display（src/style.css 既有 `[hidden]{display:none!important}`
  防禦）。複合 sticky／內捲不連鎖／浮現不裁切／no-op click／SVG
  currentColor／reduced-motion 停格皆通過。
- **T1.2 拖曳邊緣自動捲動**：Chromium/Edge **原生成立、免 JS 補償**；
  Firefox 本機未裝＝待第三輪真機；JS 補償演算法已於 PoC 獨立驗證
  正確（40px 判定帶＋rAF 12px/tick＋drop/dragend/dragleave 冪等
  停止），真機證實破口時直接套用。
- **S2**：30/30 段樣例非空、單列、零控制碼（7–33 字元，最長
  project-dir）——**compact 版式可容納全部**；FULL mock 下
  fallback 段 0（該情境設計上全段存活，fallback 路徑由單元測試
  另證）。介面：`defaultConfig(catalog)` 帶參（傳
  `SEGMENT_CATALOG`）。注意：`↺`(U+21BA) 字寬未逐字型驗證；長路徑
  段（windows-cjk 情境）建議 compact 列帶 CSS 截斷防溢出。
- **S3**：D1 **選型定案＝JS 模態旗標**（詳 D1-B′ 修訂；破口＝select
  滑鼠即浮現＋列內 prefix 文字輸入）；零躍動／程式化還焦延續／
  no-op click 通過；Edge 與 Chrome 同引擎非異質樣本，Firefox 待
  真機（S3-RESULT 附人工配方）。
- **S4**：jsdom 的 `:focus-visible` 對 select 與真機**反向**（假綠
  陷阱）——純 CSS 方案 dom 不可證；JS 旗標路徑 classList 全數 dom
  可證 →「滑鼠不浮現」常駐案**落 dom 層**。樣例快取隔離定案＝
  **test-only reset hook＋beforeEach**（vitest 實測模組單例跨案
  存活）。e2e 真瀏覽器斷言浮現態宜斷 `pointerEvents` 而非 opacity
  （transition 中繼值陷阱）。
- **S5**：行動版佈局**定案＝原生單一 DOM 序**——index.html 源序
  寫死「設定→預覽→清單」，桌面 plain grid（無 order／無
  grid-area 重映射）、行動僅切 `flex-direction: column`＋解除
  sticky/max-height；**零 JS 搬移**，兩斷點 DOM 序＝視覺序＝Tab 序
  恆等（真 Tab 走查實證），測試選擇器單套通用。micro-fix-3 由源序
  重排滿足（T2.1/T2.2 版面手術即完成真搬，T2.3 僅媒體查詢釋放）。
- 越界觀察（不入本批）：dist 建置頁 1400px viewport 下
  `max-width:1360px` media 覆寫未生效疑似既有問題——留 DRIFT
  對帳。

## Spec deltas

### root `SPEC.md`
- **Section: Components** — modify
  Why: statusline-builder 版面、move 鈕鍵盤策略、dialog 尺寸、教學帶
  與新 localStorage key 皆元件層行為契約，本批全部變更。
  New content: **汰除**頂帶舊契約句（「全寬 sticky 預覽頂帶／
  max-height ≤40dvh 頂帶自身／頂帶右端單一按鈕／雙欄 2→1 欄退化」
  ——SPEC 現 §57-64），改述為**行為契約**（不釘實作選擇器）：三欄
  版面「左設定／中預覽＋產出（欄內 sticky、region 隨遷、終端框內部
  捲動）／右＝教學帶＋目錄 compact 列＋已選擇清單同一捲動容器」；
  目錄列 compact 形（☐ 段名＋預設形樣例值／☑ 已加入）；行動版摺疊
  序 設定→預覽→清單（DOM 序＝視覺序）；move 鈕行為契約＝**預設
  收納、鍵盤導航浮現、滑鼠點擊不浮現**（`.row:has(:focus-visible)`
  ／JS 旗標屬實作層，S3 定案後再落 SPEC）；dialog
  `min(90vw, max(640px, 55vw), 72rem)`×`min(85dvh, 60rem)`；拖曳
  教學帶：**顯示 ⟺ 讀值 ≠ `'1'`（fail-open）**、key＝
  `eztools-statusline-builder-drag-tutorial`、sentinel＝`'1'`
  （比照 lang key 先例列名）。

### root `CLAUDE.md`
(none)——本批不動入口頁 inline theme script、不新增工具、不改建置
／測試指令與工作流規約，CLAUDE.md 零牽動（round-2 A3 建議就地補
本佐證句，比照 PRD 款式）。

### magi/`PRD.md`
(none)——教學帶屬既有「拖移編排」能力的 onboarding 輔助、非新能力；
目錄樣例值屬呈現層；**move 鈕預設收納為可供性（affordance）變更，
排序能力雙路徑（拖曳＋鍵盤）不增不減；三欄重排屬呈現層**——四項均
低於 PRD 能力條目粒度（round-1 A2 質疑、協調者裁決維持 (none)；
round-2 擴寫本句涵蓋兩項頭號變更，以本句為據）。

### magi/`TECHSTACK.md`
- **Section: 前端技術** — modify
  Why: 本批新倚賴 `:has()`／`:focus-visible`／`overscroll-behavior`
  （dvh 既有），TECHSTACK 無瀏覽器基線條目（round-1 實證），順勢
  補齊。
  New content: 補一句目標瀏覽器基線「evergreen（Chrome/Edge/Firefox/
  Safari 近兩年版本）；CSS 基線含 :has()、:focus-visible、dvh、
  overscroll-behavior」。

## Verification

- `npm test` 全綠（含連動更新後的 dom 測試網）＋`npm run typecheck`。
- **黃金檔零 diff ×2**（步驟 3 後＋收尾終驗；emit 契約護欄——config
  形與 DOM 行為由測試網覆蓋，黃金檔不背書後兩者）。
- `npm run test:e2e` 8 案全綠——教學帶 dismiss（或 seed key，與實作
  共用同一 sentinel 常數）為全案前置步驟；「教學帶不擋拖曳」無條件
  回歸案。
- i18n 巡檢（屬性面＋en 重掃）涵蓋**靜態**新文案；**動態**目錄文字
  （樣例 hint／已加入態）不在巡檢器可視範圍——由「切語言後目錄
  文字連動」dom 案補位（beforeEach 經 test-only hook 重置樣例
  快取，防模組單例跨案汙染）。
- D1 常駐回歸：「滑鼠點擊列內控件不加 reveal class」（S4 定層後歸
  dom 或 e2e）。
- D4 斷言分層：dom 正向 `document.activeElement`＋具名 spy＋
  live-region 播報；e2e scrollY 不變。
- localStorage 案：dismiss／記憶／拋錯 fail-open／怪值顯示——全數
  收斂於單一謂詞「顯示 ⟺ 讀值 ≠ `'1'`」斷言；beforeEach 清 key
  隔離。
- reduced-motion 停格版面穩定性案。
- **視覺驗證政策明文**：grid／dvh／sticky 的 layout 正確性 jsdom
  結構性驗不到，接受「第三輪真機驗收」為該面驗證層（Spike S1 PoC
  先擋大形，真機收尾）。
- 真機驗收：本批出貨後**第三輪真機回饋**六項對帳（含 touch 排序
  檢核——iOS/Android 各一）；BACKLOG 對帳動作已入 approach 步驟 6。
