# Sprint 05（statusline-builder）逐份報告整合摘要

本檔為 sprint 05（Claude Code statusline 產生器）開發期間產出之 **34 份**
逐份審議／任務報告（`.pr*-plan-report.md` 10 份、`.cr*-report.md` 5 份、
`.t*-report.md` 18 份、`.postfix-report.md` 1 份）之整合摘要。原始 34 份
dotfile 已於 **2026-07-18** 清理，**本檔為唯一留存紀錄**。

工具程式碼內若見到形如 `.t23-report §5`、`.t31-report.md「DOM 結構契約表」`
之註解引用（例：`emit-bash.ts:3`、`emit-ps1.ts:3`、`index.html:46,704`、
`main.ts:14-15,415,481,560`、`render-preview.ts:368`），即指向原報告——
對應摘要見本檔「二、任務報告」對應 T 編號小節。

## 重大決策速查（跨報告貫穿線索）

| 決策 | 裁定者／時間 | 內容 | 詳見 |
|---|---|---|---|
| SP-0 延後 → provisional 體制 | WORKS 2026-07-07 | 真機 fixture 擷取延後；全 24 segment／4 mock 情境標 `provisional:true`，由測試機械斷言防漏標 | T2.1 |
| 字型 dist 落點＝路 A（base64 inline） | WORKS T3.2, 2026-07-08 | subset woff2 3,556B ＜ Vite `assetsInlineLimit`(4096) → inline 進 CSS chunk，非獨立 `dist/assets/*.woff2` 檔；verify-dist 斷言與 SPEC/TECHSTACK delta 皆據此改寫 | T3.2、T4.2、T4.3 |
| emit-ps1 shell-out 存活守衛修正（授權擴權 (A)） | WORKS T2.7, 2026-07-08 | `$so -ne ''` → `$null -ne $so -and $so -ne ''`；乾淨 repo 誤顯 `*`／detached 誤留空段之 bug 修復＋回歸鎖 | T2.7 |
| `[hidden]` CSS 根治 | WORKS T3.3 交 review 裁 → postfix Important 4 落地 | `src/style.css` 補 `[hidden]{display:none!important}`；main.ts `setHidden` 簡化 | T3.3、CR3、postfix |
| PUA 拒收落點修正（A 類違約→postfix 修復） | CR5 抓出 → postfix Important 1 | PUA 判定併入 `validate.ts` 單一咽喉（`validateCustomText`），修復 config 持久化繞過清洗致 init 崩潰 | CR5、postfix |
| emit-ps1 plain 閾值 bare-head 多一 reset（byte 分岔） | CR2 抓出 → postfix Important 2 | head 空時多餘 `$e[0m` 收進 `head!==''` 分支 | CR2、postfix |
| emit-bash 缺全段真執行案 | CR4 抓出 → postfix Important 3 | 補 21 段 full-behavior 真執行（含 worktree 兩 fallback 路徑） | CR4、postfix |
| worktree 雙表述保守併一 | PLAN 授權＋SP-0 判定前預設 | `workspace.git_worktree` 優先 fallback `worktree.name`，24 段（非名目 25） | T2.1、CR1 |
| SGR emission 規則／oracle 語意＝byte-exact | T2.2 定義 → T2.3(SP-5) 實測定案 | 逐 run 無條件 reset 前綴（stateless）、fg 先 bg、行尾恆 reset；14 組合×2 shell 全 byte-exact，不退 canonical 正規形 | T2.2、T2.3 |
| ps1 雙 BOM／編碼契約 | T1.5(SP-2 M1) 實測定案 | 檔案 BOM（原始碼）＋`UTF8Encoding($false)`（輸出，無 BOM）＋`InputEncoding` 同款（CJK stdin 往返）三線並存 | T1.5 |
| PS 5.1 Decimal 陷阱 | T2.3(SP-5) 發現 → T2.7(SP-7) 驗證 | `ConvertFrom-Json` 小數回 Decimal 非 double；數值消費點需顯式 `[double]` 轉型（於 `$null` 判定之後） | T2.3、T2.7 |
| jq `strflocaltime` 時間路徑 | T2.6(SP-2 殘項) 實測定案 | jq 1.8.1 可用，採 jq 路徑；三後端（jq／ps1 DateTimeOffset／node-TS）同 epoch 同 HH:mm | T2.6、T2.7 |
| 色盤 pattern 終裁＝候選 B | T1.7(SP-6) 量測 → coordinator 終裁 | 16 基本色 swatch＋0–255 spinbutton；鍵盤中位 4 步／worst 恆 4，唯一內嵌可行（A/C 強制 popup 化） | T1.7 |

---

## 一、計畫審議（pr 系列）— PLAN.md 多鏡頭審議

五鏡頭 × 二輪（round 1 / round 1b）對 `PLAN.md` 進行審議，round 1 聚焦找問題，
round 1b 驗證 round 1 採納項是否真折入＋複核新引入契約段。

