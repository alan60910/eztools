# WORKS — Statusline Builder UX 第二輪真機回饋批

> Sprint: magi/14-statusline-ux-round2/ • append-only 工作日誌

## 2026-07-20 — M1 Spikes（三 lane 併行：A=S1/S5、B=S2、C=S3/S4）

**Tasks:** T1.1, T1.2, T1.3, T1.4, T1.5, T1.6
**Verdict:** DONE（6/6）
**Test result:** 1843/1843 pass（`npm test`，協調者親跑，57 files，89.3s，exit 0）；e2e n/a（spike 以自帶 CDP runner 實測，非專案 e2e 套件）
**Files touched:** `magi/14-statusline-ux-round2/spikes/`（s1-layout-poc.html、S1-RESULT.md、S5-RESULT.md、S2-RESULT.md、s3-focus-matrix.html、s3-run.mjs、S3-RESULT.md、S4-RESULT.md）；各 lane 臨時 vitest 檔已刪、`git status --porcelain` 覆核除 sprint 目錄外零觸碰

**Decisions made by developer（＋協調者採認）：**
- **D1 選型定型＝JS keydown/mousedown 模態旗標＋`.row--reveal`**（純 CSS `:has(:focus-visible)` 於 Edge/Chrome 150 實測兩處滑鼠模態破口：select 點擊即浮現＋列內 prefix 文字輸入；PLAN 既載後備轉正、非新架構）。`visibility:hidden` 確認不需。
- **初載欄底可達性破口實錘** → 啟用 `calc(100dvh − var(--column-top))` 後備（292px→24px，`--column-top` JS load 後一次性寫入）。
- **S5 行動版＝原生單一 DOM 序**（源序 設定→預覽→清單；零 JS 搬移；兩斷點選擇器單套通用；micro-fix-3 由源序重排滿足）。
- 樣例快取隔離＝test-only reset hook＋beforeEach；jsdom `:focus-visible` 對 select 假綠 → 常駐「滑鼠不浮現」案落 dom 層（JS 旗標 classList 可證）。
- S2：30/30 段樣例 compact 可容納（7–33 字元、零控制碼）；FULL mock 下 fallback 0；`defaultConfig(catalog)` 帶參。
- Chromium/Edge 拖曳邊緣自動捲動原生成立（免 JS 補償）；Firefox 未裝＝待第三輪真機（JS 補償演算法已備驗）。

**Out-of-scope observations to follow up:**
- **列內控件盤點更正**：round-2 審議對 A1「無文字輸入」的反證有誤——segment-row 內有 prefix `<input type=text>`（index.html:881，協調者複核屬實）；已回填 PLAN D1-B′。
- dist 建置頁 1400px viewport 下 `max-width:1360px` media 覆寫未生效，疑似既有問題（lane A CDP 實測，未深究）→ 留 DRIFT 對帳。
- `↺`(U+21BA) 字寬未逐字型驗證；長路徑段（windows-cjk）compact 列建議截斷策略（M3 T3.3 留意）。
- e2e 真瀏覽器斷言浮現態宜斷 `pointerEvents` 而非 opacity（transition 中繼值陷阱）；長 CDP session rAF 節流佐證「逐案 fresh 瀏覽器」慣例。
- 教學帶樣式勿以高於 `[hidden]` 的 specificity 覆寫 display（M2 T2.6 留意）。

**Spike 結論已回填 PLAN.md**（D1-B′ 修訂＋「Spike 結論回填」節）。

## 2026-07-20 — M2 批次 1：三欄版面手術（T2.1–T2.3 併批單 developer）

**Tasks:** T2.1, T2.2, T2.3
**Verdict:** DONE
**Test result:** 1855/1855 pass（58 files；協調者親跑複核 110s exit 0）；typecheck 3 tsconfig 綠；`npm run build` 成功；e2e 依計畫未跑（M4 校準）
**Files touched:** index.html（740 行 diff，含整檔重寫噪音）、style.css（217）、main.ts（+20）、preview-band.dom.test.ts（81）、skip-nav.dom.test.ts（21）、layout-columns.dom.test.ts（新增 295 行、10 案）

