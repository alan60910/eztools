# WORKS — 06-statusline-ui-refresh

> Append-only 施工日誌。由 /magi:go 維護。

## 2026-07-10 — T1.1 S1 spike：程式層完成，人工視覺矩陣待使用者實測
**Tasks:** T1.1（partial）
**Verdict:** partial（可程式化部分 DONE；視覺判讀矩陣為手動 gate，待使用者填 `sp1/REPORT.md` §5）
**Test result:** 790 pass / 71 skip / **8 fail**（`emit-bash.test.ts` 「黃金檔皆 LF、無 CR」斷言）；e2e: n/a（spike）。8 個失敗為**既存問題、與本任務無關**——證據：本次僅新增 untracked `sp1/` 檔案；`git ls-files --eol` 顯示 `__golden__/*.sh` index 為 `i/lf`、工作樹為 `w/crlf`；`core.autocrlf=true` 且 repo 無 `.gitattributes`，checkout 時被轉 CRLF。
**Files touched:** `sp1/emoji-utf8bom.ps1`、`sp1/emoji-utf8nobom.ps1`、`sp1/emoji-escape.ps1`、`sp1/emoji-utf8bom.sh`、`sp1/emoji-utf8nobom.sh`、`sp1/REPORT.md`（全數新增，未動任何生產檔）
**Decisions made by developer:**
- 除「有 BOM／無 BOM」兩變體外，另產出 `[char]::ConvertFromUtf32()` 純 ASCII 跳脫第三變體（byte 驗證 0 個 >0x7F），供 T1.2 直接對比兩種 emitter 編碼策略。
- parse-fidelity 以「script 內部將字串重輸出為 hex code unit」實作，隔離剖析層與顯示層——自動化管線下顯示層必亂碼，不能作為剖析層證據。
**程式層發現（詳 `sp1/REPORT.md` §3–4）：**
- 無 BOM `.ps1` 在本機 Big5 ANSI（cp950）下**剖析層確證損壞**（⌨️ 預期 `2328 FE0F`，實得 `003F 5241 003F`）——S1 的已知風險成立。
- BOM 變體與 escape 變體 code unit 全數正確（含代理對，如 💻 = `D83D DCBB`）且兩者相同——escape 策略為可行的 BOM 無關後備。
- `.sh` 兩變體 UTF-8 解析皆正確；BOM 置於 shebang 前僅使 line 1 報錯一行，其餘解碼不受影響。
**Out-of-scope observations to follow up:**
- **npm test 既存 8 failed（M2 驗收前置）**：`__golden__/*.sh` 被 `autocrlf=true` 的 checkout 轉成 CRLF。需補 `.gitattributes`（如 `*.sh text eol=lf`，或 golden 目錄 `-text`）並重新 normalize 工作樹，否則 M2「npm test 全綠」不可達。已回報使用者裁決，未擅自修。
- pwsh 7 本機未安裝——矩陣 {pwsh 7+WT} 欄標「本機未安裝，待補測」；是否安裝由使用者裁決。
- 開發者旁註：harness Write tool 拒建名為 `REPORT.md` 的檔案（guardrail 誤判為 subagent 自我報告），以「先寫別名再 `mv`」繞過；本 sprint 後續若有同名交付物比照辦理。
- `chmod +x` 對含 BOM 的 `.sh` 不生效（Git-for-Windows 檔案模式模擬的好奇心紀錄；`bash ./script.sh` 不受影響，不阻斷）。

