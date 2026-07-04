# Works — GIF 編輯工具（sprint 03）

Append-only journal。記錄實作過程的決策與觀察。

## 2026-07-04 — T1.1 gifuct-js 安裝＋SP-6 型別 spike
**Tasks:** T1.1
**Verdict:** DONE
**Test result:** 82/82（`npm test` exit 0，coordinator 親驗）；`npm run typecheck` exit 0（tsconfig＋tsconfig.node 雙 project）
**Files touched:** package.json、package-lock.json、tools/gif-editor/gifuct-typecheck.ts（新增）
**Decisions made by developer:**
- SP-6 結論：gifuct-js shipped 型別**足夠**，未動用 fallback（無 augmentation、無 wrapper、無第二個 declare module）
- 已知型別不精確處（不阻塞）：shipped 型別把 `delay`/`disposalType`/`transparentIndex` 宣告為必要 `number`，但無 GCE 幀執行期實為 `undefined`；TS 對 `number !== undefined` 防禦式比較不報 TS2367，可直接編譯——**型別不會幫忙擋、執行期仍須判斷**（已記錄於探針檔頭，供 T3.1 decode.ts 參考）
- 探針檔 `gifuct-typecheck.ts` 為永久保留的型別回歸守門
**Out-of-scope observations to follow up:**
- （無）

## 2026-07-04 — T1.2 機械搬遷 composite／gif-reader／gifenc.d.ts → src/lib
**Tasks:** T1.2
**Verdict:** DONE
**Test result:** 82/82（總數不減）；typecheck exit 0；build exit 0（✓ built，9 產物）——coordinator 另親驗 test＋typecheck 皆 exit 0
**Files touched:** 4 檔 git mv（composite.ts／composite.test.ts／gif-reader.ts／gifenc.d.ts → src/lib/，rename 0 行變更）；6 檔 import repoint（main.ts／encode.worker.ts／decode.ts／decode.test.ts／convert.ts／convert.test.ts，共 +7/−7 行）
**Decisions made by developer:**
- 全程 git mv（無複製＋刪除流程，符合全域刪檔規則）
- convert.test.ts 同檔兩個 import（composite＋gif-reader）皆 repoint；convert 匯入依契約未動（薄層屬 T1.3）
- gif-reader 檔頭 test-only 註記依契約未動（角色升級屬 T3.1）
**Out-of-scope observations to follow up:**
- （無）

## 2026-07-04 — T1.3 編碼管線下沉＋薄相容層＋測試遷併（M1 完結）
**Tasks:** T1.3
**Verdict:** DONE
**Test result:** 82→84（原 82 全數存活於 src/lib/gif-encode.test.ts＋2 條薄層 smoke）；coordinator 親驗三閘：test 84/84 exit 0、typecheck exit 0、build exit 0
**Files touched:** 新增 src/lib/{gif-encode.ts, gif-encode.test.ts, test-helpers.ts}；tools/apng-to-gif/convert.ts 退 12 行薄 re-export、convert.test.ts 改兩條 smoke
**Decisions made by developer:**
- 泛化更名：encodeGif／GifEncodeInput／GifEncodeOptions／NormalizedGifEncodeOptions／normalizeGifEncodeOptions；寫幀迴圈逐行核對零變更
- 薄層 re-export 面釘死 `{convertToGif, ConvertOptions, DecodedAnimation}`；grep 證實 RGBAFrame 從未經 convert.js 被消費，未含入（符合「不多不少」）
- smoke：`convertToGif === encodeGif` 身分斷言＋單幀 gif-reader 讀回
- grep 證實 gif-encode.ts 零 import tools/；main.ts／worker／decode.ts 的 convert 匯入面一字未動
**Out-of-scope observations to follow up:**
- （無）