**Decisions made by developer:**
- **條件式捲動停點判定＝降為 1**：搬遷後 `#preview-section` 不再是捲動容器（40dvh 預算已遷 `.preview-terminal`），移除其 tabindex、僅留 role=region；skip-nav 錨點跳轉變「僅捲動不奪焦」（與既有「跳至已選擇」慣例一致），已入註解與斷言。
- 右欄容器 `#list-column`：sticky＋`calc(100dvh − var(--column-top, 0px))`＋overscroll contain；內容序 `#tutorial-band-slot`（空槽，T2.6 填）→`.segment-lists`→`#selected-section`。`--column-top` 由 `syncColumnTop()` 於 init 一次性寫入（無 resize 監聽，依 S1-RESULT 建議最小接線）。
- 桌面三欄靠 grid auto-placement 依 DOM 序落位（無 order／無 grid-area 重映射）；`#output-status`/`#error-message` `grid-column:1/-1` 跨欄置頂；<1100px 切 flex column＋解除右欄 sticky/max-height；**刪舊 `.builder-columns__catalog{order:1}` 視覺序覆寫（micro-fix-3 真 DOM 序收斂）**。

**Out-of-scope observations to follow up:**
- index.html 以整檔 Write 落 LF（git 警告下次 touch 轉 CRLF；.gitattributes text=auto 會正規化）——diff 740 行含搬移噪音，語意變動量較小。
- `.preview-terminal` 現三責（橫捲＋縱捲＋40dvh 預算）——M4 e2e 座標假設需重核。
- `.preview-section` 移除 z-index:5／border-bottom（頂帶視覺分層退役）——真機驗收時目視複核。

## 2026-07-20 — M2：T2.4 dialog 尺寸

**Tasks:** T2.4
**Verdict:** DONE
**Test result:** 1857/1857 pass（58 files；協調者親跑 113.8s，含通過行證據）；typecheck 綠（exit 0）
**Files touched:** style.css（dialog.output-dialog 單一區塊兩行）、output-dialog.dom.test.ts（+公式全文比對 describe，沿 layout-columns 原始文字比對慣例）

**Decisions made by developer:**
- 舊規則 `width: min(90vw, 640px)`／`max-height: min(85vh, 46rem)` → 契約式 `min(90vw, max(640px, 55vw), 72rem)`／`min(85dvh, 60rem)`；**順帶收斂 85vh→85dvh**（契約明定）；無分散規則或 media override 需合併。
- 新斷言含「非舊 `min(85vh,…)` 形」反向檢核，防 vh/dvh 回歸。

## 2026-07-20 — M2：T2.5 move 鈕收納＋JS 模態旗標浮現

**Tasks:** T2.5
**Verdict:** DONE
**Test result:** 1870/1870 pass（59 files；協調者親跑 89s exit 0；1857＋13 新案對帳吻合）；typecheck 綠
**Files touched:** main.ts（+79：`inputModality` 模組態＋`wireMoveRevealModality()`，init 掛載）、style.css（`.segment-row__move` 收納/浮現區塊 +28）、move-reveal.dom.test.ts（新增 270 行、13 案）

**Decisions made by developer:**
- 收斂範圍＝`.segment-row__move`（上/下移鈕對）；`.segment-row__remove` 為兄弟節點恆顯（契約如此）。
- document 層 capture 監聽 mousedown/pointerdown→mouse、keydown（排除純修飾鍵）→keyboard；focusin/focusout 以 `closest('.segment-row')` 切 `.row--reveal`。
- index.html 零改動（既有 class 足以錨定）。
- 案 (4) 走真 moveSegment 點擊流（節點重用＋邊界還焦＋浮現延續），非模擬。

