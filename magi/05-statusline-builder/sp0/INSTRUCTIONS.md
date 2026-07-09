# SP-0 擷取步驟（使用者 mini-gate，約 5–10 分鐘）

> **✅ 狀態（2026-07-09）：DONE。** 使用者本機擷取 73 筆真 stdin、coordinator
> 執行 §4 對帳完成（記 WORKS 2026-07-09）：全 jqPath 命中、worktree 判定獨立
> 並存→拆回 25 段（+worktree-branch）、descriptor 拆 provisional（僅 vim-mode/pr
> 留）、fast_mode/agent_type 記 backlog、fixture 凍結於 `fixtures/stdin-dump.jsonl`。
> 下方 §1–§3 為擷取步驟留存、§4 為對帳協定留痕。

## §4 回歸後對帳（coordinator 執行，記錄在此供追溯）
> **✅ 已執行（2026-07-09，見 WORKS）：** 73 筆 fixture 逐欄對帳、全 jqPath
> 命中；worktree 判定獨立→拆回 25 段（+worktree-branch）；fast_mode/agent_type
> 記 backlog；descriptor 拆 provisional（僅 vim-mode/pr 留）；重生 plain-full.ps1；
> 全測試矩陣重跑綠（850 pass/19 skip/0 fail）。下列步驟為協定留痕（step 2 的
> 「24」為執行前目錄數，判定獨立後拆為 25）。
1. 剝 BOM、逐筆 parse `fixtures/stdin-dump.jsonl`
2. 逐欄 diff `segments.ts` 全部 24 個描述子（worktree 雙表述保守併一）的 tsPath/jqPath/ps1Path
   對真實欄位（含 nullability 時序、effort/vim enum、worktree 雙表述
   判定、prompt_id）
3. 不符處：改描述子（單源，一處改三後端同步）＋改 mock-data.ts
4. `npm run golden:update` 類腳本重生黃金 → 黃金 diff 人審
5. 全測試矩陣重跑（單元＋黃金＋本機 ps1 真執行）
6. 拆 F1 的 ⚠、解除 provisional 標記（僅真檔出現過的欄位）；
   未出現的條件欄維持 provisional
7. WORKS.md 記對帳結果；T1.1／task #53 勾銷

## 1. 掛上擷取器
編輯 `C:\Users\alan6\.claude\settings.json`，加入（**若已有 statusLine
區塊，先把原內容備份到別處**）：

```json
"statusLine": {
  "type": "command",
  "command": "powershell -NoProfile -ExecutionPolicy Bypass -File D:/personalfile/git/eztools/magi/05-statusline-builder/sp0/capture.ps1"
}
```

## 2. 開一個「新的」Claude Code session 走狀態序列
（本 session 不算——要全新 session 才有「首次回應前」的 null 期）

終端機底部會顯示 `SP-0 capturing... (N)`，N 會隨擷取增加＝有在動。

**必做序列**（每步之間隨便打一句話讓它回應即可）：
1. `claude` 開新 session → 先不打字，看到 statusline 出現（早期 null 期）
2. 打一句話等回應完（首次 API 回應後——rate_limits 應出現）
3. `/compact`（compact 後 current_usage null 期）
4. `/vim` 開 vim mode，切 NORMAL/INSERT 各停留一下
5. `/rename` 取個 session 名（session_name）

**選做（能做幾項是幾項，做不到的欄位會標 provisional）**：
6. 在有「開著的 PR」的 repo 裡開 session（pr.*）
7. `claude --worktree` 或在 git worktree 內開 session（worktree.*）
8. `claude --agent <name>`（agent.name）
9. effort 級別切換（若你的環境有 /effort 或等效設定）

## 3. 收工＋還原
1. 把 `%USERPROFILE%\statusline-dump.jsonl` 複製到
   `D:\personalfile\git\eztools\magi\05-statusline-builder\fixtures\stdin-dump.jsonl`
2. settings.json 移除（或還原）statusLine 區塊
3. 回這裡跟我說「SP-0 好了」，我會接手逐筆 diff F1、拆 ⚠／標
   provisional，然後解鎖 M2。

注意：dump 檔開頭可能有 UTF-8 BOM（PS 5.1 Add-Content 特性），ingest
時會剝除，不用處理。
