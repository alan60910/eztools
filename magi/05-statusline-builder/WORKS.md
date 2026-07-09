# Works — Claude Code Statusline 產生器（sprint 05）

> Append-only 施工日誌。Source: TASKS.md（21 tasks／4 milestones）。

## 2026-07-07 — Sprint 啟動：SP-0 擷取請求發出＋M1 wave 1 派工
**Tasks:** T1.1（part A：工具與說明備妥，待使用者執行）；T1.2/T1.4/T1.5/T1.6/T1.7 派工中
**Verdict:** in progress
**Coordinator 決策：**
- T1.3（threshold+config）依賴 T1.2 的 `ColorSpec` 型別 → 移 wave 2
  （T1.2 DONE 後即派），其餘五 lane 檔案不相交、平行。
- SP-0 擷取工具落 `magi/05-statusline-builder/sp0/`（capture.ps1＋
  INSTRUCTIONS.md）；採 PS 5.1 相容 append JSONL（ConvertTo-Json
  -Compress 失敗時退原文單行）；statusline 顯示擷取計數供使用者確認。
- 開發 agent 一律要求檔案保底報告（`.t<id>-report.md`）＋逐項核對
  現狀防雙改（本機訊息通道掉件慣例）。

## 2026-07-07 — Coordinator 裁定：SP-0 延後、M2 以 provisional 體制先行
**Tasks:** T1.1（deferred）
**Verdict:** 授權偏差（使用者授權）
**背景：** 使用者遠端模式無法操作本機擷取（「我現在遠端模式沒辦法這樣弄
可以先跳過該東西嗎 先把相關步驟跟接下來先紀錄起來待我回去再使用」）。
**裁定內容（比照 sprint 04 mini-gate 順延前例）：**
- SP-0 擷取延後至使用者回本機；步驟＋回歸後對帳協定記錄於
  sp0/INSTRUCTIONS.md（§1–§3 擷取、§4 對帳七步）。
- M2 解除 hard gate、改以 **provisional 體制**續跑：mock-data.ts 由
  F1 轉述 schema 派生、「全部」segment 標 provisional（非僅 8 條件欄）；
  黃金檔照簽但於本檔標 provisional；SP-0 回歸後強制對帳（診 diff→改
  描述子→重生黃金→全矩陣重跑→拆標）。
- 風險承認：C3（轉述級 schema 三處一致地錯）部分回歸；緩解＝tri-path
  描述子單源（錯一處改一處）＋黃金可腳本重生＋對帳清單強制。
- 此裁定使 PLAN「SP-0 無降級路徑／M2 hard-gate」條文產生授權偏差，
  預期 review-code 標 DRIFT B 類（授權記錄在此）。

## 2026-07-07 — T1.2 DONE（SP-4＋color.ts）
**Tasks:** T1.2
**Verdict:** DONE
**Test result:** 447/447（npm test，TEST_EXIT=0；typecheck TSC_EXIT=0）
**Files touched:** tools/statusline-builder/color.ts、color.test.ts（僅此二檔，零新依賴）
**Developer 決策（全文見 .t12-report.md）：**
- ANSI256 表公式生成＋spot-check；SGR 兩層 API（esc 可注入，三後端共用建構規則——SP-5 byte-exact 前提落地）
- 0–15 基本色採 xterm 預設；autoFg 色軌一致（ansi256→16/231 端點）；clampAnsi256Index 供 config 複用
- **發現 PLAN D6 例示 off-by-one：`ANSI 137 #af8787` 應為 137=#af875f（#af8787=138）。裁定：公式為權威，PLAN 該例不改文（審計留痕），下游引用一律用公式值。**

## 2026-07-08 — session limit 全滅事件＋驗屍重生
**Tasks:** T1.3/T1.4/T1.5/T1.6/T1.7
**Verdict:** 重生續作中
**事件：** 2026-07-07 深夜五個 in-flight developer 同時死於 session limit
（reset 00:50 Taipei）。驗屍（磁碟痕跡）：T1.4 近完成（validate.ts＋67
測試已綠）、T1.5 五檔落盤未跑 harness、T1.7 原型 a/b 落盤缺 c＋量測、
T1.6 僅 devDeps 宣告（未 install）、T1.3 零產出。基線 npm test 447/447
綠（340 既有＋40 color＋67 validate）。
**處置：** 五位以「核對現狀、已套用則跳過、從斷點續作」guard 重生
（dev-t13b～t17b，model fable）——T1.4 改 verify-and-complete、
T1.5/T1.6/T1.7 resume、T1.3 fresh。