**Out-of-scope observations to follow up:**
- 既有測試網對 move 鈕**無直接點擊案**（僅經 `#segment-move-status` 間接覆蓋）——本 task 的真點擊案補上此洞。
- `wireMoveRevealModality()` 於測試多次 `init()` 時在共享 jsdom document 疊加監聽器（閉包各自收斂、功能無害）——記錄供 DRIFT 評估是否加冪等 guard。

## 2026-07-20 — M2：T2.6 教學帶 markup＋SVG（M2 收口）

**Tasks:** T2.6（M2 全六 task 完結）
**Verdict:** DONE
**Test result:** 1883/1883 pass（60 files；協調者親跑 87s exit 0）；typecheck 綠；`npm run build` 綠（協調者親跑 exit 0）——M2 驗收條件（test＋typecheck＋build）全數達成
**Files touched:** index.html（+50 diff 行：#tutorial-band-slot 填入 .tutorial-band）、style.css（+86：band 規則＋keyframes＋reduced-motion 停格）、layout-columns.dom.test.ts（空槽斷言升級為含帶斷言）、tutorial-band.dom.test.ts（新增 13 案）

**Decisions made by developer:**
- dismiss 鈕**刻意不掛 aria-label 屬性綁定**（key 未入 messages.ts 前掛 data-i18n-attr 會使 en 重掃殘留 CJK 而紅）——循 `#output-dialog-close` 先例以可見文字承載可及名稱；已在 index.html 註解＋專屬測試案明記，T3.6 可再議。
- 教學帶選擇器全 class 基、無 !important——`src/style.css` 的 `[hidden]{display:none!important}` 防禦保持有效（dom 案雙檔檢核）。
- keyframes 僅動 transform（結構面證版面穩定；真像素穩定性留真機/e2e，測試名明記）。

**Out-of-scope observations to follow up:**
- dom 測試 boot 期 i18n-dom 對 `tutorial.*` 未解析 key console.warn（預期，T3.6 補 key 後消失）。

## 2026-07-20 — M3：T3.1 mode 切換焦點修正（D4）

**Tasks:** T3.1
**Verdict:** DONE
**Test result:** 1890/1890 pass（61 files；協調者親跑 88s exit 0；1883＋7 對帳吻合）；typecheck 綠
**Files touched:** main.ts（−5/+3：刪 `setAttribute('tabindex','-1')`＋`.focus()` 兩行＋死掉的 `segmentListsEl` 宣告與註解）、mode-switch.dom.test.ts（新增 7 案）

**Decisions made by developer:**
- 伴生盤點：舊碼從未清 `tabindex="-1"`（首切後永久殘留屬性）——刪除後自然消失；`DIALOG_FOCUSABLE_SELECTOR` 與此無關未動；無既有測試依賴舊「焦點移至 segment-lists」行為（純加法）。
- jsdom 探針：`click()` 不落焦——測試顯式先 `.focus()` 再 `.click()`，正向 activeElement 斷言才有意義（檔頭已記）。
- 三斷言層×雙向切換＋「無殘留 tabindex」第七案。

**Out-of-scope observations to follow up:**
- BACKLOG:42 既載 a11y note「mode 焦點落點 .segment-lists 無可及名稱」隨本修正整項失效——DRIFT 對帳時勾銷。

## 2026-07-20 — M3 批次：T3.2–T3.4 樣例合成鏈＋compact 渲染＋語言連動

**Tasks:** T3.2, T3.3, T3.4
**Verdict:** DONE
**Test result:** 1912/1912 pass（63 files；協調者親跑 89s exit 0；1890＋13 單元＋9 dom 對帳吻合）；typecheck 綠
**Files touched:** sample-values.ts（新 127 行，DOM-free）、sample-values.test.ts（新 13 案）、catalog-sample-values.dom.test.ts（新 9 案）、main.ts（+~48）、index.html（catalog item 加 `.catalog-item__hint`）、style.css（截斷規則）、messages.ts（`catalog.sampleUnavailable` zh+en）

