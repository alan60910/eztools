# Works — 09 測試網加固批（sprint 13）

> Append-only 施工日誌。Source: TICKET.md  •  Sprint: magi/13-test-hardening/

## 2026-07-19 — M1 三 lane 平行＋違規裁決修復
**Tasks:** T1.1、T1.2（lane A）、T1.3（lane B）、T1.4（lane C）＋T1.1 揭露違規之 production 小修（使用者裁決「併本 sprint 修」）
**Verdict:** DONE（lane A 曾正確 BLOCKED——巡檢器掃到現存真違規，依 brief 上報待裁）
**Test result:** 協調者親跑全套 **1833/1833 exit 0**（自 1829 淨增 4 案）；lane 各自：meta-scan 8/8（違規修復後由 7/8 轉綠）、output-dialog 18/18、i18n-dom 四輪全套零紅；typecheck 三鏈 0。
**Files touched:** i18n-meta-scan.dom.test.ts（+227/−11：屬性巡檢 `findAttrOffenders`＋strip 重寫＋盲點回歸案 ×2）、output-dialog.dom.test.ts（bash／settings 內容全等）、i18n-dom.dom.test.ts（+47/−16：檔級 `vi.setConfig({ testTimeout: 30_000 })`，移除 sprint 12 單案 20000）、index.html（+1：`#preview-terminal` 掛 `data-i18n-attr="aria-label:previewAria.groupLabel"`）
**Decisions made by developer:**
- **T1.1 巡檢器首跑即抓到現存真違規**：`#preview-terminal` 硬編 CJK aria-label 無掛標——lane A 依 brief 不修 production、BLOCKED 上報；使用者裁決併本 sprint 修。修法＝**復用既有 `previewAria.groupLabel` key**（zh byte 級同值＋en 譯文皆已存在，render-preview.ts 執行期本就走該 key 動態寫入）——index.html 單行掛標即收斂，messages.ts 零改動。
- **T1.2 盲點實測定案**：(a) 字串內 `//` 誤剝＝真缺陷（紅案打實）；(b) brief 假設的「行首 throw」**不重現**（regex 未錨定），真缺陷＝throw 行整行清空吞掉同行合法 CJK——紅案改打真缺陷，不硬造。修法＝`stripComments`（字串感知字元掃描）＋`stripThrowErrorCalls`（括號平衡、只刪呼叫本體）。
- **T1.4 量測定案**：熱點＝被測本體 main.ts 每案全量 re-import（隔離 588–966ms、並行負載翻倍；`vi.resetModules` 僅 0.1ms）；最重案負載峰值 3583ms 逼近 5s 預設限——與病史吻合。**不採 boot 減重**（跨案模組隔離是測試意圖、共用有污染風險），採檔級 testTimeout 30s 體制化（同手法先例：lang-switch.dom.test.ts／pipeline.integration.test.ts），移除單案 20000（30s 對 3.6s 峰值約 8 倍餘裕）。逐案量測數據表全文見 lane C 回報（隔離→負載：2106→3583ms 等七案）。
- lane B 工具備忘：本檔 CRLF＋`﻿` regex 字面使 Edit 工具多行匹配靜默失敗——以 node 腳本行索引插入繞過，diff 驗證僅預期行落地。
**Out-of-scope observations to follow up:**
- lane A 全套跑動中觀察到 `emit-ps1.test.ts` culture-invariance 案（spawn 真 powershell）於負載下踩 5s timeout 一次——與 i18n-dom 同族的「真執行×並行負載」flake 家族；M2 真值表盤點時一併看該檔 timeout 體制。