### pr1 — 鏡頭1／5：事實查核／外部契約（round 1，REQUEST-CHANGES）
Critical：黃金矩陣與條件式真執行餵的都是**轉述級 schema 手寫的 mock**，只能證三後端彼此一致、不能證與真實 Claude Code stdin 一致；唯一真機閘 SP-3 排在末端，測試全綠不代表 schema 對。Important 五項：jq `// empty` 與「null→`--`」語意矛盾且需 join-skip-empty 演算法；PS `[Console]::OutputEncoding=[Encoding]::UTF8` 帶 BOM 會噴進輸出；Nerd Font SP-1 先凍結字符後盤點授權順序反了；Windows `.ps1` 下載會有 MOTW／ExecutionPolicy 阻斷未點名；預覽 self-host 字型但產出腳本靠使用者終端字型，忠實度落差未警示。建議新增前置阻斷級 spike：真機掛一次 `jq . > dump.json` 擷取真實 stdin 簽入為 canonical fixture。

### pr1b — 鏡頭1／5 round 2（APPROVE-WITH-NITS）
round 1 全部採納項（C3 真機閘、null 三態 idiom、OutputEncoding 無 BOM、SP-1 授權驅動、MOTW wrapper、Nerd Font 提示、jq strflocaltime、Convention provenance、PRD Problem 調和）皆已折入。新 Important：SP-0 的 `> dump.json` **單快照覆寫**驗不了它自己列出的「nullability 時序／enum 集／條件性存在」三類 claim（因這些量隨狀態而變、單一時刻取不全）；建議改為跨狀態序列 append JSONL＋腳本化操作序列引導使用者觸發各狀態。次要：擷取指令本身依賴 jq，對「無 jq 的 Windows 機」自相矛盾。

### pr2 — 鏡頭2／5：架構／三後端一致性（round 1，REQUEST-CHANGES）
Critical：**powerline 轉場著色**（箭頭 fg=前段bg／bg=後段bg）是執行期累加＋兩趟 join 演算法，PLAN 完全未設計、未 spike、也不在既有 mock 情境覆蓋內——這是本 sprint 唯一賣點「三後端語意一致」最硬的一段。Important 五項：tri-path（TS/jq/ps1 取值路徑）單源機制被手工分散三處，黃金文字矩陣抓不到打錯的 jq path；閾值索引 `min(floor(p/10),9)` 缺下界 clamp，負索引在 bash/ps1 取末元素、TS 取 undefined，三後端靜默分岔；powerline+閾值的 auto-contrast fg 是執行期量卻未建模，應改為 emit 期預算成對陣列（bg buckets + auto-fg buckets）而非 shell 內算亮度；格式化函式（cost/duration/context-size）三後端捨入對等未測；產出腳本需無條件 `exit 0` 但 PLAN 只寫了 jq 缺件情境；config 反序列化需容忍目錄變動（drop-unknown-and-continue）但語意含糊。

### pr2b — 鏡頭2／5 round 2（APPROVE-WITH-NITS）
Critical 與全部 Important 皆真正折入：join 契約成段＋SP-5 spike、tri-path 描述子入型別、閾值上下界 clamp＋jq 端 floor、成對 auto-fg、exit-0 全面不變量、config drop-unknown＋localStorage 切線、emit-ansi oracle。新 Important 三項：powerline 下 **dash-null 段的 bg／箭頭交接色未定義**（存活但不套閾值色，bg 無來源）；`ThresholdRule` 恆長 10 只是註解非型別（`ColorSpec[]` 非 10-tuple），config 清洗未列桶數校正；**ps1 exit-0 用 try/catch 擋不住 git 原生退出碼**（PowerShell try/catch 只捕終止性錯誤，需顯式 `exit 0` 覆蓋 `$LASTEXITCODE` 洩漏）。

### pr3 — 鏡頭3／5：前端 UI／a11y（round 1，REQUEST-CHANGES）
Important 五項：預覽 `aria-label` 會混入 PUA glyph，`StyledRun` 型別缺 SR 安全文字通道；256 色盤的鍵盤（一維 roving 穿行 256 色不可用）／觸控／命名成本被低估，且驗證排在 SP-3 末端太晚；閾值編輯器最壞情形 4×10 桶×fg/bg 控件數爆炸＋嵌套 256 色盤，無揭露策略；~25 個複合 segment 列清單無 skip／分區機制，違反根 SPEC「大量項目」不變量；套模板／mode 切換的批次與視圖切換播報缺漏。建議把色盤 a11y 提前為 M1 早期 spike。

### pr3b — 鏡頭3／5 round 2（APPROVE-WITH-NITS）
#17–20 全折入（色盤 pattern 提前 SP-6 M1＋三候選＋NVDA 實測、閾值 disclosure、四分區＋skip＋停用收合、批次/mode 播報＋帶值控件 label[for]）。#16（`StyledRun.ariaText`）partially：新措辭「省略→fallback text」對箭頭／icon 這類 `text` 本身即 PUA 的 run 是陷阱，與「PUA 不進 label」自相矛盾；且組裝後 aria-label 落在 browser-only、不流入任何黃金／oracle，僅靠 SP-6 一次性 SR 實聽，無 node 可測回歸鎖。另兩項新缺口：常駐 Nerd Font 提示的 SR 呈現機制（提示 vs 播報）未定，恐撞根 SPEC L63 顯隱陷阱；每列每控件 accessible name 未明訂承載 segment 身分（full-25 下 25× 同名不可辨）。

