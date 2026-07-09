# 🧠 MAGI Plan Review — Claude Code Statusline 產生器（round 2，現況）

**Sprint:** magi/05-statusline-builder/ • **Document:** PLAN.md（r2）
> Panel：5 鏡頭 Claude subagent（PR1b 事實查核／PR2b 架構／PR3b UI+a11y／
> PR4b 測試／PR5b 風險+deltas）。原始報告：`.pr1b~5b-plan-report.md`
> （round 1 報告與彙整見 .pr1~5-plan-report.md 及本檔 Round 紀錄）。

## Dashboard

```
┌──────────────────────────────────────────────────────┐
│  VERDICT: APPROVE-WITH-NITS（5/5 一致）              │
├──────────────────────────────────────────────────────┤
│  Mode: supermajority   Threshold: 3.34               │
│  OK weight: 5 / 5      Degraded: no                  │
├──────────────────────────────────────────────────────┤
│  ✅ PR1b  ✅ PR2b  ✅ PR3b  ✅ PR4b  ✅ PR5b         │
├──────────────────────────────────────────────────────┤
│  🔴 Critical: 0    🟡 Important nits: 11             │
│  🟢 Note nits: 10  🔬 新 spike: 0（既有 SP 情境擴充）│
└──────────────────────────────────────────────────────┘
```

## Verdict
**APPROVE-WITH-NITS（5/5）**。round 1 的 3 Critical＋25 Important 採納項
被判定**全數 resolved 或 partially-with-nits，零 missed**（各鏡頭逐項
對照表見原始報告；PR5b 另親開四份目標文件逐條核實 deltas 現況引述，
r2 無誤述——上一 sprint「r2 新引入錯誤」的失敗模式在 deltas 面未再犯）。
round 2 的 nits 集中在 r2 新契約段的**執行期未定義態與措辭精度**，全屬
加法級收斂，無架構翻案，不阻擋進 TASKS。

## 🟡 Important nits（採納，11）

1. **[PR1b＋PR5b，2票] SP-0 擷取協定升級**：`> dump.json` 單快照覆寫驗
   不了時序／enum／條件性三類 claim → 改 **append JSONL**（`>> dump.jsonl`）
   ＋腳本化狀態序列（全新→首次回應後→/compact 後→vim on→各 effort→
   worktree 內→rate_limits）；**逐一觸發 8 個條件性 segment 的擷取
   checklist**，真無法觸發者 descriptor 標 `provisional`（不與已驗欄位
   同級綠燈）；worktree 雙表述未判定時 v1 保守合併為一；擷取指令按平台
   給不依賴 jq 的形（POSIX `cat >>`／Windows PowerShell `Add-Content`）。
2. **[PR2b] powerline 下 dash-null 段的 bg／箭頭交接色未定義**：明訂
   退回 SegmentConfig.color（fg 取其 auto-fg 或 fgOverride），鏈上恆有
   具體 bg；SP-5 情境補「存活 dash-null 段夾中段＋lastArrowCap 兩態」。
3. **[PR2b] ThresholdRule 恆長 10 無 runtime 保證**：型別改 10-tuple；
   清洗契約明列桶數校正（不足補、超長截）；測試補「桶數≠10」情境；
   autoFg 平行陣列同步。
4. **[PR2b] ps1 exit-0 機制錯**：try/catch 攔不住 git 原生非零
   `$LASTEXITCODE` → ps1 契約改「結尾**顯式 `exit 0`**＋try/catch 僅管
   例外」；windows leg「非 git 目錄」情境斷言 exit 0＋有輸出。
5. **[PR3b] ariaText fallback 陷阱**：「省略→fallback text」對 text 即
   PUA 的 run（箭頭/icon）自相矛盾 → 凡 text 含 PUA/裝飾 glyph 之 run
   **一律顯式設 ariaText**（裝飾箭頭=`''`；icon run=icon.ariaText＋值），
   fallback 僅適用純可列印文字 run。
6. **[PR3b] aria-label 組裝抽 node 可測純函式**（StyledRun[]→label 字串，
   置 resolve.ts 旁），icons 全開＋powerline 情境簽入單元/黃金回歸鎖；
   SP-6 SR 實聽為補充非唯一防線。
7. **[PR3b] Nerd Font 提示呈現機制**：以 `aria-describedby` 綁 icon 切換
   與 mode 控件（聚焦時讀出），**非** aria-live；視覺橫幅若要常駐須以
   內容切換承載、不作播報通道（防撞 root SPEC live region 常駐不變量）。
