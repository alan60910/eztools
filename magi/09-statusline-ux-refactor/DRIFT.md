# Drift — statusline-builder UX 重構（真機回饋批）
> Source: 角度制面板 8/8（MAGI_CODE_REVIEW.md）  •  Generated: 2026-07-18T00:00:00+08:00  •  Status: DETECTED

## A. Contract violations
- [x] ~~en 情境縮短標籤「Cond.」非 aria-label 全文之前綴子字串，違反
  index.html T4.1 明訂契約與 SPEC WCAG AA（2.5.3 Label in Name）~~
  ——**已於 post-fix 修復**（2026-07-18，使用者核准）：`scenarioCondFull`
  改 'Cond. — all conditional fields absent'＋新增兩語言四組全掃
  `Full.startsWith(Short)` meta 案；**meta 案當場再抓出 zh「早期」組
  同型違規一併修**（詞序調整『早期 session（…）』，含 index.html
  pre-JS fallback 與 mock-data.ts 字面同步）。終驗 1738/19skip exit 0。

## B. Below-the-contract decisions
（契約沉默處的自由選擇；主體皆 WORKS.md 逐 wave 記載並經協調者複驗接受，
此處彙整供 /magi:commit 對帳）
- [ ] schema 面：sanitizeConfigCore 拆分（v1 遷移源頭排除）；row-separators.ts
  僅收 real index 無 slot 入口；組合矩陣窮舉 ≤4 ops＋splice ground truth
- [ ] 後端面：bash SEP 三分支＋joinPlain 收 sepVar；ps1 單一 rowSeparatorValue
  以 `??` 保 fast path；powerline 惰性改注入對比案（bash 8 檔/ps1 6 檔
  明列——ps1 canonical 清單本異）；兩份 canonical golden 源 icon 預設不同
  （既有慣例）；clamp 上界＝目錄段數容許越界孤兒覆寫（三後端一致忽略，benign）
- [ ] 互動面：markSegmentEnabledDeferred 獨立函式；planEnableIntoTarget 純
  插入新模組；dragSource＋endDragCleanup 單一冪等出口；performCrossRowMove
  origin 第四參數 default 'move'；srcDrains=false 時 sourceRow=0 佔位
  （sameRowInsert 閘保證不讀）
- [ ] 版面面：頂帶自身承載 role=region＋tabindex=0；dialog 主動加顯式關閉
  鈕＋backdrop click（fallback 非模態 Esc 無原生關閉）；fallback 路徑頁面
  不 inert（PLAN 明記取捨）；CSS order 互斥 media range＋dialog 防禦 CSS
  （micro-fix-2；視覺序≠Tab/SR 序為已知限制→micro-fix-3 候選）
- [ ] i18n 面：single-source 反轉（messages 為源、segments 凍結 zh 消費＋
  locale accessor）；validateUserText 回傳 reason 呼叫端組句；site chrome
  維持 zh 入 meta 排除清單；render-preview.ts 追加核准（developer 先旗標、
  協調者核准）；main.ts normalizeRowSeparatorsField 與
  computeRowSeparatorsAfterMove 兩處雙寫（有整合測試網）
- [ ] 測試面：fixtures 逐案／pipeline＋lang-switch 檔級 testTimeout 30s
  （gate 基建，複驗不遮蔽真 hang、不外溢）；messages「零漂移」測試轉恆真
  保留（docstring 待改述）；e2e 錨點制＋文字比對僅標注例外；sp1/ 逐任務
  報告形態（工件簽入形態契約未規範）
- [ ] T5.6 順手修 buildSegmentRows 二次呼叫殘留舊列 bug（rebuild 前移除
  追蹤舊列，單一咽喉點）

## C. Out-of-scope observations
- [ ] **真機驗收遞延**（使用者 2026-07-18 指示）：T6.2-CHECKLIST.md A–F 區
  親測、變體 A/B 圈選、micro-fix-3 去留——**併下個 sprint**；伴生「僅真機
  能驗面」自動化零覆蓋清單見 MAGI_CODE_REVIEW Untested paths（頂帶量測／
  CSS order 摺線／原生 dialog 鏈）
- [ ] 測試網加固候選（使用者指示併下個 sprint 測試批）：i18n-meta-scan 補
  屬性巡檢（Important #2）＋main.ts strip 窄盲點；windows leg `BASH.ok &&
  PS1.ok` meta 守門；複製內容 spy 斷言；WCAG 2.5.3 `Full.includes(Short)`
  meta 案；真 DnD × 覆寫值 e2e 組合
- [ ] 雙寫收斂 follow-up：planSegmentMove 回傳形補 sourceRow/srcDrains；
  config.ts export 單一 trim helper
- [ ] descriptor.label／icon.ariaText 凍結 zh footgun（JSDoc 加固候選）；
  emit-settings 三 hint 常數「UI 用」註解與現況不符（S5 既有）；
  segment-defaults colorDisplayLabel default/auto 死分支
- [ ] 衛生（/magi:commit 處置）：.gitignore 放寬 `**/.xreview-*.md`；
  forailook/／magi/05 遺留排除於提交集；lockfile 良性 churn 與 feature
  分離；失效行號引用 ×2（segment-defaults.ts:45／main.ts:426）；
  sprint-05 dotfile 報告引用落空（main.ts:14-15／index.html:46）；
  README 未反映語言切換等新能力；sp1/ 截圖（~880KB）簽入與否、
  magi/MANUAL-VERIFICATION.md 簽入時機——committer 決策點
- [ ] 並行負載下真執行案偶發 flaky（重跑即綠）——CI 若加並行度需留意
