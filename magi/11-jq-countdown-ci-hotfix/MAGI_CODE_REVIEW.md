# 🧠 MAGI Code Review — DEV @ 5eb1843（sprint 11 hotfix 未提交工作樹）

**Diff scope:** 未提交變更 vs HEAD——6 files, +99/−30（288 行）

## Dashboard

```
┌──────────────────────────────────────────────────────────────┐
│  VERDICT: APPROVE-WITH-NITS（一項 commit 前必辦，見 🟡-2）   │
├──────────────────────────────────────────────────────────────┤
│  Mode: majority      Threshold: vote_sum > 2.0               │
│  OK weight: 4 / 4    Degraded: no（首輪 3 票暫時性失敗，     │
│                      單次重試全數回收——兩輪合併計票）        │
├──────────────────────────────────────────────────────────────┤
│  ✅ fable-5（AWN） ✅ opus（AWN） ✅ sonnet（RC） ✅ haiku（AWN）│
├──────────────────────────────────────────────────────────────┤
│  🔴 Critical: 0     🟡 Important: 2                          │
│  🟢 Minority: 6     Untested paths: 4                        │
└──────────────────────────────────────────────────────────────┘
```

> ⚠️ 同 vendor 湊票揭露：四票皆 claude 系模型。本輪交叉實證密度高：
> opus／sonnet 各自以最小重現（`1 // (2) as $x | $x+100`）獨立驗證文法
> 歸約、實測 `localtime|strftime ≡ strflocaltime`；opus 全 repo 掃描
> 確認無其餘 `// … as` 陷阱（duration 型由 `|` 先行切分、且修復前
> CI 1.7 即綠為實證）；fable＋sonnet 獨立揪出矩陣假注入（協調者 grep
> 覆核屬實）。

## Verdict

**APPROVE-WITH-NITS** — 修復本體四票一致判定正確、最小、完整：顯式括號
使 `(A // B) as $now` 雙文法唯一歸約；`localtime|strftime` 對本用格式
（無 `%Z`/`%z`）與原 idiom byte-identical；死值收斂由既有
`RESET_DEAD_COND` 正確承接、無 raw 外漏；黃金檔恰 4 檔且僅 jq 表達式段；
oracle／resolve／ps1 零觸碰。sonnet 之 REQUEST-CHANGES 針對驗證紀錄
誠信（🟡-2），非程式缺陷——WORKS.md 已由協調者追加更正條目，殘餘
補救擇一即可放行。

> **修復狀態（2026-07-18，使用者裁決「補齊注入＋重跑」）**：🟡-2 已以
> 選項 (i) 收口——`SP5_JQ_DIR` 接入兩檔複本（含防 teardown 誤刪之安全
> 修正，見 WORKS 收口條目）＋負驗證＋真 1.7.1 三檔 228/228；🟢-1
> （strflocaltime 殘註 ×2）已順手修畢。🟡-1（HOTFIX.md 回填）留待
> /magi:commit A 類流程。其餘 minority（1.6 宣稱措辭、SP5_JQ_DIR 文件
> 化、parity 守門 BACKLOG 候選）未修，零行為影響。

## 🔴 Critical (adopted)

（無）

## 🟡 Important (adopted)

1. **[vote: 4/4] HOTFIX.md 契約文字與實證定案不符——待 /magi:commit A 類回填**
   - Where: magi/11-jq-countdown-ci-hotfix/HOTFIX.md（Root cause／影響面／Fix 段）
   - 三個子面：(a) Root cause 仍載已被推翻的「`strflocaltime` 拒吃
     number」假說（真因＝jq 1.7↔1.8 `A // B as $x | BODY` 歸約差異）；
     (b) **影響面高估**（opus 靜態推導＋SPEC 對照）：`STATUSLINE_NOW_EPOCH`
     為選填、缺席回落真時鐘——env 缺席的生產預設路徑在 1.7 誤解析下
     **誤打誤撞仍正確**，真受害面＝顯式釘時的呼叫端（測試套件為大宗）
     ＋手動設 env 的 jq<1.8 使用者，非「所有 Linux jq1.7 使用者」；
     (c) Fix 段未明文授權 `nowAndR` 前綴括號修正（分類意見分歧：
     sonnet 判 A、fable/haiku 判 B、opus 判「彈性條款意圖涵蓋之已授權
     偏離」——四票一致的是：應回填追認）。
   - Suggested fix: commit 時 A 類回填——Root cause 改寫＋影響面收斂＋
     Fix 增列 `nowAndR` 顯式括號授權（或以 Amendment 段追認）。