8. **[PR3b] 每列控件組名規則**：25 列每列多控件的 accessible name ＝
   segment 身分＋控件角色（`model — 前綴`／`model — 上移`…），含移位鈕、
   色選群組、variant select、前綴 input，非僅 checkbox。
9. **[PR4b] CI「阻擋」語意與 main 邊界**：GitHub Actions 不自動擋合併、
   `push:[main]` 不觸 test.yml → 三選一明寫：deploy.yml 補 windows leg／
   main 設 required status check（一次性 repo 設定，記 README/WORKS）／
   矩陣降述為「每-DEV-push 背書」＋直推 main 繞過 gate 的風險一句。
10. **[PR4b] 格式化對等歸位**：「三後端字面相等」行為斷言歸 §3 真執行
    （對抗值併入常設 mock 情境集）＋SP-7 一次性定案；§1 node 層改述
    「TS 參考格式器＋產出碼黃金」；措辭改「單次浮點乘後 floor、禁捨入
    模式相依格式化」（cost 輸入本是浮點，「一律整數運算」名實不符）；
    同構前提（三後端 JSON number→同 double）納 SP-7 斷言。
11. **[PR4b＋PR2b，2票] tri-path「杜絕」降述＋fixture 欄位多樣性**：
    並置≠機械交叉驗證，取值正確性只有真執行覆蓋（明記）；SP-0/mock
    契約補「每個描述子來源欄位至少一情境呈相異非 null 值」，使 item-3
    對每條 jqPath/ps1Path 可觀測；（更強可選）逐段三路徑對照直測。

## 🟢 Note nits（採納，10）

- [PR2b] composition 單源：prefix/icon/value/resets_at 後綴的組合順序與
  各部件著色納入描述子或格式化規則；「空字串不入列」判定基準明訂在
  **value**（value 空→整段含 prefix/icon 剔除）；SP-5 補「prefix＋icon
  之段 value 為 null」情境。
- [PR1b] SP-7 對抗值補「補尾零」與 float 乘積邊界案（$1.0000／$0.5000／
  $0.0050／0.0029）；旁註「jq 無 printf，補零須偏移-切片 idiom」顯化為
  受測風險點。
- [PR1b] F13 firming 降級：「jq 1.7+ 具 strflocaltime」改「視 jq build
  而定，SP-2 實證（含確切輸入形）」。
- [PR1b] F14 措辭：powerline/branch 為**碼位**出自 Powerline（MIT），
  字形輪廓授權依 subset 來源字型（SP-1 釘）；RFN 補「若來源宣告 RFN 則」。
- [PR1b] 契約 11/README 補「GPO 強制 AllSigned 環境 wrapper 無效」一句
  （SP-3 註記不在 v1 保證內）。
- [PR4b] 黃金防呆補兩句：`golden:update` 禁在 CI 執行；黃金測試失敗訊息
  導向「審 diff、勿盲目重生」。比對函式自測補正向孿生（一致對→判一致）。
  §3 真執行斷言與比對函式受測補「SP-5 oracle 定案後才凍結」時序閘。
- [PR4b] skipIf 防死測機械化：meta 斷言「每後端 real-exec 至少一 leg
  未 skip」，全 skip 視為 CI 設定 bug。
- [PR3b] mock 情境 radiogroup 與深淺底切換補群組可及名稱；切換結果沿用
  預覽快照不另播報，明述為刻意。
- [PR5b] Conventions 的「<100KB」軟化為約值/sprint-local 註記（精確硬
  上限留 verify-dist 斷言），勿以未量測值訂 repo 級永久門檻。
- [PR5b] TASKS 指引補：SP-0 為使用者閘、sprint 啟動第一件事即發出擷取
  請求；M1 串行關鍵路徑 SP-0→SP-2(M1)→SP-5 顯式標注（SP-4/SP-6/SP-1
  font lane 可並行）；test.yml 不含 push-main 的繞過風險一句（與 #9 合流）。

## 🔬 Spike candidates
無新增 spike——全部為既有 SP-0／SP-5／SP-7 的**情境/驗收擴充**（已
折入上列 nits）。

## Round 紀錄
- Round 1（r1）：REQUEST-CHANGES 5/5——3C＋25I＋4N＋12 spike 彙整；
  使用者裁決：修訂後再審；v1 範圍＝全 25 segment（收斂建議否決）；
  前綴進 v1；Q1/Q2 批准。
- Round 2（r2，本輪）：**APPROVE-WITH-NITS 5/5**——round 1 採納項零
  missed；新 nits 11I＋10N，全屬加法收斂。建議：折入 PLAN（r2.1）後
  進 `/magi:tasks`；不需 round 3（依規則 round 3+ 邊際效益遞減，且無
  未解 Critical）。