## 2026-07-19 — M2 CI 跨後端 gate meta 守門（08 同族合帳）
**Tasks:** T2.1（真值表盤點）、T2.2（meta 守門實作）
**Verdict:** DONE（最終驗收＝push 後 CI 雙 leg 綠，列入 commit 交棒條件）
**Test result:** 三檔 234/234＋statusline-builder 全量 1421/1421＋typecheck 三鏈 0（開發者）；協調者親跑全套 **1839/1839 exit 0**。非恆真紅證：本機以 `GITHUB_ACTIONS=true` 偽裝 windows CI leg → 三檔拓撲鎖各紅一次（`expected true to be false`）→ 除 env 後全綠（純命令行覆寫、零檔案還原）。
**Files touched:** fixtures.test.ts／pipeline.integration.test.ts／emit-bash.test.ts（各 meta 區）
**Gate 真值表（本機 win32 實測／CI 兩 leg 推導）：**
| Gate | 本機 win32 | CI ubuntu | CI windows |
|---|---|---|---|
| fixtures `BASH.ok` | true（實測） | true（test.yml「Ensure jq」step） | **false**（sp5 jq gitignored） |
| fixtures `IS_WIN`（ps1） | true | false | true（平台旗標，不可能靜默跳） |
| pipeline `BASH.ok` | true | true | **false** |
| pipeline `PS1.ok` | true | false（非 win32 短路） | true（runner 內建 PS 5.1） |
| pipeline `PWSH7.ok` | true | **不確定（未鎖，保守）** | true（workflow 註解明文） |
| pipeline `BASH.ok && PS1.ok`（跨後端等價 9 describe） | true | **false** | **false** ＝**恆假全靜默，僅本機雙後端可跑** |
| emit-bash `REAL_EXEC.ok` | true | true | **false** |
**Decisions made by developer:**
- 新守門三類：(1) 各 leg 環境自述印 gate 真值表；(2) must-run 鎖（ubuntu：BASH/REAL_EXEC 必真；windows：PS1 必真＋pwsh present 卻 skip＝bug）；(3) 拓撲鎖（windows leg BASH.ok===false＋reason 匹配已知原因；跨後端組合門兩 leg 恆假明文化「僅本機雙後端可跑」）。
- ubuntu 側 PWSH7 真值 workflow 未明文保證 → 刻意不加斷言（防 CI 誤紅），僅真值表註記。
- `emit-ps1.test.ts` culture flake 不在可動清單、未動（如實回報）——留待 review／commit 決定去處。
**Out-of-scope observations to follow up:**
- `emit-ps1.test.ts` 真執行 spawn 檔尚無檔級 timeout 體制（i18n-dom／lang-switch／pipeline 已有）——一行同構補強候選。

## 2026-07-19 — M3 e2e 組合案＋M4 收口 gate
**Tasks:** T3.1、T4.1（M4 由協調者親執行，於此揭露）
**Verdict:** DONE（sprint 13 實作全數完成；CI 雙 leg 綠＝push 後終驗）
**Test result:** 開發者：e2e 8/8 exit 0＋竄改紅證（拖後改點另一色塊 → `UI override state changed after drag` 紅、還原後綠）；協調者親跑：全套 **1839/1839 ×2 輪**＋typecheck 三鏈 0＋`npm run test:e2e` **8/8 exit 0**（新案 5326ms）。
**Files touched:** scripts/e2e-statusline.mjs（+210/−0：案 #8 `color-variant-override-survives-drag`）
**Decisions made by developer:**
- 種子 `{cwd:0, duration:0, cost:1}`——拖後來源列仍為真實列，聚焦覆寫存活、不與既有 drain/pending 案（#2/#5）重覆蓋。
- 覆寫設定走真 DOM change 事件（同檔既有 `selectMove` 慣例）而非 CDP 點隱藏 picker——不加 flake 面；picker 可點性已有 dom 測試覆蓋。
- 斷言 (b)：以 `# <id>` 註解界切 cwd 區塊，先驗覆寫指紋（`38;5;3` SGR＋basename variant jq 片段）拖前後皆在，再驗原始區塊確有差（非恆真），最後正規化列後綴變數（`texts_N` 等）後 byte 相同——證明唯一差異＝列位。
**M4 收口對帳（TICKET Verification 七條，協調者親驗）：**
1. `npm test` 全綠＋typecheck 三鏈 ✅（1839/1839 ×2；tsc ×3 exit 0）
2. 巡檢／盲點紅綠雙證 ✅（fixture 紅→綠；盲點 (a) 紅案打實、(b) brief 假設不重現→改打真缺陷「throw 行整行清空吞同行 CJK」，誠實修正）
3. gate 真值表落 WORKS＋meta 本機綠 ✅；**CI 雙 leg 綠＝push 後終驗（交棒 commit 條件）**
4. 三鈕內容全等 ✅（ps1/bash/settings 皆 === 產出全文）
5. `npm run test:e2e` 8/8 ✅（協調者親跑）
6. flake 量測數據落 WORKS＋全套 4 輪該檔零紅 ✅（治本＝檔級 30s 體制化）
7. production 零行為改動 ✅（diff 僅測試檔＋e2e 腳本；**唯一授權例外**＝index.html +1 掛標——T1.1 揭露現存違規、使用者裁決併修，zh 字面 byte 級同值、僅補 i18n 通道）
**Out-of-scope observations to follow up:**
- `scripts/e2e-statusline.mjs` 不在 `tsconfig.scripts.json` include 內（typecheck 不覆蓋 e2e 腳本）——既有缺口非本批引入，候選一行補強。

