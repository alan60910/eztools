# Backlog

Items here are candidates for future sprints, typically promoted from
sprint DRIFT.md by `/magi:commit`. Use `/magi:plan` (no args) to promote
one into a new sprint.

## Pending
<!-- /magi:commit appends C-class drift items here -->
- [ ] verify-dist `_probe` 洩漏防線加固：現行 `checkNoUnderscoreToolDirs` 僅偵測目錄形洩漏；chunk／import 形態（出貨頁誤 import `tools/_` 路徑 → 打進 `dist/assets/*.js`）無感——候選：assets 檔名掃描（限檔名勿全文 grep：`dist/vendor/ffmpeg/ffmpeg-core.wasm` 內含 av*probe 符號的 `_probe` 位元組字串，全文 grep 必誤報）或 source 側 import 斷言
  > from `magi/12-hygiene-tail/DRIFT.md` (2026-07-19)
- [ ] 同族 `.t<n>` 短形死指標順手清：`.t15`／`.t23` 等 12 處散布 emit-bash.ts／emit-ps1.ts／emit-settings.ts／emit-ps1.test.ts／pipeline.integration.test.ts（`-report` 後綴形已於 sprint 12 歸零；短形指涉同批從未簽入的 spike 報告）＋main.ts `T5.5-report` 字面
  > from `magi/12-hygiene-tail/DRIFT.md` (2026-07-19)
- [ ] **sprint 09 真機驗收批（遞延）**：T6.2-CHECKLIST.md A–F 區親測回報＋變體 A/B 圈選（現行 A）＋micro-fix-3 去留（行動版欄序 DOM 真搬，治 Tab/SR 序分歧＋列群組標題低於摺線 38–154px 殘餘）；僅真機能驗面清單見 MAGI_CODE_REVIEW「Untested paths」（頂帶 40dvh 量測／CSS order 摺線／原生 dialog 鏈）
  > from `magi/09-statusline-ux-refactor/DRIFT.md` (2026-07-18)
  > sprint 10 併入（2026-07-18）：雙分頁互切主題即時同步＋OS 深淺切換即時跟隨（未手動切換過的分頁）＋聚焦 toggle 鈕時外部觸發 aria-pressed 變化之 SR 播報行為——見 `magi/10-theme-config-hardening/WORKS.md` M4 遞延記錄
- [ ] **sprint 09 測試網加固批**：i18n-meta-scan 補屬性巡檢（aria-label／placeholder／title／alt 含 CJK 未掛 data-i18n-attr 即紅——review Important #2）＋main.ts strip 窄盲點（字串內 `//`、同行 throw）＋windows CI leg `BASH.ok && PS1.ok` meta 守門＋複製內容 clipboard spy 斷言（三鈕對應內容＋成功/失敗分支）＋真 DnD × 非 inherit 覆寫值 e2e 組合
  > from `magi/09-statusline-ux-refactor/DRIFT.md` (2026-07-18)
- [ ] statusline-builder 雙寫收斂＋footgun 加固：planSegmentMove 回傳形補 sourceRow/srcDrains（消 computeRowSeparatorsAfterMove 鏡射重算）＋config.ts export 單一 trim helper（消 normalizeRowSeparatorsField 雙寫）＋descriptor.label/ariaText「凍結 zh、顯示走 accessor」JSDoc 加固＋messages「零漂移」恆真測試改述或刪除＋emit-settings 三 hint 常數「UI 用」註解修正與 colorDisplayLabel default/auto 死分支清理
  > from `magi/09-statusline-ux-refactor/DRIFT.md` (2026-07-18)
- [ ] statusline-builder：配置**匯入／匯出 UI**（現無檔案匯入，fixture 只能靠 localStorage 灌入——見 T5.4-CHECKLIST A 區）
  > from `magi/08-statusline-catalog-expansion/` T5.4 (2026-07-14)
- [ ] statusline-builder：`(n/a)`（百分比段）與 `--`（token 段）兩種無資料標記並存（使用者拍板）——留背景註解或未來統一
  > from `magi/08-statusline-catalog-expansion/DRIFT.md` (2026-07-15)