### pr4 — 鏡頭4／5：測試／驗證策略（round 1，REQUEST-CHANGES）
Critical：現行 CI **只有 ubuntu runner、只在 push main 觸發**，`powershell.exe` 只存在 Windows——**ps1 後端（風險最集中的後端）在此拓撲下永遠沒有自動化 merge gate**，CI 綠對它零背書。建議補 `windows-latest` CI leg，並列出「環境×後端×gate 定義」矩陣。Important 四項：三後端比對 oracle（`StyledRun[]`→ANSI 序列器）未定義、比對函式本身未列入測試；黃金檔用語「snapshot」有歧義，恐重新引入 `--update` 無腦洗回歸（repo 慣例是簽入可讀黃金＋`toEqual`）；escaping vs 輸入驗證職責界線未劃定，換行/NUL/bidi/ZWJ emoji 等對抗矩陣有缺口；字型資產 verify-dist 斷言未對齊 Vite 資產管線（woff2 經 `@font-face` 會被雜湊改名搬到 `dist/assets/`）。

### pr4b — 鏡頭4／5 round 2（APPROVE-WITH-NITS）
round 1 Critical（ps1 零 merge gate）**實質解決**：windows leg 落地，ps1 於每次 DEV push 真執行。5/6 項 resolved（emit-ansi oracle 獨立模組、黃金簽入可讀＋禁 snapshot、escaping 職責表完整、字型 dist build 實測＋100KB 上限、ps1 黃金 SP-2 時序閘）。殘留 Important：矩陣「阻擋」二字在未確立 branch protection、且 **deploy.yml 部署路徑仍 ubuntu-only** 下對 main 邊界高估保障（`push:[main]` 事件不觸發 `test.yml`）；「格式化·三後端字面相等」斷言歸錯到 node 單元層（bash/jq、ps1/pwsh 非 node 可算，應歸真執行層）；tri-path 描述子「杜絕 jq path 打錯」措辭過度宣稱——並置≠交叉驗證，取值層仍只有真執行覆蓋。

### pr5 — 鏡頭5／5：風險／範圍／Spec deltas（round 1，REQUEST-CHANGES）
Important 四項：Spec deltas 新 Conventions（`<100KB` 直接簽入）與既有「載入一律顯式絕對 URL」條文有實質張力，字型走 CSS 相對 url() 未被涵蓋或縮限；v1 範圍是歷來最肥的一次（~11 模組／~25 segment／三後端矩陣），建議把 8 個長尾條件性 segment 砍進 fast-follow backlog（**此建議後被使用者否決，v1 維持全 25**）；SP-1 阻斷級失敗會廢掉 2/4 font-related delta 與整片 glyph 模組，PLAN 未告知 TASKS 要在 M1 分叉 lane；SP-2「M2 前」須配合 emit-ps1 及其黃金檔嚴格 gate 才夠早；Open questions 過半無拍板時點/拍板人。

### pr5b — 鏡頭5／5 round 2（APPROVE-WITH-NITS）
本鏡頭 8 項採納全數 resolved（親開四份目標文件驗證）：Conventions 自洽化（載入機制軸 runtime JS/wasm + 性質軸靜態資產 + provenance）、M1 雙 lane＋font-dependent 硬 gate SP-1、SP-2 ps1 提前 M1、Open Q 全拍板（Q4 自訂前綴進 v1）、PRD Problem 調和、root-sync 子段、Status 措辭、資料資產歸屬。使用者拍板的全-25 範圍被尊重、未偷砍。新 Important：全-25 範圍下 SP-0 單一真檔無法演練 8 個條件性 segment（沒開 PR、沒掛 agent、沒開 vim mode…），這批 segment 的 presence-shape 仍停在轉述級權威（局部復現 pr1 的 C3 問題）；建議 SP-0 驗收明列逐一觸發 checklist。Note：`<100KB` 被寫進 repo 級 Conventions 規範稍嫌外推過頭（應軟化為 sprint-local 約值，精確值留 verify-dist 斷言）。

---

## 二、任務報告（t 系列，依 T 編號排序）

### T1.2（.t12-report）— SP-4＋color.ts＋color.test.ts
交付 `color.ts`／`color.test.ts`（40 tests）。內容：ColorSpec 三態 discriminated union；ANSI256↔hex 對照表（公式生成，16 基本色＋6×6×6 色立方＋24 灰階）；`ansi256SwatchName`（D6 命名）；亮度／auto-fg（WCAG 線性化、黑白對比取高平手取黑）；**SGR 組碼兩層 API**（`colorSgrParams`／`sgrBody`／`sgrSequence`，三 emitter 共用建構規則，為 SP-5 byte-exact 前提）。契約沉默處：PLAN D6 例示 `ANSI 137 #af8787` 為 off-by-one，正確應為 `#af875f`（137=#af875f、138=#af8787）——以公式為權威，PLAN 例示不改文（審計留痕）。447/447 綠。

### T1.3（.t13-report）— threshold.ts＋config.ts＋測試
交付 `threshold.ts`（30 tests）／`config.ts`（41 tests）。`ThresholdRule.buckets` 為 readonly 10-tuple；`bucketIndex(p)=max(0,min(floor(p/10),9))`；4 模板（traffic/traffic-inv/cool-warm/mono-fade）用色立方等距路徑公式化定案（PLAN 未給值）；`autoFgBuckets` 平行陣列派生。config.ts：`deserializeConfig` 採 drop-unknown-and-continue（未知 id/variant 丟、越界色 clamp、壞 hex 退預設、buckets 校正恰 10、version≠1 走 migrate），絕不整份拒收、不碰 localStorage（純函式）。518/518 綠。