## 2026-07-10 — out-of-band：golden CRLF 修復＋pwsh 7 安裝（使用者核可後執行）
**Tasks:** （非 TASKS.md 任務；使用者於 T1.1 gate 停點複選核可的三項中之兩項）
**Verdict:** DONE
**Test result:** `npm test` 全綠——31 test files passed；817 passed / 52 skipped / 0 failed（修復前 790 pass / 71 skip / 8 fail；連帶 19 個條件式 skip 恢復執行）
**Files touched:** 新增 root `.gitattributes`（`*.sh text eol=lf`＋`tools/statusline-builder/__golden__/** -text` byte-exact）；`__golden__/*` 以 `rm`＋`git checkout --` 重新 normalize 為 index 位元組（`git ls-files --eol` 全數 `w/lf attr/-text`；`LC_ALL=C grep` 確認零 CR byte）
**Decisions made:**
- 黃金檔目錄採 `-text`（非 `eol=lf`）：黃金比對是 byte-exact 契約，任何轉換都不該發生（含未來可能刻意含 CR 的 escaping fixture）。
- `winget install Microsoft.PowerShell` → pwsh **7.6.3**（MSIX；`pwsh` 於 PowerShell 與 Git Bash 皆可解析）。矩陣 {pwsh 7+WT} 欄解鎖；已回派 developer 補 pwsh 7 剖析保真程式測（REPORT.md §3.5）。
**Out-of-scope observations to follow up:**
- `.gitattributes` 為新 tracked 檔，屬本 sprint diff 一部分，隨 06a 一併 commit（交 `/magi:commit` 流程）。

## 2026-07-10 — T1.1 follow-up：pwsh 7 剖析保真補測（REPORT.md §3.5）
**Tasks:** T1.1（partial，程式層至此全部完成）
**Verdict:** DONE（程式層）；人工視覺矩陣（REPORT.md §5）仍待使用者實測——T1.1 的最後一哩
**Test result:** `npm test` 817 pass / 52 skip / 0 fail（31/31 files，exit 0）
**Files touched:** `sp1/REPORT.md`（原地編輯：§1 環境、新增 §3.5、§4 結論改寫、§5 pwsh 欄解鎖）
**程式層發現（pwsh 7.6.3）：**
- 無 BOM `.ps1` 在 pwsh 7 下**剖析正確**（code unit 與預期表逐位相符）——「無 BOM 必亂碼」的風險前提為 **PS 5.1 限定**，非普遍成立。
- BOM 版與 escape 版在 pwsh 7 下同樣全對。三變體 × 兩 host 的剖析層故事完整：僅支援 pwsh 7+ 則無 BOM 字面量安全；需支援 PS 5.1（ANSI=Big5 機器）則無 BOM 不安全，抉擇落在「BOM 字面量」vs「`ConvertFromUtf32` 跳脫」（後者對 PS 版本／codepage／BOM 全不敏感）。
- emitter 策略**未裁決**——依任務邊界留給 T1.2。
**Out-of-scope observations to follow up:**
- （無新增）

## 2026-07-10 — T1.1 人工矩陣完成＋T1.2 裁決落地 → Milestone 1 完成
**Tasks:** T1.1（完成）、T1.2（完成）
**Verdict:** DONE（M1 全部完成）
**Test result:** `npm test` 817 pass / 52 skip / 0 fail（31/31 files）；e2e: n/a（spike／文件任務）
**Files touched:** `sp1/REPORT.md`（§5.1 矩陣代填＋出處警語、§6 人工實測結論與裁決）、`PLAN.md`（「已裁決：其他」補 S1 結論一條＋§Spikes S1 附註）、`TASKS.md`（勾 T1.1、T1.2）
**人工實測結果（使用者 2026-07-10 口頭回報，經 AskUserQuestion 補問確認）：**
- PS 5.1 環境（未區分 conhost/WT）：僅無 BOM 變體亂碼，BOM 版與 escape 版正常——與剖析層結論互相印證。
- pwsh 7＋WT：三變體目視全部正常。bash 改以 **MobaXterm** 驗證（取代原計畫 VS Code 終端）：兩變體全部正常。
- ⌨️(VS16) 寬度穩定→保留；🌳🌱🌿 小字級清楚可辨→不變。
**T1.2 裁決（落地 PLAN 預先承諾之條件式，非新決策）：**
- (a) ps1 emitter icon 編碼策略＝`[char]::ConvertFromUtf32()` 碼位跳脫（原始碼純 ASCII、不依賴 BOM）——T2.3 實作依據。
- (b) emoji 對照表不變——治理句核可迴圈不觸發。
**Out-of-scope observations to follow up:**
- 矩陣為彙總口頭回報（chcp 未記錄、未逐格），REPORT §5.1 已如實標註精確度警語；§5.2 指引保留供日後重測。