- [ ] statusline-builder：非整數 `STATUSLINE_NOW_EPOCH`／`resets_at` 三後端分岔（不可達，真資料恆整數）——補固定案鎖「一致」或文件化 backend-defined
  > from `magi/08-statusline-catalog-expansion/DRIFT.md` (2026-07-15)
- [ ] statusline-builder：bar 百分比路徑缺 `type=="number"` 閘（字串型主值三向分歧，不可達）
  > from `magi/08-statusline-catalog-expansion/DRIFT.md` (2026-07-15)
- [ ] statusline-builder：CI 跨後端 byte-exact 等價案以 `(BASH.ok && PS1.ok)` gate 在 CI 拓撲恆假、全靜默跳過，meta 斷言查不到共存缺失——補守衛或 PLAN 文件化 CI gate 矩陣
  > from `magi/08-statusline-catalog-expansion/DRIFT.md` (2026-07-15)
- [ ] statusline-builder：git shell-out 段執行期輸出在 CI 零有效真執行覆蓋（既有盲區）
  > from `magi/08-statusline-catalog-expansion/DRIFT.md` (2026-07-15)
- [ ] statusline-builder：倒數階梯邏輯 3 後端 × 2 視窗手抄 6+ 份——抽 `jqResetLadder(...)`／ps1 同理參數化（技術債）
  > from `magi/08-statusline-catalog-expansion/DRIFT.md` (2026-07-15)
- [ ] statusline-builder：`toAriaLabel` 機械 enforcement 只覆蓋 PUA、不覆蓋 `█`/`░`（健壯性缺口）
  > from `magi/08-statusline-catalog-expansion/DRIFT.md` (2026-07-15)
- [ ] statusline-builder：`MOTW_HINT`/`CHMOD_HINT`/`GPO` 提示常數有測試卻未接進 UI（S5 既有缺口）
  > from `magi/08-statusline-catalog-expansion/DRIFT.md` (2026-07-15)
- [ ] statusline-builder：bash 取值 jq 未抑 stderr，畸形 stdin 噴多行 parse error（既有架構）
  > from `magi/08-statusline-catalog-expansion/DRIFT.md` (2026-07-15)
- [ ] statusline-builder a11y 三 note：`announceGlobal` 先於 `commitConfig` 組句順序脆弱、`handleModeChange` 焦點落點 `.segment-lists` 無可及名稱、powerline 關 bar 無對稱恢復播報
  > from `magi/08-statusline-catalog-expansion/DRIFT.md` (2026-07-15)
- [ ] statusline-builder：golden 由同一 emitter 重生、`golden:update` 後把關力受限——貢獻指南註明；e2e 未覆蓋新輸出能力（合理分工）
  > from `magi/08-statusline-catalog-expansion/DRIFT.md` (2026-07-15)
- [ ] statusline-builder 拖曳清理加固：drop handler 對 `is-segment-dragging`／rAF 取消單點依賴 dragend（抽 endDragCleanup 冪等共用），防「drop 發但 dragend 未發」邊際案 class 卡死
  > from `magi/07-statusline-multirow-layout/DRIFT.md` (2026-07-12)
- [ ] statusline-builder 位置制三小件加固：`lastRenderedSlots` 改淺拷貝快照、`reconcileRealSlots` 需實際增刪時 dev-warn 可觀測化、`seg.row` 直當 render-index 的正規化耦合補註解
  > from `magi/07-statusline-multirow-layout/DRIFT.md` (2026-07-12)
- [ ] 有中間 UI 空列時，重啟用段 clamp 落點的「顯示編號」可能與凍結 row 值直覺不符（契約一致非回歸；若使用者回報「跑錯列」此為根因，屆時評估 re-enable 感知顯示編號）
  > from `magi/07-statusline-multirow-layout/DRIFT.md` (2026-07-12)
- [ ] pending 空列補 region 地標（role="group"＋aria-label，rotor 可達）；renderPendingRowContainers 函式層焦點保全（現無觸發路徑，日後空列加控件時需要）
  > from `magi/07-statusline-multirow-layout/DRIFT.md` (2026-07-12)