**Decisions made by developer:**
- `getSampleValues(locale, resolveFn?)` 依 repo「純函式＋顯式依賴注入」慣例（segment-defaults.ts 先例）取代 vi.mock；快取命中忽略 resolveFn 成為 dom 測試合法 seeding 縫（同 epoch 先 import sample-values 種快取再 import main）。
- compact 形＝既有 badge 的鏡像兄弟 span（hint 淡化、aria-hidden、與 badge 依 enabled 互斥切 hidden）；textContent 寫入、`instantiateTemplate` 通道零觸碰；注入回歸案（`<img>`/`<script>`/`&`）通過。
- 語言連動走既有 `handleLocaleSwitch` 加 `refreshCatalogHints()`（鏡像 refreshCatalogNames），per-locale 快取天然免顯式失效。
- 單元案對照 S2-RESULT 字面值交叉核（model/cwd/context-used/git-branch）＋30 段全覆蓋＋空值/擲錯 fallback 雙路。

**Out-of-scope observations to follow up:**
- 真實長路徑溢出僅由 CSS ellipsis 守（FULL mock 契約內無實際溢出樣例可渲染）——真機驗收目視項。
- `↺` U+21BA 字寬跨字型未驗——真機驗收目視項。
- 快取 seeding 測試手法為本 sprint 新模式（非侵入）——review-code 時檢視是否標準化。

## 2026-07-21 — M3：T3.5 教學 dismiss 狀態機接線

**Tasks:** T3.5
**Verdict:** DONE
**Test result:** 1930/1930 pass（64 files；協調者親跑 88s exit 0；1912＋18 對帳吻合）；typecheck 綠
**Files touched:** tutorial-band.ts（新 60 行純模組：KEY／SENTINEL／`shouldShowTutorialBand()` 單一謂詞／`dismissTutorialBand()`）、tutorial-band.test.ts（新，非 jsdom，8 案）、tutorial-band.dom.test.ts（原地擴充 12→18 案）、main.ts（+27：`wireTutorialBand()` init 掛載）

**Decisions made by developer:**
- 常數出口＝獨立模組 `tutorial-band.ts`（mirror src/theme.ts 慣例：頂層不碰 localStorage、函式內惰性存取）——非 jsdom 環境可測、未來 e2e seed 的唯一合法 import 出口。
- 隱藏走既有 `setHidden` 慣例；dismiss click＝best-effort 寫入＋立即隱藏（寫入失敗本次仍隱藏，下次 fail-open 再現）。
- dom 案 beforeEach 清 key；怪值 `'true'`/`'0'`/`''` 以 it.each 收斂於單一謂詞斷言。

**Out-of-scope observations to follow up:**
- 教學帶無 FOUC inline-script 防禦（不同於 theme）——JS 前原生常顯、init 後才依謂詞隱藏，屬 PLAN 既定範圍（已 dismiss 使用者會短暫看到帶再消失，真機驗收目視確認可接受度）。

---

## ⏸️ 進度暫停點（2026-07-21，使用者指示 T3.5 後暫停）

**已完成**：M1 全（T1.1–T1.6，spike 結論已回填 PLAN）／M2 全（T2.1–T2.6）／M3 的 T3.1–T3.5。TASKS 勾 17/25。工作樹＝未提交的實作變更（tools/statusline-builder/ 下 7 個 tracked 檔＋10 個 untracked 新檔；`git status` 另有 sprint 文件），**尚未 commit（等使用者指示）**。最後親驗：1930/1930＋typecheck 綠（2026-07-21 00:12）。

**下次續跑（`/magi:go` 即可接續）**：
1. **T3.6** i18n 雙語文案（`tutorial.*` key 入 messages.ts zh+en、掛標補全含 dismiss aria-label 再議、i18n 巡檢綠——T2.6 起 dom 測試的 tutorial.* console.warn 隨之消失）。
2. **T3.7** 黃金檔零 diff 早跑（協調者親跑 `npm run golden:update`＋`git diff __golden__` 零 diff 檢核）→ M3 收口。
3. **M4** e2e 校準（T4.1 選擇器/座標＋seed（import tutorial-band.ts 常數）；T4.2 新增案）——注意 WORKS 既載：`.preview-terminal` 三責、e2e 座標假設需重核。
4. **M5** 文件簿記（T5.1 SPEC／T5.2 TECHSTACK／T5.3 BACKLOG 三平行 lane）＋T5.4 全套終驗。
5. Sprint 完成後：`/magi:review-code`（必跑，產 DRIFT.md）→ `/magi:commit`。

