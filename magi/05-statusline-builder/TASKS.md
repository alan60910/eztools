# Tasks — Claude Code Statusline 產生器

> Source: PLAN.md（r2.1） • Sprint: magi/05-statusline-builder/
> 時序閘總覽：SP-0（T1.1，使用者 mini-gate）hard-gate M2 全部；
> SP-2(M1)（T1.5）gate emit-ps1（T2.5）；SP-5（T2.3）gate 兩 emitter
> 黃金凍結與 §3 斷言；SP-1（T1.6）gate font-dependent 工作（T3.2 的
> glyph 渲染面＋T4.2 字型斷言＋兩條 font delta）。
> M1 串行關鍵路徑＝T1.1 → T1.5 → T2.3；T1.2/1.3/1.4/1.6/1.7 與之並行。

## Milestone 1: Spike 群＋純函式地基（fixture-first）
**Goal:** 全部阻斷級假設實證完畢；語意核心四模組 node 綠。
**Acceptance:** SP-0 fixtures 簽入（或明確記錄 pending＋provisional 範圍）；SP-1/2(M1)/4/6 結論記入 WORKS；color/threshold/config/validate 測試全過。

- [ ] T1.1 — **SP-0 真機 stdin fixture 擷取（使用者 mini-gate；2026-07-07 使用者遠端→延後，M2 經裁定以 provisional 體制先行，回歸後對帳——見 sp0/INSTRUCTIONS.md §4＋WORKS 授權記錄）**：coordinator 產出跨平台擷取指令（append JSONL、不依賴 jq：POSIX `cat >>`／Windows `$input | Add-Content`）＋腳本化狀態序列說明（全新→首次回應後→/compact→vim→effort→worktree→rate_limits）＋8 條件性 segment 逐一觸發 checklist＋還原說明，交使用者執行；收件後簽入 `fixtures/`、逐筆 diff F1、拆 ⚠ 或標 provisional、worktree 雙表述判定（未判定→保守併一）。**M2 全部 task hard-gate 於此**（無降級路徑）。
- [x] 🔀 [A] T1.2 — SP-4＋`color.ts`：ColorSpec 三態、ANSI256↔hex 對照表定稿（命名＝索引＋hex）＋spot-check、sRGB 相對亮度 auto-fg（黑/白判定）、ANSI 組碼（truecolor/ansi256、fg/bg）；單元測試。
- [x] 🔀 [B] T1.3 — `threshold.ts`＋`config.ts`：10-tuple ThresholdRule、`idx=max(0,min(floor(p/10),9))`、4 模板預填陣列、auto-fg 成對陣列預算；config serialize/deserialize/migrate＋drop-unknown 清洗（含桶數校正為恰 10、越界色 clamp、壞 hex 拒）；測試含 p=-5/0/9.9/9.99/10.0/100/105/null、桶數≠10、舊 config×目錄變動 roundtrip。不碰 localStorage。
- [x] 🔀 [C] T1.4 — `validate.ts`：拒收集 R＝{換行/CR/NUL/C0-C1/bidi 格式控制/長度>8}正面表列；property 測試「R 內任意輸入不達 emitter」；escaping 對抗基礎案（`'`/`"`/`$`/backtick/`\`/`!`/CJK/ZWJ emoji）。
- [x] 🔀 [D] T1.5 — **SP-2(M1) ps1 encoding spike**（非產品碼）：手寫 ps1 以 `powershell.exe`（5.1）＋`pwsh`（7）spawn（呼叫形與 settings 生產形逐字同）餵 mock stdin，斷言 piped stdout 原始位元組：開頭無 `EF BB BF`（`UTF8Encoding($false)`）、glyph/ANSI bytes 正確；harness UTF-8 顯式解碼。**emit-ps1（T2.5）及其黃金 gate 於此**。
- [x] 🔀 [E] T1.6 — **SP-1 font lane（授權驅動）**：候選 glyph 逐來源列授權（只取 MIT/OFL-clean，Codicons CC-BY／Pomicons 類換純文字或改來源）→凍結碼位表→subset 工序（來源版本＋指令記 `fonts/README.md`）→瀏覽器逐碼位渲染 smoke→簽入 woff2＋`fonts/LICENSE-nerd-fonts.md`（OFL 全文＋條件性 RFN 改名＋各來源條款）。失敗退場：降級純文字＋ANSI、回報使用者重議（font-dependent 工作全停）。
- [x] 🔀 [F] T1.7 — **SP-6 色盤 pattern＋最壞情形量測**：三候選原型（role=grid 2D／16 色＋spinbutton／listbox 分區）純鍵盤實測＋結構準則（tab 停點、觸控 ≥24px、命名）擇一定案（NVDA 實聽覆核併入 T4.4 checklist）；25 列全開＋4×10 閾值最壞情形 DOM/tab 序量測，驗證收合/分區承載；icons 全開＋powerline 之 aria-label 組裝檢視。

## Milestone 2: 目錄＋決策核心＋三產生器（fixture 後）
**Goal:** resolve→emit 全鏈 node 綠、黃金簽入、真執行 harness 就緒。
**Acceptance:** 340 級測試矩陣全過（單元＋黃金＋本機 ps1 真執行）；SP-5/SP-7 結論記入 WORKS；黃金檔 diff 經人審。

- [x] T2.1 — `segments.ts`＋`mock-data.ts`：tri-path 描述子全 25 段（含 nullPolicy/variants/icon.ariaText/format 鍵）＋格式化純函式（單次浮點乘後 floor、整數運算、jq 補尾零 idiom 對應之 TS 參考實作）；mock-data 由 fixtures `.jsonl` 聯集派生＋欄位多樣性要求（每描述子至少一情境相異非 null）；provisional 欄標記。（gate：T1.1）
- [x] T2.2 — `resolve.ts`＋`emit-ansi.ts`＋aria-label 純函式：執行期 join 演算法宣告式實作（存活判定在 value、composition 單源、dash-null bg 退 base color、powerline 箭頭交接、lastArrowCap 兩態、行尾 reset）；emit-ansi oracle（獨立於 emitter 組碼）；aria-label 組裝純函式（PUA run 顯式 ariaText、箭頭=''）；測試含 C1 組合＋icons 全開情境。
- [x] T2.3 — **SP-5 join spike＋oracle 定案**：bash＋ps1 手寫最難情境（中段條件隱藏＋鄰段閾值 bg；存活 dash-null 夾中段；prefix＋icon 段 value null；× lastArrowCap 兩態）真跑，斷言 stdout ANSI == emit-ansi(resolve())；oracle byte-exact 定案（不可行→canonical 正規形並記錄）。**兩 emitter 黃金與 §3 斷言/比對函式定義 gate 於此**。
- [x] 🔀 [A] T2.4 — `emit-bash.ts`＋黃金：jq 缺件提示 exit 0、null 三態 idiom、join 累加器、閾值陣列＋jq 端 floor、exit-0 不變量（禁 set -e、shell-out 包裹、結尾 exit 0）、escaping 單引號 context＋`$(payload)`/`!` 對抗、無 printf 格式位負向斷言；黃金＝簽入可讀 `__golden__/*.sh`＋`toEqual(readFileSync)`（重生腳本禁 CI）。（gate：T1.1＋T2.3）
- [x] 🔀 [B] T2.5 — `emit-ps1.ts`＋黃金：PS 5.1 語法底線、`$e=[char]27`、`UTF8Encoding($false)` 檔頭、結尾顯式 `exit 0`（try/catch 僅例外面）、PSObject 屬性存在檢查、escaping `''` 雙寫＋`$()` 惰性證明；黃金 `__golden__/*.ps1`（含檔案 BOM 契約）。（gate：T1.5＋T2.3）
- [x] T2.6 — `emit-settings.ts`＋SP-2 殘項：Windows wrapper 形（`-NoProfile -ExecutionPolicy Bypass -File` forward-slash）／POSIX 形＋chmod 提示；refreshInterval/hideVimModeIndicator 條件附帶；MOTW 實測（ADS `Zone.Identifier` 模擬＋預設 ExecutionPolicy 執行）；jq `strflocaltime` 可用性評估（不可用→`date -r`→`date -d` fallback 定案）；GPO 註記文案。
- [x] T2.7 — 真執行 harness＋**SP-7**：spawn 架構（bash ubuntu/Git Bash、powershell 5.1＋pwsh 7 windows）＋skipIf＋meta 斷言（每後端至少一 leg 不 skip）；比對函式（正/負向自測）；SP-7 格式化對等（補尾零/float 下緣對抗值＋JSON number→double 同構斷言）＋shell-out 等價（乾淨/髒/detached/無 branch）；對抗值併入常設情境；「非 git 目錄」exit 0 案。

## Milestone 3: 工具頁 UI＋預覽＋a11y 契約落地
**Goal:** 完整可操作的設定頁（dev 環境），a11y 契約逐條落地。
**Acceptance:** dev 手動冒煙可走完「選段→排序→配色→閾值→預覽→產出三份→下載/複製」；a11y 結構面（分區/skip/收合/組名/live region/aria-describedby）逐條對 PLAN 檢核。

- [x] 🔀 [A] T3.1 — `index.html`＋`style.css`：工具頁骨架（F9 慣例）、四類分區 landmark＋heading＋skip、閾值 disclosure 結構、三產出區 heading、常駐 live region（is-empty pattern 沿用）、觸控 ≥24px、`prefers-reduced-motion`。
- [x] 🔀 [B] T3.2 — `render-preview.ts`＋字型接線：StyledRun→DOM span、深淺底＋mock 情境 radiogroup（群組可及名稱、切換不重播明述）、@font-face subset 載入（gate：T1.6；SP-1 失敗則純文字降級分支）、Nerd Font 提示（aria-describedby 綁控件＋常駐橫幅內容切換）。
- [x] T3.3 — `main.ts` 全流程：UI 狀態機、localStorage 介接（config.ts 純函式）、segment 清單（checkbox/上下移＋播報/停用收合/每控件組名=段名＋角色/前綴 input）、色盤元件（T1.7 定案 pattern＋三態 radio）、閾值編輯器（模板 select＋套用批次播報＋10 段 label[for]）、mode 切換（焦點管理＋顏色語意翻轉播報）、產出（Blob 下載：ps1 帶 BOM／sh 無、剪貼簿＋成功播報）、驗證拒收 role=alert。
  # E2E: npm run dev → /tools/statusline-builder/ 手動冒煙

## Milestone 4: CI＋時序閘＋deltas＋使用者總 gate
**Goal:** 部署鏈完備、入口上架、專案級文件同步、真機驗收。
**Acceptance:** test.yml 兩 leg＋deploy.yml windows leg 綠；verify-dist 全過；deltas 落地；T4.4 checklist 回報。

- [x] 🔀 [A] T4.1 — CI：新增 `.github/workflows/test.yml`（push DEV＋PR main；matrix ubuntu＋windows；ubuntu＝bash＋jq gate（pin jq 假設，缺則顯式安裝）、windows＝ps1 5.1＋7 gate）；`deploy.yml` build job 補 windows test leg（部署前置）。
- [x] 🔀 [B] T4.2 — 時序閘：`src/tools.ts` 翻 available、`tools.test.ts` tripwire `toBe(4)`、verify-dist ENTRY_ANCHOR_SLUGS ×4＋字型資產斷言（先 build 實測落點：Vite 雜湊搬 `dist/assets/` 之判定；<100KB 上限）。（字型斷言 gate：T1.6）
- [x] T4.3 — Spec deltas 落地：root SPEC.md ×4（overview 軟化/Components/Conventions 兩處/Status 四工具措辭）、root CLAUDE.md 枚舉句、PRD Problem＋Goals、TECHSTACK Framework＋Deployment；README root-sync（第三方元件字型段、Tools 表、schema 基準版註記＋人工重核 checklist、GPO/Unblock-File 提示）。
- [ ] T4.4 — **SP-3 使用者總 gate（人工 checklist）**：真機掛載（經工具實際下載帶 MOTW → 預設 ExecutionPolicy 執行 → statusline 顯示）、glyph 實渲染、refreshInterval、null 期行為、provisional 條件欄實遇複核；a11y：鍵盤全程（排序/色盤/閾值/mode 切換）、SR 播報（移位/套模板/mode/複製成功/aria-describedby 提示/預覽 label）、NVDA 色盤覆核（T1.7 併入項）；量測：腳本單次執行耗時。回報後記 WORKS、值回填 PLAN。
