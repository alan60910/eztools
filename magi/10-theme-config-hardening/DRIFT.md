# Drift — 06 殘項批（sprint 10：主題即時同步、config 遷移階梯、verify-dist 測試網、repo 衛生）

> Source: magi-report.md（4 票 MAGI：fable-5／opus／sonnet／haiku，majority >2.0）  •  Generated: 2026-07-18  •  Status: DETECTED

## A. Contract violations

(none)

> 兩件候選未過採納門檻，處置如下：①「註解剝除豁免面大於 Non-Goal (ii)
> 授權面」（1/4，fable）→ 列 MAGI_CODE_REVIEW 🟢-1，屬防線強度議題非行為
> 回歸，修補建議已附；②「TASKS 勾選 vs 手動 smoke 遞延無落點」（2/4，
> fable＋sonnet）→ 協調者已於 review 當場收口（TASKS.md M2/T4.3 遞延註記
> ＋BACKLOG「真機驗收批」併入 sprint 10 三項），不留殘留。

## B. Below-the-contract decisions

- [ ] `src/theme-inline.test.ts` 自寫最小 inline-script 抽取（單一 `<script>`
  regex、不剝註解）而非重用 `scripts/verify-dist-checks.mjs` 的
  `extractInlineScripts`——tsconfig include 邊界考量，檔頭有完整論證
  （[vote 4/4]；連帶脆弱面見 MAGI_CODE_REVIEW 🟢-6 的 sentinel 建議）

> 其餘 1–2 票之 B 類觀察（CLI optional 位置參數、成功路徑顯式 exit(0)、
> shebang→子行程煙霧案、initThemeSync 不做初始同步、tsconfig.scripts.json
> 細節、M4 補註解一句）均已於 `WORKS.md` 各 milestone 條目留審計軌跡，
> 依門檻規則不再重複列載。

## C. Out-of-scope observations

(none)

> 未過門檻之 C 類（strip 盲點家族其餘項、test.yml 不跑 build+verify:dist、
> 檔案型 canary 依賴人類遵守凍結、inline/module 長期同步成本）皆已有既存
> 落點：BACKLOG「sprint 09 測試網加固批」、PLAN Rev 2 Verification 明記、
> 測試檔內警示註解、SPEC Conventions 雙軌體制敘述——無新增待辦。