**DRIFT 素材已累積於各節 out-of-scope 觀察**（盤點更正、1360px media 疑點、監聽器疊加、BACKLOG:42 失效、FOUC 可接受度、↺ 字寬、長路徑溢出、快取 seeding 模式標準化）。

## 2026-07-21 — T3.6 i18n 雙語文案（tutorial 域落鍵＋巡檢補網）
**Tasks:** T3.6
**Verdict:** DONE
**Test result:** 1932/1932（基線 1930＋2 新 it；協調者親跑 `npm test 2>&1 | tail -6` → `Tests 1932 passed (1932)`、EXIT:0）；typecheck EXIT:0（developer 證據）；e2e: n/a
**Files touched:** tools/statusline-builder/messages.ts（+30：`tutorial` 域介面＋zh＋en，置於 catalog 之後 langToggle 之前、兩字典域序一致）、index.html（僅教學帶上方 HTML 註解段：T2.6 過渡期敘述改定案）、i18n-meta-scan.dom.test.ts（+87）
**Decisions made by developer:**
- en 文案定稿：`tutorial.dragHint` = "Drag a segment name to reorder or move it to another row"；`tutorial.dismiss` = "Got it"。zh 字面與 index.html 原文完全一致（`拖曳段名可排序與移列`／`知道了`）。
- dismiss 鈕 aria 懸決就此定案：沿用可見文字即可及名稱慣例（同 `#output-dialog-close`），不掛 aria-label／data-i18n-attr；index.html 註解同步改述。
- 巡檢補網三案：(1) 新 describe「applyI18n(doc,en) 後主文件樹文字節點零殘留 CJK」；(2) 新 describe「applyI18n 對整份 index.html 零 console.warn（兩語言）」；(3) 既有 T5.5 en 抽查 it 內加 tutorial 兩鍵翻轉斷言（不增計數）。
- en 文字重掃唯一 offender＝`.lang-toggle`（`langToggle.shortLabel` en 值 `'中'`）——查證為 T5.4 既有設計（顯示切換目標語言助憶短碼，i18n-dom.dom.test.ts:274／lang-switch.dom.test.ts 已有鎖定斷言），非殘留缺陷；處置＝新案判準額外豁免 `.lang-toggle` 容器並以 JSDoc 記理由，不動 messages.ts 既有值。
- `catalog.addedBadge`／`sampleUnavailable` 經比對確認雙語已備（T3.2/T3.3 落地），零檔案動作。
**Out-of-scope observations to follow up:**
- developer 本機兩次撞到與本 task 無關的 flaky 5000ms timeout（catalog-sample-values.dom.test.ts T3.4 語言切換重渲染案、layout-columns.dom.test.ts T2.2 header 高度變動案），重跑即綠——對機器負載敏感，若 CI 重現頻率高屬 sprint 13 flake 治本殘餘案例，DRIFT 候補。

## 2026-07-21 — T3.7 黃金檔零 diff 早跑（M3 收口）
**Tasks:** T3.7
**Verdict:** DONE（協調者親自執行——驗證型任務，無產程式碼，不派 developer）
**Test result:** `npm run golden:update` EXIT:0（8 個 golden 檔全數重寫）；重生前後 `git status --porcelain -- tools/statusline-builder/__golden__` 皆空、`git diff --stat` 空 → **零 diff（第一跑）**
**Files touched:** （無——golden 檔重生後與 HEAD 位元一致）
**Decisions made by developer:** n/a
**Out-of-scope observations to follow up:** （無）本結果證實 T3.2 樣例值合成鏈對 `resolve()` 的唯讀呼叫未觸動 emit 契約，M3 acceptance「黃金檔零 diff（第一跑）」達成；T5.4 終驗第二跑仍須照跑。