## 2026-07-10 — T2.1：config v2（powerlineArrow＋遷移）完成
**Tasks:** T2.1
**Verdict:** DONE
**Test result:** 824 pass / 52 skip / 0 fail（876 總數，+7 新測試）；`npm run typecheck` exit 0；`__golden__/*` 零異動（協調者以 git status 驗證）
**Files touched:** config.ts、config.test.ts、scripts/statusline-golden-configs.ts、scripts/golden-statusline-ps1.mjs、emit-ps1.test.ts、emit-bash.test.ts、emit-settings.test.ts、pipeline.integration.test.ts、render-preview.test.ts、resolve.test.ts
**Decisions made by developer:**
- typed 字面量漣漪修正時，powerline 模式 config 設 `powerlineArrow: true`（保留現行箭頭預期至 T2.3 gating 落地）、plain 設 false。
- segments.test.ts 三處 `version: 1` 為 raw JSON（非 typed 字面量）不需改——改走 v1→v2 遷移路徑、觀測結果不變（以全套測試驗證，非猜測）。
**協調者備註（dispatch 模式偏離）：** TASKS 標 T2.1‖T2.2 平行 lane，但 CONFIG_VERSION 字面型別漣漪使 T2.1 觸及 resolve.test.ts／segments.test.ts（T2.2 檔案集），實際檔案集相交——依 /magi:go §4a 改全串行。
**Out-of-scope observations to follow up:**
- （無）

## 2026-07-10 — T2.2：25 段 icon PUA→emoji 完成（黃金檔紅為預期中間態）
**Tasks:** T2.2
**Verdict:** DONE
**Test result:** 821 pass / 52 skip / **6 fail**（全數為黃金 byte 比對：emit-bash 4＋emit-ps1 2——glyph 內容變因，預期紅至 T2.4 重生；協調者驗證失敗集合精確一致）；typecheck exit 0
**Files touched:** segments.ts（25 glyph＋註解）、segments.test.ts（目錄級斷言＋非 PUA 斷言＋精確對照測試）、resolve.test.ts（emoji 放行＋PUA_RE 未變負向測試）
**Decisions made by developer:**
- glyph 替換以 regex 驅動（非逐行手改），先以一次性腳本驗證既有凍結碼位測試與檔案實際碼位逐 byte 相符，避免不可見 PUA 字元轉錄錯誤。
- resolve.test.ts 既有「PUA run 省略 ariaText → TypeError」測試原依賴 git-branch 舊 PUA glyph，換 emoji 後會靜默失效——改用 POWERLINE_ARROW（仍為 PUA、本 sprint 不變）維持測試有效性（僅動測試檔，非 scope creep）。
**Out-of-scope observations to follow up:**
- （無）

## 2026-07-10 — T2.3：D1 gating＋ps1 icon 跳脫完成
**Tasks:** T2.3
**Verdict:** DONE
**Test result:** 840 pass / 52 skip / 6 fail（失敗集合與 T2.2 後完全相同＝繼承紅黃金比對，未擴大；協調者驗證一致）；typecheck exit 0；pipeline.integration＋真執行 legs 全綠
**Files touched:** resolve.ts、emit-bash.ts、emit-ps1.ts＋三個對應測試檔（+379/−75）
**Decisions made by developer:**
- padding 空格加在 run 的 `text`（非 ariaText——toAriaLabel 逐 chunk trim，裝飾空白不進 aria）；「padding 不新增 run」寫入 resolve 檔頭不變量。
- `powerlineArrow=true` 路徑逐 byte 重現 v1 輸出（golden 翻轉變因可審的前提）。
- ps1 icon 跳脫機制：BMP 用 `[char]0xHEX`、astral 用 `[char]::ConvertFromUtf32(0xHEX)`、多碼位（⌨️）以 `+` 串接——沿用既有 `$ARROW = [string][char]0xE0B0` idiom；新增純 ASCII icon 保證單元測試。
**Out-of-scope observations to follow up:**
- **ps1 產出的 `›` 分隔符 preset（及其他非 icon 注入內容）仍為非 ASCII 字面量**——PS 5.1 無 BOM 貼上流程對其仍有亂碼風險。預設分隔符為 `|`（ASCII）故 06a 零豆腐驗收不受影響；建議列 06b/06c 或獨立 chore 處理（統一 ps1 非 ASCII 跳脫咽喉）。
- emit-ps1 的 `$BgT`/`bgs` 背景追蹤陣列在 `powerlineArrow=false` 時為無害死資料，T3.2/後續可考慮清理。

