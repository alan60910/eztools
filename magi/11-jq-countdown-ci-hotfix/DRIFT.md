# Drift — jq 倒數段 CI hotfix（sprint 11）

> Source: magi-report.md（4 票 MAGI：fable-5／opus／sonnet／haiku，majority >2.0；首輪 3 票暫時性失敗經單次重試回收，兩輪合併計票）  •  Generated: 2026-07-18  •  Status: DETECTED

## A. Contract violations

- [x] **（已回填，2026-07-18 /magi:commit 使用者裁決 y）HOTFIX.md Root cause／影響面／Fix 段與實證定案不符** — files: `magi/11-jq-countdown-ci-hotfix/HOTFIX.md`
  契約載「`strflocaltime` 拒吃 number（jq 1.8 才寬容）」假說與「Linux＋jq 1.7 真實使用者實際故障」影響面；實證定案＝jq 1.7↔1.8 `A // B as $x | BODY` 文法歸約差異，且僅顯式設 `STATUSLINE_NOW_EPOCH` 之呼叫端受害（env 缺席之生產預設路徑於 1.7 誤解析下仍正確——影響面被高估）；Fix 段未明文授權實際修法所在的 `nowAndR` 前綴括號修正（四票分類意見分歧、回填共識一致）。[vote 4/4]
  Proposed PLAN/SPEC update: 依 WORKS.md 定案回填——Root cause 改寫為文法優先級差異（附最小重現）、影響面收斂為「顯式釘時之呼叫端＋測試套件」、Fix 增列 `nowAndR` 顯式括號之追認授權。
- [x] **（已收口）WORKS.md 矩陣 (b) 宣稱與 harness 事實矛盾** — files: `magi/11-jq-countdown-ci-hotfix/WORKS.md`、`tools/statusline-builder/fixtures.test.ts`、`tools/statusline-builder/pipeline.integration.test.ts`
  原況：`SP5_JQ_DIR` 僅接線 emit-bash.test.ts、另兩檔假注入，HOTFIX Test 段「fixtures FULL 案於 1.7.1 綠」未達成。[vote 2/4——fable＋sonnet；協調者 grep 實證確立]
  **收口（2026-07-18，使用者裁決選項 (i)）**：覆寫接入兩檔複本（含防 teardown 誤刪的安全修正）＋負驗證證明注入生效＋真 1.7.1 三檔 228/228 重跑綠——HOTFIX Test 條款至此真正達成；WORKS.md 更正條目＋收口條目皆已落。無殘餘動作。

## B. Below-the-contract decisions

- [ ] `SP5_JQ_DIR` opt-in 測試 harness 覆寫（emit-bash.test.ts）——契約沉默處新增；比照既有 `SP5_BASH` 慣例、未設時逐位元組同路徑、win32-only、CI 零影響。[vote 3/4]
- [ ] `nowAndR()` 共用前綴顯式括號——派工 brief「共用前綴不動」被實測推翻之必要偏離，WORKS.md 有據記載；分類意見分歧（B vs 授權 A），回填面已併入 A-1。[4/4 提及]
- [ ] 結構斷言強化（`not.toContain('strflocaltime')` 負向鎖＋更長子字串）——斷言強度只增不減。[vote 1/4，附記供審計]

## C. Out-of-scope observations

(none)

> 未過門檻之 C 類皆有既存落點或屬候選：產出腳本 jq stderr 外漏＝BACKLOG
> 既有「bash 取值 jq 未抑 stderr」條目；CI windows leg 恆跳過 bash e2e＝
> WORKS 已記、與 BACKLOG「CI byte-exact gate」同族；「跨 jq 版本 parity
> 守門」（opus 1/4）為新 BACKLOG 候選，未過門檻——commit 時可由使用者
> 自行決定是否收錄。
