# 🧠 MAGI Code Review — DEV @ 未commit變更集（sprint 04 video-converter）

**Diff scope:** HEAD 對工作樹（11 個追蹤檔修改 +126/−20；新增 tools/video-converter/** 全工具＋scripts ×2）
**Date:** 2026-07-06 • **Panel:** 5 lens reviewers（Fable 5）

## Dashboard

```
┌────────────────────────────────────────────────────────────┐
│  VERDICT: APPROVE-WITH-NITS（5/5 一致）                    │
├────────────────────────────────────────────────────────────┤
│  Mode: supermajority   Threshold: 3.34 / ok_weight 5       │
│  OK weight: 5 / 5      Degraded: no                        │
├────────────────────────────────────────────────────────────┤
│  ✅ CR1-契約  ✅ CR2-a11y  ✅ CR3-建置  ✅ CR4-測試  ✅ CR5-細讀 │
├────────────────────────────────────────────────────────────┤
│  🔴 Critical: 0   🟡 Important: 1（2票）                   │
│  🟢 Minority/Note: 12   A 類漂移: 0（5/5 全零）            │
└────────────────────────────────────────────────────────────┘
```

計票備註：鏡頭特化板，沿 sprint 03 慣例——2 票跨鏡頭收斂＝採納；1 票領域
議題以 Note 保留。多位審查者親自重跑 npm test（336 綠）／build／verify:dist
複核，CR5 對兩個懷疑點做了實證重現。

## Verdict

**APPROVE-WITH-NITS**（5/5 一致；零 Critical、零 A 類）

跨鏡頭共同評價：對 PLAN r2.1 的高保真實作——CR1「罕見高保真」（每處字面
偏離都能在 WORKS 找到授權記錄）；CR4 驗證斷言強度名副其實（toEqual 11 案
屬實、fixtures 綁真實資料、drift tripwire 會咬）；CR2 確認 BACKLOG 前兩條
a11y 教訓「真解且改進前工具」；CR5 未找到任何 Critical/Important 級真 bug。

## 🟡 Important (adopted)

- [vote 2/5 — CR4＋CR2 跨鏡頭收斂] **strategyText 對 audio-only copy 來源
  誤標「需轉碼，預估較慢」**（main.ts:324-328）：aac/mp3 純音訊實走
  `-c:a copy` 快速輸出，文案與行為不符（預期管理失準；audio-only notice
  有補充故不誤導結果）。Fix：依 `plan.args.includes('copy')` 分流文案。

## 🟢 Minority / Note（單票，保留可見）

- [CR5] **asset-url 無尾斜線裸目錄 URL 少一層 → 子路徑部署 404**
  （asset-url.ts:23；實證觸發輸入附上；GH Pages 通常 301 補斜線故列 Note；
  CR5 明薦：**修復＋補測最具防迴歸價值**）。
- [CR5] ETA 首播於 progress 極小時誇張（0%＋「約 9 分鐘」瞬態）：播報端
  percent<1 不播 ETA 即可，不動 estimateEtaMs 契約。
- [CR4] busy 釋放後連續復用（probeFile→runConversion 同 client 依序）無
  顯式測試——main.ts 正依賴此路徑，建議補一案。
- [CR4] pipeline.integration「逐字同形」措辭輕微誇大（省略 setTimeout，
  實害為零）——註解改「呼叫序同形」＋略去之由。
- [CR2] loading-core 心跳「同字串重寫→SR 重播」隨 SR 而異——T4.3 SR 實測
  定案，不可靠則文案加必變 token。
- [CR2] HEVC preview-failure 覆寫可能吞掉「轉換完成」播報（契約授權的
  同節點覆寫內在取捨）——T4.3 SR 觀察。
- [CR2] error 態焦點落 body（三工具一致的既有 polish 缺口，非本 sprint
  退步）——選配補 focus 重試鈕或跨工具統一入 backlog。
- [CR1] audio-only copy 失敗的 fallback 沿用 blind plan（帶未使用的視訊
  旗標；`0:v:0?` optional 故無實害）——語意精修選配。
- [CR1] NOTICE_TEXT['unsupported-codec'] 硬編「（如 AV1）」與觸發集合
  目前吻合——未來擴充時同步。
- [CR5] yuvj420p（full-range 8-bit 4:2:0）被保守轉碼——方向安全、非必要
  轉碼＋輕微色彩位移風險；納 copy 白名單與否留後續評估。
- [CR3] SPEC Status「三工具完成」vs README License 草稿佔位的落地順序——
  commit 收尾項（使用者定稿 License 後才上 main）。
- [CR3] 既有文件漂移（非本 sprint 引入）：CLAUDE/TECHSTACK 寫
  `--passWithNoTests` 但 package.json 實為 `vitest run`。

## Untested paths

- main.ts 可抽出純函式（strategyText／formatDurationSec／
  conversionFailureMessage 六組合）——flagged by CR4
- busy 釋放後 sequential reuse——CR4
- Transferable detach 不變量（fake 不模擬；實作正確，由 review 保障）——CR4
- SR 朗讀行為（心跳重播／preview-failure 覆寫）——CR2，僅 T4.3 人工可驗

## 各鏡頭 verdict

| 鏡頭 | Verdict | A 類 | 重點 |
|------|---------|------|------|
| CR1 契約漂移 | APPROVE-WITH-NITS | 0 | 高保真；兩高風險對照驗證安全；B×5 全有授權 |
| CR2 a11y/UI | APPROVE-WITH-NITS | 0 | 映射表八列語意正確；BACKLOG 教訓真解 |
| CR3 建置/文件 | APPROVE-WITH-NITS | 0 | deltas 對帳零多漏；vendor 腳本 crash-safe |
| CR4 測試品質 | APPROVE-WITH-NITS | 0 | 斷言強度屬實；tripwire 會咬；漏測面清點 |
| CR5 正確性細讀 | APPROVE-WITH-NITS | 0 | 零 Critical/Important 真 bug；3 邊界 Note |