## 2026-07-08 — T1.5 DONE（SP-2 M1 ps1 encoding spike）
**Tasks:** T1.5
**Verdict:** DONE（dev-t15b 完工後才死於 API Overloaded——報告完整，無需重派）
**Test result:** harness 14 checks／0 failures、exit 0（.t15-report.md 全文）
**Files touched:** sp2/ 零改動（前任五檔全數核實可用）；報告檔
**關鍵結論：**
- 雙 BOM 契約成立：檔案 BOM 必帶（負向證據：去 BOM→CJK/U+E0B0 靜默毀損
  且 exit 0）；OutputEncoding UTF8Encoding($false) 輸出無 BOM。
- F11 註記：PS 5.1 連帶 BOM 靜態屬性也不噴 preamble（.NET Framework 剝
  除）——防禦仍保留，pwsh 7 交 CI 覆核。
- **新發現（coordinator 採納、已折入 PLAN 契約 8）**：PS 5.1 預設
  InputEncoding 非 UTF-8，stdin CJK 毀損；emit-ps1 檔頭須 Input＋Output
  兩行（probe-inenc 實證無損）。
- 生產 spawn 形逐字定稿：`powershell -NoProfile -ExecutionPolicy Bypass
  -File <abs forward-slash>`；本機無 pwsh，7 的覆蓋交 CI windows leg。
- **T2.5（emit-ps1）gate 解除**。

## 2026-07-08 — T1.4 DONE（validate.ts 拒收集 R）
**Tasks:** T1.4
**Verdict:** DONE（verify-and-complete：前任產出全保留，僅補一處）
**Test result:** 447/447（npm test exit 0）；validate 單檔 67/67；typecheck 0
**Files touched:** validate.test.ts（39 個 raw R 字元改 \uXXXX escape，
runtime 值不變——消 GitHub bidi 警示／目視審查盲區）；validate.ts 零改動
**前任契約沉默處選擇（.t14-report.md）：** 長度口徑＝code point（ZWJ
家族=7cp，測試釘死）；newline 擴納 U+2028/29；新增 lone-surrogate
reason；bidi 補 U+061C 成全集 12；ZWJ/VS16/膚色放行；reason 優先序＝
單趟首個 R 成員、字元類先於 too-long；空字串放行。

## 2026-07-08 — T1.3 DONE（threshold.ts＋config.ts）
**Tasks:** T1.3
**Verdict:** DONE（重生 fresh——驗屍確認零遺留後全新寫）
**Test result:** 518/518（22 files，TEST_EXIT=0）；typecheck 兩 tsconfig TSC_EXIT=0
**Files touched:** threshold.ts＋threshold.test.ts（30）、config.ts＋config.test.ts（41）
**Developer 決策（14 條全文見 .t13-report.md，關鍵三條）：**
- 四套模板取色公式驅動定案（traffic=[46,82,118,…,196] 等）；模板深凍結、UI 套用複製新 tuple
- config 清洗產出恆為 catalog.ids 排列（存檔序保留、缺段補末）；id 暫 string、M2 segments.ts 聯合型別後窄化
- threshold 兩級退場（形狀不可辨→丟欄；桶數≠10→校正）；auto-fg 不入 config、emit 期派生

## 2026-07-08 — T1.6＋T1.7 DONE；M1 自動化面收官
**Tasks:** T1.6、T1.7；M1 里程碑（T1.1 依裁定延後除外）
**Verdict:** DONE；coordinator 收尾驗證 npm test 518/518（22 files）exit 0
**T1.6（SP-1）：** 28 碼位全 MIT（Powerline ×5＋Octicons ×23，NF vendored
LICENSE 實讀）、零縮編；剔除記錄含 Codicons(CC-BY)/FA/MDI/Pomicons/品牌；
NF OFL 無 RFN 宣告→無改名義務；來源 Nerd Fonts v3.4.0 SymbolsOnly
（sha256 釘死）；產出 symbols-nerd-font-mono-subset.woff2＝3,556B
（<100KB）＋fontkit 28/28 讀回＋再生腳本雙路徑 byte-identical；
README（凍結表）＋LICENSE（OFL 全文＋MIT 署名×3）就位。
**font-dependent lane 解鎖**（T3.2 glyph／T4.2 字型斷言／兩條 font delta）。
**T1.7（SP-6）：** 三原型齊；量測——§1 到色步數 A 中位7/worst12、
B 中位4/worst恆4、C 中位11/worst22；§2 最壞全頁 90 色選實例：收合態
40 停（三候選同值，收合規則有效）、全展開 A/C 333停/23,678元素 vs
B 423停/2,168元素（A/C 內嵌不可行、強制 popup）；§3 觸控皆過；
§4 label 樣例零 PUA（負向 enforcement 可測，T2.2 沿用）。
**Coordinator 終裁（已回填 PLAN D6）：色選採候選 B（16 swatch＋
spinbutton）**；NVDA 覆核歸 T4.4，不過則回退 A＋共用 popup。
**里程碑判定：** M1 acceptance 達成（SP-0 pending 已記 provisional 範圍；
SP-1/2(M1)/4/6 結論入 WORKS；四純函式模組全綠）→ 進 M2（provisional
體制）。