### T1.4（.t14-report）— validate.ts 拒收集 R（verify-and-complete）
核對前任 checklist 全數既有：R＝{LF/CR/U+2028-29、NUL＋全 C0/C1、bidi 12 個全集、長度>8（code point 口徑）}；property 測試（固定 seed mulberry32）；純函式零 DOM。本輪唯一補齊缺口：`validate.test.ts` 內 39 個**原始不可見字元**（NUL/ESC/C1/bidi）改寫為 `\uXXXX` escape（runtime 值不變），消除目視審查盲區。447/447 綠，validate.test.ts 67/67。

### T1.5（.t15-report）— SP-2(M1) ps1 encoding spike
harness 實跑 14 checks/0 failures。**雙 BOM 契約成立**：檔案層 `.ps1` 下載必帶 UTF-8 BOM（無 BOM→PS 5.1 以 ANSI 誤讀原始碼，CJK 毀損、glyph 消失、甚至 reset 序列被吃掉、仍 exit 0 靜默毀損）；輸出層 `[Console]::OutputEncoding=[System.Text.UTF8Encoding]::new($false)`，piped stdout 首位元組無 `EF BB BF`。生產 spawn 形逐字定稿：`powershell -NoProfile -ExecutionPolicy Bypass -File <forward-slash 絕對路徑>`。**新發現**：PS 5.1 預設 `InputEncoding` 非 UTF-8，stdin 含 CJK 會往返毀損；需檔頭**同時**設 `[Console]::InputEncoding=[System.Text.UTF8Encoding]::new($false)`。本機無 pwsh 7，交 CI windows leg。

### T1.6（.t16-report）— SP-1 font lane（授權驅動 subset）
來源：Nerd Fonts v3.4.0 `NerdFontsSymbolsOnly.zip`（sha256 釘死）；產出 `symbols-nerd-font-mono-subset.woff2`，**28 glyph、3,556 bytes**（<100KB）。授權盤點：Powerline Symbols（MIT）5 個＋Octicons（MIT）23 個留用；Codicons（CC-BY-4.0）、Font Awesome（歸屬歧義）、Pomicons（限制性）、Devicons `dev-vim`（品牌 logo）剔除。**零縮編**——25 segment icon 需求全由 MIT 來源覆蓋。RFN 查核：nerd-fonts 未宣告 Reserved Font Name，無改名義務；散布採 OFL 1.1（較嚴格）。fontkit 讀回逐碼位機械驗證 28/28 OK。

### T1.7（.t17-report）— SP-6 色盤 pattern 三候選＋最壞情形量測
三候選：A（role=grid 2D）／B（16 swatch+spinbutton）／C（listbox 分區）。量測：鍵盤到達任意色步數中位 A=7／**B=4**／C=11，worst A=12／**B=4**／C=22。最壞情形全頁模擬（25 列全開+4×10 閾值全展開）：A/C 每實例 257+ 元素、S3 全頁 **23,678 元素→強制改共用 popup 架構**；B 每實例 17 元素、**內嵌可行**（S3 全頁 2,168 元素）。**建議＝候選 B**（coordinator 終裁採納）：鍵盤效率主導、唯一內嵌可行、觸控窄視口天然達標。附 aria-label 組裝樣例與負向 enforcement（PUA run 省略 ariaText 即拒）。

### T2.1（.t21-report）— segments.ts 核對＋segments.test.ts／mock-data.ts／mock-data.test.ts
segments.ts（前任遺產）核對全過、零改動：StatusData mirror 逐欄對 F1；SegmentDescriptor 全目錄 **24 段**（永在10／百分比4／條件7／shell-out3，PLAN 名目25，worktree 併一）；icon 凍結碼位機械斷言；格式化純函式對抗值（cost 補尾零、**0.0029→$0.0028 float 乘積下緣**、duration 邊界、context-size 10⁶ 門檻）。mock-data.ts：4 canonical 情境（full/early-null/conditional-absent/windows-cjk）×三通道（data/shell/env）；D1 欄位多樣性不變量機械化（遍歷全 24 descriptor×4 情境，斷言每欄位 ≥2 相異值且 ≥1 非 null，防打錯 jqPath/ps1Path 靜默通過）。613/613 綠。

### T2.2（.t22-report）— resolve.ts＋emit-ansi.ts＋aria-label 純函式＋測試
resolve.ts 兩趟演算法：第一趟依序評估存活段（dash/hide/empty 三態 nullPolicy）＋composition；第二趟 join（plain 插分隔符、powerline 箭頭 fg=前段bg/bg=後段bg、lastArrowCap 收尾、dash-null 段 bg 退主色）。**emit-ansi.ts oracle SGR emission 規則四條（下游 T2.3/2.4/2.5 直接依賴）**：①逐 run 無條件 reset 前綴（stateless，`ESC[0m+fg+bg+text`）；②行尾再一個無條件 reset；③fg 先於 bg；④default/缺席色不 emit。run 粒度：powerline 恆單 run，plain 唯一分裂例外＝閾值生效且 head 非空→兩 run（head 隨主色、value 隨桶色）。`toAriaLabel` 兩層負向 enforcement（PUA run 省略 ariaText＝拒；顯式 ariaText 夾帶 PUA＝拒）。677/677 綠。