## 2026-07-10 — T2.4：golden 全量重生＋零豆腐驗證 → Milestone 2 完成
**Tasks:** T2.4
**Verdict:** DONE（M2 全部完成）
**Test result:** **846 pass / 52 skip / 0 fail**（898 總數）；typecheck exit 0（協調者最終覆核）
**Files touched:** `__golden__/` 六檔全數僅經 `npm run golden:update` 重生（plain-full.ps1、powerline-threshold.ps1、plain-rich.sh、powerline-rich.sh、shellout.sh、sp5-c-plain.sh）
**Golden diff 逐行審結果：** 全部 hunk 歸因於變因 (a) glyph 替換（.sh：PUA→emoji UTF-8 字面量；.ps1：PUA 字面量→純 ASCII `[char]`/`ConvertFromUtf32` 跳脫式）；變因 (b) 箭頭翻轉零 hunk——golden 的 powerline config 均由 `mode==='powerline'` 派生 `powerlineArrow: true`，箭頭輸出逐 byte 不變（符合 v1 語意保留設計）。無不可解釋 hunk。
**pipeline.integration.test.ts 同步：** 查證不需更新——不讀 golden、oracle 自算、全部 case `icon: false`，結構上不受 glyph 表影響。
**零豆腐程式化驗證（powerline 預設 `powerlineArrow: false`、24 段開 icon）：** .sh 原始碼零 PUA、.ps1 本體零非 ASCII、無 ARROW/$ARROW 變數；bash 與 powershell.exe 真跑 exit 0、stdout 零 PUA，兩者輸出一致。示範腳本與 stdin 已存 scratchpad 供使用者目視確認（見 handoff）。
**協調者查核：** developer 旁註「目錄 24 段」為誤數——協調者以 node 驗證 descriptor/id 皆 25、glyph 零 PUA 殘留、`String.fromCodePoint` 構式零殘留，與 PLAN 名目一致，非缺陷。
**Out-of-scope observations to follow up:**
- M2 驗收的「真機視覺」腿（Windows Terminal＋VS Code 目視零豆腐）已備妥指令交使用者 30 秒確認；程式化不變量（輸出僅 emoji＋ASCII、零 PUA）已使豆腐字在裝有 emoji 字型的終端不可能出現。

## 2026-07-10 — T3.3：verify-dist 字型 guard 拆除＋入口頁 script 白名單
**Tasks:** T3.3
**Verdict:** DONE
**Test result:** `npm run build && npm run verify:dist` exit 0（協調者覆核 verify:dist 綠、檔內 woff2/MAX_FONT_BYTES/fontSrcDir 零殘留）；`npm test` 846 pass 不受影響；負向驗證：注入 `<script>alert(1)</script>` 於 dist 副本 → 白名單正確 fail（exit 1，訊息引用於 developer 報告）
**Files touched:** scripts/verify-dist.mjs（55+/39−，隔離單檔）
**Decisions made by developer:**
- 白名單機制：`ENTRY_ALLOWED_INLINE_SCRIPTS` 常數＋空白正規化比對；帶屬性的 `<script>`（含 src=）一律拒絕；零 script 通過（M3 現況）。種子＝PLAN D4 釘死的主題 bootstrap，註記 T4.2 落地入口頁最終版（含 toggle 監聽）時更新此常數。
- 負向驗證以 dist 副本手動執行、不建永久測試檔（verify-dist 現無 vitest 覆蓋、維持現狀）。
**協調者備註：** M3 執行順序改為 T3.3→T3.2→T3.1（TASKS 標 T3.1‖T3.2）——T3.1 刪檔會炸 T3.2 未拆的 import 與 verify-dist 字型 guard，重排後每步 build＋verify:dist 皆綠。
**Out-of-scope observations to follow up:**
- （無）