## 2026-07-08 — T2.1 DONE（segments.ts＋mock-data，provisional）
**Tasks:** T2.1
**Verdict:** DONE（dev-t21 limit 陣亡→dev-t21b 續作：segments.ts 核對
全過零改動、補 segments.test.ts(60)＋mock-data.ts＋mock-data.test.ts(35)）
**Test result:** 613/613（24 files，TEST_EXIT=0）；typecheck 兩 tsconfig 0
**關鍵決策（全文 .t21-report.md）：**
- 目錄 24 段（worktree 保守併一，fallback 鏈三路同構、U+F418 備用碼位
  在 subset 內供拆段）；全段 provisional＋段別 note
- MockScenario 三通道（data/shell/env）；scenarioStdinJson 單一餵入口；
  情境恰 4 釘測（SP-0 對帳重建時同步更新）
- jqPath/ps1Path idiom 字面釘死（ps1Path='$d'+jqPath 機械同構）；產出
  腳本不得 Set-StrictMode、null 判定顯式 $null -eq
- formatCost float 下緣參考值 0.0029→$0.0028 釘為 SP-7 基準
- SP-0 對帳掛鉤段列明重做點（mock 重建/worktree 拆段隨動清單）

## 2026-07-08 — T2.2 DONE（resolve.ts＋emit-ansi.ts＋aria-label）
**Tasks:** T2.2
**Verdict:** DONE（訊息掉件、檔案保底生效）
**Test result:** 677/677（26 files，TEST_EXIT=0）；typecheck 0
**Files touched:** resolve.ts、emit-ansi.ts、resolve.test.ts(52)、emit-ansi.test.ts(12)
**關鍵決策（全文 .t22-report.md，9 條沉默處）：**
- oracle emission 規則＝逐 run 無條件 reset 前綴（stateless）＋行尾
  reset＋fg 先 bg——兩 shell 逐元素拼接即 byte-exact，SP-5 鎖死面
- run 粒度決定論：powerline 段恆單 run；plain 閾值＋head 非空＝唯一
  分裂（head 隨主色/value 隨桶色）
- SP-5 三情境 (a)(b)(c) 期望 bytes 已在測試字面釘住（T2.3 直接抄）
- **Coordinator 裁定（已回填 PLAN 契約 6）**：PUA 併入拒收集 R
  （T2.2 風險註記——前綴夾 PUA 會觸發 label enforcement TypeError）；
  落地歸 T3.3（UI＋validate.ts），containsPua 已 export

## 2026-07-08 — T2.3 DONE（SP-5 join spike，byte-exact 定案）
**Tasks:** T2.3
**Verdict:** DONE（dev-t23 交卷後死於 Fable limit；coordinator 親驗
harness 32/0＋npm test 677/677，證據充分無需重派）
**Test result:** SP-5 harness 7 組合×2 shell=32 checks/0 failures（HARNESS_EXIT=0）；npm test 677/677
**關鍵成果（全文 .t23-report.md）：**
- **byte-exact 成立**：三情境×cap 兩態×(Git Bash+jq／PS 5.1)＝14 真執行
  全與 emit-ansi(resolve()) 逐位元組相等，首輪即過。**oracle 語意定案
  ＝byte-exact，不退 canonical**；兩 emitter 黃金＋§3 斷言 gate 解除。
- join 演算法兩趟虛擬碼（§5）＝T2.4/T2.5 直接藍本；jq null idiom/桶索引
  /cost 補尾零切片全實測可用（§6）。
- **⚠ SP-7 前置重大發現（已折入 PLAN 格式化對等規則）**：PS 5.1
  ConvertFrom-Json 小數回 Decimal 非 double（0.0029 floor：Decimal 29
  vs double 28）→ 破同構前提；對策＝null 判定後顯式 [double] 轉型
  （已入 join.ps1 藍本）；**T2.5 必帶、T2.7/SP-7 必斷言 0.0029 兩形**。
- 環境定稿（T2.7 沿用）：Git Bash 真路徑 scoop（非 Program Files）、
  Get-Command bash 回 WSL 不可用 → 候選探測＋SP5_BASH 覆寫；jq 1.8.1
  便攜版 provenance 齊（sha256 對官方）——**是否入 repo 留 commit 期裁定**。