### T2.3（.t23-report）— SP-5 join spike＋oracle 定案 ★高引用密度
**byte-exact 成立**：7 組合×2 shell＝14 真執行輸出，全與 oracle 逐位元組相等（32 checks/0 failures），首輪即全過。**oracle 語意定案＝byte-exact，不退 canonical 正規形**，emit-ansi.ts 規則凍結，T2.4/T2.5 黃金 gate 解除。**§5 join 演算法虛擬碼**（emit-bash.ts:3／emit-ps1.ts:3 引用之藍本）：第一趟存活段評估＋平行陣列累加（`texts[]/fgs[]/bgs[]`，`fgs[i]`=完整 SGR 參數段、`bgs[i]`=bg 參數「尾」供箭頭 fg/bg 雙向派生）；第二趟逐 run 固定拼接 emission（每 run 前置 reset、i>0 時視 mode 插分隔符或箭頭、cap 收尾箭頭、行尾恆 reset）。**§7 重要發現（SP-7 前置）**：PS 5.1 `ConvertFrom-Json` 對小數 JSON number 回 **Decimal 非 double**（`0.0029×10⁴` Decimal floor=29 ≠ TS/jq double floor=28）——需在 `$null` 判定**之後**顯式 `[double]` 轉型恢復同構。jq 1.8.1 實測：null 政策 idiom（`// empty`／`// "--"`）、桶索引公式、cost 補尾零「+10⁴→切片」idiom 皆可行且 byte-exact。

### T2.4（.t24-report）— cwd-variant 端到端 byte-exact 修復
修 4 紅，兩獨立根因：(1) **emitter 真 bug**——basename 分支 jq regex 跳脫層數不足（`[/\\\\]+` 需 8 個反斜線源字面，非修前的 4 個），導致 oniguruma char-class 找不到收口、jq 出錯、段死；已修並重生 `powerline-rich.sh` 黃金（人審 diff 僅此一行）。(2) **harness/Windows 環境 artifact**——Git Bash 呼叫原生 jq.exe 時 MSYS 把類 Unix 路徑的**引數**改寫成 Windows 路徑（`$HOME` 本身不受影響，只有 argv 被轉），致 tilde 收合失敗；修法為 harness 加 `MSYS_NO_PATHCONV=1` 環境變數（emitter／黃金不動，因 jq 邏輯本身正確、只是 Windows 測試環境引入了目標平台不存在的 mangling）。766/766 綠。

### T2.6（.t26-report）— emit-settings.ts＋SP-2 殘項（時間路徑定案）
`emitSettings` 產出完整 `{"statusLine":{...}}` 片段；command 依 target 三分（POSIX 直呼／Windows powershell 5.1／pwsh 7 wrapper，皆 .t15/.t23 逐字定稿旗標形）；refreshInterval／hideVimModeIndicator 依啟用段條件附帶。**SP-2 時間路徑實測定案（8/8 checks）**：jq `strflocaltime("%H:%M")` 可用（jq 1.8.1），**採 jq 路徑**（非 `date -r/-d` fallback）；ps1 `[DateTimeOffset]::FromUnixTimeSeconds().ToLocalTime()` 本機可用；jq==ps1==node/TS 同一 epoch 本地 HH:mm 逐字相等。emit-bash resets 後綴 idiom 定案但本任未落地（列 follow-up，由 T2.7 補）。766/766 綠。

### T2.7（.t27-report）— 真執行 harness＋SP-7（M2 末棒）
**Step 0**：emit-bash resets 後綴落地（jq `strflocaltime` 直吃 epoch，鏡像 T2.6 idiom），黃金 `.sh` byte 完全不變（無黃金 config 用 percent-reset variant）。交付 `pipeline.integration.test.ts`：SP-7 格式化對等（cost/duration/context-size/percentage 對抗值集，含 **0.0029 Decimal 兩形**分別斷言 ps1 5.1 與 pwsh7）＋shell-out 五態等價（clean/dirty/detached/unborn/非git）＋skipIf meta＋hexEqual 正負自測。**⚠ harness 抓到 emit-ps1.ts 真 bug**（scope 偏離，coordinator 授權 (A) 修復）：`emitShellOut` 對無 stdout 的 pipeline 得 `AutomationNull`，`[string](AutomationNull)` 回 `$null` 非 `''`，而 `$null -ne ''` 為真→守衛誤觸發，致乾淨 repo 誤顯 `*`、detached 誤留空段。**根因線索**：`emit-ps1.test.ts` 的 `fullBehaviorCases` 明確 filter 掉 shell-out 段，這 3/24 段從未真執行過，黃金測試只比文字不執行——「單元＋黃金全綠 ≠ 真執行正確」的具體例證。修法：1 行改 `$null -ne $so -and $so -ne ''`；重生 `plain-full.ps1`（唯一含 shell-out 的 ps1 黃金，diff 恰 2 行）；補 shell-out 四態×兩後端真執行回歸鎖。820 pass/19 skip（pwsh7，交 CI）。