### M3 里程碑收口（2026-07-21）
M3 全 7 task DONE。Acceptance 對照：回饋 #1（move 鈕收納浮現）/#4（mode 焦點）/#5（目錄樣例值）/#6（拖曳教學）行為面可展示 ✅；`npm test` 1932/1932 綠 ✅；黃金檔零 diff 第一跑 ✅。剩餘：M4（T4.1/T4.2 e2e 校準，本機限定）、M5（T5.1–T5.4 文件簿記終驗）→ 之後 `/magi:review-code`（必跑）→ `/magi:commit`。

## 2026-07-21 — T4.1＋T4.2 e2e 校準批（M4 收口）
**Tasks:** T4.1, T4.2
**Verdict:** DONE
**Test result:** e2e **10/10 passed**（developer 連跑 3 輪穩定；協調者親跑第 4 輪 `npm run test:e2e` → `10/10 passed — total 50831ms`、E2E_EXIT:0）；vitest 1932/1932（協調者親跑 EXIT:0）；typecheck EXIT:0
**Files touched:** scripts/e2e-statusline.mjs（+207/-3，唯一改動檔；生產碼與 vitest 檔零觸碰）
**Decisions made by developer:**
- T4.1 校準結果＝**零選擇器/座標變更需求**：三欄版面未破壞任何 data-testid 錨點與活座標紀律（首跑 8 案即綠）。唯一必要改動為 harness 級前置：`seedExpr` 新增 `{ dismissTutorial = true }` 選項，預設以 `tutorial-band.ts` **import 的** `TUTORIAL_DISMISS_KEY`／`TUTORIAL_DISMISS_SENTINEL` seed dismiss（零字面重複，Node ≥22.18 type-stripping，本機 24.10 原生支援；已註明 dev-only 前提）。
- 新案 9 `tutorial-band-does-not-block-drag`：`seedTutorial:false` 無條件保持教學帶可見；斷言＝拖前 band 在場（hidden===false 防呆）→ 同列真拖曳成功 → band 仍在場。
- 新案 10 `mode-switch-scroll-position-stable`：`window.scrollTo(300)` 實捲 scrollY=166>0（防空泛恆真）→ 真 CDP 滑鼠序點擊 powerline radio → 捲動位置不變＋選配 activeElement 斷言。採主判準 window.scrollY；`#list-column.scrollTop` 後備分支保留供未來版面收緊時使用。
- 實作陷阱二則（已記入腳本 JSDoc）：(1) JS `element.click()` 在真 Chromium 不觸發表單控件原生 focus（activeElement 仍 body），無法重現舊 bug 觸發前提 → 案 10 改真 CDP mousePressed→mouseReleased（新 `clickBySelector` helper）；(2) `scrollIntoView({block:'center'})` 恆置中會先動頁面、汙染「捲動不變」待測訊號 → 案 10 專屬 `modeRadioClickPointExpr` 省略 scrollIntoView（其餘 9 案紀律不變）。
- 「滑鼠不浮現」依 T1.5 分層維持 dom 層（move-reveal.dom.test.ts 已覆蓋），e2e 不落案——判斷經協調者確認。
**Out-of-scope observations to follow up:** （無新增）先前「.preview-terminal 三責任 e2e 座標假設再確認」疑慮經實跑證偽——8 案零校準即綠，無座標耦合。

### M4 里程碑收口（2026-07-21）
M4 全 2 task DONE。Acceptance 對照：`npm run test:e2e` 本機 8＋新增 2 案全綠 ✅（證據見上，協調者親驗）；證據記入 WORKS.md ✅。剩餘：M5（T5.1–T5.4 文件簿記終驗，T5.1/T5.2/T5.3 為 🔀 三平行 lane）→ `/magi:review-code`（必跑）→ `/magi:commit`。