- [ ] 評估 Chromium 133+ `Element.moveBefore()` progressive enhancement——原生保焦點搬移節點，可整族解決「relayout 即失焦」（含現靠顯式回焦的 select／移位鈕路徑）
  > from `magi/07-statusline-multirow-layout/DRIFT.md` (2026-07-12)
- [ ] `dragOrigin` 死狀態移除；相同播報文案 SR 不重讀（live region 尾端零寬變異等通用強化）
  > from `magi/07-statusline-multirow-layout/DRIFT.md` (2026-07-12)
- [ ] 引入 lint/format 工具（eslint/prettier）與對應 CI 檢查
  > from `magi/01-entry-page-skeleton/DRIFT.md` (2026-07-02)
- [x] ~~README 的 License 段落補齊（目前為佔位符）~~（06a T5.2 已填 MIT＋howar31 註記，2026-07-11）
  > from `magi/01-entry-page-skeleton/DRIFT.md` (2026-07-02)
- [ ] footer 與 header 標語文案去重微調
  > from `magi/01-entry-page-skeleton/DRIFT.md` (2026-07-02)
- [ ] sprint 02 review 選修改進彙總：~~convert 端到端補 transparentColorIndex 動態值斷言~~（已由 sprint 03 interop 三方交叉在精神上緩解，2026-07-04）、暫停鈕 aria-pressed 語意二擇一、maxColors=2／全透明幀端到端案例、main.ts 純邏輯（hexToRgb／進度節流／大檔估算）抽離補測（大檔估算已於 sprint 03 對 gif-editor 側抽測，apng 側仍待）、預覽面板 section 化
  > from `magi/02-apng-to-gif/DRIFT.md` (2026-07-03)
- [ ] apng-js 上游將 delay ≤10ms 改寫為 100ms——補註解與文件對齊（含首幀 PREVIOUS 降級冗餘註明、無效 c8 註解清理）
  > from `magi/02-apng-to-gif/DRIFT.md` (2026-07-03)
- [ ] 「轉換完成」status 播報與結果區 focus 移轉的播報順序競態打磨
  > from `magi/02-apng-to-gif/DRIFT.md` (2026-07-03)
- [ ] worker fallback 邊界強化（執行期失敗回退主執行緒、損壞實例重建）＋ fixtures/generate.ts 歸入 node tsconfig
  > from `magi/02-apng-to-gif/DRIFT.md` (2026-07-03)
- [ ] gifuct 上游 bug 緩解：js-binary-schema-parser 的 GIF schema Plain Text Extension 分支欄位誤植（`parent.text.blockSize` 應為 `parent.blockSize`），含 0x21 0x01 擴充的合法 GIF 使整條解碼管線 throw——decode 前預掃剝除該區塊，或向上游回報 patch
  > from `magi/03-gif-editor/DRIFT.md` (2026-07-04)
- [ ] apng-to-gif 的 #progress-section backport gif-editor 常駐模式（live region 永掛、僅 progress 元素 hidden），補齊「live region 常駐」既有不變量
  > from `magi/03-gif-editor/DRIFT.md` (2026-07-04)
- [ ] 全域暫停鈕對「轉換後預覽」region 的可發現性打磨（region 導覽先入結果區時找不到控制鈕）
  > from `magi/03-gif-editor/DRIFT.md` (2026-07-04)
- [ ] error 態焦點跨工具統一：三工具失敗時焦點皆落 body，統一補 focus 至重試/重新開始鈕
  > from `magi/04-video-converter/DRIFT.md` (2026-07-06)
- [ ] yuvj420p（full-range 8-bit 4:2:0）納入 video copy 白名單評估（現保守轉碼：非必要轉碼＋輕微色彩位移風險 vs 容器 full-range flag 保留驗證）
  > from `magi/04-video-converter/DRIFT.md` (2026-07-06)
- [ ] video-converter main.ts 純函式（strategyText/formatDurationSec/conversionFailureMessage）下沉 limits/convert-plan 補全分支測試
  > from `magi/04-video-converter/DRIFT.md` (2026-07-06)
- [ ] statusline-builder：真 stdin 多出 `fast_mode`（boolean 旗標，/fast）與 `agent_type`（string，與 `agent.name` 冗餘）欄位——評估是否新增 segment（v1 未設，型別已存查）
  > from `magi/05-statusline-builder/DRIFT.md` (2026-07-09)
