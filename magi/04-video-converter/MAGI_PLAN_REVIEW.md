# 🧠 MAGI Plan Review — 影片格式轉換工具（video-converter）

**Sprint:** magi/04-video-converter/ • **Document:** PLAN.md（r2） • **Round:** 2 • **Date:** 2026-07-04

## Dashboard

```
┌──────────────────────────────────────────────────────────────┐
│  VERDICT: APPROVE-WITH-NITS（5/5 一致）                      │
├──────────────────────────────────────────────────────────────┤
│  Mode: supermajority     Threshold: 3.34 / ok_weight 5       │
│  OK weight: 5 / 5        Degraded: no                        │
├──────────────────────────────────────────────────────────────┤
│  ✅ PR1b-fact(Fable)  ✅ PR2b-build(Fable)  ✅ PR3b-arch(Fable)│
│  ✅ PR4-a11y(Opus)    ✅ PR5b-test(Fable)                     │
├──────────────────────────────────────────────────────────────┤
│  🔴 Critical: 0      🟡 Important(新引入): 2                 │
│  🟢 Note: 8          round 1 議題殘留: 0（3C＋16I 全結案）   │
└──────────────────────────────────────────────────────────────┘
```

## Verdict

**APPROVE-WITH-NITS**（RC→AWN 收斂，比照 sprint 03 節奏）

Round 1 的 3 Critical＋16 Important **全數確認正確解決**——五位審查者各自
回查自己的議題，多位以源碼／隔離 build 實證（非僅信宣稱）：PR1b 逐條源證
r2 新增已查證事實 10–14 屬實；PR3b 領域覆核白名單判準、`-map ?` 語法、
6-mode enum 正確；PR2b 以 repo 同版 Vite 8.1.3 隔離 build 實測；PR4 確認
播報映射表與預覽失敗子態設計自洽。無人要求 round 3。

殘留議題全部是 r2 修訂過程**新引入或既有精修**的 nits，兩項 Important
級、八項 Note 級，均為小幅文字修正，建議折入 PLAN（r2.1）後進 tasks。

## 🟡 Important（r2 新引入，須折入）

- [vote 2/5 — PR2b（Vite 8.1.3 隔離 build 實證）＋PR1b（獨立推導同一深度問題）] **§Vite URL 構法 (a) 寫錯**：
  `base:'./'` 下 `import.meta.env.BASE_URL` 編譯為字面 `"./"`（不編頁面深度），
  `new URL('./vendor/…', location.href)` 從兩層深工具頁解析到
  `tools/video-converter/vendor/…` → **404**；且 dev 過、build 過、
  **僅 preview/production 才炸**。
  - Fix: (a) 改 `new URL('../../vendor/ffmpeg/ffmpeg-core.js', location.href).href`
    （工具頁固定 `tools/<slug>/` 兩層深＝SPEC 慣例；註記深度依賴）；
    SP-1 stage-3 收緊：**明訂從 `tools/video-converter/` 子頁載入**（root 頁
    煙測會假綠）＋ core/wasm network 200 斷言＋「dev 綠燈對 URL 構法無
    背書力」註記；stage-2 補 worker chunk 接線確認（存在≠可用）。
- [vote 1/5 — PR5b；coordinator 認可（blind-transcode 路徑無 StreamInfo，durationSec 必缺）] **ETA 公式依賴 durationSec，r2 自己升為一線的 blind-transcode 路徑無此值**：
  - Fix: ETA 改進度率式 `elapsed×(1−progress)/progress`（probe／blind 兩
    路徑統一、limits.ts 單一契約可測）；progress 無效／停滯退心跳（沿用
    >60s 條款）。

## 🟢 Note（折入 PLAN 或標記實作期處理）

- [PR4] 映射表 loading-core 補第三分支：URL 方案 (a) 無 byte 事件 →
  時間驅動心跳「核心元件下載中（首次約 32 MB）…」；SP-1 擇定方案時
  一併輸出對應文案。
- [PR4] 映射表補 preview-failure 列（於 done「轉換完成」之後播、同節點
  覆寫）＋ready 列第三變體（blind-transcode 告知）。
- [PR4] error 列成因補「core 下載失敗」；audio-only 分支結果元素
  accessible name 改音訊語意（「轉換後音訊預覽」）。
- [PR5b] rotation 補常設回歸測試（args builder 陣列鎖定案）＋E2E recipe
  加旋轉來源與「輸出目視直立」項（rotation 屬 ret==0 靜默破檔類，僅
  一次性 spike 不足）。
- [PR5b] §Vite 補句：classWorkerURL 備援一旦啟用，verify-dist 一併斷言
  `{worker.js, const.js, errors.js}` 三檔存在。
- [PR3b] 白名單「是否需 level 上限」併入 SP-6 實測再定（實務風險低）。
- [PR3b] 選配：SP-2 decoder 清單可支撐事前 unsupported-codec notice
  （否則維持反應式收斂，MVP 可接受）。
- [PR1b] 文書：L22「增補 10–15」→「10–14」；L140「31 MB」→「32 MB」。

## Round 1 → Round 2 結案總表

| Round 1 議題 | 檢核者 | 狀態 |
|---|---|---|
| C1 探測失敗語意矛盾＋ffprobe 缺席 Plan B | PR3b | ✅ 統一降級鏈＋SP-2 PoC |
| C2 core 編碼器盤點缺失 | PR5b/PR1b | ✅ SP-2 枚舉＋撤「全格式」 |
| C3 toBlobURL 壓縮硬失敗 | PR2b/PR1b | ✅ 已查證 10＋SP-1 驗收 |
| 16 Important（矩陣白名單/型別/生命週期/a11y 五項/fixture/E2E/SP-4/守衛/GPL/hooks…） | 各鏡頭 | ✅ 全數折入，多位源證確認 |
| 9 Minority 擇要（預覽子態/gate/競態/beforeunload/deltas 補遺…） | 各鏡頭 | ✅ 折入 |

## 各鏡頭 round 2 verdict

| 鏡頭 | Verdict | 殘留 |
|------|---------|------|
| PR1b-fact | APPROVE-WITH-NITS | 2 Note（文書＋SP-1 scoping） |
| PR2b-build | APPROVE-WITH-NITS | 1 Important（URL 構法，已實證）＋1 Note |
| PR3b-arch | APPROVE-WITH-NITS | 2 Note（level／unsupported-codec）；明言不需 round 3 |
| PR4-a11y | APPROVE-WITH-NITS | 3 Note（映射表收斂） |
| PR5b-test | APPROVE-WITH-NITS | 1 Important（ETA blind 分支）＋2 Note |

## 處置建議

兩項 Important＋可折的 Note 均為小幅文字修正（無架構變動）：折入 PLAN
（r2.1）後直接 `/magi:tasks`。round 3 無必要（§7.5 遞減報酬；PR3b 明言）。