## 2026-07-21 — T5.1–T5.3 文件三 lane（🔀 平行）＋T5.4 全套終驗（M5 收口＝sprint 實作面完成）
**Tasks:** T5.1, T5.2, T5.3, T5.4
**Verdict:** DONE
**Test result:**（T5.4，全數協調者親跑）`npm test` **1932/1932** EXIT:0（含 i18n 巡檢屬性面＋en 文字面重掃＋零 warn 案）；`npm run typecheck` EXIT:0；黃金檔第二跑 `golden:update` 後 `git status --porcelain -- __golden__` 空＝**零 diff 終驗** EXIT:0；`npm run test:e2e` **10/10 passed** EXIT:0
**Files touched:** SPEC.md（+24/-10，Components 節）、magi/TECHSTACK.md（+3）、magi/BACKLOG.md（09 真機驗收批條目兩註記）
**Decisions made by developers:**
- T5.1（lane A）：頂帶舊契約四要素字面歸零（協調者 grep 複核：殘留僅 :188/:197 sprint 06b/09 史料節，正確保留）；六點新行為契約落句（三欄＋右欄同居／目錄 compact 形＋樣例合成語意／行動摺疊序 DOM 序＝視覺序／move 鈕三句行為契約不釘選擇器／dialog 尺寸公式／教學帶謂詞＋key＋sentinel 比照 lang key 列名）。developer 主動保留兩則仍屬實的舊句（目錄拖移入列＋列群組地標）防 SPEC 資訊流失——協調者認可，屬實作現況。
- T5.2（lane B）：基線 bullet 落「## Framework / runtime」節——**節名映射記錄：PLAN／TASKS 所稱「前端技術」為近似指稱，TECHSTACK.md 無此字面標題**。
- T5.3（lane C）：micro-fix-3 子項 `~~劃銷~~`＋收斂括注（S5 定案＋T2.1–T2.3，去留問題消滅）；新增「> sprint 14 註記」引用行記 A/C/F 區部分驗項失效與承接前重盤要求。條目 checkbox 維持 `- [ ]`（整體仍未完成）。款式偏差記錄：BACKLOG 條目實為單一長物理行，developer 依周邊實況放棄 72 欄折行字面要求。
**Out-of-scope observations to follow up:** （無新增）

### M5 里程碑收口＝Sprint 14 實作面完成（2026-07-21）
**25/25 task 全 DONE。** M5 acceptance 對照：三文件 delta 與 PLAN spec-deltas 節一致 ✅（PRD／CLAUDE (none) 如訂）；BACKLOG 兩動作完成 ✅；全套驗證綠（含黃金檔終驗零 diff 第二跑）✅。
下一步：`/magi:review-code`（**必跑**，產 DRIFT.md 供 /magi:commit）→ 使用者觸發 `/magi:commit`。DRIFT 素材已散記於各 entry 之 out-of-scope observations（inventory 更正／1360px media 疑似既有問題／wireMoveRevealModality 監聽器累積／BACKLOG:42 a11y note 已 moot／教學帶 FOUC 可接受性／↺ 字寬未驗／長路徑僅 CSS 防線／快取 seeding 測試模式標準化／e2e 斷 pointerEvents 慣例／flaky 5000ms timeout 殘餘二案）。

## ⏸️ 停點（2026-07-21，使用者指示：實作面 25/25 完成後暫停，先真機驗收）
實作與終驗全數完成（見上方 M5 收口節）；`/magi:review-code`（必跑）與 `/magi:commit` 待使用者下次觸發。工作樹維持未提交。