### T3.1（.t31-report）— 工具頁靜態骨架＋樣式（零 JS）★高引用密度
交付 `index.html`／`style.css`＋⚠ **建置佔位 stub** `main.ts`（僅兩行 CSS import；因 Vite 收錄工具頁後缺 `./main.ts` 會使整個 build 失敗，T3.3 覆寫，無 lane 衝突）。a11y 契約逐條落地：四類分區 landmark+heading+skip-link；停用列收合（`display:none` 整個 `.segment-row__controls`，非 live region 故不違反顯隱不變量）；色選 pattern B 骨架（16 swatch radio + spinbutton + native color input）；閾值 disclosure；Nerd Font 常駐橫幅（禁 display:none，內容切換承載）。**§3 DOM 結構契約表（main.ts:14-15,481,560 引用之藍本）**：3a 固定節點清單（`#error-message`／`#mode-plain`／`#segment-list-*`／`#preview-terminal`／`#output-*` 等 query 約定）、3b `#segment-row-template`（token `__ID__`）、3c `#color-picker-template`（token `__PID__`）、3d `#threshold-editor-template`（token `__TID__`）、3e token 取代機制（`replaceAll` 或逐屬性取代）。830 pass/19 skip。

### T3.2（.t32-report）— render-preview.ts＋字型接線
交付 `render-preview.ts`（含 controller）／`preview-font.css`。**關鍵發現**：字型 woff2（3,556B）**被 Vite inline 成 base64 data URI 進 CSS chunk**（＜預設 `assetsInlineLimit` 4096），非 `dist/assets` 獨立檔——實測 scratch build 三種載入方式皆 inline；直接定型 T4.2 verify-dist 斷言設計（提出路 A：斷 CSS 含 `data:font/woff2;base64,` 字面／路 B：改 `assetsInlineLimit` 求獨立檔，coordinator 選路 A）。**§4 controller API（main.ts:14-15 引用）**：`createPreview(init)→PreviewController`，含 `setConfig`／`setScenario`／`setTheme`／`describeWithHint`／`render`；`renderOutputs` 供填三 `<pre><code>`。契約：預覽 role=img 刻意不 aria-live、每次同步刷 label 防 stale；font-family 以 inline `container.style.fontFamily` 覆寫 T3.1 CSS class（inline 特異性勝）。831 pass/19 skip。

### T3.3（.t33-report）— main.ts UI 全流程狀態機（wave 2 末棒）
整份覆寫 T3.1 stub（759 行）。a11y 契約逐條落地：四分區清單依 catalog 序生成、停用收合、每控件 accessible name（段名+角色）、拖曳+上下移鈕雙路徑排序＋播報、色盤 pattern B（spinbutton ↑↓±1/PageUp±16/Home-End/數字直入）、閾值 disclosure＋批次套模板播報、mode 切換視圖重構（焦點移轉+顏色語意翻轉播報+停用 custom 分隔符）。**下載 BOM 實測**：`.ps1`=`UTF8_BOM+emitPs1(...)`（首位元組 `ef bb bf`）；`.sh`／`settings.json` 無 BOM。PUA 拒收：`validateUserText`=`validateCustomText`(R) + `containsPua`（T2.2 裁定併入）。**契約沉默處**：`[hidden]` 被 T3.1 style.css 的 `display:flex` 蓋過，本檔以 `setHidden`（hidden 屬性+inline display 雙寫）workaround，並建議 review 於 `src/style.css` 加 `[hidden]{display:none!important}` 根治（後於 postfix Important 4 落地）。831 pass/19 skip。

### T4.1（.t41-report）— CI test.yml＋deploy.yml windows leg
新增 `test.yml`（push DEV + PR main，matrix ubuntu+windows）；`deploy.yml` 新增 `windows-test` job 作 build 的 `needs:` 前置（+31 純插入、0 刪除）。**§3 harness 跨平台 jq/bash resolve 評估（核心產出）**：三個真執行 harness 的 jq 探測在**非 win32 分支走 `spawnSync('jq',...)` 探系統 jq**（非 windows 便攜 exe）——ubuntu-latest 內建 jq，**bash+jq gate 於 ubuntu leg 真跑成立**，此前疑慮「harness 只認便攜 jq 導致 ubuntu 全 skip」不成立。windows leg 使 19 個本機 skip（pwsh 7）轉真跑。🔴 交 coordinator：`tools/statusline-builder/` 全目錄未 tracked，commit 期須一併簽入，否則 CI checkout 無測試檔、gate 語意靜默歸零。834 pass/19 skip。

### T4.2（.t42-report）— 時序閘：tools.ts 翻 available＋tripwire＋verify-dist 字型斷言
三檔：`tools.ts` 新增第四筆 `statusline-builder`（status: available）；`tools.test.ts` tripwire `toBe(3)→toBe(4)`；`verify-dist.mjs` 新增字型斷言**路 A**（依 T3.2 實測與 WORKS 裁定）：(a) glob CSS chunk 含 `data:font/woff2;base64,`；(b) 源檔 `fonts/*.woff2` 存在且 <100KB（policy 天花板守衛移至源檔，因 dist 端已 inline 無法量測）。834 pass/19 skip，build/verify:dist 皆綠。

