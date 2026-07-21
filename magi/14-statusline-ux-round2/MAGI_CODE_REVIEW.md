# 🧠 MAGI Code Review — DEV @ 2036109（未提交變更集）

**Diff scope:** HEAD 之後全部未提交變更（tracked +1347/−504（12 檔）＋untracked 新檔 9 檔約 1,558 行；產生檔零觸碰）
**Generated:** 2026-07-21

## Dashboard

```
┌──────────────────────────────────────────────────────────┐
│  VERDICT: REQUEST-CHANGES                                │
├──────────────────────────────────────────────────────────┤
│  Mode: majority（角度制）   Threshold: vote_sum > 3.5    │
│  OK weight: 7 / 7           Degraded: no                 │
├──────────────────────────────────────────────────────────┤
│  規模判定：~3,400 行（>800）→ 7 票（角度 1–7 全員）      │
│  ✅#1 正確性(fable)  ✅#2 契約(opus)   ✅#3 測試(sonnet) │
│  ✅#4 回歸(haiku)    ✅#5 安全(fable)  ✅#6 效能(opus)   │
│  ✅#7 架構(sonnet)                                       │
├──────────────────────────────────────────────────────────┤
│  🔴 Critical: 1     🟡 Important: 7                      │
│  🟢 Minority: 10                                         │
└──────────────────────────────────────────────────────────┘
```

- 逐角 verdict：#1 REQUEST-CHANGES／#5 REQUEST-CHANGES／#2 #3 #4 #6 #7 APPROVE-WITH-NITS。
- 揭露：無 gemini/codex 機器，名冊為 claude 四模型輪替（fable×2、opus×2、sonnet×2、haiku×1）——**同 vendor 湊票、無跨 vendor 驗證**。
- 揭露：diff 超過 2,000 行門檻，依 sprint 審查性質不拆分（drift 分類需整包對照契約），以 7 票規模制回應。
- 單票採納項皆依政策 §6「專家單票條款」經**協調者親自實證**（grep／層疊規則判讀／原始碼路徑盤點），逐項標注。

## Verdict
REQUEST-CHANGES——一條經協調者實證的 Critical（行動版右欄解除規則被 CSS 層疊源序整條無效化，PLAN §D2 與本批新 SPEC 句在 <1100px 全數落空），加七條小成本 Important。核心六大回饋項的實作與測試品質獲全員肯定（教學帶狀態機、樣例合成鏈、注入防線、e2e 防恆真設計、單一事實來源紀律皆過檢），修復面窄、修畢即可轉綠。

## 🔴 Critical (adopted)

### 1. 行動版右欄「解除 sticky／max-height」被層疊源序無效化（角度 #5 提出；協調者實證確認）
- **Where:** `tools/statusline-builder/style.css:1481-1486`（media 解除規則）vs `:1569-1575`（無條件基準規則）
- 兩規則同為 `.builder-columns__list` 單類選擇器（0-1-0），media query 不增 specificity；基準 sticky 規則位於**檔尾、media 區塊之後**——<1100px 下兩者皆命中、源序後者勝。行動版右欄恆為 sticky＋max-height＋內捲＋overscroll-contain，PLAN §D2「解除右欄、回歸文件流、防嵌套捲動陷阱」與 SPEC 新句「右欄 sticky／max-height 解除」全數落空；`:1566` 註解「<1100px 由上方 media query 解除」與層疊實況相反。
- **連動（同票採納）：** `layout-columns.dom.test.ts:230-235` 行動版案僅驗「解除規則存在」不驗層疊序——對本缺陷假綠（1932 全綠與 Critical 並存的結構性盲點首次實際擊發）。
- **Fix:** 把基準規則搬進 `@media (min-width: 1100px)` 區塊（徹底消除源序依賴，建議）或移至解除規則之前；同步補一條源序／歸屬斷言（斷言基準規則位於 min-width 區塊內），把「基準先、解除後」鎖成不變量。

## 🟡 Important (adopted)

### 2. e2e 直接 import `.ts` 需 Node ≥22.18，engines 僅宣告 `>=22`（4 票：角度 #1 #2 #4 #5）
`scripts/e2e-statusline.mjs:127`。Node 22.0–22.17 跑 `npm run test:e2e` 會以隱晦 loader 錯誤炸裂。Fix：腳本起手加 `process.versions.node` 檢查印友善訊息（建議），或 engines／README 註記。

### 3. `.row--reveal` 隱藏池往返殘留——重啟用列無焦點卻浮現（角度 #1 本職；協調者實證確認）
`main.ts:2479/2488` 為僅有的兩個 class 變異點（focusin 加、focusout 移除）；`assignSegmentsToContainers`（`main.ts:3309-3322`）把停用段 `appendChild` 進 `#segment-hidden-pool` 且明文「保留內部接線／焦點……純節點重定位」——聚焦元素被搬移不觸發 focusout，鍵盤浮現→remove→重新啟用後節點帶著殘留 class 回列，違反 SPEC「預設收納」。Fix：隱藏池掛回時 `li.classList.remove('row--reveal')` 一行＋補一條 dom 回歸案。