### 📋 使用者索取之手動驗證清單（2026-07-21 盤點；依 PLAN 不擋 review/commit）
- **Firefox 真機**（本機未裝，唯一異質引擎）：(1) move 鈕四斷言——人工配方見 spikes/S3-RESULT.md「重現配方」（s3-focus-matrix.html＋window.__spike helpers）；(2) 拖曳邊緣自動捲動——若 Gecko 不觸發，JS 捲動補償預案已實作待接線（S1-RESULT）；(3) 三欄／教學帶／dialog 基本盤。
- **視覺體感**：教學帶 FOUC 可接受性／↺ U+21BA 字寬／長路徑 compact 列 CSS 截斷／初載欄底殘餘 24px／SVG 動畫深淺主題＋OS reduced-motion 停格／dialog 尺寸極端視窗觀感。
- **觸控行動 SR**：<1100px 摺疊序真手機＋觸控拖曳（第三輪收尾）；SR 走查（樣例 aria-hidden／教學帶語意／落列播報）。
- **既有疑似問題順手驗**：dist 頁 1400px viewport 下 max-width:1360px media 未生效（DRIFT 候補）。
- 備忘：sprint 13 CI（2036109）首跑待收；BACKLOG「09 真機驗收批」A–F 區承接前重盤。

## 2026-07-21 — /magi:review-code（7 角度 MAGI）
**Verdict:** REQUEST-CHANGES（🔴×1＋🟡×7＋🟢×10；MAGI_CODE_REVIEW.md／DRIFT.md Status: DETECTED，A×3）
**規模判定：** ~3,400 行 → 7 票全角度；claude 四模型輪替（同 vendor 揭露）；7/7 成功、無降級。
**協調者實證（專家單票條款）：** 層疊源序 Critical（style.css :1481 vs :1569 同 specificity、基準規則後出恆勝——grep＋層疊規則判讀確認）；`.row--reveal` 隱藏池殘留（變異點僅 :2479/:2488，assignSegmentsToContainers 無清理）；z-index 全檔僅剩 skip-link 一處；SPEC:63 中欄字面；e2e :983-986 阻斷式 return；tutorial-band.ts:35 檔名引用——全數屬實。
**核心肯定面：** 教學帶狀態機／樣例合成鏈／注入防線／e2e 防恆真設計／單一事實來源紀律全員過檢；黃金檔、禁改檔、測試數宣稱經角度 #2/#3 獨立重驗吻合。
**下一步：** 修復批（Critical 必修＋七 🟡 小成本）→ 重跑 `/magi:review-code` 復核 → `/magi:commit`。

## 2026-07-21 — Review 修復批（🔴×1＋🟡×7＋doc×1）＋3 角度復核
**Tasks:** MAGI_CODE_REVIEW 九項採納發現修復（developer 單批）＋核心三角復核（fable/opus/sonnet）
**Verdict:** DONE；復核 3/3 APPROVE → 最終裁決 **APPROVE-WITH-NITS**
**Test result:**（協調者親跑）`npm test` **1935/1935**（1932＋3：隱藏池往返案／z-index 案／教學帶靜態出貨態案；🔴-1 案等量替換）EXIT:0；`npm run test:e2e` **10/10** EXIT:0；`golden:update` 後 `__golden__` 零 diff；typecheck／build 綠（developer 證據）。
**Files touched:** style.css（基準規則遷入 min-width media＋z-index:2）、main.ts（入池 strip＋wireTutorialBand JSDoc＋document marker guard）、index.html（教學帶靜態 hidden＋註解改述）、SPEC.md:63（右欄方位）、scripts/e2e-statusline.mjs（Node gate＋動態 import＋選配不阻斷）、tutorial-band.ts（檔名引用）、四測試檔連動；PLAN §D2 機制句由協調者修訂（層疊規約化，吸收 DRIFT A-1 提案）。
**復核要點：** 修復 delta 386 行，表定 5 票依政策 §2 下調至 3 票（規則搬移雙計行、逐項可對點驗證、全套驗證背書——已於報告 Dashboard 揭露）；#3 對 🔴-1／Fix2／Fix3／Fix4 連動測試逐一心智紅測＋呼叫鏈追蹤，確認鎖住成因非假綠；#2 夾帶盤點零超權改動；復核新增 6 notes 全數 🟢 級，記 DRIFT C。
**DRIFT.md 重寫（現況語意）：** Status: DETECTED——A (none)（三項全消解）／B×8／C×17。
**下一步：** `/magi:commit`（sprint mode，自動拾取 DRIFT.md）——等使用者明示。