## 2026-07-08 — T2.5 DONE／T2.4 partial（雙撞 Opus limit 後 coordinator 驗屍）
**Tasks:** T2.4、T2.5
**Verdict:** T2.5 DONE；T2.4 partial（4 端到端 byte-exact 紅）
**背景：** dev-t24／dev-t25 交卷前雙撞 Opus session limit（無報告）。
coordinator 跑 npm test：745 tests（677+68），741 過、4 紅全在
emit-bash.test.ts 端到端。
**T2.5（emit-ps1）：** 全綠——product＋黃金（含檔案 BOM）＋端到端
byte-exact（PS 5.1，[double] idiom 生效）全過。無報告但測試證據充分，
判 DONE。
**T2.4（emit-bash）4 紅診斷（coordinator）：** 單一根因＝cwd variant
路徑轉換錯——(1) tilde variant 未把 $HOME 收成 `~`（產全路徑）；
(2) basename variant 對 CJK 路徑產空段。真相源＝segments.ts formatPath；
emit-ps1 同 variant 全對＝bug bash 專屬。結構斷言＋黃金比對＋其餘
28 端到端案全過。→ 派 dev-t24-fix。

## 2026-07-08 — T2.6 DONE（emit-settings＋SP-2 時間路徑定案）
**Tasks:** T2.6
**Verdict:** DONE
**Test result:** emit-settings 21/21；typecheck 0；npm test 766/766（dev-t26
自報——含 T2.4 4 紅已消，但那是 dev-t24fix 平行 lane 狀態，T2.4 待其自報＋親驗）
**Files touched:** emit-settings.ts、emit-settings.test.ts、sp2/time-probe.mjs
**SP-2 時間路徑定案：**
- jq `strflocaltime("%H:%M")` **可用**（jq 1.8.1 直吃 epoch）→ 採 jq 路徑，
  date -r/-d fallback 僅留 F13 反面分支。
- ps1 `[DateTimeOffset]::FromUnixTimeSeconds().ToLocalTime().ToString('HH:mm')`
  本機可用。三後端 jq==ps1==TS 逐字相等。
**⚠ FOLLOW-UP（掛帳，T2.7 前補或併入）：** emit-bash 的 resets 後綴
**尚未落地**（emit-bash.ts 未動、percent-reset 暫等同 percent）；idiom 已
定案＝`<resetsAt.jqPath> | if type=="number" then " ("+strflocaltime("%H:%M")+")" else "" end`。
需落地 emit-bash.ts＋對應黃金/端到端案。
**契約沉默處：** 片段＝完整 {statusLine:{...}}；空白路徑雙引號包覆；
refreshInterval clamp ≥1 整數；只計啟用段。

## 2026-07-08 — T2.4 DONE（emit-bash 4 紅修復）
**Tasks:** T2.4
**Verdict:** DONE（dev-t24fix；coordinator 親驗 npm test 766/766＋typecheck 0）
**兩獨立根因（修正 coordinator 原診斷分組：實為 1 tilde＋3 basename）：**
- basename（×3，真 emitter bug）：jq regex 跳脫少一層——源 `[/\\\\]+` 產出
  .sh 剩 2 個 \→jq 解成 `[/\]+`→oniguruma char-class `]` 被跳脫不收口→
  premature end of char-class→jq 出錯段死。修：源改 8 個 \。重生黃金**僅
  powerline-rich.sh 一行變**（其餘 6 檔 byte 不變），diff 人審合預期。
- tilde（×1，harness artifact 非 emitter bug）：coordinator「缺 HOME」假設
  證偽（L201 本有 HOME）；真因＝MSYS 引數轉換把 `--arg home /home/alan`
  mangle 成 `C:/Users/.../home/alan`。真 POSIX 目標無此轉換、tilde 邏輯正確。
  修在 harness：env 加 `MSYS_NO_PATHCONV: '1'`（非 win32 空操作）。黃金不動。
**變更 3 檔：** emit-bash.ts、emit-bash.test.ts、__golden__/powerline-rich.sh。

## 2026-07-08 — Coordinator 裁定：授權 T2.7 修 emit-ps1 shell-out bug
**Tasks:** T2.7（進行中）
**Verdict:** 授權擴權（scope 偏離，coordinator 批准）
**背景：** dev-t27 新建的真執行 harness（T2.7 章程正為抓跨後端分岔）抓到
emit-ps1.ts 真 bug——shell-out 段 `[string](AutomationNull)` 回 $null 非 ''，
PowerShell `$null -ne ''` 為真 → 守衛誤觸發：乾淨 repo git-dirty 誤顯 `*`、
detached/unborn HEAD 誤留空字段。與 emit-bash（`[ -n ]` 正確剔）＋oracle
（isValueDead 剔）分岔。dirty 態三後端一致，僅空輸出案分岔。
**為何 T2.5 沒抓到：** emit-ps1.test.ts fullBehaviorCases filter 掉
git-branch/git-dirty/clock，shell-out 段從未真執行——**e2e 覆蓋盲區**。
**裁定 (A)：** 授權 dev-t27 修 emit-ps1.ts（1 行：`$null -ne $so -and
$so -ne ''`）＋重生 plain-full.ps1（人審 diff）。理由：真 bug、極小、合檔內
顯式 $null 慣例、不修 M2 末棒帶紅；「emit-ps1 不得動」邊界建於「它正確」
前提，harness 證偽該前提故擴權。要求補 shell-out 真執行覆蓋（乾淨/髒/
detached/unborn ×兩後端）鎖回歸。
**DRIFT 掛帳：** T2.5「DONE」帶潛伏 bug（shell-out e2e 覆蓋盲區），由 T2.7
harness 首度抓到——review-code 應記為測試覆蓋 C 類觀察。