### T4.3（.t43-report）— Spec deltas 落地（純文件，無碼）
五檔落地：root SPEC.md（4 處：Architecture overview 媒體枚舉軟化、Components 新增、Conventions 兩處自洽化［runtime JS/wasm 載入機制軸＋非執行型靜態資產性質軸+provenance］、Status 三→四工具）；root CLAUDE.md（What this is 增列）；PRD.md（Problem 定位句、Goals 增列）；TECHSTACK.md（零依賴+字型路 A 措辭對齊 WORKS 裁定、Deployment test.yml 描述）；README.md（Tools 表、第三方元件 Nerd Font subset 段、`## statusline-builder 注意事項` 新段落含 schema 基準版 v2.1.196／changelog 實核至 v2.1.169／人工重核 checklist、MOTW/Unblock-File/GPO AllSigned 提示）。834 pass/19 skip，純文件無測試回歸。

---

## 三、程式審議（cr 系列）— 實作完成後五鏡頭複審

### cr1 — 鏡頭1／5：契約符合／DRIFT 對帳（APPROVE-WITH-NITS）
契約（PLAN r2.1）與實作逐節對帳：**無 A 類（未授權契約牴觸）**，所有偏離皆可追溯至 WORKS coordinator 授權或契約明文許可。§產生器契約 1–12、型別契約、格式化對等規則、config 清洗（桶數校正恰 10）、CI gate 矩陣皆逐條落地；provisional 體制完整（全 24 段+4 mock 情境標記，測試機械斷言防漏標）；黃金＝簽入可讀 `.sh/.ps1`+`toEqual`+禁 snapshot（全庫零 `.snap`/`toMatchSnapshot`）。Note 四項：`npm run golden:update` 於 package.json 不存在但多處引用如既存（提出補 script）；settings 無簽入黃金（改由 roundtrip 測承擔）；ps1 黃金 config 雙源維護（bash 側單源、ps1 側待抽共用模組）；SP-0 INSTRUCTIONS 寫「25 個描述子」應為「24（worktree 併一）」。C 類待裁：`[hidden]` 根治是否本 sprint 落地、commit 期須確保全部 harness/測試檔簽入。

### cr2 — 鏡頭2／5：架構／三後端語意一致性（**REQUEST-CHANGES**）
三後端在 join/null 三態/格式化/閾值/箭頭交接/exit-0 上絕大多數真同構。**Important（唯一）**：`emit-ps1` 在 **plain＋閾值＋head 空（無 prefix 無 icon）＋數值**時多吐一個 `ESC[0m`（emitPercentage 對 head 空分支無條件疊出兩個 reset，oracle 對此情形應為單 run 單 reset），破 SP-5 byte-exact 不變量。**盲區本質**：所有受測閾值 config 的閾值段不是 powerline 就是帶 head，沒有任何情境同時滿足「plain+閾值+bare head+數值」——這正是本 sprint 核心風險（測試漏掉的跨後端分岔）的具體例證，且黃金重生（含 SP-0 對帳）不會關掉此洞，因黃金是文字自比、抓不到與 oracle 的分岔。執行期實害為零（視覺全等）但屬 byte-exact 不變量的靜默違反。Note 二項：clock 段在 ps1 恆存活無守衛（bash/oracle 有）；clock 的 ps1 命令雙軌（descriptor.shellOut.ps1 為死碼）。此問題已於 postfix Important 2 修復。

### cr3 — 鏡頭3／5：前端 UI／a11y（APPROVE-WITH-NITS）
a11y 契約在四檔（index.html/style.css/main.ts/render-preview.ts）中逐條忠實落地，工具內無執行期 a11y 破口。**Important（唯一）**：`[hidden]` CSS 缺陷——UA `[hidden]{display:none}` 被作者 `display:flex` 蓋過（`.color-picker__panel`/`.control-subfield`），main.ts `setHidden()` workaround 功能正確但脆弱（三處在地佐證：`#separator-custom-field` 是 live 節點會有 pre-JS 閃現／FOUC；`.threshold__panel` 初始收合僅因該 class 恰無 author display 規則而僥倖正確；色選面板初始 hidden 靠 JS 時序遮住）。**跨工具佐證**：其餘三工具的 `.button-like` 按鈕（gif-editor #pause-button 等）直接切 `.hidden` 而無 workaround，author `inline-block` 同樣蓋過 UA hidden，`memory-warning` 類容器有真實可見洩漏疑慮——反證根治能一併修好別處潛伏 bug。建議 `src/style.css` 補 `[hidden]{display:none!important}`（已於 postfix Important 4 落地，跨 4 工具冒煙 build 綠）。Note：truecolor color input 段身分僅靠 fieldset legend；上下移鈕邊界靜默 no-op 無播報。另指出 `resolve.ts` 的 `PUA_RE` 以字面不可見字元寫入原始碼、與 T1.4 的 `\uXXXX` escape 裁定相衝（已於 postfix Important 1 一併修正）。