### 4. 行動版 sticky 預覽的繪序保護隨 `z-index: 5` 移除而消失（角度 #1 本職；協調者實證確認）
style.css 全檔現僅剩 `:146`（skip-link z-index:10）一處 z-index；`.preview-section`（`:1116`）無 z-index、<1100px 維持 sticky（`:1471-1473` 註解自陳）。DOM 序在後的 positioned 後代（如 `.color-swatch`）依繪序浮於 sticky 預覽之上。Fix：`.preview-section` 補低位 z-index（低於 skip-link 的 10）或 `isolation: isolate`；真機驗收清單加「行動版捲動下預覽帶遮蓋完整性」。

### 5. 教學帶 dismiss 後重載 FOUC 窗口（角度 #1 Important＋角度 #2 C 類；協調者實證屬實）
`index.html:502`（無 hidden）＋`main.ts wireTutorialBand`（JS 才補掛）——已 dismiss 使用者冷載/慢網下可見帶閃現後收合，右欄內容隨之跳移，瞬時違反 SPEC「dismiss 後永久隱藏」。WORKS 已記為待裁項，本輪升級為應處理。Fix 候選：靜態預設帶 `hidden`、init 依謂詞**移除**（fail-open 語意實質不變——無 JS 時拖曳本身也不存在）；需同步翻轉 tutorial-band.dom.test.ts／layout-columns.dom.test.ts 常駐顯示斷言與 T2.6 註解。

### 6. SPEC.md Components 自我矛盾：「至中欄目標列」vs 同段右欄定位（角度 #2 本職；協調者實證確認）
`SPEC.md:63`——line 61 已把已選擇清單定位右欄，line 63 保留舊句仍稱拖曳落點在中欄（新三欄中欄＝預覽，無落點）。Fix：改「至右欄已選擇清單目標列」或去方位詞，一行 doc 修訂。

### 7. e2e 案 10「選配斷言」實為阻斷式（角度 #3 本職；協調者實證確認）
`scripts/e2e-statusline.mjs:983-986`——activeElement 斷言失敗直接 `return { ok:false }`，與註解「選配」及 PLAN §D4「activeElement 同斷言選配」字面矛盾。Fix：改為記錄警告不阻斷，或升級為必要條件並同步修 PLAN 措辭與註解（二擇一使文與碼一致）。

### 8. `wireMoveRevealModality` document 監聽器無冪等防護（角度 #7 本職＋角度 #2 C 類；協調者實證確認，WORKS 自行預flag）
生產單次 init 無害；測試網「每案重新 init」慣例下在共享 jsdom document 線性累積，現靠「重放同一事件天然同步」的巧合維持無害。Fix：模組層 `let wired = false` 防重掛一行（或抽獨立模組並匯出 test-only reset hook，見 minority 下沉建議）。

## 🟢 Minority（未過門檻，保留備查）
- `getSampleValues` 快取命中靜默忽略 `resolveFn` 參數——介面「參數有時無效」氣味；現靠 JSDoc＋測試 reset 規避（角度 #2B/#5/#6，3 票）。
- `handleLocaleSwitch` 尾端補呼叫 `syncColumnTop()`——近零成本消除切語後 `--column-top` 陳舊（角度 #1/#6，2 票）。
- 觸控裝置 move 鈕不可達（pointerdown 恆判 'mouse'＋收納態 pointer-events:none）——PLAN 既定第三輪真機必驗＋「行動斷點恆顯」後備（角度 #1/#3，2 票，既定遞延再確認）。
- move-reveal 跨列 focus 轉移無 dom 案（focusout relatedTarget 分支唯一未直接證明路徑）（角度 #3）。
- 樣例值「全空白非空字串」不觸發 fallback；「零控制碼」不變量無常駐斷言（角度 #3/#5 各一）。
- 教學帶 `infinite` 動畫 dismiss 前常駐合成層、輕微耗電（角度 #6）。
- e2e `seedTutorial`／`dismissTutorial` 兩層命名不對稱＋`!== false` 隱式反轉（角度 #7）。
- `wireMoveRevealModality` 抽獨立模組下沉（main.ts 3,652 行續肥、同 sprint 抽模組判準不一致）（角度 #7）——記 BACKLOG 候補。
- 快取白箱播種測試手法標準化——「暫不抽象化，第二使用點出現再收斂」（角度 #7 裁量，回應 WORKS 提問）。
- `tutorial-band.ts:35` 檔頭引用不存在檔名 `tutorial-band-key.test.ts`（實為 `tutorial-band.test.ts`）——順手 doc 修（角度 #1；協調者實證確認）。