## 2026-07-04 — T2.1＋T2.2 SP-2/3/4 spikes 沉澱（M2 完結，平行 lanes）
**Tasks:** T2.1（lane A）、T2.2（lane B）
**Verdict:** DONE ×2
**Test result:** 84→112（+10 generate.test、+18 interop.test）；coordinator 親驗 112/112 exit 0、typecheck exit 0。lane A 曾目擊 lane B WIP 的 2 個暫態失敗，lane B 落地即消（同 sprint 02 併行經驗）
**Files touched:** 新增 tools/gif-editor/fixtures/{generate.ts, generate.test.ts, sample-edit.gif(99B, byte-stable 測試釘住)}；新增 tools/gif-editor/{netscape-loop.ts, interop.test.ts}
**Decisions made by developer:**
- **SP-4 一次過**：無壓縮 LZW（全 literal code＋每 2^minCodeSize−2 codes 發 clear code，碼寬鎖 minCodeSize+1）；PoC 非零偏移（left=1,top=2 且 left≠top 防交換 bug）＋disposal=3 由 gifuct 逐像素解回；fallback 未動用。builder 純函式零 node 依賴；寫 sample 入口以 isMainModule 閘控（有別於 APNG 先例，因本檔會被測試 import）
- **SP-3 擇法：方法 (a)**（走訪 gifuct parseGIF 的 application ext subBlocks）——與像素解碼共用單一 parser、無第二錯誤模型；兩法在 loop 0/1/n 五組值上一致後採 (a)；gif-reader 維持 test-only oracle **不進生產路徑**（PLAN §4a 首選為 gif-reader、授權「SP-3 擇一」，此為契約內選擇）
- **上游 bug 發現**：js-binary-schema-parser GIF schema 的 Plain Text Extension 分支 `parent.text.blockSize` 應為 `parent.blockSize`——含 0x21 0x01 ext 的合法 GIF 會讓 gifuct parseGIF throw TypeError。extractLoopCount 的 try/catch 降級（→loop=1）實際擋下此 bug（有測試釘住）；但**像素解碼同樣會炸**（與 loop 抽取無關），屬 decode 管線的上游限制
- 0cs→100ms 釘死測＋1cs 對照；三方交叉含 transparentColorIndex 跨庫一致性
**Out-of-scope observations to follow up:**
- 上游 bug（js-binary-schema-parser plain-text ext）：含 Plain Text Extension 的合法 GIF 整條 gifuct 解碼管線會 throw。可選緩解：decode 前預掃剝除 0x21 0x01 區塊、或上游回報 patch——候補 backlog

## 2026-07-04 — T3.1＋T3.2 decode.ts／edit.ts（平行 lanes）
**Tasks:** T3.1（lane A）、T3.2（lane B）
**Verdict:** DONE ×2
**Test result:** 112→165（+30 decode.test、+23 edit.test）；coordinator 親驗 165/165 exit 0、typecheck exit 0
**Files touched:** 新增 tools/gif-editor/{decode.ts, decode.test.ts, edit.ts, edit.test.ts}
**Decisions made by developer:**
- decode：`gifDisposalToComposite` 顯式映射＋數碼交錯註解；delay 用 `?? 100`（非 `||`，防字面 0 誤判缺失）＋`NO_GCE_DEFAULT_DELAY_MS` 純函式直測；loop 直接重用 extractLoopCount 不再包裝；disposal 2/3 fixture 測試加第三「透明探針幀」讓 BACKGROUND vs PREVIOUS 在像素層可分辨（退化情形以 table 測試為權威）
- decode 發現：gifuct 對截斷輸入異常寬容（6-byte 簽名＋垃圾也「成功」解出 null/零欄位），「損壞但過 magic」的 throw 路徑需精心構造（GCT 完整、Image Descriptor 空缺）——已在 decode.test.ts 註解記錄
- edit：無效輸入契約選 **throw**（呼叫者 bug 應立即現形；與 applyEdits 前置斷言一致），唯 delay 走 normalizeDelayMs 正規化不拒收（gif-encode 既有契約）；全程不可變（slice/map/spread），23 測試含不可變性鏈式驗證
- edit 只依賴 `GifEncodeInput`（未 import lane A 的 DecodedGif，結構相容），lane 邊界零接觸
**Out-of-scope observations to follow up:**
- gifuct 對截斷輸入的寬容性：真實損壞檔可能解出空/零欄位而非報錯（decode 已對 0 幀防禦？——T3.3 端到端與 review 時留意空 frames 陣列路徑）