### cr4 — 鏡頭4／5：測試／驗證工程（APPROVE-WITH-NITS）
實跑：`npm test`=834 pass/19 skip/0 fail；`npm run build`/`verify:dist` 皆綠；全庫零 `toMatchSnapshot`/`.snap`/`--update`。**Important（唯一）**：emit-bash 缺對稱的「全段」真執行案——emit-ps1 有 `fullBehaviorCases`（21 段真執行 byte-exact），emit-bash 沒有對稱案，6 個 stdin 段（project-dir/output-style/effort/vim-mode/agent-name/**worktree**）零執行覆蓋，其中 worktree 是**唯一手寫 jq fallback 表達式**、最易打錯卻只有 ps1 端真執行覆蓋——與已知 emit-ps1 shell-out bug 同類「config/filter 選擇造成的執行覆蓋盲區」。已於 postfix Important 3 修復（補 21 段×3 情境含 worktree 兩 fallback 路徑）。Note 三項：clock 的 ps1 Get-Date 分支零真執行；ps1 黃金 config 雙源＋硬編碼 threshold 字面；verify-dist 字型路 A 斷言對 subset 成長於 (4096B,100KB) 區間脆弱。C 類重申：三後端一致 ≠ 對真實 stdin 正確（provisional 體制根本限制，SP-0 對帳前為測試可信度最大保留）；commit 期須確保全部 harness 簽入。

### cr5 — 鏡頭5／5：安全／escaping／供應鏈／deltas（APPROVE-WITH-NITS）
頭號風險（注入）已被 escaping 層確實堵死：bash 單引號 `'\''`、ps1 `''`、使用者文字不進 jq 程式/printf/`-f` 格式位，逐條到位。供應鏈事實（字型授權、provenance、便攜 jq 官方雜湊）查證正確。五份 delta 落地忠實。**A 類違約（唯一，已於 postfix Important 1 修復）**：**PUA 防線落點偏離契約授權位置**——PLAN §6 與 WORKS T2.2 裁定明訂「UI 層+validate.ts」，實作卻放在 resolve.ts（`containsPua`），validate.ts 與 config 清洗邊界皆無 PUA 判定；後果：localStorage 持久化 config 帶 PUA 前綴會通過清洗保留，init→createPreview→toAriaLabel 擲 TypeError，整頁崩潰——正是原裁定要防的 bug，只是換到持久化路徑重現，且違反「重整不丟」承諾。Note 三項：settings 路徑輸入無驗證且 `quoteIfNeeded` 不逸出既有雙引號/shell 元字元（威脅模型為單使用者自傷，嚴重度低）；複製到剪貼簿的 `.ps1` 不帶 BOM（僅下載 Blob 帶，刻意取捨有註解兜底）；便攜 jq（1MB windows 二進位）入 repo 姿態建議不入（ubuntu leg 系統 jq 已承擔 gate、windows leg 優雅降級）。

---

## 四、Postfix — 實作後修復（4 Important + 近端 Notes）

### postfix（.postfix-report）— Post-review fixes（DONE）
四閘全綠（typecheck/測試/build/verify:dist），834→849 pass（+15，全落 pass 欄，證兩個真執行回歸鎖確實未 skip）。

- **Important 1**（CR5 A 類）：PUA 併入 `validate.ts` 單一咽喉——`CustomTextRejectReason` 加 `'pua'`；`PUA_RE` 顯式 `\u{...}` 轉義（不嵌字面不可見字元，呼應 T1.4 裁定）；`rejectReasonFor` 尾端補判；config.ts 的 `sanitizeSegment`/`sanitizeSeparator` 自動同時受惠。`resolve.ts` 的 `containsPua` 保留作第二道 enforcement。新增 7 個 PUA 邊界 code point 測試+property 覆蓋+config roundtrip（舊 config 帶 PUA 前綴→剔前綴不整份拒收）。
- **Important 2**（CR2 byte 分岔）：`emit-ps1.ts` emitPercentage 的第二個 `$s += "$e[0m"` 收進 `head!==''` 分支；head 空時單 run 單 reset，與 oracle/bash 同構。黃金**未重生**（無黃金 config 落此格）。新增 `pipeline.integration.test.ts` 三後端 byte-exact 回歸鎖（context-used 55%，icon:false 無 prefix，TRAFFIC 閾值）。
- **Important 3**（CR4 覆蓋盲區）：`emit-bash.test.ts` 補對稱 full-config 真執行案，21 個非 shell-out 段×{full,windows-cjk,early-null} 三情境，含 **worktree 兩 fallback 路徑**驗證（full 走 `workspace.git_worktree`、windows-cjk 走 `worktree.name`）。
- **Important 4**（CR3 根治建議）：`src/style.css` 補 `[hidden]{display:none!important}`；`main.ts` 的 `setHidden` 簡化為只切 `el.hidden`（移除 inline display 半）。跨工具冒煙：`npm run build` EXIT=0，四工具+root 無回歸；未改其餘三工具 JS（其 `.button-like` 按鈕真隱藏行為變化，交各工具人工冒煙 pending）。
- **近端 Notes 處置**：`sp0/INSTRUCTIONS.md`「25→24 個描述子」；`package.json` 補 `golden:update` script；`resolve.ts` PUA_RE 轉義（隨 Important 1 一併完成）。**未動**（超出本批 scope）：settings 路徑 shell 逸出、複製路徑 BOM、便攜 jq 不入 repo、truecolor 命名死 span、移位鈕邊界回饋、clock ps1 守衛、verify-dist inline 斷言放寬、ps1 黃金雙源。

實際變更之 tracked 檔僅二（`package.json`+7行、`src/style.css`+7行）；其餘變更檔（validate.ts/resolve.ts/main.ts/emit-ps1.ts/各 test.ts/sp0 INSTRUCTIONS）皆為 sprint 05 尚未 commit 的 untracked 檔案就地編輯。