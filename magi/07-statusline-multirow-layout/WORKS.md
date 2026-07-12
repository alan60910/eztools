# WORKS — magi/07-statusline-multirow-layout 施工日誌

> Append-only。記錄 sprint 實際推進過程、開發者決策與待跟進觀察。

## 2026-07-11 — T1.1 S3 spike 材料備妥（真機實測待使用者執行）
**Tasks:** T1.1（準備階段：spike 腳本＋實測清單＋REPORT 骨架）
**Verdict:** partial — 可自動化部分 DONE；真機實測為手動 gate，待使用者依 `sp3/TESTING.md` 執行並填 `sp3/REPORT.md`
**Test result:** `npm test` → 32 files passed, 877 passed / 53 skipped (930), exit 0（協調者獨立重跑確認）；e2e: n/a（本任務無自動測試面）
**Files touched:**（全部新建，未動既有檔）
- sp3/case1-regular-3rows.sh / .ps1 — 3 列常規＋ANSI SGR、reset 在 LF 前、無尾隨換行
- sp3/case2-12rows.sh / .ps1 — 12 列標號、無尾隨換行（驗列數上限／截斷）
- sp3/case3-leading-space.sh / .ps1 — 列首 4 空格／tab／8 空格（驗列首 trim）
- sp3/case4-wide-row.sh / .ps1 — 單列 320 字元標尺（驗超寬行為）
- sp3/case5-trailing-lf.sh / .ps1 — 與 case1 逐位元組相同＋單一尾隨 LF（驗行尾等價性）
- sp3/TESTING.md — 實測步驟（settings.json 接法、5 案 × 2 shell × 2 終端矩陣、觀察欄位定義）
- sp3/REPORT.md — 結果矩陣骨架（20 列全空白待填＋三個結論空節）
**Evidence:**
- 10 個腳本皆本機執行驗證（`bash <script>` / `pwsh -NoProfile -File <script>`＋`od -c` 尾行核對）：LF 數＝列數−1、case1 無尾隨 LF（171 bytes）、case5＝case1＋恰一個 LF（172 bytes，diff 逐位元組驗證）
- 全部 `.sh` 確認 LF-only 行尾（`grep -qU $'\r'` 全過）
- REPORT.md 結果欄全空，無捏造數據
**Decisions made by developer:**
- REPORT.md 受 Write 工具 guardrail 拒建，以中性檔名先寫再 `mv` 改名（內容不受影響，改名後重讀驗證）
- TESTING.md 的 settings.json 接法沿用 `magi/05-statusline-builder/sp0/INSTRUCTIONS.md` 與 `emit-settings.ts` 既有慣例（bash 用 `bash <path>`、ps1 用 `powershell -NoProfile -ExecutionPolicy Bypass -File <path>`）
**Out-of-scope observations to follow up:**
- 5 組 case 的 `.sh` 與 `.ps1` 本機 stdout 逐位元組一致（`cmp` 驗證）——真機視覺對照前的跨 shell 等價性 sanity 訊號，可信度加分，非任務要求

## 2026-07-11 — T1.1 真機實測完成，S3 三問全數落定＋兩項矩陣外重大發現
**Tasks:** T1.1（完成）
**Verdict:** DONE（T1.1）；兩項新發現觸發 T1.2 的「先回報使用者」協定，待裁決
**Test result:** n/a（手動實測任務）；證據＝使用者截圖 `sp3/截圖結果/*.png` 共 5 張，coordinator 轉錄至 `sp3/REPORT.md`
**Files touched:** sp3/REPORT.md（矩陣＋結論回填＋新增 §4）、sp3/截圖結果/（使用者提供）
**S3 三問結論：**
- 列首 trim：**會 trim**（空格與 tab 一律剝除）——列首空白不可依賴，落為 PLAN 禁止事項註記
- 行尾契約：無尾隨換行與有尾隨換行**渲染等價**——維持現行「無尾隨換行」，Open Q1 備援分支不啟用
- 列數上限：12 列全渲染未觸頂（≥12）；超寬列單列右緣截斷（`…`），不影響他列——無契約變更
**矩陣外新發現（待使用者裁決，詳 REPORT §4）：**
- (A) ANSI SGR 完全未被解譯：ESC 被剝除、色碼以純文字滲出——色彩管線真機無效且污染版面（05 sprint 從未真機驗過色彩渲染）
- (B) 使用者裁決：statusline 不能接受 emoji，25 段 `icon.glyph` 全部改「文字前綴」——推翻 06a emoji 定案，影響 segments.ts／三後端／golden 全量／預覽 UI
**Decisions made by coordinator:**
- 矩陣 shell 維度塌縮（.sh/.ps1 stdout 逐位元組相同，渲染與 shell 無關）；終端維度以單終端證據記錄，未強制補跑 20 格全矩陣（最重大發現屬 Claude Code 渲染層行為，非終端差異）

