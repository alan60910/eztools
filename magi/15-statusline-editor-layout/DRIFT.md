# Drift — Statusline Builder 版型重構（預覽頂帶＋目錄｜列區｜設定四區）
> Source: MAGI_CODE_REVIEW.md（7 角度制審議，majority ≥4/7＋專家單票條款；併入 T4.5 前置留痕並經七員逐條核實）  •  Generated: 2026-08-16  •  Status: DETECTED

## A. Contract violations
(none)——兩件 A 類主張各僅 1 票未過門檻，經協調者裁決分別歸 B／C 並保留少數意見：
①T2.6 容許量適用範圍（角度 2 判 A：PLAN 正文未回填；角度 3／4／5／6 判 B、角度 6 並獨立驗算「單調遞增、max 即上界，語意等價非鬆綁」）→ 歸 B-2，消解行動＝PLAN 回填一句；
②js-init-pending fail-open 縫隙（角度 6 判 A 但自陳 PLAN 括號「教學帶等既有靜態骨架仍可達」留有解釋空間）→ 歸 C-4，實質缺陷已列 review 🟡-1/2 待修。

## B. Below-the-contract decisions
- [ ] OQ-5 定案留痕：D8 持久化旗標小工廠**不抽**（教學帶／收合為 repo 內同構第四次複製；本批維持各自單檔、避免過早抽象化）——供下一批評估（PLAN §OQ-5 原文授權；七員逐條核實屬實，角度 6 補充認同理由：兩者謂詞形狀不同，收合多一層斷點條件）。
- [ ] T2.6 容許量範圍再校準（**門檻定義層變更**）：G2 e2e 的 N4 遮蔽 ≤140px 容許自「唯 literal max-scroll 取樣點」再校準為「穩態捲距後所有取樣點」（穩態逐輪動態量測；穩態前零容許）——依 S-a-RESULT 再量測授權，實測退化為連續線性、無平台期、與 seed 無關。**審議結論**：多數判 B（角度 6 驗算語意等價）；角度 2 少數意見判 A（PLAN 正文未回填），消解行動＝PLAN §D2 N4 定案句與 §Spike 回填「S-a」各補一句「≤140px 容許適用於穩態後所有取樣點、穩態前零容許」；另中段判別力損失已採納為 review 🟡-5（建議單調性斷言／插值上界）。**✅ 已消解（2026-08-16 修復批）**：PLAN 兩處回填句已補；e2e 補穩態點殘差 ≈0 斷言＋劣化單調性斷言＋`maxScroll≥steadyThreshold` 防呆（🟡-5／🟡-8 已修）。
- [ ] T4.2 G4 容許量的真機補充（**門檻定義層調整**）：`dragstart` 後 `body.is-segment-dragging` 命中區擴張造成一次性、有界、可逆位移且通道隨 viewport 不同（1400×1000 scroll anchoring 補償 scrollTop+40px；1280×800 畫面下移 40px）。判準以執行期實測擴張量為該次跳動上界、其餘階段與 drop 後回歸 ±2px 嚴格。**審議結論**：裁量方向四員認可（S-i 原型量不到 T5.11 CSS，真機補充有據），但上界統計量（全列群組加總 ≈200px ≈ 5× 物理量）過寬已採納為 review 🟡-3（建議限縮至目標列之上群組＋sanity 天花板）；PLAN §Verification G4 建議補一句「baseline→dragstart 容許一次性有界跳動 ≤ 執行期實測命中區擴張量」。**✅ 已消解（2026-08-16 修復批）**：上界限縮為「目標列之上列群組長高總量＋2px」（實測跳動 40px vs 新上界 42px）＋64px 單群組量級天花板；PLAN 回填句已補（🟡-3 已修）。
- [ ] flake 檔級 testTimeout 30s 體制化：全批負載下 jsdom boot 成本隨 index.html 增長，timeout 型偶紅以檔級 `vi.setConfig({ testTimeout: 30_000 })` 治理，現**七檔**（i18n-dom／lang-switch／pipeline.integration／layout-columns／catalog-sample-values／tutorial-band／**catalog-collapse.dom**——審議修正：前置留痕誤記六檔，4 票核實為七）；判準＝隔離重跑恆綠即 flake。結構性根因（~51 次 `await boot()` 全模組圖重載）已採納為 review 🟡-11，升 BACKLOG 治本候選。
- [ ] S-j en locale 410px 裁量（審議補列，2 票）：MS1 定案明文留 MS2 裁決，本批定案**維持 340px**（理由四條載 `style.css` D3 註解；en 樣例值提示 5/30 截斷以 ellipsis 降級），真機覆核項已入 BACKLOG。
- [ ] S-e 複合形第 3 件（vitest `setupFiles` 共用 RO stub）**未落地**（審議補列，2 票）：PLAN 標「補強備用、非強制起手式」，屬授權內取捨；代價＝RO 回呼行為零測試掛點（與 🟡-11 的治本候選 (b) 同一落點，repo 現無 vitest test 區塊）。
- [ ] e2e 共用常數 `DRAG_ESTABLISH_DY` 3→2（審議補列，角度 5）：為 G4 ≥40px 安全帶預算讓路，影響既有八個拖曳案的共用參數，實測全綠、碼內註解留痕。
- [ ] skip 可見性 e2e 相交斷言豁免 ×2（「跳至預覽」＝TASKS 原文豁免；「跳至產出腳本」＝MS2 產出鈕移入頂帶後的必然延伸）——補償斷言（activeElement＋elementFromPoint）就地留痕，角度 2 核實合法。