## 2026-07-04 — T3.3 端到端閉環＋SP-7 邊界（M3 完結）
**Tasks:** T3.3
**Verdict:** DONE
**Test result:** 165→174（+9 pipeline.test）；coordinator 親驗 174/174 exit 0、typecheck exit 0
**Files touched:** 新增 tools/gif-editor/pipeline.test.ts（僅新增，零既有檔修改）
**Decisions made by developer:**
- 主線：4 幀 fixture → 刪中間幀＋改刪除點之後的幀 delay（證明 keep×delaysMs 對齊）＋setLoop(5) → encode → gif-reader 斷言（幀數 3、disposal 全 2、delayCs 對齊、transparent flag、loopCount 4、trailer）
- NETSCAPE 三分支走完整管線（∞→0、1→省略、6→5）；再解碼閉環（decode↔encode 全閉環，透明幀 alpha 往返全零）
- SP-7 成立：import 面僅 vitest＋src/lib/*＋gif-editor 自身（無直接 gifuct/gifenc import）
- **0 幀 GIF 實況**：decodeGif 靜默回空（gifuct 寬容），管線在 applyEdits 以明確 throw 擋下、不會靜默達 encodeGif
**Coordinator 裁決：** 0 幀處置——decode.ts 維持寬容不改；UI 層（T4.3）於解碼完成時檢查 `frames.length === 0` 顯示 role=alert 錯誤（已寫入 T4.3 契約）
**Out-of-scope observations to follow up:**
- （無新增）

## 2026-07-04 — T4.1＋T4.2 工具頁骨架／tools 翻轉／verify-dist 通用化（平行 lanes）＋_probe 合規修復
**Tasks:** T4.1（lane A）、T4.2（lane B，含 coordinator 追加的 _probe 修復）
**Verdict:** DONE ×2
**Test result:** coordinator 親驗四閘：test 174/174、typecheck exit 0、build exit 0（dist 三工具頁齊）、verify:dist all checks passed
**Files touched:** 新增 tools/gif-editor/{index.html, style.css, main.ts(stub)}；src/tools.ts（gif-editor→available、description 補「循環次數」）；src/tools.test.ts（連結數改顯性硬編 2＋tripwire 註解）；scripts/verify-dist.mjs（三段通用化）；tools/_probe/index.html（補 main＋meta description）
**Decisions made by developer:**
- 骨架：live region 三顆常駐（memory-warning／status／error，is-empty）；進度區改「真常駐」（僅 progress 元素本身 hidden，live region 永掛——優於 sprint 02 的整區 hidden 模式）；skip-link＋分頁 nav 置清單前；原始預覽初始 hidden（延後掛載不變量入 markup）；單一全域暫停鈕涵蓋雙預覽（sprint 02 先例、poster 各自一顆）——T4.3 依此接線
- tools.test 連結數斷言原為自我參照（永遠打平、抓不到忘記翻轉），改顯性硬編 2 當 tripwire——比 PLAN 預想更進一步的改良
- verify-dist：骨架掃 dist/tools/* 全頁（真陽性抓到 _probe 不合格）＋顯式雙 anchor（同步責任註解）＋dangling anchor 交叉
- **coordinator 裁決**：_probe 骨架不合格→本 sprint 就地修復（範本應示範慣例；underscore 排除屬 BACKLOG「_probe 去留」既有議題不擴大）。tools/_probe/index.html 為 sprint 01 產物的最小修改，屬計畫外必要變更，於此記錄
- vite.config.ts 的 available↔entry guard 使 lane B 在 lane A 落地前 npm test 全掛（結構性時序）；lane B 以隔離 config 驗證自身邏輯，lane A 落地後全鏈自癒
**Out-of-scope observations to follow up:**
- （無新增；_probe 長期去留仍在 BACKLOG）

## 2026-07-04 — T4.3 main.ts＋encode.worker.ts（UI 全流程）
**Tasks:** T4.3
**Verdict:** DONE
**Test result:** coordinator 親驗四閘全綠：test 174/174、typecheck、build、verify:dist（main/worker 依 sprint 02 先例無獨立單測，行為由 T4.5 真人 gate 驗）
**Files touched:** 新增 tools/gif-editor/{main.ts（完整取代 stub）, encode.worker.ts}；index.html 增揭露文字段（未動 landmark/live region 結構）
**Decisions made by developer:**
- a11y 契約逐條落實（延後掛載、0 幀守門、記憶體閘（parseGIF metadata 估算、1GiB 閾值精神）、分頁 50/頁＋換頁焦點/播報、編輯播報（change 非 input 事件故不逐鍵）、非破壞性刪除不重繪清單、雙 poster（結果取 applyEdits 輸出首幀）、worker 協定＋fallback、下載＋大小對比）
- **併發 bug 自抓自修**：記憶體閘等待「仍要繼續」期間再選第二檔會雙 handleFileSelected 併發、晚者靜默覆蓋——加 isProcessingFile 旗標（fileInput.disabled 擋不住拖放路徑）
- **Transferable detach 危害自抓自修**：applyEdits 輸出 frames 與 decoded.frames 共用底層 buffer，直接轉移會 detach 原資料——一律 slice() 複製後再轉移
- SP-8：分頁後單頁 ~300 DOM 元素（不分頁 500 幀 ~3000，10 倍差）；skip-link 路徑 Tab 3 次達轉換鈕（不用 skip-link 約 108 次）
- SP-9（node 量測）：320×240×500 幀 decompressFrames ≈ 529ms 凍結——僅 153.6MB、遠低於記憶體閾值仍有實感凍結，印證 yield-before-decode 須獨立於記憶體閘存在
- build 觀察：gif-encode 成為兩工具共用 chunk（13.14 kB 單份）——下沉實際消除編碼核心雙打包
**Out-of-scope observations to follow up:**
- 全刪時轉換鈕 disable 的原因說明僅一次性播報，無持續性 aria-describedby——刻意簡化，SR 使用者 tab 到停用鈕聽不到原因（候補打磨項）

## 2026-07-04 — T4.4 Spec deltas 落地（實作面完結）
**Tasks:** T4.4
**Verdict:** DONE
**Test result:** 174/174（coordinator 親驗）；SPEC.md／TECHSTACK.md diff 抽查與 PLAN deltas 宣告一致
**Files touched:** SPEC.md（Components ×3、Conventions ×2、Status）、magi/TECHSTACK.md（runtime deps 分項改寫＋gifenc d.ts 位置）
**Decisions made by developer:**
- PLAN deltas 原文「gif-reader 抽 loop」為 SP-3 定案前暫定句，落地時按定案（走訪 gifuct application extension；gif-reader 留測試 oracle）修正措辭——與程式碼一致
**Out-of-scope observations to follow up:**
- （無）

## 2026-07-04 — T4.5 真人 checklist 交付（使用者 gate 開啟）
**Tasks:** T4.5（進行中——checklist 已交付，待使用者執行回報）
**Verdict:** partial（coordinator 側完成；human 項待回報）
**備註:** 全部自動化驗證已綠（174 tests／typecheck／build／verify:dist）；sprint 實作面（T1.1〜T4.4）完結，待 /magi:review-code。

## 2026-07-04 — MAGI code review（5×Sonnet 鏡頭面板）
**Tasks:** （review 階段）
**Verdict:** APPROVE-WITH-NITS（4/5；CR2 REQUEST-CHANGES）
**產出:** MAGI_CODE_REVIEW.md＋DRIFT.md（Status: DETECTED；A×2 皆 coordinator 親驗、B×16、C×7）
**要點:**
- 🔴 A-1（親驗證實）：poster canvas 無 aria-label——暫停/reduced-motion 下 SR 全盲（img→canvas 結構改動遺失 alt 的新回歸）
- 🟡 A-2（模式親驗、行為待 AT 實測）：delay input wrap-label 之 AccName 現值污染疑慮
- 🟡 CR3 實測：worker chunk 各自內嵌編碼核心（dist 三份）——**修正本檔 T4.3 條目的措辭**：「gif-encode 共用 chunk 單份」僅對 main-thread import 圖成立；兩個 encode.worker-*.js 因 Vite module worker 獨立子建置而各自內嵌（sprint 02 既有限制、非本次回歸）
- 🟡 CR4：estimateDecodedByteSize 零測試（與本 sprint 自建的純函式抽測慣例矛盾）
- 正面：遷併 33 區塊零弱化、薄層面「不多不少」證實、CR1 加寫 4 個獨立驗證全過
**透明備註（規則偏離記錄）:** CR1 審稿人自建的 4 個臨時驗證測試檔於驗證後自行刪除（「未留痕跡」）——偏離全域「刪檔前需使用者確認」規則；刪除對象為其自建暫存檔、無 repo 影響。與 sprint 02 lane A 同型事件，如實記錄。

## 2026-07-04 — Post-review 修復批（使用者確認「全修」，10 項）
**Tasks:** post-review fixes
**Verdict:** DONE（10/10）
**Test result:** 174→180（+6：estimator×3、還原方向、minCodeSize=3、無 GCE 端到端）；coordinator 親驗四閘全綠（整體 exit 255 為 Select-Object -First 截斷 git 管線的已知假警報，各閘實際 0——sprint 01 教訓再確認）
**Files touched:** tools/gif-editor/{main.ts, index.html, decode.ts, decode.test.ts, edit.ts, edit.test.ts, fixtures/generate.ts, fixtures/generate.test.ts}、src/lib/gif-reader.ts（檔頭）、magi/03-gif-editor/PLAN.md（檔案清單補列）
**Decisions made by developer:**
- A-1：renderPosterCanvas 增 label 參數設 role=img＋aria-label（原始／結果各自等效文字）
- A-2：delay input 改 label[for]＋id=frame-delay-N；checkbox wrap-label（無值污染疑慮）維持
- estimator 抽至 decode.ts（連同專屬 import 一併搬遷、無死碼殘留）
- GifFrameSpec GCE 欄位可選：兩者皆省略才不寫 GCE、僅省其一補 0（向後相容）
- reset 語意：isPaused 重置採 `reducedMotionQuery.matches`（鏡射模組初始式而非硬編 false——同時滿足「新檔自動播放」與 reduced-motion 不變量）；loop 控制項回預設；frame-list-section 納入顯隱管理
**流程自糾（如實記錄）:** 開發者為取含 untracked 的 diff --stat 曾 `git add -N .`＋`git reset`，誤將先前已 staged 的 4 個搬遷 rename unstage；已自行以 `git add -A -- <四組路徑>` 還原（gif-reader.ts 原「staged rename＋unstaged 修改」現合併為 staged，內容無差異）。coordinator 親驗 git status：4 rename 均為 staged R、無異常。
**Out-of-scope observations to follow up:**
- （無新增）