## 2026-07-08 — T2.7 DONE；M2 里程碑收官
**Tasks:** T2.7；M2 里程碑（T1.1/SP-0 依裁定延後除外）
**Verdict:** DONE；coordinator 親驗 npm test 820 pass／19 skip（全 pwsh7）／
0 fail／exit 0＋typecheck 0
**T2.7 交付：**
- Step 0 emit-bash resets 後綴落地（jq strflocaltime）；黃金 .sh byte 全不變
  （無黃金 config 用 percent-reset）；emit-bash.test.ts 36→40（+4 percent-reset
  e2e byte-exact）
- pipeline.integration.test.ts：SP-7 三後端字面相等（cost 補尾零／**0.0029
  兩形證 [double]==$0.0028**／duration／context-size／percentage，bash+jq＋
  ps1 5.1 真跑）＋resets 三後端一致＋shell-out 五態 byte-exact 等價＋skipIf
  meta（bash/ps1 present 不得 skip、pwsh7 skip+reason）＋hexEqual 正負自測
- **emit-ps1 shell-out bug 修（coordinator 授權 (A)，已追認）**：
  `if ($null -ne $so -and $so -ne '')`；重生 plain-full.ps1（Compare-Object
  恰 2 行守衛、powerline-threshold 不變）
**里程碑判定：** M2 acceptance 達成（resolve→emit 全鏈綠、黃金簽入、
本機 ps1+bash 真執行 byte-exact、SP-5/SP-7 結論入 WORKS、黃金 diff 人審）。
**依使用者「先跑 m1 m2」指示：於 M2 邊界停。** M3（UI）／M4（CI/deltas/
使用者 gate）待後續；SP-0 待使用者回本機補做＋對帳。

## 2026-07-08 — T3.1 DONE（index.html＋style.css）
**Tasks:** T3.1
**Verdict:** DONE（build 綠；T3.2 lane 平行中，最終全套驗證俟兩 lane 齊）
**Test result:** npm run build BUILD_EXIT=0（工具頁進 dist：index.html 29.33kB
＋tool-statusline-builder-*.css 8.68kB，三工具＋root 無回歸）；typecheck 0
**Files touched:** index.html、style.css、**＋最小 main.ts stub（見裁定）**
**a11y 契約逐條落地：** 四類分區 landmark＋heading＋skip、停用列收合、色選
三態＋SP-6 pattern B、閾值 disclosure（button aria-expanded）、mode radio、
常駐 live region（error/global/move/output，is-empty/sr-only）、預覽 role=img
＋深淺底＋mock radiogroup（各 legend）、Nerd Font 常駐橫幅（內容切換非
display:none）、三產出區 heading＋pre＋名帶產物別之複製/下載鈕、觸控 ≥24px。
**Coordinator 裁定（scope 偏離，批准）：** T3.1 加最小 main.ts stub（2 行
CSS import＋註解、零 UI）——vite glob 要求可解析 ./main.ts，否則 build 失敗；
scope「只動兩檔」與 done「build 綠」張力，stub 極小、T3.3 整份覆寫、無 lane
衝突、未自行刪檔。DOM 結構契約表（3 template＋id/class/data-* 命名，對齊
segments/config/color/threshold/mock-data）交 T3.3。
**給 T3.2 協調點：** `#preview-terminal` font-family 首選 `'Symbols Nerd
Font Mono'`——T3.2 @font-face family 名須對齊；深淺底＝--dark/--light；
preview span aria-hidden、SR 文字走 role=img aria-label。

