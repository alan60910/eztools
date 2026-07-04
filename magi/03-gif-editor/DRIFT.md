# Drift — GIF 編輯工具
> Source: MAGI 5-reviewer panel（Sonnet，supermajority, ok_weight 5）  •  Generated: 2026-07-04  •  Status: DETECTED

## A. Contract violations
- [x] ✅已修復（2026-07-04 post-review fix：renderPosterCanvas 設 role=img＋aria-label，兩呼叫點各給等效文字）poster canvas 缺資訊性 alt 等效文字（暫停／reduced-motion 下 SR 全盲） — files: `tools/gif-editor/index.html`, `tools/gif-editor/main.ts`
  [vote 1/5 — CR2；coordinator 親驗 index.html:95/227 與 main.ts:300 證實無 role/aria-label] SPEC Conventions 互動工具 a11y 不變量明文「資訊性 alt」；暫停機制以無名 canvas 頂替有 alt 的 img，屬「img swap-src → img↔canvas 替換」結構改動時遺失屬性的新回歸。
  Proposed PLAN/SPEC update: PLAN §5 補「poster canvas 須以 role=img＋aria-label（比照對應 img 的 alt）提供等效文字」；可考慮 SPEC a11y 不變量補「媒體之替代呈現（poster／截圖）須繼承等效文字」。
- [x] ✅已修復（2026-07-04 post-review fix：改 label[for]＋獨立 input id「frame-delay-N」；AccName 實效仍列 T4.5 AT 驗證項）幀 delay input 採 wrap-label，accessible name 疑併入現值、偏離 PLAN 字面 — files: `tools/gif-editor/main.ts`（createFrameRow:398-411）
  [vote 1/5 — CR2；coordinator 親驗 wrap 模式屬實（無 htmlFor/id，與同頁 label[for] 慣例不一致）；AccName value-substitution 行為屬規範推導，待 T4.5 AT 實測] PLAN §5 明文 name 應為「幀 N 停留時間（毫秒）」字面。
  Proposed PLAN/SPEC update: PLAN §5 補「delay input 以 label[for]＋獨立 input id 達成（不可 wrap），避免 spinbutton 現值滲入 name」。

## B. Below-the-contract decisions
- [ ] loop 抽取採方法(a)（gifuct application ext 走訪）、gif-reader 維持 test-only oracle [CR3+CR5；PLAN §4a「SP-3 擇一」授權；WORKS 有記錄] — 背書。
- [ ] SPEC delta 落地時按 SP-3 定案修正 PLAN 暫定句（「gif-reader 抽 loop」→「走訪 application extension」）[CR5；WORKS 有記錄] — 正確而非疏漏。
- [ ] tools.test 連結數改顯性硬編 2（tripwire；原自我參照恆真）[CR3+CR5；WORKS 有記錄] — 優於 PLAN 預想。
- [ ] verify-dist 入口 anchor 採顯式 ENTRY_ANCHOR_SLUGS＋同步責任註解＋dangling 交叉 [CR3+CR5；與 PLAN Recommended approach 逐字對應] — 契約內。
- [ ] _probe 骨架修復（main＋meta description）[CR5；coordinator 裁決、WORKS 有記錄] — 計畫外必要變更。
- [ ] edit.ts 無效輸入一律 throw（delay 例外走正規化）[CR5；PLAN 授權二擇一；WORKS 有記錄]。
- [ ] isProcessingFile 旗標防併發選檔 [CR2；WORKS 有記錄（自抓自修）]。
- [ ] Transferable 前 slice() 複製防 detach [CR2；WORKS 有記錄（自抓自修）]。
- [ ] 全刪時轉換鈕 disable 原因僅一次性播報、無持續 aria-describedby [CR2；WORKS 已列候補打磨]。
- [x] ✅已修復（2026-07-04：納入顯隱管理，初始 hidden、解碼成功後與原始預覽一同顯示）frame-list-section 選檔前常駐顯示（空清單＋disabled 分頁）[CR2；契約沉默] 。
- [x] ✅已修復（2026-07-04：resetForNewFile 重置 loop 控制項＋isPaused=reducedMotionQuery.matches（鏡射模組初始、兼顧 reduced-motion 不變量）＋同步 aria-pressed）resetForNewFile 不重置 loop 控制項與 isPaused [CR1]。
- [x] ✅已修復（2026-07-04：applyEdits doc comment 補共享 buffer 警語）applyEdits 淺共享 frame 物件（edit.test 釘住；下游現況只讀）[CR1]。
- [x] ✅已修復（2026-07-04：抽至 decode.ts 具名匯出＋3 條測試（精確值／偽幀過濾／0 幀））estimateDecodedByteSize 內嵌 main.ts 未匯出、零測試 [CR4]。
- [x] ✅已修復（2026-07-04：WORKS 以 append 條目修正措辭，限定於 main-thread／原始碼層）worker chunk 各自內嵌編碼核心（dist 三份；Vite module worker 既有限制）[CR3 實測]——bundle 層去重本身留候補（動態 import() 評估）。
- [x] ✅已修復（2026-07-04：補 5 色 GCT minCodeSize=3 fixture、還原方向測試、GCE 可選＋無 GCE 端到端——tests 174→180）fixture builder 泛化僅在 minCodeSize=2 驗證；edit「還原」方向未行使；無 GCE 幀未過 decodeGif 端到端 [CR4]。
- [x] ✅已修復（2026-07-04：gif-reader 檔頭改明確 test-only 定位＋點名 netscape-loop 為生產路徑；PLAN 清單補列兩檔）gif-reader 檔頭自述過時；PLAN 檔案清單缺 netscape-loop.ts／gifuct-typecheck.ts [CR5]。

## C. Out-of-scope observations
- [ ] 上游 bug：js-binary-schema-parser GIF schema 之 Plain Text Extension 分支欄位誤植（`parent.text.blockSize`→應 `parent.blockSize`）——含 0x21 0x01 ext 的合法 GIF 使 gifuct parseGIF 整體 throw；loop 抽取有降級擋下，**像素解碼路徑無等效降級**。緩解選項：decode 前預掃剝除該區塊／上游回報 patch [CR3+CR5；WORKS 有記錄]
- [ ] apng-to-gif 的 #progress-section 仍整段 hidden 切換，未達「live region 常駐」既有不變量；gif-editor 本次的「僅 progress 元素 hidden、status 節點永掛」模式為 backport 候選 [CR2]
- [ ] 全域暫停鈕 DOM 歸屬於原始預覽 region，以 region 導覽先入結果 region 的 SR 使用者找不到控制鈕（軟性可讀性議題）[CR2]
- [ ] fixtures/generate.ts 檔頭重生指令在 node 22 早期次版本需 --experimental-strip-types 旗標（CI node24 不受影響、不在 build 鏈）[CR3]
- [ ] verify-dist.mjs 自身無單測（sprint 01 起既有慣例）[CR4]
- [ ] sprint 02 backlog「transparentColorIndex 動態值斷言」已被本 sprint interop 三方交叉在精神上滿足——該 backlog 項可收斂或標記已緩解 [CR4]
- [ ] PLAN 虛擬碼 `DisposeOp` 型別實際不存在（composite 刻意用 plain number 常數）——文件措辭落差、無行為影響 [CR1+CR5，2 票跨鏡頭]
