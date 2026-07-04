# 🧠 MAGI Code Review — DEV @ 2ce6663（sprint 03 未 commit 變更集）

**Diff scope:** working tree vs HEAD（19 tracked 檔 +149/−716 含 4 rename；另 untracked 新檔：src/lib/gif-encode*＋test-helpers、tools/gif-editor/ 全套）

> **面板組成透明備註**：MAGI 多 CLI orchestrator 於 Windows 不可用；由
> 5 個鏡頭特化的 Claude（**Sonnet**，依使用者指定）subagent 平行審閱，
> coordinator 手動套用 MAGI_VOTING.md。鏡頭特化下單一議題鮮少跨鏡頭；
> 2 票收斂視為強訊號；A 類 drift 一律經 coordinator 親驗才收錄。

## Dashboard

```
┌──────────────────────────────────────────────────────────┐
│  VERDICT: APPROVE-WITH-NITS（4/5；CR2 REQUEST-CHANGES）   │
├──────────────────────────────────────────────────────────┤
│  Mode: supermajority   Threshold: 3.34   OK: 5/5  無降級  │
├──────────────────────────────────────────────────────────┤
│  ✅CR1正確性 ✅CR2a11y ✅CR3建置 ✅CR4測試 ✅CR5契約        │
│  （AWN）    （RC）    （AWN）  （AWN）  （APPROVE）       │
├──────────────────────────────────────────────────────────┤
│  🔴 Critical: 1（coordinator 親驗證實）  🟡 Important: 3  │
│  🟢 Note: 10    四閘全綠（174/174）由多位審稿人重跑確認   │
└──────────────────────────────────────────────────────────┘
```

## Verdict
**APPROVE-WITH-NITS**（正式採納門檻 ≥4/5 無議題觸及；以下依嚴重度列
單鏡頭發現，Critical/Important 建議修復後再 commit）

正面事實（多位審稿人獨立實證）：四閘全綠重跑確認；gif-encode.test 遷
併 33 區塊逐條比對「一字不差、零斷言弱化」；薄層 re-export 面「不多不
少」grep 證實；兩工具零互相 import；disposal 透明探針幀設計獲讚；CR1
另寫 4 個獨立驗證（256 色 LZW 邊界、越界裁切、多 sub-block NETSCAPE）
全過；sprint 02 backlog 的 transparentColorIndex 斷言缺口已被三方交叉
在精神上補上。

## 🔴 Critical
- **[CR2；coordinator 親驗證實] poster canvas 無任何無障礙名稱——暫停
  ／reduced-motion 下 SR 全盲**
  `#original-poster`（index.html:95）／`#result-poster`（:227）無
  role/aria-label；暫停機制把有 alt 的 `<img>` hidden、以 canvas 頂
  替；reduced-motion 使用者從頭到尾只見 canvas。violate SPEC「資訊性
  alt」不變量；係「img swap-src」（sprint 02）改為「img↔canvas 替換」
  時遺失屬性的新回歸。
  Fix：`renderPosterCanvas` 增 label 參數，設 `role="img"`＋
  `aria-label`（兩呼叫點補上）。

## 🟡 Important
- **[CR2] 幀 delay input 的 wrap-label 使 accessible name 疑遭現值污染**
  main.ts:398-411 以 `<label>` 包住文字＋input（coordinator 親驗屬
  實）；AccName 對 spinbutton 的 name-from-content 會併入現值 →
  name 可能為「幀 3 停留時間（毫秒）100」且隨值漂移。同頁其他控件皆
  用 `label[for]`。規範推導（未 AT 實測）。Fix：改 `label[for]`＋
  `input id`，或 input 直接設 aria-label；T4.5 以 SR 驗證。
- **[CR3，實測] worker chunk 各自內嵌完整編碼核心——dist 三份副本；
  WORKS「單份」措辭不實**
  Vite 對 module worker 為獨立子建置（既有限制、非本次回歸）：
  gif-encode 共用 chunk 只對 main-thread 路徑成立，兩顆
  encode.worker-*.js（各 ~11.4 kB）各自內嵌。Fix：修 WORKS 措辭把
  「消除雙打包」限定於原始碼／main-thread 層；未來可評 worker 內動態
  import()。
- **[CR4] `estimateDecodedByteSize`（記憶體閘估算）零測試**
  main.ts:132-136 內嵌未匯出；與本 sprint 自建慣例（decode 的純函式
  皆抽出配 table test）矛盾；改壞即閘門靜默失效。Fix：抽出＋補閾值邊
  界與偽幀過濾測試。

## 🟢 Note（依鏡頭）
- [CR1] resetForNewFile 不重置 loop 控制項與 isPaused（選檔失敗後短暫
  顯示前檔設定；建議補 WORKS 裁決或重置）
- [CR1] applyEdits 淺共享 frame 物件（安全、測試釘住）——建議在 doc
  comment 明文警語防未來就地修改像素的功能踩雷
- [CR2] frame-list-section 選檔前常駐顯示空清單＋disabled 分頁（契約
  沉默；確認是否刻意）
- [CR2] 播放次數播報文字與 PLAN 差一空格（對齊即可）
- [CR3] verify-dist 骨架掃描於 dist/tools/ 空目錄時靜默通過（有交叉檢
  查兜底；可加零目錄 fail）
- [CR4] LZW builder 泛化公式僅在 minCodeSize=2 被驗證（建議補 ≥8 色
  fixture 讓 minCodeSize=3 跑一次）
- [CR4] edit「還原」方向（false→true→applyEdits）未被行使
- [CR4] 無 GCE 幀未經 decodeGif 端到端（builder 不支援省略 GCE；建議
  GifFrameSpec 讓 GCE 可選＋一條案例）
- [CR5] gif-reader.ts 檔頭仍自述「usable from browser worker」與
  test-only 定位矛盾（過時文件）
- [CR5] PLAN 檔案清單缺 netscape-loop.ts／gifuct-typecheck.ts（授權
  在 WORKS，清單宜補）

## Untested paths
- tools/gif-editor/main.ts／encode.worker.ts（先例：無單測、由 T4.5
  真人 gate 驗）——內含 estimateDecodedByteSize（見 Important）
- scripts/verify-dist.mjs 邏輯本身（既有慣例，跑一次間接驗）

## Drift 摘要
DRIFT.md：A×2（皆 coordinator 親驗）、B×16、C×7 —— Status: DETECTED