## 2026-07-08 — T3.2 DONE（render-preview.ts＋字型接線）
**Tasks:** T3.2
**Verdict:** DONE（coordinator 親驗：build EXIT=0、npm test 831 pass/19 skip/0 fail、typecheck 0；T3.2 觀察之「build 紅」係平行時序，T3.1 stub 落後即綠）
**Test result:** 831 pass/19 skip（+11 render-preview.test.ts 純函式）
**Files touched:** render-preview.ts、render-preview.test.ts、preview-font.css
**controller API（給 T3.3）：** createPreview({container:#preview-terminal,
hint:#nerd-font-banner, config, scenarioId, theme}) → setConfig/setScenario/
setTheme/setNerdFontActive/describeWithHint（已對齊 T3.1 DOM）。
**★Coordinator 裁定（字型 dist 落點——推翻 PLAN 假設，記 DRIFT）：**
subset woff2＝3,556B ＜ Vite assetsInlineLimit(4096) → **base64 inline 進
CSS chunk、dist 無獨立 .woff2**（實測）。PLAN「Vite 搬 dist/assets 獨立檔
＋<100KB byte 斷言」假設不成立（同 sprint04 BASE_URL 類 Vite 實態）。
**採路 A**：T4.2 verify-dist 斷 statusline CSS chunk 含 `data:font/woff2;
base64,`；byte 上限守衛移至**源檔** tools/statusline-builder/fonts/*.woff2
（已簽入 3,556B）。不改 vite.config（路 B 否決——3.5KB inline 無弊）。
**font-family 小冗餘（非阻斷）：** T3.1 class 名 'Symbols Nerd Font Mono'
vs T3.2 @font-face '...Subset'＋inline 覆寫勝出——T3.3 接線時消化。

## 2026-07-09 — T3.3 DONE；M3 里程碑收官
**Tasks:** T3.3；M3 里程碑
**Verdict:** DONE（dev-t33 死於暫時性逾時→dev-t33b 重試成功；coordinator
親驗 npm test 831 pass/19 skip/0 fail、typecheck 0、build EXIT=0、**字型
inline 進 statusline CSS chunk True**）
**T3.3 交付：** main.ts 759 行整份覆寫 stub；狀態機＋localStorage（重整不丟）
＋24 段四類清單＋色盤 pattern B＋閾值 disclosure＋mode 切換播報＋前綴 PUA
拒收（validate.ts＋containsPua）＋下載 BOM byte 級（.ps1 首 ef bb bf／.sh
無 BOM＋LF／settings UTF-8）＋三產出複製/下載。預覽/字型/提示全走 T3.2
controller（未自 resolve）。
**字型 inline 路 A 驗證：** tool-statusline-builder-*.css 含 data:font/woff2;
base64（3,556B <100KB），dist 無獨立 woff2 → T4.2 verify-dist 採路 A。
**⚠ review 待裁（記 DRIFT C 類）：** T3.1 style.css `.color-picker__panel`／
`.control-subfield` 之 `display:flex` 蓋過 UA `[hidden]{display:none}`（src/
style.css 輕量 reset 未含 `[hidden]{display:none!important}`）→ 純 hidden 屬性
切換視覺無效。dev-t33b 於 main.ts 以 setHidden()（hidden 屬性＋inline display）
workaround、功能已足。**根治建議＝src/style.css 補 `[hidden]{display:none
!important}`（全 repo 通用）**——跨 4 工具共用 CSS，coordinator 不自寫，交
review-code 裁。
**契約沉默處：** settings target 由 #settings-path 副檔名推斷（.ps1→windows）；
fg-override「終端預設」＝清除覆寫回 auto-fg；閾值桶用全名 legend 命名。
**里程碑判定：** M3 acceptance 達成（dev 冒煙全鏈可走、a11y 結構面逐條落地、
build 綠含字型）。實機互動/SR/MOTW 歸 T4.4 SP-3。**依 /magi:go m3 單一里程碑
指令，於 M3 邊界停。**

## 2026-07-09 — T4.2 DONE（時序閘：tools.ts available＋tripwire＋verify-dist）
**Tasks:** T4.2
**Verdict:** DONE（coordinator 親驗 npm test 834 pass/19 skip/0 fail、build
EXIT=0、verify:dist all checks passed）
**Test result:** 834 pass（+3＝第四工具經三 it.each 各衍生一例）；tripwire
toBe(4) 過；typecheck 0
**Files touched:** src/tools.ts（+statusline-builder available）、src/tools.test.ts
（toBe(3)→toBe(4)）、scripts/verify-dist.mjs（ENTRY_ANCHOR_SLUGS ×4＋字型路 A
斷言）；3 files、+60/-5
**字型路 A 落地驗證（非空）：** CSS_HAS_INLINE_FONT=True、DIST_WOFF2_COUNT=0、
源檔 woff2=3556B<102400——與 T3.2 裁定一致。入口頁 4 卡片（4 anchor 過即證）。

## 2026-07-09 — T4.3 DONE（Spec deltas 落地）
**Tasks:** T4.3
**Verdict:** DONE（純文件；npm test 834/19/0 不受影響）
**Files touched:** SPEC.md、CLAUDE.md、magi/PRD.md、magi/TECHSTACK.md、
README.md；5 files、+60/-6
**逐條落地（照 PLAN r2.1 §Spec deltas）：**
- SPEC ×4：overview 軟化／Components 增列／Conventions 兩處（絕對-URL 縮限
  ＋非執行型靜態資產條文）／Status 四工具
- CLAUDE ×1：枚舉增第四項
- PRD ×2：Problem 定位句＋Goals 增列
- TECHSTACK ×2：Framework（零依賴＋**依 T3.2 裁定寫「Vite base64 inline
  進工具 CSS chunk」，非 PLAN 舊 dist/assets 假設**）＋Deployment（test.yml
  ＋deploy windows leg）
- README ×4：Tools 表／第三方元件（讀 fonts/README＋LICENSE 取正確事實：
  28-glyph 3556B、nerd-fonts v3.4.0、Powerline+Octicons MIT、OFL 1.1 散布、
  無 RFN）／注意事項段（schema 基準 v2.1.196／changelog v2.1.169＋重核
  checklist＋MOTW/Unblock-File/GPO 提示）
**對帳掛鉤：** commit §2.5 declared={SPEC/CLAUDE/PRD/TECHSTACK}＋README
（root-sync）→ 應 D3 match。

## 2026-07-09 — T4.1 DONE（CI test.yml＋deploy.yml windows leg）；M4 自動化面收官
**Tasks:** T4.1；M4 里程碑（自動化面）
**Verdict:** DONE（yaml 合法 PyYAML 兩檔過；npm test 不受影響 exit 0；CI
實際綠在 push 時確認——本機無法跑 GHA，同 sprint01 deploy.yml 前例）
**Files touched:** .github/workflows/test.yml（新 36 行）、deploy.yml（+31 純插入）
**設計：** test.yml push DEV＋PR main、matrix ubuntu+windows、Ensure jq(Linux)、
fail-fast:false；deploy.yml 新增 windows-test job（ps1 5.1/pwsh7 真執行）＋
build needs: windows-test（部署前置、不依賴 branch protection＝PLAN nit #9）；
Option B（內嵌 needs）非 workflow_run。
**harness 跨平台評估（證偽 coordinator 疑慮）：** detectBashExec 非 win32 分支
用 spawnSync('jq','--version') 探系統 jq → ubuntu-latest 內建 bash+jq → BASH.ok
=true、ubuntu leg 真跑；windows leg 使 19 本機 skip 的 pwsh7 轉真跑。skipIf
meta 每後端有 leg 真跑，不違反。
**🔴 COMMIT 期前置（交 /magi:commit 確認，非本任缺陷）：**
- `tools/statusline-builder/` 全 untracked——commit 須一併簽入**全部**測試檔＋
  harness，否則 CI checkout 無 harness → 真執行 gate＋skipIf meta 靜默缺席、
  workflow 綠但語意歸零。
- `scripts/statusline-golden-configs.ts`、`golden-statusline*.mjs`、
  `subset-statusline-font.mjs` 同須入庫。
- package.json/package-lock.json 須同步入庫否則 npm ci 全 leg 紅。
- 便攜 jq（sp5/tools/jq-windows-amd64.exe，1MB win exe）是否入 repo：兩態皆穩
  （入庫＝本機 win 真執行有 jq；不入＝CI 用系統 jq、本機 win dev 需自備）——
  commit 期裁定。
**里程碑判定：** M4 自動化面（T4.1/T4.2/T4.3）達成。**T4.4 SP-3 使用者總
gate 延後**（同 SP-0，需本機實機＋SR）。Sprint 05 實作面（M1–M4 自動化）完成。

## 2026-07-09 — Post-review fixes DONE（4 Important＋近端 Notes）
**Tasks:** S5-Post-review（task #74）
**Verdict:** DONE（coordinator 親驗四閘：npm test 849 pass/19 skip/0 fail、
typecheck 0、build 0、verify:dist all checks passed；[hidden] 規則 Grep 確認
src/style.css:53）
**四 Important 修訖：**
1. PUA 併入 validate.ts 單一咽喉（PUA_RE `\u{E000}-\u{F8FF}`＋補充平面、顯式
   轉義非字面字元）→ config 清洗＋main 自動受惠、持久化 PUA 前綴剔除不崩潰；
   resolve containsPua 保留為第二道。+PUA property/roundtrip 測。→ **A 類清帳**
2. emit-ps1 bare-head reset 收進 head!=='' 分支 → head 空時 ps1==oracle==bash
   單 reset。黃金**未重生**（無 config 落此格）。+pipeline byte-exact 回歸鎖
   （win32 真跑，修前會紅）。→ **A 類清帳**
3. emit-bash full-behavior 三情境真執行案（21 非 shell-out 段含 worktree 兩
   fallback 路徑）→ 6 段 bash 零覆蓋補齊。win32 真跑綠。
4. [hidden]{display:none!important} 補 src/style.css reset＋setHidden 簡化為
   只切 hidden 屬性；四工具 build 綠。**跨工具**：一併修好其餘三工具
   .button-like 按鈕 .hidden 切換原不生效之潛伏 bug（未改那三工具 JS，
   目視歸各工具 pending 人工 gate）。
**近端 Notes：** INSTRUCTIONS 25→24、package.json golden:update 別名、
resolve PUA_RE \u 轉義（併 #1）。
**測試 834→849（+15 全 pass，無新 skip）。** tracked 新改：src/style.css
（+[hidden]）、package.json（+golden:update）——另有 sprint 05 既存未 commit
change set。
**DRIFT 更新：A 類 2 項已清（→ none）；C 類 5 項標已修。**

## 2026-07-09 — SP-0 §4 對帳 DONE；T1.1／SP-0 收官（worktree 拆段 24→25）
**Tasks:** T1.1（SP-0 真機 fixture 對帳；task #53）
**Verdict:** DONE（coordinator 親驗：npm test 850 pass/19 skip/0 fail、
typecheck 0、build 0、verify:dist all checks passed；bash+jq 與 win32 pwsh
兩後端 full-behavior byte-exact 真跑，含新段 worktree-branch）
**擷取集：** 使用者本機 73 筆真 stdin（凍結 `fixtures/stdin-dump.jsonl`；剝
BOM、逐行 re-stringify、73/73 parse 成功）。涵蓋 null 期（used%/remaining%/
current_usage 各 null×4）、rate_limits 在席 69/73、session_name 67/73、effort
恆在（xhigh）、agent 1/73、worktree 1/73（L22）。
**逐欄對帳結論（證據＝真檔）：**
- **全部 24 tri-path jqPath 命中真檔、無一錯路徑**（C3 於此批未觸發）。
- **null 三態坐實**（欄位恆在、值 null×4＝首回應前／compact 後）；**resets_at
  epoch 秒坐實**（1783575600≈2026-07，[double]／FromUnixTimeSeconds 正確）；
  shape 確認 rate_limits／repo／effort／agent／current_usage。
- **worktree 雙表述判定＝獨立並存**（L22：workspace.git_worktree 名稱 ＋
  top-level worktree 物件 {name,path,branch,original_cwd,original_branch} 同時
  出現、名稱同值、branch 為額外資訊）→ **依 PLAN 名目拆回兩段**（worktree
  名稱＋worktree-branch 分支；glyph U+F414／U+F418 subset 早備）。**目錄
  24→25 段（＝PLAN 名目，DRIFT B「保守併一」項解消）。**
- **新欄位 fast_mode（73/73 boolean）／agent_type（1/73，與 agent.name 同值）**
  ——超 PLAN 25 段契約，使用者裁定記 backlog（DRIFT C）；型別加入 StatusData
  存查、v1 不設段。
- **vim-mode／pr 從未出現**（0/73；vim 本環境＝Unknown command、DEV 無開 PR）
  → 依使用者裁定**維持 provisional**，其餘 23 段拆標。
**程式碼變更（coordinator SP-0 §4 授權：診 diff→改描述子→重生黃金→全矩陣重跑→拆標）：**
- segments.ts：+worktree-branch 描述子（tsPath `.worktree.branch`；glyph 以
  `String.fromCodePoint(0xf418)` 建構避 PUA 字面損毀）；StatusData.worktree 擴形
  ＋fast_mode/agent_type；全目錄 provisional=false 除 vim-mode/pr；拆 stale note。
- mock-data.ts：full 加 top-level worktree 物件（鏡射 L22 並存、供 branch）、
  windows-cjk worktree 加 branch（CJK）。
- 測試：segments.test／mock-data.test／emit-bash.test／emit-ps1.test 全段清單
  ＋計數（24→25、conditional 7→8）＋icon/nullPolicy 表＋provisional 測試（改測
  「僅 vim-mode/pr」）＋legacy 遷移測試（worktree-branch 現為合法 id）更新。
- golden-statusline-ps1.mjs plain-full 加 worktree-branch → **重生 plain-full.ps1
  （+1 段區塊；powerline-threshold 不變）**。bash 黃金不動（無 config 用 worktree）。
**測試 849→850（+1 net；D1/full-behavior 等衍生案含 worktree-branch）。**
**mock 情境 provisional=true 續留**（語意＝合成非擷取派生，所依 schema 已驗）。
**T1.1／task #53 勾銷；SP-0 收官。** commit 期須一併簽入 `fixtures/stdin-dump.jsonl`。
