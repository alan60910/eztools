# 🧠 MAGI Plan Review — GIF 編輯工具（round 2，現行）

**Sprint:** magi/03-gif-editor/ • **Document:** PLAN.md **r2**（2026-07-03）
**Round 歷史:** round 1（對 r1）＝REQUEST-CHANGES 5/5，25 項 minority
（含 3 票×2、2 票×2 強訊號）、9 spikes——全數已折入 r2；本檔為 round 2
對 r2 的現行結論（round 1 細節見 git 歷史）。

> **面板組成透明備註**：MAGI 多 CLI orchestrator（bash）於 Windows 不可
> 用；由 5 個鏡頭特化的 Claude（Opus）subagent 平行審閱（與 round 1 同
> 一批、保有脈絡），coordinator 手動套用 MAGI_VOTING.md。同模型鏡頭特
> 化面板下，正式採納門檻（supermajority ≥4/5）幾乎不會被單一議題觸
> 及；**2 票跨鏡頭收斂視為強訊號**。

## Dashboard

```
┌──────────────────────────────────────────────────────────┐
│  VERDICT: APPROVE-WITH-NITS（5/5 一致）                   │
├──────────────────────────────────────────────────────────┤
│  Mode: supermajority   Threshold: 3.34（ok_weight×2/3）   │
│  OK weight: 5 / 5      Degraded: no       Round: 2        │
├──────────────────────────────────────────────────────────┤
│  ✅ CR1事實  ✅ CR2架構  ✅ CR3a11y  ✅ CR4測試  ✅ CR5契約 │
├──────────────────────────────────────────────────────────┤
│  Round 1 議題結案: 25/25（各鏡頭自行審計確認）            │
│  🔴/🟡 採納: 0   🟢 新 nits: 7（含 2票×2 強訊號）          │
└──────────────────────────────────────────────────────────┘
```

## Verdict

**APPROVE-WITH-NITS**（5/5 一致；round 2）

五位審稿人逐項審計 round 1 議題，一致認定 **25/25 已解決**（多項獲
「超額」評語：roundtrip 錨定、解碼前讓出事件迴圈、DEFAULT 常數整條下
沉）。CR1 並複核 r2「已查證事實」段全部斷言與原始碼相符。剩餘 7 個
nits 全為 r2 新設計表面引入、各約一至數句計畫文字即可閉合，無一需要
重新設計；CR3 明示「建議直接折入、不必再走完整重審循環」。

## 🟢 新 nits（依票數排序）

### 強訊號（2 票跨鏡頭收斂）

- **N1 [CR5(Important)+CR2(Note)] 薄相容層與檔案修改清單自相矛盾**
  §3 說「既有 import 面不變」（main.ts／worker 的 convert 匯入停留
  `./convert.js`），檔案清單卻寫「composite／convert import 路徑改指
  src/lib/」——照字面 repoint 會撞「gif-encode.ts 只匯出更名後的
  `encodeGif`」而斷 typecheck，或做出零消費者的死相容層。
  Fix：清單改為「僅 **composite** import 改指 src/lib/；convert 匯入
  經薄層維持不變」；薄層 re-export 面依 grep 釘死為
  `{ convertToGif, ConvertOptions, DecodedAnimation }`（r2 漏列
  main.ts／worker 實際在用的 `ConvertOptions`）；SP-5 一併釘死。
- **N2 [CR4(Important)+CR2(Note)] gif-reader 生產化的健壯性／loop 抽取失敗降級**
  gif-reader 檔頭自述 test-scoped、遇未知 byte 直接 throw；升為生產
  loop 抽取後，gifuct 可解的真實 GIF 可能被它拖垮整個 decode——而
  SP-3 的 gifenc 自產 fixture 天然驗不出此缺口。
  Fix：明訂「loop 抽取失敗 → 安全降級 `loop = 1`」契約＋測試
  （try/catch 或找到 NETSCAPE 即早退）；SP-3 選型納入健壯性判準、加
  一組非 gifenc 來源的真實 GIF，並優先評估「走訪 gifuct 單一 parser
  的 application ext subBlocks」法（免第二個 parser 的錯誤模型）。

### 單鏡頭

- **N3 [CR3, Important] 分頁換頁缺焦點管理與播報、頁導覽位置未定**
  Fix：換頁後焦點移至新頁清單起點（或 role=status 播報「第 X 頁，共
  Y 頁，顯示幀 a–b」）；頁導覽置清單前（或前後皆置）；SP-8 追加換頁
  焦點／播報驗證；Conventions delta 的清單不變量補「換頁須管理焦點並
  播報」。
- **N4 [CR3, Important] 結果預覽 poster 須自「編輯後首個保留幀」重生**
  刪除首幀時沿用來源共享 poster 會讓結果預覽的靜態畫面不在輸出裡。
  Fix：原始／結果各自一顆 poster，結果 poster 取 applyEdits 後輸出的
  第一幀。
- **N5 [CR1, Note] 揭露文字「0 秒」以偏概全**：gifuct 只特判 0cs，但
  瀏覽器對 1cs 等極低延遲另有箝制——UI 揭露改「極低延遲（含 0 秒）的
  幀會被正規化」；SP-2 旁註 1cs 行為避免日後誤讀為 bug。
- **N6 [CR4, Note] convert.ts 薄 re-export 失去自動化覆蓋**：留一條極
  小 smoke（單幀 → `convertToGif` → gif-reader 讀回）或斷言
  `convertToGif === encodeGif` 身分，讓相容層破裂被 `npm test` 抓到。
- **N7 [CR3, Note] 「確保播報落地」措辭過滿**：機制正確（讓出一輪事件
  迴圈），但 SR 實際朗讀非頁面可保證——改「best-effort」、實效由手動
  gate 判準。

## 🔬 Spike 增補（併入既有 SP，無新編號）

- SP-3 追加：健壯性判準（非 gifenc 來源真實 GIF、不 throw 或安全降級
  loop=1）＋ gifuct-subBlocks 法優先評估 [CR4+CR2]
- SP-5 追加：釘死相容層裁決與 convert.ts 確切 re-export 面 [CR2+CR5]
- SP-8 追加：換頁焦點落點、role=status 頁位播報、頁導覽可達性 [CR3]

## 處置建議

7 個 nits 全屬計畫文字補強，coordinator 折入 PLAN（r2.1）後即可進
`/magi:tasks`；無需 round 3（CR3 明示、且 §7.5 round 3+ 邊際效益遞
減原則適用）。