## 2026-07-19 — review round 1 更正條目（append-only，協調者實證）
**上文 M1 對 `#preview-terminal` 的「現存真違規」定性，經 review（opus＋haiku 兩票、協調者實證 render-preview.ts:246）修正如下：**
- 該 aria-label 在本批**之前**即由 `render-preview.ts` 的 `renderRuns()` 以同一 key（`previewAria.groupLabel`）於 boot 與每次語言切換時無條件執行期覆寫——執行期 i18n **並無缺口**，「真違規」定性高估。
- 準確定性＝**靜態 HTML 文案重複＋新巡檢器對「JS 管理屬性」的已知盲點**（掃描器只看靜態面）。掛標修復仍成立且不回退：價值＝靜態 HTML 自洽＋巡檢綠（belt-and-suspenders 良性冗餘，同 key 同值收斂、無可見 race）。
- **M4 對帳 item 7 補遺**：`git diff` 除測試檔＋e2e 腳本＋index.html（授權例外）外尚含 `magi/BACKLOG.md`——屬 sprint promote 簿記、非 production／實作 diff，列準則豁免（原對帳漏言明，此處補正）。

## 2026-07-19 — review 收尾批（使用者裁決「修採納項全批」，雙 lane 平行）
**Tasks:** MAGI review 🟡-1/-2/-3＋🟢-4~9 收尾（lane A＝掃描器＋巡檢；lane B＝診斷性＋e2e＋註解；協調者＝簿記三件）
**Verdict:** DONE
**Test result:** lane A 單檔 12/12＋全 repo 1843/1843；lane B 三檔 234/234＋e2e 8/8（headless Edge，含新後綴身分斷言）；協調者終驗全套 **1843/1843 exit 0**＋typecheck 三鏈 0。各項紅證以「暫還原修復前版本→跑紅→還原」於真實 repo 完成。
**Files touched:** i18n-meta-scan.dom.test.ts（+423/−11）、fixtures/pipeline/emit-bash 三檔 meta 區（診斷性＋reason 全集註解＋行號符號化）、e2e-statusline.mjs（後綴身分斷言＋指紋註解）、render-preview.ts（+10 純註解：雙寫入者關係）
**Decisions made by developer:**
- 🟡-1：字串模式換行終止（template literal 例外維持跨行）＋throw marker 字串感知＋JSDoc 已知限制明文（**regex 含 `//` 誤判註解類未修、已文件化**——lane A 誠實回報 brief 原例 `/\/\//` 屬此類、換行終止修不到，紅案改用含引號形態精準打修復點）；紅證揭露字串內 marker 舊行為比預期更嚴重（誤觸發後一路吃到檔尾）。
- 🟡-2：`coveredByI18nAttr` 收緊（含冒號＋非空 key）＋template.content 子樹巡檢（實測僅 color-picker-template 含 3 個 CJK 屬性、均已掛標→綠）＋en 重掃案（全 repo key 零錯字→綠，未觸發 BLOCKED；錯字 TEMP 探針證明機制會現形後移除）。
- 🟡-3：三檔訊息補「本機誤設 GITHUB_ACTIONS 先 unset」＋reason 字串全集註解＋「首次真驗＝CI 首跑；不符時放寬 regex 而非改拓撲」＋PWSH7 ubuntu 不斷言理由入註解。
- 🟢：pipeline 九行號符號化；e2e 後綴身分斷言（before 全 `_0`／after 全 `_1`，實跑驗證）＋指紋耦合註解；render-preview 雙寫入者註解（勿誤刪任一側）。
**Out-of-scope observations to follow up:**
- 掃描器殘餘已知限制（文件化未修）：regex 含 `//` 誤判行註解、throw 參數含帶括號 regex 之 desync——已列 JSDoc，未來 main.ts 引入此類 regex 前須擴充掃描器。