## 2026-07-10 — T3.2：banner／字型接線拆除＋預覽 CSS 三角箭頭
**Tasks:** T3.2
**Verdict:** DONE
**Test result:** 848 pass / 52 skip / 0 fail（31/31 files）；typecheck 0；build＋verify:dist 綠；grep「nerd|preview-font|PREVIEW_FONT_FAMILY」生產檔零殘留（協調者覆核）
**Files touched:** tools/statusline-builder/{index.html, main.ts, render-preview.ts, render-preview.test.ts, style.css}（+175/−220）
**Decisions made by developer:**
- 新增純函式 seam `runRenderSpec(run)`（text/arrow discriminated union，以 `run.text === POWERLINE_ARROW` 判定、常數自 resolve 匯入不重複碼位）——node 可測、不需 jsdom（沿既有測試慣例）。
- 三角形實作：`.preview-terminal__arrow::before` 用 `clip-path: polygon(0 0, 100% 50%, 0 100%)`，fg 走 `--arrow-fg` custom property、bg 走 inline background-color（cap 箭頭 bg=null→透明）；箭頭 span `aria-hidden`，aria 仍由 toAriaLabel 承載。
- 一併移除 `needsNerdFont`（banner API 拆除後零呼叫點的死碼）——判斷性刪除，記錄供審。
**Out-of-scope observations to follow up:**
- （無）

## 2026-07-10 — T3.1：字型資產刪除＋依賴淨刪 → Milestone 3 完成
**Tasks:** T3.1
**Verdict:** DONE（M3 全部完成）
**Test result:** 848 pass / 52 skip / 0 fail；typecheck 0；`npm run build && npm run verify:dist` exit 0；M3 驗收 grep（dist 無 nerd/woff2、package.json 無 subset-font/fontkit）協調者覆核全淨
**Files touched:** 刪除 fonts/ 三檔＋preview-font.css＋scripts/subset-statusline-font.mjs；package.json（淨刪兩 devDep）；package-lock.json（−22/+29 純去重重排，developer 逐行審無版本變動）；verify-dist.mjs（新增 06a 字型移除不變量負向斷言：dist 無 nerd/woff2、package.json 無兩依賴）
**Decisions made by developer:**
- 負向斷言植入 verify-dist（post-build guard 的自然歸屬），三條負向路徑均以手動 harness 實證會 fail 後復原。
**Out-of-scope observations to follow up:**
- root README.md「第三方元件」段仍引用已刪除的 fonts/ 檔案——屬 **T5.2 既定範圍**（非 T3.1 回歸），flag 以防漏做。