## Untested paths
- Firefox 異質引擎：move 鈕四斷言／拖曳邊緣自動捲動（本機未裝；S3-RESULT 附人工配方；JS 捲動補償預案已備未接線）——角度 #2 #3。
- grid／dvh／複合 sticky 幾何正確性（jsdom 無 layout；S1 PoC＋真機為驗證層）——角度 #2 #4。
- 教學帶 FOUC 目視、行動版繪序（🟡-4）真機確認——角度 #1 #2。
- 樣例逐段空值 fallback 的真實資料觸發路徑（FULL mock 下 0 段落入，僅替身覆蓋）——角度 #2。
- 修飾鍵單獨按下不切模態、`#list-column.scrollTop` e2e 後備分支覆蓋率——角度 #3。
- resize 後 `--column-top` 陳舊行為（契約接受面）——角度 #3 #6。

---

# 🧠 復核（2026-07-21）— 修復批驗證

**復核 scope:** 修復 delta（pre-fix 快照 → 現行工作樹，386 變動行）
**規模改判揭露（政策 §2）：** 386 行表定 5 票，**下調一級至 3 票**——理由：delta 近四成為規則搬移＋註解重述之雙計行、實質邏輯變更小、九項標的逐條可對點驗證且另有全套驗證（1935／typecheck／build／e2e 10/10／golden 零 diff）背書。核心三角復核：#1 正確性(fable)／#2 契約(opus)／#3 測試(sonnet)，3/3 成功、無降級，majority 門檻 >1.5。

## Dashboard（復核）

```
┌──────────────────────────────────────────────────┐
│  VERDICT: APPROVE-WITH-NITS（修復後）            │
├──────────────────────────────────────────────────┤
│  九項採納發現：9/9 ✅ 驗證解決（3/3 全 APPROVE）│
│  🔴 new: 0   🟡 new: 0   🟢 new notes: 6         │
└──────────────────────────────────────────────────┘
```

## 逐項復核結果（三員一致）
- 🔴-1 層疊源序：✅ 基準規則遷入 min-width media（語法層根除，非調序）；連動測試改鎖「歸屬＋唯一性」雙不變量，#3 心智紅測證實搬回檔尾即轉紅。
- 🟡-2 Node gate：✅ static import 全數 builtin、`.ts` 改版本檢查後動態 import（hoisting 消除；22.17 邊界實測攔下）。
- 🟡-3 隱藏池殘留：✅ strip 落點覆蓋唯一實際可達入池路徑；#3 呼叫鏈追蹤確認測試案走的正是修補處、紅測成立。
- 🟡-4 z-index：✅ `.preview-section` z-index:2＋字面斷言（`\b` 邊界防誤配）。
- 🟡-5 FOUC：✅ 靜態 hidden 反轉成套（HTML／main.ts／測試；五態語意全驗）；SPEC「永久隱藏」不再瞬時違反。
- 🟡-6 SPEC:63：✅ 右欄方位一致。
- 🟡-7 e2e 選配：✅ 改警告不阻斷；核心捲動斷言保持阻斷力（未掏空為恆真）。
- 🟡-8 冪等 guard：✅ document marker 跨 epoch 語意成立；prod 零行為變化。
- 順手 doc（tutorial-band.ts 檔名引用）：✅。
- 夾帶盤點（#2）：fix-delta 全數對映九項採納＋兩使用者裁定，**無超出授權改動**。
- PLAN §D2 機制句過時（#2 提出）：✅ 協調者已就地修訂（行為句＋層疊規約化，吸收 DRIFT A-1 提案）。

## 🟢 復核新增 notes（全數非阻斷，記 DRIFT C）
1. 模態旗標跨案殘留＋🟡-8 註解作用域誤述（#1 #2 #3 三員共見）——舊 epoch 監聽器閉包自足成立，但理由是「讀寫點全封閉於 wiring 函式」非「函式作用域變數」；日後 move-reveal 新案斷言前須顯式派發模態事件，勿依賴開機預設。
2. `mediaBlockRange` 括號計數不防註解內孤立大括號（#3）——與 🔴-1 同型「無聲失真」隱患，現況人工核驗安全。
3. `style.css` 新註解「不落入任何規則」過度陳述（min-width:0 共用規則仍命中，行為無誤）（#1）。
4. `shrinkRowGroupContainers` 防禦性 fallback 入池分支未同步 strip（理論不可達）（#1）。
5. e2e 版本 gate 對 Node 23.0–23.5 放行（23.x 已 EOL，實害趨零）（#1）。
6. （已消解）PLAN §D2 機制句——見上，協調者修訂完畢。

## 最終裁決
**APPROVE-WITH-NITS**——REQUEST-CHANGES 的全部採納項驗證解決；殘餘 nits 為註解精確度／防禦縱深級（見 DRIFT C），可隨後續批次順手處理，不擋 commit。