- [ ] statusline-builder：settings 路徑輸入未走驗證／無 shell 逸出（`quoteIfNeeded` 不逸出 `"`／`;`／`&`）——至少擋控制字元
  > from `magi/05-statusline-builder/DRIFT.md` (2026-07-09)
- [x] ~~statusline-builder 預覽：default 色 powerline 箭頭渲染為透明三角，真終端會以預設前景繪出——`var(--arrow-fg, currentColor)` 對齊~~（sprint 07 交付，2026-07-11）
  > from `magi/06-statusline-ui-refresh/DRIFT.md` (2026-07-11)
- [x] ~~statusline-builder：`applyPreviewFontFamily` 死重清理（inline style 蓋掉 CSS 較豐富字族棧）＋index.html 既存「24 段」註解修正（實為 25 段）~~（sprint 07 交付，2026-07-11）
  > from `magi/06-statusline-ui-refresh/DRIFT.md` (2026-07-11)

## Promoted to sprints
<!-- /magi:plan moves consumed items here -->
- ~~statusline-builder：複製到剪貼簿的 `.ps1` 無 UTF-8 BOM（殘餘：自訂 prefix／分隔符非 ASCII 內容）~~ → `magi/12-hygiene-tail/` (2026-07-18)
- ~~決定 `_probe` 的長期去留（含 style.css stub 補件）~~ → `magi/12-hygiene-tail/` (2026-07-18)
- ~~衛生殘項：失效行號引用 ×2＋sprint-05 dotfile 報告引用落空＋forailook/ 處置＋magi/05 遺留 untracked 清理~~ → `magi/12-hygiene-tail/` (2026-07-18)（註：forailook/ 於 promote 前已自然消解（已刪＋已 ignore）、magi/05 僅剩承重 sp5/ 依裁保留——兩者實為零動作結案）
- ~~全站主題：OS 主題偏好即時跟隨（matchMedia change 監聽）＋跨分頁 storage 事件同步~~ → `magi/10-theme-config-hardening/` (2026-07-18)
- ~~statusline-builder：CONFIG_VERSION 未來 bump 的「未知版本重置」資料損失陷阱——遷移階梯＋「v2 存檔存活」回歸測試~~ → `magi/10-theme-config-hardening/` (2026-07-18)
- ~~verify-dist.mjs 補自動測試（合成 dist fixture）＋script 擷取 regex 嚴謹化~~ → `magi/10-theme-config-hardening/` (2026-07-18)
- ~~repo 級 `.gitattributes` 基線（`* text=auto`＋例外盤點）~~ → `magi/10-theme-config-hardening/` (2026-07-18)
- ~~statusline-builder：powerline 無箭頭模式末段尾隨空格——使用者文件一句話註記~~ → `magi/10-theme-config-hardening/` (2026-07-18)
- ~~statusline-builder UX 重構（真機回饋批：逐列分隔符、欄位預設值標示、拖移上列、sticky 預覽＋單一產出鈕、i18n）~~ → `magi/09-statusline-ux-refactor/` (2026-07-17)
- ~~statusline-builder：預覽固定 mock `now` vs 產出腳本真時鐘——加常駐說明~~ → `magi/09-statusline-ux-refactor/`（併入 G4，2026-07-17 拍板）
- ~~APNG → GIF 轉換功能~~ → `magi/02-apng-to-gif/` (2026-07-03)
- ~~statusline 引擎邊界補測：`toAnsi([])` 零列文件性測試＋多列 × `powerlineArrow=false` 真執行案~~ → `magi/08-statusline-catalog-expansion/`（06c 前置加固）(2026-07-12)
- ~~補 jsdom 測試覆蓋 `renderRuns` spec→DOM；CDP 驗證腳本收編為可重跑整合案~~ → `magi/08-statusline-catalog-expansion/`（06c 前置加固）(2026-07-12)
- ~~GIF 編輯功能（頁數編輯、時間停留等基礎功能）~~ → `magi/03-gif-editor/` (2026-07-03)
- ~~影片格式轉換功能（如 MKV → MP4）~~ → `magi/04-video-converter/` (2026-07-04)