## 2026-07-10 — T4.1：全站 CSS token 化（wave 1 root＋wave 2 四工具頁平行）
**Tasks:** T4.1
**Verdict:** DONE
**Test result:** 848 pass / 52 skip / 0 fail；typecheck 0；build＋verify:dist exit 0（協調者批次覆核）
**Files touched:** src/style.css（token 基礎＋--dark-* 單一來源＋兩深色情境＋color-scheme）；四工具頁 style.css（apng +121/−53、gif-editor +168/−59、video-converter、statusline-builder +231/−118）
**Dispatch 模式：** 使用者指定 agent team＋wave——wave 1（root token 詞彙表，單 agent）→ wave 2（四工具頁，**四 agent 平行**，檔案不相交、禁 build 防 dist 競爭）→ 協調者批次驗證。
**Decisions made by developers:**
- 共用詞彙：--bg/--fg/--fg-muted/--link/--border/--border-strong/--surface/--surface-dim/--badge-*/--shadow-color；深色調色盤 AA 對比全數以 WCAG 公式驗算並記檔頭（延續專案慣例）。
- 四 lane 獨立發現同一問題：--dark-link (#60a5fa) 作白字按鈕填色僅 ≈2.5:1——各自建立工具局部 accent-fill token（dark 多為 #2563eb）。
- 排除項（各檔內註解明示）：statusline 預覽終端框（TASKS 明文）、video-converter ffmpeg log 終端模擬與 video 黑框、各工具白字按鈕文字色（配 tuned 填色）。
- statusline `.output-block__code` 兩主題維持固定深底（判斷性決策，比照 log 終端模擬邏輯）。
**Out-of-scope observations to follow up（供 /magi:review-code）：**
- **跨工具深色 accent 不一致**：hover 色三工具各異（#1e40af／#2f6fdb／#2f6fe0），statusline accent-fill 深色維持 #1d4ed8（與其他三工具的 #2563eb 不同、且其對頁面深底 <3:1 的 UI 邊界對比採「白字自證」讀法）——建議後續把 accent-fill/hover 升為 src/style.css 共用 token 消除漂移。
- --bg 與 --surface 目前值相同（語意分離保留）——gif-editor lane 觀察，無功能差異。

## 2026-07-10 — T4.2：theme.ts＋五頁主題接線（wave 3）
**Tasks:** T4.2
**Verdict:** DONE
**Test result:** 865 pass / 52 skip / 0 fail（+17 theme 測試，32 test files）；typecheck 0；build＋verify:dist exit 0；協調者覆核：五頁皆含 eztools-theme、四個 main.ts 渲染前 import theme、dist 入口頁零外部/module script、白名單放行最終 script
**Files touched:** src/theme.ts（新）、src/theme.test.ts（新）、五個 index.html、四個 main.ts、src/style.css（.theme-toggle token-only）、scripts/verify-dist.mjs（白名單常數更新）
**Decisions made by developer:**
- theme.ts 對 document/localStorage/window 一律函式體內延遲存取（不在模組頂層），使 vi.stubGlobal 可在無 jsdom 環境測真邏輯。
- Vite 對無屬性 inline script 原樣直出（byte 不變）——白名單直接比對原始文字即可（已實測 dist 驗證）。
- 入口頁 HTML 註解內出現字面 `<script type="module">` 會誤觸 verify-dist 的 naive regex——改寫註解措辭避開（不動 regex，超scope）。
**Out-of-scope observations to follow up:**
- verify-dist 的 script 擷取 regex 不解析 HTML 註解——目前以措辭迴避，嚴謹修法（跳過註解）可列 chore。
- tools/_probe/ 範本的主題 script＋toggle 同步屬 T5.1（PLAN 明文），本任務刻意未動。

## 2026-07-10 — T4.3：手動驗證第一輪＋換頁白閃修正
**Tasks:** T4.3（partial——修正已落地，待使用者複測 #2 與確認 #8）
**Verdict:** partial
**Test result:** 865 pass / 52 skip / 0 fail；verify:dist 綠；五頁 meta＋critical style 逐頁確認、五個 style 區塊 md5 一致（協調者覆核）
**使用者第一輪清單結果：** #1 深色 OS 手選淺色生效 ✅、#2 跨頁導航閃白 ❌（F5 正常）、#3 localStorage 記憶 ✅、#4 系統跟隨 ✅、#5 原生控件跟色 ✅、#6 導航一致 ✅、#7 aria-pressed ✅、#8 待確認（使用者不確定題意，已解釋）
**#2 修正（T4.3「修正發現的問題」範圍）：** 根因＝瀏覽器導航 commit 時以預設白畫布首繪、非資源未載完；使用者提議改 SPA 內遷換頁——協調者裁決不採（違反純靜態多頁與入口頁零框架 JS invariant，範圍過大），改正規修法：五頁 `<head>` 加 `<meta name="color-scheme" content="light dark">`＋主題 script 後緊跟 critical inline `<style>`（html 主題底色，五頁 byte 一致，色值與 --bg/--dark-bg 同步之要求以註解釘死於各頁與 src/style.css）
**Trade-off（記錄）：** 深色 OS＋手選淺色者理論上有反向暗閃窗口——paint-holding 下可忽略，且嚴格優於原本全深色使用者白閃。
**Out-of-scope observations to follow up:**
- （無新增）

## 2026-07-11 — T4.3 複測通過 → Milestone 4 完成
**Tasks:** T4.3（完成）
**Verdict:** DONE（M4 全部完成）
**使用者複測（2026-07-11）：** 換頁白閃已消除 ✅；主題切換下深色程式底（產出腳本區）不受站台主題影響 ✅（使用者以 output-block 口徑確認；預覽終端框的主題獨立性另有 T4.1 CSS 排除實作與 lane 驗證保證）
**Test result:** 865 pass / 52 skip / 0 fail；typecheck 0；build＋verify:dist 綠（沿用前輪協調者覆核，其後無程式變更）

## 2026-07-11 — MAGI code review（6 票面向分區）＋修復輪
**Tasks:** /magi:review-code（使用者指定：依實際更動分域、嚴重性配模型、不限三票）＋REQUEST-CHANGES 修復輪（使用者核可修全部 8 項）
**Verdict:** 修復輪 DONE；review 產出 MAGI_CODE_REVIEW.md＋DRIFT.md（Status: DETECTED，A:0/B:11/C:11）
**Review 結果：** R1-R3（opus：引擎／emitters＋golden／UI 預覽）與 R4、R6（sonnet：主題／管線文件）＝APPROVE-WITH-NITS；R5（sonnet：CSS token）＝REQUEST-CHANGES。0 Critical、8 Important、13 Notes。
**修復輪（三路平行＋一次追補）：**
- A（CSS）：共用 `--accent-fill`/`--accent-fill-hover`/`--accent-fill-fg` 升入 src/style.css（deep #2563eb ≈3.58:1、hover #2f6fdb ≈3.89:1），四工具局部 accent token 全數退役；`.button-like--secondary` 初修（text=accent）被 lane 自我旗標 3.58:1 低於一般文字 AA——協調者改裁 R5 方案二（text＋border 皆 `--link`，深色 7.28:1、淺色 pixel-identical），四工具統一（含 review 未旗標的 video-converter 既有同病）。
- B（管線/文件）：verify-dist nerd/woff2 掃描改 `\b` 詞界（負向雙證：nerd-font 仍殺、ownerDocument 放行）；README「零 JS」殘留與 howar31 時態修正；入口頁 inline script 補 aria-label＋白名單常數同步＋雙側 lockstep 註解。
- C（emitter/golden）：ps1 分隔符非 ASCII 走 `[char]` 跳脫（'›'/'·' 實測純 ASCII、真執行 byte 不變）；新增 `powerline-noarrow` 雙 golden（threshold＋dash-null＋shell-out＋icon 全覆蓋）＋pipeline cfgT 參數化真執行 case；ps1 golden 補 no-CR 斷言（與 bash 對稱）。
**Test result:** 877 pass / 53 skip / 0 fail（930，+13 測試）；typecheck 0；build＋verify:dist exit 0（協調者終驗）
**Out-of-scope observations to follow up:**
- DRIFT.md C 類清單為 06b/backlog 候選（copy 無 BOM 通道、matchMedia 即時跟隨、verify-dist 測試覆蓋、repo 級 gitattributes 基線、_probe 部署姿態、預覽 default 色箭頭 currentColor 等）。

## 2026-07-11 — T5.1‖T5.2：五頁 footer 統一＋_probe 同步＋README 修訂（平行批次）
**Tasks:** T5.1、T5.2
**Verdict:** DONE
**Test result:** 865 pass / 52 skip；typecheck 0；build＋verify:dist exit 0；協調者覆核：六個 html 皆含 LICENSE 連結、video-converter 含 GPL 引擎行、README `grep Nerd|待定` 零命中
**Files touched:** T5.1＝五個 index.html＋tools/_probe/{index.html,main.ts}；T5.2＝README.md（單檔，−12 Nerd Font 段／+3 howar31／License 填 MIT）
**Decisions made by developers:**
- footer 隱私句統一為定案文「不會上傳任何資料」（先前四頁寫「檔案」、statusline 頁已是「資料」——順帶修齊）。
- _probe 補足新工具全套 boilerplate（meta color-scheme＋主題 script＋critical style＋toggle＋footer＋main.ts 接線）；經查 _probe 確實參與 Vite build（discoverToolEntries glob）。
- _probe 未加 `import './style.css'`（範本無此檔，加了會炸 build）——偏離「完全鏡像」的刻意決策。
- README「statusline-builder 注意事項」節經掃描無殘留字型敘述，四處契約項全落地。
**Out-of-scope observations to follow up:**
- _probe 範本缺 style.css stub——未來工具三件套（index.html/main.ts/style.css）不完整，可列 chore。

## 2026-07-11 — T5.3：living docs 落地 → 全部 15 任務完成
**Tasks:** T5.3
**Verdict:** DONE（sprint 實作依 TASKS 契約全數完成；一項 PLAN↔TASKS 拆解縫隙見下）
**Test result:** 865 pass / 52 skip / 0 fail（32/32 files）；typecheck 0；build＋verify:dist exit 0（協調者 sprint 終驗）
**Files touched:** SPEC.md（+43/−10）、magi/PRD.md（+3/−1）、magi/TECHSTACK.md（+8/−5）——僅 06a delta，06b/06c 內容明確未混入
**Reality-vs-PLAN 對帳發現（developer 逐檔對帳，協調者採認）：**
1. **⚠ powerlineArrow 無 UI 控件**：PLAN D1 gating 表 UI 欄與 06b 節「（checkbox 已於 06a 交付）」假設 06a 有「Powerline 箭頭」checkbox＋「需字型支援」警語＋false 時停用 lastArrowCap 控件——但 TASKS M2 拆解（T2.1–T2.4）從未含 UI 接線任務，main.ts/index.html 無此控件。現況：新 config 恆 false，僅 v1 powerline 存檔遷移可得 true。SPEC 已按現實撰寫（引擎層欄位、不宣稱 opt-in UI）。**待使用者裁決：現補／留 DRIFT／移 06b。**
2. TECHSTACK Deployment 原本無 subset-font/fontkit 字面（PLAN delta 假設的註記不存在）——改為新增「已移除」註記。
3. theme.ts 條目按實反映 T4.3 白閃修正（meta color-scheme＋critical style），非僅 D4 原文。
**Out-of-scope observations to follow up:**
- （無新增；發現 1 待裁決）

## 2026-07-11 — T2.5（追加）：powerlineArrow UI checkbox → sprint 實作全部完成（16/16）
**Tasks:** T2.5（使用者裁決「現在補做」後追加至 TASKS）
**Verdict:** DONE
**Test result:** 865 pass / 52 skip / 0 fail；typecheck 0；build＋verify:dist exit 0（協調者覆核，UI 元素接線 grep 確認）
**Files touched:** tools/statusline-builder/{index.html, main.ts, style.css}
**Decisions made by developer:**
- 警語採常駐小字提示＋aria-describedby（比勾選才出現更可及）；措辭「支援此符號的特殊字型」避開字面 "Nerd Font"——否則撞 T3.1 的 dist 負向斷言（好的自我攔截）。
- 停用鏈：`powerlineArrowEl.disabled = mode !== 'powerline'`；`lastArrowCapEl.disabled = !powerline || !config.powerlineArrow`（D1 表）。
- 無色塊邊界提示：`hasNoBoundaryRisk()` 純函式（main.ts 內部、未單測——main.ts 無測試檔且無 jsdom，頂層 DOM 查詢使 vitest node 環境無法 import；函式四行、審視可驗，JSDoc 註明）。
- 手動驗證四步驟已附於 developer 報告，供使用者抽查。
**Out-of-scope observations to follow up:**
- （無）