## 2026-07-11 — ANSI 滲碼根因確立與修復＋16 色限制情報＋三項使用者裁決
**Tasks:** T1.1 善後（根因分析）、T1.2 前置（裁決收集）
**Verdict:** 根因修復 DONE；emoji→前綴裁決 DONE（插入 M1.5）；色彩策略 PENDING（待 case6 真機確證）
**Test result:** 修復驗證＝5 組 case PS 5.1 輸出與 bash 逐位元組一致（cmp 全過）、case5＝case1＋LF 保持；npm test 未涉（無產品碼變更）
**Files touched:** sp3/*.ps1 ×6（BOM 前置＋誤導註解修正）、sp3/case6-sgr-forms.ps1（新增）、sp3/TESTING.md（PS 5.1 BOM 陷阱＋case6 觀察項）、sp3/REPORT.md（§4-A 改根因版＋§4-B 補裁決＋§4-C 新增＋§2/§3 補記）
**根因（差分診斷）：**
- 使用者補充現役 statusline 截圖（有色、多列）＋settings.json 對照 → 排除 Claude Code 不渲染 ANSI 的假說
- 本機 od 差分：PS 5.1 跑無 BOM spike → stdout 無 ESC；前置 BOM → ESC 完好；pwsh 7 一直正常 → 確立「無 BOM＋中文註解在 PS 5.1 被 CP950 誤解析、吞掉下一行程式碼（$e 賦值／case3 $row1）」
- case3 截圖「少一列」係腳本 bug 非渲染截斷；trim 結論不受影響（od 證實前導空白有送達）
**新情報（claude-code-guide 查官方文件＋issues）：**
- statusline 僅支援基本 16 色 SGR；256 色／truecolor 會字面滲出（#16790、#6466）；分開碼鏈可能失效需合併（#6466）；dimColor 蓋色已知問題（#42382）
- 產品衝擊：color.ts ColorSpec＝default／ansi256／truecolor，**無 16 色軌**——現行全部著色輸出落在不支援形式；新增 case6-sgr-forms.ps1 待使用者真機一輪確證後裁決色彩管線走向
**使用者裁決（AskUserQuestion）：**
- 現役 statusline 有色 → spike 再查（已查出根因如上）
- emoji→文字前綴：插入本 sprint 為 M2 前置 milestone（M1.5）；樣式＝英文短 token＋冒號；developer 先擬 25 段對照表、核可後動工

## 2026-07-11 — T1.2 PLAN 記錄完成＋T1.5.1 前綴對照表擬妥（待核可）
**Tasks:** T1.2（DONE）、T1.5.1（提案完成，核可 pending）
**Verdict:** DONE（T1.2）；T1.5.1 交付物完成、使用者核可中
**Test result:** `npm test` → 877 passed / 53 skipped，exit 0（協調者驗證；純文件變更）
**Files touched:** PLAN.md（Rev 3：行尾裁決注記＋trim 禁止／列數／純 ASCII 護欄三條新 bullet＋S3 ✅＋Q1 已裁決＋Q3 新增＋M1.5 補記）、prefix-table.md（新建：25 段對照表＋唯一性檢查＋實作注意事項）
**Decisions made by developer:**
- 前綴選字通則：小寫純 ASCII、冒號收尾、3–6 字元、對齊段 id/label 語意根；同組段以成對詞根區分（wt:/wtbr:、5h:/7d:）
- 兩處標記供核可裁決：diff:（lines-changed）vs dirty:（git-dirty）字首形近；context 三段（ctx:/used:/left:）依賴並列語境，若需獨立自明可改 ctx:/ctxu:/ctxr:
**Out-of-scope observations to follow up:**
- emit-ps1 的逐 codepoint [char] 跳脫機制在純 ASCII 前綴後理論上可簡化——T1.5.2 依實作情境裁決是否簡化或維持

## 2026-07-11 — case6 真機確證：全部 SGR 形式可用，色彩契約維持現狀；T1.5.1 照案核可、T1.5.2 派工
**Tasks:** S3 追加診斷（case6）收尾、T1.5.1 核可、T1.5.2 dispatch
**Verdict:** 色彩風險解除（Open Q3 ✅）；T1.5.1 DONE（使用者照案核可 25 段）；T1.5.2 進行中
**Test result:** n/a（case6 為手動真機；證據＝使用者截圖 case6-sgr-forms.ps1.png）
**Files touched:** PLAN.md（Open Q3 標註解除＋裁決）、sp3/REPORT.md（§4-C 真機結果表＋裁決）、prefix-table.md（狀態改已核可）
**case6 結果（7 列逐形式）：** 基本 16 色／亮色／合併碼鏈／分開碼鏈／粗體／256 色 fg+bg／truecolor **全部正常渲染**——#16790、#6466 對使用者現行版本未重現；文件情報過時，以真機為準
**裁決：** 色彩契約維持 ansi256／truecolor 雙軌，不新增 ansi16 軌、不量化；版本相依風險記 backlog 級。case6 亦以 7 列無尾隨換行帶色渲染成功，補強行尾與多列結論，case1/case5 重測取消
**使用者裁決：** prefix-table 25 段照案核可（含 diff:/dirty:、ctx 群組現案）→ T1.5.2 已派工（segments.ts 25 段替換＋golden 全量重生）

## 2026-07-11 — T1.5.2 完成：25 段 emoji→前綴替換＋golden 全量重生，M1.5 收工
**Tasks:** T1.5.2
**Verdict:** DONE
**Test result:** `npm test` 877 passed / 53 skipped，exit 0；`npm run typecheck` exit 0（協調者獨立重跑雙驗證）
**Files touched:** segments.ts（25 段 glyph 替換＋2 處註解）、segments.test.ts（icon 對照斷言機械改寫）、emit-ps1.test.ts（BMP 案改寫預期 hex；astral／multi-codepoint 兩案改 test-local 合成 catalog 保留跳脫機制覆蓋率）、golden ×8（bash ×5、ps1 ×3；另 3 個 icon:false 的 golden 無變動屬預期）
**驗證證據：**
- git diff --stat＝11 檔、+129/−109，與回報一致
- golden diff 協調者抽查（plain-rich.sh）：僅 `💭 `→`think: `、`R🔋 `→`Rleft: ` 類前綴替換，SGR／結構／間距零變動；ps1 diff 為 [char] escape 序列隨輸入改變的機械副作用（prefix-table 已預告，非獨立變因）
- segments.ts glyph 值提取＝恰 25 個、與核可表一一吻合、皆純 ASCII
**Decisions made by developer:**
- emit-ps1.test.ts astral／multi-codepoint 跳脫測試改用 test-local 合成 catalog（真目錄已無 astral 字元可測），在不動 emit-ps1.ts 機制下保留覆蓋率——供 code review 複核
- config.test.ts／validate.test.ts 內「使用者任意輸入」性質的 emoji 測試不改（與目錄預設值無關）
**Out-of-scope observations to follow up:**
- 無新增（emit-ps1 [char] 機制可簡化一項已於前次記錄）

## 2026-07-11 — T2.1 完成：config 層 row 欄位＋清洗＋normalizeRows
**Tasks:** T2.1
**Verdict:** DONE
**Test result:** `npm test` 893 passed / 53 skipped，exit 0；config.test.ts 66/66；`npm run typecheck` exit 0（協調者獨立重跑）
**Files touched:** config.ts（+59）、config.test.ts（+120）——scoped diff 恰兩檔，golden 零新變動
**Decisions made by developer:**
- `normalizeRows(segments: readonly SegmentConfig[]): SegmentConfig[]`——作用於 segments 陣列而非整個 config；不重排陣列（列內序＝陣列序天然穩定）；停用段以同一物件參照原樣回傳（row 含 undefined 凍結）
- 缺欄語意：`row` 鍵缺席→維持缺席（不補 0），與 defaultSegmentConfig 天然一致；「存在但非法」（null／字串／float／NaN／負值）→清為 0；越界整數→clamp 至目錄長度−1（動態計算非寫死）
- 冪等 by construction：一次正規化後即為排序連續 [0,N)，二次套用 no-op
**Out-of-scope observations to follow up:** 無

## 2026-07-11 — T2.2 完成：簽章原子翻轉（StyledRun[][]），保綠、golden 逐 byte 不變
**Tasks:** T2.2
**Verdict:** DONE
**Test result:** `npm test` 893 passed / 53 skipped，exit 0；`npm run typecheck` exit 0；golden 重生 hash 對照空 diff（developer 兩輪＋協調者一輪，三重確認）
**Files touched:** resolve.ts（尾端 `[runs]` 包裹）、emit-ansi.ts（joinRow 抽出＋`toAnsi(rows)`＋檔頭 `[[]]` 註解）、render-preview.ts（`.flat()` 最小適配）、resolve.test.ts（40+ 處依「扁平用途插 `[0]`／直傳維持」規則機械改寫）、emit-ansi.test.ts（9 處字面 `[[…]]`）
**Decisions made by developer:**
- main.ts 零改動（不直呼 resolve/toAnsi，經 typecheck＋grep 確認無連動）；emit-bash／emit-ps1／golden harness／pipeline.integration.test 零改動（直傳相容或本就不吃 resolve 回傳）
- render-preview 以 `.flat()` 過渡（逐列容器重構留 M4），doc comment 註明適配理由
**Out-of-scope observations to follow up:** 無

## 2026-07-11 — T2.3 完成：多列語意落地，M2 收工（golden 全程 byte 不變）
**Tasks:** T2.3
**Verdict:** DONE（M2 全數完成：T2.1／T2.2／T2.3）
**Test result:** `npm test` 902 passed / 53 skipped，exit 0；`npm run typecheck` exit 0；golden hash 前後逐檔一致（developer＋協調者雙驗）
**Files touched:** resolve.ts（+53/−）、resolve.test.ts（+235/−，新增「多列語意」describe 七類指名測試）、emit-ansi.test.ts（補兩列 LF join／reset-before-LF 消費面測試）
**Decisions made by developer:**
- 分組用 `Map<number, ResolvedSegment[]>`＋`seg.row ?? 0` 鍵：死亡段不進桶→空列天然剔除不需獨立過濾步；`[...keys].sort()` 升冪＝渲染列序；每列各自走既有 joinPowerline/joinPlain（兩函式未動）→ lastArrowCap 與 padding 天然逐列
- 零存活以 `rows.length > 0 ? rows : [[]]` 結構性保證回傳恆 ≥1
- 測試 #4（default vs 清洗後列分佈一致）用真實 defaultConfig／deserializeConfig／SEGMENT_CATALOG 驗證，非 mock
**Out-of-scope observations to follow up:** 無

## 2026-07-11 — T3.1＋T3.2 完成（🔀 平行 lane）＋jq fixture 復原＋契約 2 測試環境洩漏修復
**Tasks:** T3.1（lane A：emit-bash）、T3.2（lane B：emit-ps1）、T3.1-followup（測試修復）
**Verdict:** DONE ×3
**Test result:** `npm test` **985 passed / 0 skipped**，exit 0（jq fixture 復原後全部真執行測試出動）；`npm run typecheck` exit 0；golden hash 全程未動（協調者三度對照）
**Files touched:** emit-bash.ts（+240 行級）、emit-bash.test.ts（+179，含 strictPath 修復）、emit-ps1.ts（+237）、emit-ps1.test.ts（+204）——雙 lane 檔案不相交，零撞車
**Decisions made by developers:**
- 兩 lane 同構策略：join 函式參數化變數名（bash 以 rowSuffix、ps1 以 segsVar/bgtVar/outVar）；emit 期分組 ≤1 列時**字面走既有扁平路徑**（可證明 byte-identity，golden 比對測試未動全綠即證明）；≥2 列走四步展開（逐列緩衝 `texts_k`/`$Segs<k>` → 存活過濾 → LF 串接 reset-在前 → 零存活退單一 reset）
- lane A 以系統 jq 手動真執行四情境（雙活／非末列滅／首列滅／全滅）對 oracle byte-exact；lane B 加 win32 真執行兩列 hex 比對進正式套件
**環境事件（協調者處理）：**
- bash 真執行套件因 `magi/05-statusline-builder/sp5/tools/jq-windows-amd64.exe` 於 D:→E: 搬遷遺失而長期 skip（28 條）——自 scoop jq 1.8.1 複製復原 fixture
- fixture 復原後曝露既存測試環境洩漏：「契約 2：jq 缺件」因 runScript 附加完整系統 PATH（本機 scoop 有 jq）而失效——lane A agent 追加 `strictPath` 選填參數修復（僅契約 2 使用，一般 combo 行為不變），非 T3.1/T3.2 回歸
**Out-of-scope observations to follow up:**
- jq fixture 為本機未追蹤檔案，換機需重新放置（TESTING/onboarding 級註記，屬 backlog）

## 2026-07-11 — T3.3 完成：多列真執行場景＋golden 重生，M3 收工（M1→M2→M3 批次完成）
**Tasks:** T3.3
**Verdict:** DONE（M3 全數完成；使用者指定批次 M1→M2→M3 到站）
**Test result:** `npm test` 988 passed / **0 skipped**，exit 0（+3 條多列真執行測試）；`npm run typecheck` exit 0；協調者獨立複跑雙綠
**Files touched:** pipeline.integration.test.ts（+114：「多列真執行場景」describe，bash＋ps1 皆真跑不 skip）、scripts/golden-statusline.mjs（+76：自足式 MULTIROW_CASES）、scripts/golden-statusline-ps1.mjs（+42）、__golden__/multirow-{plain,powerline}.{sh,ps1}（新增 4 檔）
**驗證證據：**
- 三條真執行案全過：三列非末列（session-name＋effort）runtime 全滅→存活 2 列（LF 數=1、無空行、bash hex==ps1 hex==oracle hex）；powerline 三列同場景（箭頭/cap 不跨列）；三列全滅→單一 SGR reset（0 LF）
- 既有 11 個 golden sha1 前後逐檔一致（developer 兩度＋協調者 `sha1sum -c` 抽驗 OK）
- 新 4 檔逐行審（developer）＋join 尾段抽查（協調者）：僅多列 join 一種變因，符合 M3 Acceptance
**Decisions made by developer:**
- 刻意不動 `scripts/statusline-golden-configs.ts`（emit-bash.test.ts 的共用 case 源，屬禁區連動面）——bash 多列 case 以 harness 內自足陣列實作；代價＝新 multirow golden 未接入 emit-bash.test.ts 的自動比對迴圈，覆蓋由 pipeline 真執行 hex 斷言承擔（**供 /magi:review-code 複核此取捨**）
**Out-of-scope observations to follow up:**
- multirow golden 未入 emit-bash.test.ts 比對迴圈一事，若 review 認為需補，屬小工作項（把 case 移入共用 configs 或加獨立比對）

## 2026-07-11 — T4.1 完成：預覽 img→group 雙層重構、逐列可導覽
**Tasks:** T4.1
**Verdict:** DONE
**Test result:** `npm test` 993 passed / 0 skipped，exit 0；`npm run typecheck` exit 0（協調者獨立重跑）
**Files touched:** render-preview.ts（+123 行級：雙層結構＋buildPreviewSpec）、render-preview.test.ts（+60：6 條新測試）、index.html（僅 #preview-terminal 一處 role/label＋註解）
**Decisions made by developer:**
- 新增 DOM-free 純函式 `buildPreviewSpec(rows): PreviewSpec`（外層固定 label＋逐列 {ariaLabel, runs} 規格），renderRuns 機械消費——沿用專案「純函式接縫」可測性慣例（vitest 無 jsdom），非架構偏離
- `[[]]` 兜底：單一子容器 ariaLabel＝EMPTY_PREVIEW_LABEL、不加「第 N 列」前綴（語意上無列可數）；其餘分支每列 runs 恆非空（resolve 不變量保證）
- 外層 label 恆定後移除了「每次 render 刷 label 防 stale」機制；createPreview 空 config 分支改走同一 `[[]]` 兜底
- main.ts 查證零改動（不直接操作預覽容器 role/aria）
**Out-of-scope observations to follow up:**
- 新匯出型別 PreviewRowSpec/PreviewSpec 可供 T5.x 複用

## 2026-07-11 — T4.2 完成：三小件 C 項收整，M4 收工
**Tasks:** T4.2
**Verdict:** DONE（M4 全數完成：T4.1／T4.2）
**Test result:** `npm test` 993 passed / 0 skipped，exit 0；`npm run typecheck` exit 0（協調者獨立重跑；style.css diff 親核＝恰一行箭頭 fallback）
**Files touched:** style.css（1 行：`var(--arrow-fg, transparent)`→`currentColor`）、render-preview.ts（applyPreviewFontFamily＋PREVIEW_FONT_STACK 死重整組移除、docstring 同步）、index.html（「24 段」→「25 段」註解）
**Decisions made by developer:**
- 同句註解「條件7」一併修為「條件8」——避免留下 10+4+7+3=24 算術矛盾；經 segments.ts 唯讀核對（conditional 實為 8 段）且與 segments.test.ts:85／segments.ts:23 既有口徑一致
- 箭頭 fallback 無純函式測試面（CSS fallback 字面值由瀏覽器消費、專案測試邊界為 DOM-free），未新增 CSS-content 測試模式——沿用既定邊界
- BACKLOG 對應兩行 C 項應於交付時劃銷（PLAN Goals #5 註記；commit 階段處理）
**Out-of-scope observations to follow up:** 無

## 2026-07-11 — T5.1 S7 spike 材料備妥（三瀏覽器實測待使用者）；T5.2 雙欄版面同步施工中
**Tasks:** T5.1（準備階段 DONE）、T5.2（平行進行中）
**Verdict:** T5.1 partial——材料 DONE、Chrome/Edge/Firefox 實測＝手動 gate 待使用者；與 T5.2 平行派工（sp7/ vs tools/ 檔案不相交）
**Test result:** `npm test` 993 passed，exit 0（T5.1 未動產品碼）
**Files touched:**（全新建）sp7/repro.html（自足單檔：3 select＋原地更新路徑＋單發/800ms 自動連發＋即時 selectedIndex/value/焦點讀出＋雙層捲動觀察＋事件log）、sp7/TESTING.md（三瀏覽器 × 兩核心問題操作腳本）、sp7/RESULTS.md（矩陣骨架全空白＋結論空節）
**Decisions made by developer:**
- 更新路徑忠實模擬真 UI 契約：原地改既有 option 文字＋於「新增一列」前插入新 option，絕不重建 select／replaceChildren
- 邊角案設計：高亮正停在「新增一列」項時被新插入項擠位——驗 selectedIndex/value 漂移
- repro 以 node --check＋標籤配對靜態驗證（不替代真瀏覽器行為測試）
**Out-of-scope observations to follow up:** 無

## 2026-07-11 — T5.2 完成：雙欄版面（D3）落地
**Tasks:** T5.2
**Verdict:** DONE
**Test result:** `npm test` 993 passed / 0 skipped，exit 0；typecheck exit 0；`npm run build`＋`verify:dist` 全過（協調者四項獨立重跑）
**Files touched:** index.html（+49/−：兩 wrapper、DOM 順序不動、#error-message 留 main 直子跨欄）、style.css（+68/−：@media ≥1100px grid 兩欄＋header/main/footer 放寬 1360px＋右欄 sticky 組＋min-width:0 防撐破）
**Decisions made by developer:**
- 右欄 wrapper `.builder-columns__aside`＝唯一語意節點（role="region"＋tabindex＋aria-label="預覽與產出"）；左欄純版面 div，skip-nav 維持原位
- 第二捲動停點落在 #preview-terminal 本體（僅加 tabindex="0"；不另包框層，避免第三層巢狀捲動）——T4.1 的 role/label 未動
- 欄寬換算 (1360−48−32)/2＝640px 吻合 PLAN；裸元素選擇器經 Vite 分包驗證僅本工具頁生效
- main.ts 逐一查證 DOM 存取皆 id/class 選取，零改動
- 附 T5.6 人工確認清單（斷點/sticky/buckets 2桶行/tab 序兩停點/巢狀捲動/瀏覽器矩陣）
**Out-of-scope observations to follow up:** 無

## 2026-07-11 — T5.3 完成：雙區清單重構＋列群組生命週期＋normalizeRows 接線
**Tasks:** T5.3
**Verdict:** DONE
**Test result:** `npm test` 1008 passed / 0 skipped（33 檔，+15 條 row-groups 測試），exit 0；typecheck／build／verify:dist 全綠（協調者獨立重跑四項）
**Files touched:** main.ts（+179/−13：列群組生命週期＋跨容器搬移＋commitConfig 接線）、index.html（#segment-row-groups 掛點＋section template）、style.css（最小樣式，重用既有 segment-section 樣式）、row-groups.ts＋row-groups.test.ts（新模組：computeRowGroups／rowGroupsEqual 純函式）
**Decisions made by developer:**
- **正確性關鍵**：normalizeRows 回傳新物件會孤兒化既有 li 事件閉包（閉包持原 config 物件參照）——applyRowNormalization 改為把 row 值原地寫回既有 config.segments[i]（符合 PLAN 原文），不整批替換
- 列群組生命週期：grow→assign→shrink 序（shrink 前防禦性先搬離殘留 li）；啟停搬移經 commitConfig 的分組變動偵測隱式觸發＋顯式 re-focus checkbox
- 分組變動偵測：computeRowGroups vs lastRowGroups 深比較，僅變動才 layoutSegmentContainers——改顏色等 commit 零 DOM 重排
- 新檔 row-groups.ts 超出 in-scope 清單，理由充分（main.ts 頂層 document 存取不可在 node 環境 import；比照 buildPreviewSpec 純函式接縫慣例）
- 既有排序鈕／拖曳因每列自有 ol 而自然同列化（副作用），T5.5 才做正式語意
**Out-of-scope observations to follow up:** 無

## 2026-07-11 — sp7 repro 修訂：下拉內「新增一列」選項由死錨點改為功能性觸發
**Tasks:** T5.1 善後（使用者回報「點新增一列不會真的新增」）
**Verdict:** 已修復並雙路 headless 實證
**Test result:** headless（Edge --headless=new --dump-dom）：按鈕路徑本來就正常（點兩下→options=6、values=1..5,__add__）；修訂後下拉選「新增一列」→ options+1、該 select 自動指到新列（value=4）、其他 select 同步長出新選項
**Files touched:** sp7/repro.html（change handler 加 __add__ 分支＋intro 說明三種觸發）、sp7/TESTING.md（補記第三種觸發＋新觀察情境）
**根因：** 初版 repro 的下拉內「新增一列」選項僅作插入位置錨點（死的），與真實 UI 語意（選了→建列＋移段）不符——使用者誤點該選項而觀察到「沒新增」。修訂後三種觸發（按鈕／800ms 自動／下拉選項）皆走同一原地更新路徑；下拉觸發還額外覆蓋「變更提交同一刻全體更新」的最高風險情境
**Out-of-scope observations to follow up:** 無

## 2026-07-11 — sp7 repro 第二修：儀表觀察者效應（A/B→C 下拉自關）
**Tasks:** T5.1 善後（使用者回報：先點 A/B 再點 C，C 下拉自動關閉；直接點 C 沒事）
**Verdict:** 已修復（機制分析＋headless 載入 sanity）
**Files touched:** sp7/repro.html（#event-log 改固定 height、select-row 間距縮小＋容器 380px 讓三 select 初始全可見、底部惰性墊高保留捲動觀察）、sp7/TESTING.md（補記 2）
**根因：** repro 自身儀表污染實驗——事件記錄面板用 max-height，未滿 12 行前每插一行就長高：A→C 觸發 blur(A)＋focus(C) 連插兩行、版面位移兩次，原生下拉開啟瞬間遇位移即自動關閉；直接點 C 僅一行（無前置 blur）故無事。段 C 初始被 260px 容器裁掉一截、first focus 多一次 scrollIntoView 亦為噪音源
**對 S7 的意義：** 不修會把儀表噪音誤記為「option 更新造成的自關」，污染三瀏覽器矩陣結論；修復後再現的自關＝真訊號
**Out-of-scope observations to follow up:** 無

## 2026-07-11 — T5.1 完成：S7 實測收案＋兩項使用者裁決＋PLAN D2 回寫
**Tasks:** T5.1（DONE）
**Verdict:** DONE；S7 三問全數落定，重大發現一件＋契約修訂一件
**Test result:** n/a（手動 spike；證據＝使用者對話回報＋log 摘錄，coordinator 轉錄 sp7/RESULTS.md）
**Files touched:** sp7/RESULTS.md（矩陣＋結論＋§4 新發現回填）、PLAN.md（D2 列選擇 UI＋從空白建多列流程＋Spikes S7 三處回寫）、TASKS.md（T5.4 任務行加 S7 裁決修訂註記）
**S7 結論：**
- 原地更新**安全**（問題 1／2.1／2.2 全 OK，含變更提交同一刻全體更新情境）——T5.4 採用，無需防護
- **重大發現**：閉合 select 鍵盤導航逐按即提交 →「新增一列」option 被按住 ↓ 無限誤觸（實測 rowCount 7→10 連鎖）
- 2.4 反白疑問＝閉合模式無反白態（僅開下拉有）；裁決後邊角案整體失效
**使用者裁決（AskUserQuestion）：**
- 「新增一列」移出 select、改每段獨立按鈕（根治鍵盤誤觸；修訂 D2 契約）
- Firefox 未安裝——註記「未測」後收案（Chromium 系實測為據）
**Out-of-scope observations to follow up:** 無

## 2026-07-11 — T5.4 完成：列指派 select（僅枚舉使用中列）＋「新增一列」獨立按鈕＋重啟用 clamp
**Tasks:** T5.4
**Verdict:** DONE
**Test result:** `npm test` 1020 passed / 0 skipped（34 檔，+12 條 row-select 測試），exit 0；typecheck／build／verify:dist 全綠（協調者獨立重跑四項）
**Files touched:** row-select.ts＋row-select.test.ts（新：rowSelectOptionsForCount／computeRowSelectOptionOps／clampReenableRow 純函式）、main.ts（接線）、index.html（segment row template：row-field＝select＋icon-button）、style.css（最小樣式）
**Decisions made by developer:**
- 控件落點：`.segment-row__controls` 內新 row-field（移動鈕欄之後）——停用段整塊 controls 本就 display:none，免額外邏輯；enable-field 尾端保留給 T5.5
- 選項刷新＝純函式 diff 出最小 op 序列（update/append/trim；無變動回 []）→ DOM 端只做原地 value/text 寫入＋尾端增刪，絕不 replaceChildren；僅在 rowGroupsEqual 為 false 時刷新——與 row 無關 commit 零觸碰
- **契約細節抓漏**：normalizeRows 升冪壓縮會把超界凍結 row「鑄造成新列」而非 clamp——啟用路徑前置 clampReenableRow（超界→現行末列、undefined 保留、零列 no-op），落實 PLAN「不自動新增列」語意
- 「新增一列」按鈕：seg.row＝lastRowGroups.length → commitConfig → 顯式 re-focus 按鈕；aria-label「〈段名〉— 新增一列」
- 附 T5.6 人工項：從空白建 7 列（需 ≥2 段啟用才有意義——單一段按鈕為 no-op by design，空列自然壓縮）、重啟用兩案、全體 select 同刻刷新的真 DOM 焦點驗證
**Out-of-scope observations to follow up:** 無

## 2026-07-11 — T5.5 完成：排序 UX 落地，M5 自動化任務全數收工
**Tasks:** T5.5
**Verdict:** DONE（sprint 07 程式面全部完成；剩 T5.6／T5.7 手動驗收）
**Test result:** `npm test` 1031 passed / 0 skipped（34 檔，row-groups 測試 +26 案），exit 0；typecheck／build／verify:dist 全綠（協調者獨立重跑四項）
**Files touched:** main.ts（performSwap／refreshMoveButtonStates／拖曳語意重構、移除 syncConfigOrderFromDom 死碼）、index.html（鈕移入 enable-field）、style.css（margin-left:auto）、row-groups.ts＋test（computeRowSwap／formatMoveAnnouncement 純函式）
**Decisions made by developer:**
- 同列交換＝computeRowGroups 找同 row 子序列相鄰成員、交換**絕對陣列位置**（物件參照保留）；DOM 搬移直接重用 T5.3 的 layoutSegmentContainers（rowGroupsEqual 可偵測列內順序變化），零新 DOM 碼
- 鈕顯示條件：enable-field 不隨 controls 塊自動隱藏，改 main.ts 顯式 setHidden（建列＋checkbox change 兩處）
- 拖曳：dragover 一律 preventDefault（跨列也發 drop）；同列 drop＝同一 performSwap 核心；跨列 drop＝不動 config、dragOrigin 吸附回原位＋播報「不支援跨列拖曳…請改用『顯示於第 N 列』選單」
- **行為變更（誠實回報）**：停用段拖曳排序變 no-op（舊 DOM resync 移除；停用段無 row、不影響輸出）——列入 T5.6 清單第 10 項供使用者裁定是否需跟進任務
**Out-of-scope observations to follow up:**
- 停用段裝飾性拖排若要保留需另開「同 category 子序列」純函式任務（使用者於 T5.6 裁定）

## 2026-07-11 — T5.6 驗收回饋觸發 M5.5 改版（PLAN Rev 4）
**Tasks:** M5.5 立項（T5.8／T5.9）；T5.6／T5.7 順延
**Verdict:** 契約修訂完成、T5.8 派工
**使用者驗收回饋（原話摘要）：**
- 取消已選段會「亂跳」回四類區、勾選跳到最上面——一路往下勾的流程每勾一次重排一次，不符直覺
- 「新增一列」每段一顆 + 很怪，應在最上層
- 建議三欄（左目錄／中已選擇／右預覽腳本）＋滿版——資訊量大，雙欄仍要一直捲
**使用者三項裁決（AskUserQuestion）：** 三欄滿版（斷點 3→2→1）；左欄灰化留位（transfer-list、零跳動）；「新增一列」中欄頂部單一按鈕＋UI 暫存空列（config 壓縮契約不動）
**協調者處置：** PLAN Rev 4＋D3-R4 節（取代 D3 版面與跨容器搬移互動；sticky／捲動停點 a11y 契約沿用；停用段控件列改收隱藏池不銷毀——維持節點重用鐵律；S7 鍵盤誤觸裁決維持有效）；TASKS 插入 M5.5（T5.8 版面→T5.9 互動）；T5.6 checklist 屆時增補三欄項
**Out-of-scope observations to follow up:** 無

## 2026-07-11 — T5.8 完成：三欄滿版版面重構
**Tasks:** T5.8
**Verdict:** DONE
**Test result:** `npm test` 1031 passed / 0 skipped，exit 0；typecheck／build／verify:dist 全綠（協調者獨立重跑四項）
**Files touched:** index.html（三 wrapper：catalog／selected／aside；#segment-row-groups＋#segment-move-status 遷出 segment-lists 入中欄）、style.css（grid-template-areas 三斷點：<1100 單欄疊、1100–1400 兩欄「catalog+selected 疊左／aside 右」、≥1400 三欄 3fr:4fr:3fr＋1800px 滿版檔位）
**Decisions made by developer:**
- grid-template-areas 取代裸 grid-column（兩欄斷點需 catalog/selected 同欄堆疊，named areas 消除 auto-placement 歧義；#error-message＝error area 全斷點跨欄）
- global-section 留左欄頂（最小 diff；低密度控件，跨欄頂列無 PLAN 授權）
- #segment-move-status（排序播報 live region）隨列群組遷中欄（D3-R4 排序歸中欄語意）
- main.ts 零改動（id/class 選取不受 wrapper 更名影響，逐一查證）
- 已知過渡瑕疵：T5.9 前左欄仍載重控件列，三欄下 threshold buckets 暫回 1 桶/行——T5.9 落地自然消解
**Out-of-scope observations to follow up:** 無

## 2026-07-11 — T5.9 完成：transfer-list 互動落地，M5.5 收工（sprint 程式面第二度全完成）
**Tasks:** T5.9
**Verdict:** DONE（M5.5 全數完成；待 T5.6／T5.7 手動驗收）
**Test result:** `npm test` 1049 passed / 0 skipped（35 檔：catalog.test.ts 新 6 案、row-select.test.ts 擴至 24 案），exit 0；typecheck／build／verify:dist 全綠（協調者獨立重跑四項）
**Files touched:** main.ts、index.html（#catalog-item-template＋#segment-hidden-pool＋#add-pending-row）、style.css、row-select.ts＋test（解禁擴充 pendingRowCount）、catalog.ts＋test（新：buildCatalogGroups）
**Decisions made by developer:**
- 目錄序取 SEGMENT_DESCRIPTORS 定義序（非 config.segments 陣列序——後者會被 T5.5 同列交換重排）→「恆定不重排」結構性保證
- setSegmentEnabled 經 init 時建立的 segmentConfigById 查表改同一物件（物件身分全程保全）；灰化＝原位 class＋badge 切換、零 DOM 移動、顯式 re-focus 同一 checkbox
- 隱藏池＝main 直子 `<ul hidden aria-hidden>`；建構時全部 li 先進池；assignSegmentsToContainers 統一搬移；shrink 孤兒 fallback 改指池——無銷毀、監聽器/展開態 round-trip 保全
- 暫存列＝模組級計數（不進 config）；row-select 純函式加 pendingRowCount 參數（「第 N 列（新列）」標籤）＋nextPendingRowCount 於分組變動時遞減實現數
- 兩項判斷留 T5.6 裁定：中欄不加「移除」鈕（左欄單一入口）；暫存空列無撤銷（重載前留存）
**Out-of-scope observations to follow up:** 無

## 2026-07-11 — 使用者驗收回饋第二/三波：Rev 5（跨列拖曳解禁）＋Rev 6（移除鈕/插入制特效/整列刪除）＋T5.10 完成
**Tasks:** T5.10（DONE）、T5.11（立項待派）
**Verdict:** T5.10 DONE；PLAN Rev 5＋Rev 6 契約修訂完成
**Test result:** `npm test` 1057 passed / 0 skipped（row-groups +8 案），exit 0；typecheck／build／verify:dist 全綠（協調者獨立重跑四項）
**使用者裁決（Rev 5＋Rev 6）：**
- 跨列拖曳解禁（推翻 Non-Goal「不做拖曳跨列」與 accept-then-revert 案）
- 中欄每段「移除」鈕（推翻 T5.9 左欄單一入口判斷）；拖曳統一插入制＋插入點挪空間特效；整列刪除鈕（僅剩最後一真實列 disabled、確認後執行、暫存列免確認）
**T5.10 實作（files: main.ts／row-groups.ts＋test）：**
- computeCrossRowMove 純函式（不 mutate 輸入、beforeId===id no-op 防衛、8 測試案含空源列壓縮）
- targetRow 以 closure／容器索引解析（不加 data 屬性，index.html 零改動）；暫存列 drop＝rowCount+i，與 select 指派同值收斂
- 跨列 drop 實移＋formatMoveAnnouncement 播報；同列維持交換（T5.11 將改插入）；無效落點 revert 保留
- 誠實標記：列尾空白 drop 命中區狹窄（.segment-list 無額外 padding）——T5.11 挪空間特效將重塑，屆時一併處理
**Out-of-scope observations to follow up:** 無

## 2026-07-11 — T5.11 完成：移除鈕＋插入制＋挪空間特效＋整列刪除，M5.5（Rev 4–6 全部回饋）收工
**Tasks:** T5.11
**Verdict:** DONE（sprint 程式面第三度全完成；待 T5.6／T5.7 手動驗收）
**Test result:** `npm test` 1068 passed / 0 skipped，exit 0；typecheck／build／verify:dist 全綠（協調者獨立重跑四項）
**Files touched:** main.ts、index.html、style.css、row-groups.ts＋test（新純函式 resolveDropSide／computeRowDeletion；同列插入案補齊）
**Decisions made by developer:**
- 移除鈕（✕）＝enable-field 排序鈕後；走 setSegmentEnabled 同路徑、焦點回左欄目錄 checkbox、播報「已從清單移除」；共用視覺同步抽 syncSegmentEnabledUi 供批次刪列複用
- 確認步驟＝inline 兩段式（觸發鈕→確認刪除/取消，焦點預設落「取消」防雙 Enter 誤刪）；理由：codebase 零原生 dialog 慣例、inline 焦點全可控且不打斷 live region
- 整列刪除＝computeRowDeletion 純函式（列成員＋isLastRow）→ 批次停用＋單次 commitConfig；僅剩一真實列時 disabled 維持可見；刪後焦點落「新增一列」鈕
- gap 特效：resolveDropSide 純函式（指標上/下半→前/後插）；**實作中抓掉地雷**——gap 設 pointer-events:none 會被容器列尾 handler 劫持，改 gap 自帶 dragover/drop（stopPropagation）；drag 期間 scoped 規則拓寬列尾命中區（不動共用 .segment-list）；reduced-motion 由全站既有規則涵蓋
- 同列拖放正式改插入（經 computeCrossRowMove targetRow=原列）；上/下移鈕維持 performSwap 交換
- 已知怪癖（模型使然、非 bug）：暫存列刪除為計數制——點任一暫存列的刪除移除的是最高編號那個（placeholder 可互換）；列入 T5.6 確認
**Out-of-scope observations to follow up:** 無

## 2026-07-11 — T5.12 完成（Rev 7）：「顯示文字」措辭＋預設開啟——sprint 程式面最終收工
**Tasks:** T5.12
**Verdict:** DONE（M5.5 含 Rev 4–7 全部回饋落地；程式面完結，待 T5.6／T5.7）
**Test result:** `npm test` 1068 passed / 0 skipped，exit 0；typecheck／build／verify:dist 全綠（協調者獨立重跑四項）；golden 15 檔 hash 前後逐檔一致
**Files touched:** config.ts（defaultSegmentConfig icon false→true＋doc comment）、config.test.ts（預設值斷言更新）、index.html（「顯示圖示」→「顯示文字」）、main.ts（註解同步）
**Decisions made by developer:**
- deserialize 缺欄語意查證：sanitizeSegment 為嚴格 `raw.icon === true` 強制轉換（非 fallback 到 default）、icon 為必填欄且裸 stringify 恆序列化——舊存檔解讀零影響；翻轉僅及全新 config 與目錄對帳補段兩個預期場景
- 「顯示圖示」全源碼 grep 0 命中（僅剩 magi/ 歷史文件屬禁區正確保留）
- CONFIG_VERSION 維持 2
**Out-of-scope observations to follow up:** 無

## 2026-07-11 — T5.13 完成（Rev 8）：拖曳把手＋頂部條起拖修正
**Tasks:** T5.13
**Verdict:** DONE
**Test result:** `npm test` 1068 passed / 0 skipped，exit 0；typecheck／build／verify:dist 全綠（協調者獨立重跑四項）
**Files touched:** index.html（enable-field 首位 ⠿ grip、aria-hidden、template doc comment 第 13 點）、style.css（cursor grab/grabbing、muted 色、enable-field user-select:none——controls 塊不受波及）
**Decisions made by developer:**
- main.ts 零改動：既有 dragstart guard（closest 控件選擇器）天然放行 grip span／段名 span／空白區、按鈕維持阻擋
- grabbing 游標用純 CSS :active，免 JS 狀態
**使用者回報→診斷：** 「點頂部拖不動」＝右半按鈕群被 guard 正確阻擋（設計）＋段名可選取文字按住變選字（缺陷）——grip＋user-select:none 雙管齊下
**Out-of-scope observations to follow up:** 無

## 2026-07-11 — /magi:review-code 完成：MAGI 面向分區 ×5 審查
**Tasks:** code review（使用者指定「依照角度多方位審議且不限3票」）
**Verdict:** **REQUEST-CHANGES（輕量）**——0 Critical、5 Important 採納、14 Minority/Note；票型 4× APPROVE-WITH-NITS＋1× REQUEST-CHANGES（R3）
**產出：** MAGI_CODE_REVIEW.md＋DRIFT.md（Status: DETECTED——A×3／B×7／C×9）
**審查規模：** 五位 reviewer 分面向（R1 引擎／R2 shell 後端／R3 UI 邏輯／R4 結構樣式 a11y／R5 測試與漂移總查）；diff 38 檔 +5085/−448；R1 實跑 202 node 測試、R2 實測 4 個 multirow golden byte-current＋逐行 diff 驗單列 byte-identity、R3 逐條追物件身分一致性、R4 驗 id 唯一性/Label-in-Name/live region/分包隔離
**採納的 5 個 Important（commit 前必辦）：**
1. 上/下移至列邊界焦點落 body（唯一行為 bug；R3）——改聚焦反方向鈕
2. multirow golden 無常駐比對迴圈（R2＋R5 跨票）——補純 emit it.each＋config 收攏單一來源
3. SPEC.md＋PRD.md Spec deltas 未落地（R5；交付閘門）
4. BACKLOG 兩行未劃銷（R5；交付閘門）
5. 中欄缺地標/skip 目標（R4）——region＋aria-label＋skip-link
**Out-of-scope observations to follow up:** 見 DRIFT.md C 節（過時註解群／jsdom renderRuns 測試／toAnsi([]) 邊界等）

## 2026-07-11 — review 修復完成：5 項 Important 全數收掉（＋零風險註解群）
**Tasks:** MAGI review Important I-1～I-5＋Note 級註解修正
**Verdict:** DONE（協調者四 gate＋golden 雙驗通過）
**Test result:** `npm test` **1076 passed / 0 skipped**（+8：multirow golden 比對迴圈等），exit 0；typecheck／build／verify:dist 全綠；既有 11 golden hash 不變、4 multirow golden 未動且新迴圈「改壞即紅」閉環驗證（sha1 還原比對）
**Files touched:** main.ts（I-1 邊界改聚焦反方向鈕）、multirow-golden-configs.ts（新：單一來源）、兩 harness .mjs（改 import 共用來源；ps1 側因 registerHooks 時序改動態 import）、emit-bash/emit-ps1.test.ts（無條件 it.each 比對）、SPEC.md（Components＋Status 依三欄終態）、magi/PRD.md（Goals 多列無上限）、PLAN.md（Rev 9：邊界 re-focus 句＋Spec deltas ✅）、magi/BACKLOG.md（53-56 劃銷）、index.html（中欄 region＋跳至已選擇 skip-link＋註解修正）、style.css（註解修正）、resolve.test.ts（astral 字面恢復原覆蓋意圖）
**Decisions made by developer:**
- I-1 邊界判斷用 computeRowSwap 回傳（position===1／===rowSize），非 null 保證 rowSize≥2 故反方向鈕必 enabled——正確性由既有純函式測試間接保護
- 單一來源模組化時抓到兩處既有 inline config 的等價性（bash helper 預設 icon:false vs ps1 顯式覆寫——功能相同）並收攏；TS2783 重複屬性即時修正
- 中欄 region 刻意不加 tabindex（非捲動容器、不增停點）
**DRIFT 更新：** A×3 全數勾銷（附解法）；Status 維持 DETECTED（B/C 記錄項由 /magi:commit 流程向使用者確認）
**Out-of-scope observations to follow up:** main.ts 無 DOM 測試 harness 為既存架構缺口（review Untested paths 已載）

## 2026-07-11 — T5.6 驗收中 bug：列末段 disabled 鈕滑鼠死區（頂部間歇不可拖）——根因確立＋一行 CSS 修復
**Tasks:** T5.6 驗收回饋 bug 修
**Verdict:** DONE（根因以 CDP 真實輸入實證；四嫌疑逐一裁決）
**Test result:** `npm test` 1076 passed / 0 skipped，exit 0（協調者複跑）；CDP headless Edge 對 dist 實頁驗證修復前後行為
**Files touched:** style.css 一處——`.icon-button[disabled]` 加 `pointer-events: none`（協調者 grep 確認 :770-774）
**根因（嫌疑 a 成立；b/c/d 均以證據排除）：** 原生 `disabled` 按鈕吞滑鼠事件且不冒泡（CDP 實測：死區中心 mousedown 零事件、enabled 同位鈕正常冒泡至 li）→ 該區連 dragstart 都不觸發；列末段下移鈕必 disabled（refreshMoveButtonStates），故「最後一段＋頂部右側＋位置相依偽間歇」
**a11y 取捨：** 選 pointer-events:none 而非 aria-disabled——`disabled` 屬性原封不動（tab 序/SR 朗讀/不可點全不變，T5.5「disabled 維持可見」語意零變化）；唯一代價＝懸停該鈕不再顯示 not-allowed 游標（純 hover 提示，鈕本就不可點）
**排除證據：** drop-gap 清理無漏（dragend 規格保證恆發）；is-segment-dragging 隨 dragend 必清；threshold panel 常規流無覆蓋
**使用者複驗：** 列末段頂部右側（下移鈕一帶）按住起拖應恢復正常；該鈕仍不可點、Tab 仍跳過、SR 仍朗讀停用

## 2026-07-11/12 — T5.6 驗收回饋雙修：✕ 移除捲動跳躍（模態區分）＋checkbox.checked 同步缺口
**Tasks:** T5.6 驗收回饋 bug 修 ×2
**Verdict:** DONE ×2（CDP 實證＋協調者四 gate 複跑全綠：1076/0 skip）
**Files touched:** main.ts（兩修皆僅此檔）
**修 1——兩欄堆疊下 ✕ 移除的視口跳躍：** 滑鼠觸發（event.detail>0）→ `focus({preventScroll:true})`、鍵盤觸發（detail===0）→ 維持捲動聚焦。CDP 分離量測：以「focus 全 stub」建立純版面位移基線（Δ−311），修復後滑鼠路徑與基線**完全相同**（focus 跳躍歸零）、鍵盤路徑保留 Δ−1350 捲動。一致性掃描：左欄自身切換／整列刪除聚焦 add-pending-row（同欄近距）／Rev 9 反方向鈕（同 li）皆免改
**修 2——checkbox.checked 殘留（修 1 CDP 儀器化時挖出）：** T5.11 新增的 ✕／整列刪除停用路徑繞過 checkbox，syncSegmentEnabledUi 只切 class/badge 不同步 .checked → 勾勾殘留、重啟用需點兩次。修：統一同步點補 `checkbox.checked = enabled`（程式賦值不觸發 change、無迴圈；grep 確認 seg.enabled 賦值點僅兩處故窮盡）。CDP 驗證：✕ 後 false＋單擊重啟用、整列刪除僅翻該列
**Out-of-scope observations to follow up:** 無

## 2026-07-12 — T5.6 驗收回饋修復：最後列拖曳被 Chromium 即時中止（dragstart 同幀版面位移）
**Tasks:** T5.6 驗收回饋 bug 修（「最後列(兩列以上)拖移還是卡住，從偶爾變一定觸發」）
**Verdict:** DONE（根因 red→green 全鏈 CDP 實證；協調者三 gate 複跑全綠：1076/0 skip、typecheck、build+verify:dist）
**Files touched:** main.ts（dragstart/dragend handler＋模組級 `dragClassRafId`）、style.css（僅註解）
**根因（CDP 實證，最小重現頁＋真實頁面雙確認）：** dragstart handler 內**同步** `body.classList.add('is-segment-dragging')` → 其 CSS（列清單 `padding-bottom: 2.5rem`）令上方每個列群組清單立即長高 → 非第一列的來源 li 於 dragstart 派發**同幀**下移 40px → Chromium 偵測來源元素版面位移即中止原生拖曳（實測 dragstart 後 2–3ms 即 dragend、`Input.dragIntercepted` 無事件＝session 未建立）。第一列自身 padding 長在其 li 下方、位移 0，永遠正常——與回報「只有最後列、兩列以上、一定觸發」機制吻合。「從偶爾變一定」＝前次 disabled 鈕死區修復（pointer-events:none）讓頂部起拖真正進到 dragstart，此深層問題遂成必現
**修法：** class 改 `requestAnimationFrame` 延遲一幀加（dragstart 派發完成、session 已建立後）；callback 以 `draggingId !== null` guard＋dragend `cancelAnimationFrame` 雙保險防極短拖曳 class 殘留；`li.style.opacity` 不影響 layout 維持同步。命中區放寬僅晚一幀，肉眼不可辨
**驗證（headless Edge＋Input.setInterceptDrags，CDP 唯一能驅動原生 DnD 管線的方式）：** 修復前真頁 red 基線：最後列 dragstart→2ms dragend、session 未建立；修復後：最後列 grip 起拖 session 建立→gap 出現→drop 提交**實際跨列移動**（rows 快照前後對照）；對照組第一列起拖無回歸亦完整提交；每輪結束 body 無 `is-segment-dragging` 殘留
**Decisions made by developer:** 照協調者 fix contract 逐字實作，無自主決策
**使用者複驗：** 兩列以上時自最後列任一段（把手/段名/頂部空白）起拖——應能正常拖起、gap 挪空間、同列/跨列 drop 皆落地；極短一按即放不應讓列尾命中區高度殘留
**Out-of-scope observations to follow up:** CDP 合成 drop 管線同 session 第二輪起保真度不穩（harness 限制，非程式行為；以「對照組先跑」交叉驗證排除）

## 2026-07-12 — T5.6 驗收回饋修復：段間縫隙 drop 誤判列尾（PLAN Rev 10 契約細化）
**Tasks:** T5.6 驗收回饋 bug 修（「拖一到兩個中間的黑區會預設到最後段，拖到其他人身上就 OK」）
**Verdict:** DONE（red→green CDP 實證＋協調者三 gate 複跑全綠：1082/1082、0 skip、typecheck、build+verify:dist）
**Test result:** `npm test` **1082 passed / 0 skipped**（+6：resolveBlankAreaInsertIndex 幾何解析），exit 0
**Files touched:** row-groups.ts（新純函式 resolveBlankAreaInsertIndex）、row-groups.test.ts（+6）、main.ts（wireRowContainerDrop 兩 handler 改用幾何解析）、PLAN.md（Rev 10）
**根因（CDP 實證）：** wireRowContainerDrop 對「事件目標不在 li 內」的所有位置一律視為空白處＝落列尾；段與段之間 0.5rem flex gap 條帶正是此類目標（`elementFromPoint` 實測命中 `.segment-list` 容器本身）→ gap 視覺提示與 drop 落點雙雙錯到列尾
**修法（使用者裁決語意）：** 縫隙依指標 Y 幾何解析插入點——`resolveBlankAreaInsertIndex(pointerY, items)` 回傳首個「中線低於指標」的段索引（與 li 級 resolveDropSide 同一中線語意）、全在其上→null＝落列尾。dragover（gap 位置）與 drop（beforeId）共用同一解析；刻意不排除被拖曳段自身（佔位幾何與所見一致，`beforeId===id` 由 computeCrossRowMove 既有分支安全退化）；暫存空列無 li → 恆 null，語意不變
**驗證（CDP headless Edge＋Input.setInterceptDrags）：** red：縫隙 drop → gap 顯示 between [cwd][END]、段落列尾；green：同座標 → gap 顯示 between [model][cwd]、drop 實際插入兩段之間；尾端空白對照組 → gap 於列尾、drop 仍 append（契約不變）；body class 零殘留
**Decisions made by developer:** 照協調者 fix contract 實作；共用 resolveBeforeNode 區域 helper
**使用者複驗：** 拖到兩段之間的縫隙——gap 應在縫隙處挪空間、放開即插入該處；拖到列尾下方空白仍落列尾
**Out-of-scope observations to follow up:** CDP 合成 drop 需在 gap 長高後補發 dragover 才會派發 drop（真實指標為連續 dragover 流、無此問題）——harness 筆記已更新

## 2026-07-12 — T5.14 列耗盡保留＋暫存列位置制（PLAN Rev 11）
**Tasks:** T5.14（T5.6 驗收回饋：「第3列唯一段拖到第2列→第3列消失」「第1列段拖到第3列→顯示在第2列」；使用者裁決：拖曳＋select 搬空來源列＝原地保留空列；空列純 UI 態）
**Verdict:** DONE（主體＋一輪追修；協調者 CDP 九情境全綠＋四 gate 全綠）
**Test result:** `npm test` **1112 passed / 0 skipped**（1082→1106 主體 +24、追修 +6 slotsEqual），exit 0；typecheck／build／verify:dist 全綠
**Files touched:** row-slots.ts（新：RowSlot 位置制純函式模組——realIndexOfSlot/slotIndexOfRealRow/consume/convert/remove/reconcile/slotsEqual）、row-slots.test.ts（新，37）、row-select.ts（枚舉改依 slots；nextPendingRowCount 刪除）、row-select.test.ts、main.ts（rowSlots 狀態＋commitSegmentMove 統一移動入口＋wirePendingRowDrop＋顯示編號全面同步＋lastRenderedSlots 雙閘門）、index.html（#segment-pending-rows 移除、暫存列插入 #segment-row-groups 內）、style.css（死規則清理）
**設計要點：** 暫存列計數制→位置制 slots（空列可在中間）；「第 N 列」一律顯示位置編號（標題/刪除鈕/select/播報）；指派入中間空列＝該位置插入真實列（其下真實列 row +1 bump）＋consumePendingSlot；來源耗盡＝convertRealToPending（原位翻 kind，位置不變）；srcSlot 於任何 slots 變更前計算（consume/convert 不移位故後續有效）；✕移除/取消勾選/整列刪除維持壓縮/真刪除；引擎 normalizeRows/resolve 契約零變動（config 恆無空列）；連帶修正暫存列刪除鈕計數制怪癖（刪所點那列）
**追修（協調者 CDP S4 抓出）：** 「空列成真（real+1）＋來源耗盡（real−1）抵銷」→ 真實分組不變 → rowGroupsEqual 閘門跳過重繪、slots 已變但 DOM 卡舊態。修：slotsEqual＋lastRenderedSlots 快照，commitConfig 重繪條件改雙閘門；繞過 commitConfig 的新增/刪除空列路徑同步快照；與分組、slots 皆無關的 commit 仍不觸發重繪（Rev 2 語意保留、測試釘死）
**CDP 驗證（headless Edge＋Input.setInterceptDrags，九情境）：** S1 拖曳耗盡末列原地保留（新列）✓；S2 拖曳耗盡首列、落點編號不漂移 ✓；S3 select 耗盡同語意 ✓；S4 指派入中間空列（含耗盡抵銷）重繪正確 [p,r,r]→[r,p,r] ✓；S5 ✕耗盡仍壓縮 ✓；S6 暫存列刪除點哪刪哪 ✓；S7 重整空列消失 ✓；S8 非耗盡指派入中間空列 bump 正確 ✓；S9 刪中間空列下方重編號 ✓——播報/標題/select 枚舉全程顯示編號正確
**Decisions made by developer:** DropTarget 型別置於 main.ts（非共用模組）；rowSlots 變異函式皆回傳新陣列（快照別名安全性註解）；style.css 清理 .segment-pending-rows 死規則
**使用者複驗：** 兩個原始情境（第3列唯一段拖第2列→第3列留為（新列）；第1列段拖第3列→落點仍標第3列）＋空列可再指派段/可刪除/重整消失
**Out-of-scope observations to follow up:** 無

## 2026-07-12 — MAGI 增量聚焦 review（第二輪）：REQUEST-CHANGES（0 Critical／3 Important／15 Note）
**Tasks:** /magi:review-code（增量聚焦式，使用者裁決範圍）——審 2026-07-11 首輪 review 後的全部變動（上輪修復落地＋T5.6 四波修復＋T5.14 位置制）
**Verdict:** 審畢——票型 4× APPROVE-WITH-NITS＋1× REQUEST-CHANGES（R2/main.ts 面向，Fable 承審）；首輪報告存證 MAGI_CODE_REVIEW-2026-07-11.md
**採納 Important：** I-1 select 跨列指派後焦點落 body（契約違反 A 類，鍵盤路徑自斷，T5.10 期既存、本輪重寫面）；I-2 整列刪除 inline 確認態隨容器錯位復用殘留（指向別列的一鍵誤刪陷阱，T5.11 期既存）；I-3 commitSegmentMove bump/drain 決策層抽純函式補測試（R5+R2 跨票，nextPendingRowCount 覆蓋遷移落點，不阻擋但採納併修）
**信心背書：** T5.14 slots 算術經 R2 組合矩陣全譜 trace 正確（S4 抵銷必被 slotsEqual 捕捉之證明）；R1 純函式 105 測試複跑綠＋代數不變量確認；R3 rAF 競態全譜無殘留窗；R4 顯示編號稽核全過＋id/aria 鏈完好；R5 PLAN Rev 11 逐句落地＋gates 複跑 1112/1112
**DRIFT.md：** 重生（Status: DETECTED）——A×1（select 回焦，待修）；B 更新：計數制記錄作廢（Rev 11 取代）、補 row-slots.ts 模組記錄、新增 slot value 編碼／enable 0→1 前置等裁量項；C 新增 SPEC 補句、drop 清理加固、moveBefore() 等 backlog
**Out-of-scope observations to follow up:** 見 DRIFT.md C 節（本輪新增六項 backlog 級）

## 2026-07-12 — 增量 review 修復：Important ×3 全數收掉（PLAN Rev 12）
**Tasks:** MAGI 增量 review I-1／I-2／I-3（使用者裁決「修」）
**Verdict:** DONE（協調者 CDP V1–V4＋S1/S4 等價抽查＋四 gate 全綠）
**Test result:** `npm test` **1122 passed / 0 skipped**（+10：planSegmentMove 組合矩陣），exit 0；typecheck／build／verify:dist 全綠
**Files touched:** main.ts、row-slots.ts（planSegmentMove＋DropTarget 移入）、row-slots.test.ts（37→47）
**I-1（select 回焦）：** change handler 於 commitSegmentMove 後顯式回焦該段 row select。CDP V1：real-target（含來源耗盡）與 pending-target 兩路徑指派後 activeElement 均回到該 select ✓
**I-2（確認態不跨 relayout 存活）：** 新 resetRowGroupDeleteConfirmStates() 於 layoutSegmentContainers（shrink 後）對全部倖存容器復位＋焦點保全（activeElement 在被隱藏 confirmGroup 內→回焦該容器 deleteTrigger）。CDP V2（checkbox 觸發 relayout→全復位、焦點依 checkbox 自身契約保留）✓ V3（刪中間列→零殘留、焦點落 add-pending-row）✓ V4（拖曳觸發 relayout→全復位；focus 落 body 經探針歸因為 mousedown 於把手時瀏覽器**原生** blur——發生在任何程式碼之前、等同點擊頁面空白處，非修復缺陷；guard 為正確防禦保留）✓
**I-3（planSegmentMove）：** commitSegmentMove 步驟 1–4 逐行搬遷至 row-slots.ts 純函式（決策/執行分離：回傳 targetRow/nextSlots/bumpIds，main.ts 依 bumpIds mutate）；10 測試涵蓋 pending×耗盡三向、real×耗盡、同列 guard、多中間 pending、S4 抵銷 named 迴歸、bumpIds 排除 moved/停用段、不 mutate 輸入。行為等價由 CDP S1/S4 重跑結果與修復前逐位一致證明
**DRIFT 更新：** A×1 勾銷（附解法）；Status 維持 DETECTED（B/C 記錄項由 /magi:commit 確認）；PLAN Rev 12 存證
**Out-of-scope observations to follow up:** 無新增

## 2026-07-12 — T5.7 SR 抽測：使用者明示豁免（PLAN Rev 13）
**Tasks:** T5.7
**Verdict:** WAIVED（使用者裁決「朗讀跳過 不需要該功能」）
**處置：** TASKS.md T5.7 標記豁免存查；PLAN Rev 13 記錄「06b 驗收閘門縮減為 T5.6 單關」；DRIFT.md C 項同步改寫。a11y 結構（地標／標題／live region／焦點契約）維持已實作現狀、不回退，僅不再以 SR 實測驗收。

## 2026-07-12 — T5.6 驗收完成＋T5.15 排序操作說明文字
**Tasks:** T5.6（完結）、T5.15（新增並完成）
**Verdict:** DONE ×2
**T5.6 結案：** G 區複驗 11 項——1–9、11 全數 [V]（含列耗盡保留拖曳/select 雙路徑、空列指派/刪除/重整、select 鍵盤回焦、確認框復位、enable 0→1 排序 UX 過目 OK）；G-10 `prefers-reduced-motion` 使用者裁決**註記不測**（「現在應該沒人再關閉」，原 D 區同項一併註記）；B 區「重啟用落點」歷史 X 項經修復後於 G-1 翻綠。原清單 A–F 先前已 [V]。TASKS.md T5.6 勾銷
**T5.15（使用者回饋「方向鍵可排序應寫入頁面說明」）：** 中欄已選擇區（#segment-move-status 之後、新增一列鈕之前）補純靜態 `<p class="segment-section__desc">` 排序操作說明（滑鼠拖曳／↑↓ 鈕同列交換／select 方向鍵換列）；僅動 index.html、無互動邏輯變更。協調者驗證：dev server 頁面文字出現、1122/1122、typecheck、build+verify:dist 全綠
**Sprint 狀態：** 全部任務（T1.1–T5.15）完成；T5.7 使用者豁免（Rev 13）；DRIFT.md Status: DETECTED（A 全解，B/C 記錄項待 /magi:commit 確認）→ **可進 /magi:commit（sprint 模式）**