## C. Out-of-scope observations
- [ ] 既存 i18n 漂移（非本批引入）：`messages.ts` zh-Hant `catalogHint`「中間『已選擇』欄」vs `index.html` 靜態後備「下方『已選擇』清單」——runtime 因 `applyI18n` 無條件覆寫不可見；統一措辭時宜一併處理斷點差異（桌面中欄／行動下方，角度 2 補充）。
- [ ] `preview-band.dom.test.ts` 檔頭「真瀏覽器停點總數與 Tab 序回歸基準由 MS4 e2e 承接」與 TASKS 粒度落差（T3.5 已依 PLAN 擇 dom 層落地）——留下一批對齊。
- [ ] SPEC.md 硬編行號自我引用漂移：「skip 落點快照謂詞」句引 `SPEC.md:145` 已位移（實際約 :167）；本批新寫 `:183-190` 同類——建議下一批改錨點式引用一次治理（三員核實）。**部分治理（2026-08-16）**：SPEC:60 的 `:183-190` 引用已改錨點式；其餘（含 Conventions 引 `:145` 句）留下一批。
- [ ] **js-init-pending fail-open 縫隙**（review 🟡-1/2，4 票）：init() 半路擲錯時行動版目錄被暫抑樣式鎖 0 高度、解除行全網零覆蓋（斷言恆真）——角度 6 少數意見判 A 類；修法＝try/finally 或前移＋boot 補掛 class。**✅ 已修（2026-08-16 修復批）**：並用前移（init 起手第一敘述）＋try/finally 不吞錯；dom 測試 boot 補掛 class 並紅→綠機械自證；G8 e2e 補 class 已除斷言（🟡-1/2）。
- [ ] **D8 桌面態硬條件零回歸覆蓋**（review 🟡-6）：`summary{display:none}` 無 dom 歸屬斷言、無桌面 e2e 驗證；PLAN §Verification 測試層歸屬未對此條做明確指派（角度 7）。**✅ 斷言已補（2026-08-16 修復批）**：layout-columns 補第二 media 區塊歸屬斷言＋e2e 新案 `d8-catalog-summary-desktop-1400x1000` computed-style 驗證（🟡-6）；PLAN 層歸屬指派句留下一批。
- [ ] **summary 雙 rAF 持久化時序無真瀏覽器覆蓋**（review 🟡-7）：jsdom details 同步翻轉無鑑別力、e2e G8 走 seed 繞過點擊——補 e2e 真點擊案或列真機必測。**✅ 已修（2026-08-16 修復批）**：e2e 新案 `catalog-collapse-summary-click-persist-390x844` 真點擊行使雙 rAF 真時序（🟡-7）。
- [ ] SPEC Conventions「skip 落點快照謂詞」無機械守門人＋「頂層分區」口徑未定義（review 🟡-9）。**✅ 已修（2026-08-16 修復批）**：skip-nav 補正向枚舉斷言（口徑常數化＋兩例負向控制證敏感度）；SPEC 該句補口徑括號。
- [ ] `Runtime.exceptionThrown` gate 實作外溢為全域例外守門（超出 PLAN D6-3 的 RO 可觀測性授權；日後良性噪音例外會 19 案連坐，屆時需豁免清單）；且哨兵自身缺正控制（「真的抓得到 RO loop error」未證）。
- [ ] 行動版 `dvh` 過場（URL bar 收放）驅動 RO 回呼＋forced layout（`syncBandHeight` 走 gBCR 非 `entry.borderBoxSize`）的頻率未量測；備案＝改讀 entry／<1100px 跳過 RO 追蹤。
- [ ] 340px 目錄軌寬於真實 dist 無截斷斷言——可在常駐 `viewport-probe-1280x800` 案加 `scrollWidth ≤ clientWidth` 哨兵，把 S-j 定案升為機械保護。
- [ ] e2e `evaluate` 缺 `awaitPromise`——`SETTLE_AFTER_SCROLL_EXPR` 雙 rAF 實為 no-op，現靠 `delayFn` 掩護；harness 級既有模式，下一批一次修正。
- [ ] jsdom boot 結構性成本（review 🟡-11）**✅ 已立 BACKLOG 條目（2026-08-16）**：唯讀契約案收斂 beforeAll 單次 boot／vite.config 補 `test.setupFiles`（順帶承接 RO stub）。
