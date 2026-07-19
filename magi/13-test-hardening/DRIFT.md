# Drift — 09 測試網加固批（sprint 13）

> Source: 角度制 5 票 MAGI（fable×2／opus／sonnet／haiku，threshold >2.5；
> 零重試）  •  Generated: 2026-07-19  •  Status: DETECTED

## A. Contract violations

(none) — 五票一致：六工作面全數落地；index.html +1 掛標有使用者裁決
授權（zh 字面 byte 級同值，A1 實證）；BACKLOG.md 為 promote 簿記常規。

## B. Below-the-contract decisions

- [ ] **T1.2 盲點 (b) 換標的**：TICKET 例示的「同行 throw 漏剝」實測
  不重現（舊 regex 未錨定、本就命中），改打實測真缺陷「throw 行整行
  清空吞同行 CJK」——契約前提有誤時的透明修正，三處留證（WORKS／
  TASKS 對帳／測試檔排查記錄），opus 評為 drift 處理範本級。[5/5 認可]
- [ ] **T1.4 治本選檔級 testTimeout 而非 boot 減重**：契約明訂二擇一，
  量測數據支撐（resetModules 0.1ms、熱點＝被測本體、跨案隔離為測試
  意圖）；代價＝無效能回歸訊號（minority 記載）。[opus＋sonnet]
- [ ] **ubuntu leg PWSH7 刻意不斷言**：workflow 未明文保證，保守防
  CI 誤紅；不對稱風險姿態（windows 斷 pwsh、ubuntu 不斷）有記。[3 票]
- [ ] **T1.1 巡檢範圍取窄**：「全 DOM」收斂為「豁免區沿既有慣例」，
  template 內文落掃描外（升 🟡-2 加固候選）。[A1]
- [ ] fixtures windows leg 自主加新鮮 powershell 探測防線；e2e 覆寫
  設定走 DOM change 事件而非 CDP 點擊（picker 可點性另有覆蓋）；
  `extractSegmentBlock` 新耦合 emit-bash `# <id>` 註解結構（A5 驗證
  假設成立、失效方向吵）。[各 1-2 票，皆有據]
- [ ] #preview-terminal 修法選復用既有 key 而非新增條目——最小 diff
  與授權範圍相稱。[A5]

## C. Out-of-scope observations

- [x] **（已收口，2026-07-19 修採納項全批）掃描器邊角源碼形 fail-open**
  （🟡-1）——換行終止＋marker 字串感知＋回歸案 ×3；regex 含 `//` 類
  文件化未修（JSDoc 已知限制，main.ts 引入前須擴充）。
- [x] **（已收口）屬性巡檢背書過寬**（🟡-2）——key 收緊＋
  template.content 巡檢＋en 重掃案（全 repo key 零錯字實證）。
- [x] **（診斷性已輕修；CI 首跑仍為契約遞延終驗）meta 守門首跑風險**
  （🟡-3）——三檔訊息＋reason 全集註解落地；push 首跑盯緊＋放寬
  regex 預案備妥。
- [x] **（已落地）**#preview-terminal 定性修正（WORKS 更正條目）＋
  T4.1 對帳補遺＋emit-ps1 culture flake 入 BACKLOG（🟢-4/-5/-6）。
- [x] **（已升級 BACKLOG，2026-07-19 使用者裁決 y）**detect 複本硬編
  個人 scoop 路徑——PATH 探測＋env 文件化候選。[2 票]
- [x] **（已升級 BACKLOG 備忘）**拓撲鎖之「CI 拓撲變更第一步必然先紅」
  設計意圖——日後動 CI 拓撲的 TICKET 預記連動更新。[A5 1/5]