2. **[vote: 2/4 — fable+sonnet；協調者 grep 實證確立] 矩陣 (b) 對三檔中兩檔為假注入——WORKS 宣稱失實（已更正）、HOTFIX Test 條款未達成**
   - Where: fixtures.test.ts:263、pipeline.integration.test.ts:160（各自
     `detectBashExec` 複本硬編 sp5 綁定 jq）；WORKS.md 矩陣 (b) 宣稱
   - `SP5_JQ_DIR` 僅接線 emit-bash.test.ts → fixtures／pipeline 兩檔在
     Windows 恆吃 1.8 語意綁定 jq，「1.7.1 綠」為假陽性；HOTFIX.md Test
     段「fixtures FULL 案於 1.7.1 綠」嚴格未達成。亦解釋本機 17 案 vs
     CI 18 案差一。**協調者已於 WORKS.md 追加更正條目**。
   - 修復本體風險有限（emit-bash 17 案已雙版本覆蓋＋CI ubuntu 為真 1.7
     終驗），殘餘補救擇一：(i) `SP5_JQ_DIR` 抽共用 helper 接進兩檔複本
     ＋重跑矩陣 (b)（sonnet 建議）；(ii) 宣稱更正即可、1.7 覆蓋交 CI
     ubuntu 承接（fable 最小方案）。

## 🟢 Minority（未過門檻，保留供參）

- [2/4 fable+opus] emit-bash.ts:250／:793 兩處 diff 外註解仍以現在式稱
  倒數 pipeline 用 `strflocaltime`——同次 idiom 汰換的殘留，順手改。
- [2/4 haiku+opus] `SP5_JQ_DIR` 僅 in-code 註解文件化——比照 `SP5_BASH`
  於開發者文件補一句（低優先）。
- [1/4 fable] 「jq 1.6+ 通用 idiom」宣稱未經矩陣實測（僅 1.7.1／1.8.1）
  ——與本次 hotfix 起因（「jq 1.8.1 可用」過度宣稱）同型；措辭改
  「1.7.1／1.8.1 實測；1.6 文獻推定」。
- [1/4 opus] 倉內無跨 jq 版本 parity 自動守門——CI jq 升版後 1.7 面
  退化將無捕捉；BACKLOG 候選（「emit jq 面跨版本 parity gate」）。
- [1/4 haiku] `localtime|strftime` 等價性證據文件化——已由 opus／sonnet
  review 中實測交叉補強，殘餘為 WORKS 記載粒度問題。
- [1/4 fable-C] 產出腳本 jq 呼叫無 `2>/dev/null`、硬錯時 stderr 外漏
  （既有面）——BACKLOG 既有「bash 取值 jq 未抑 stderr」條目已涵蓋，
  無需新增。

## Untested paths

- fixtures FULL 案＋pipeline.integration bash 案 × jq 1.7 — 本機矩陣
  未真覆蓋（🟡-2）；現唯一覆蓋點＝push 後 CI ubuntu。— fable/sonnet
- `STATUSLINE_NOW_EPOCH` 缺席（生產預設真時鐘）路徑 — e2e 為 byte-match
  恆顯式釘 env，時鐘路徑結構上無自動化覆蓋（本質限制）。— opus
- `probeJqVersion()`／`SP5_JQ_DIR` 錯誤分支 — 診斷性質、低風險。— haiku/opus/sonnet
- jq 1.6 — 註解宣稱相容、矩陣未含。— fable

## ⚠️ Degraded mode

無降級。首輪 fable／opus／sonnet 三票瞬間 exit=1（log 空、疑暫時性
API 失敗），依單次重試政策重派後全數回收；本報告合併兩輪四票計票。
