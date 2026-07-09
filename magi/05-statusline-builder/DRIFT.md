# Drift — Claude Code Statusline 產生器（statusline-builder）
> Source: MAGI 5-reviewer panel（Fable/Opus，supermajority, ok_weight 5）  •  Generated: 2026-07-09  •  Status: DETECTED
> Post-review fixes（2026-07-09，task #74）後更新：A 類 2 項已清、C 類 5 項標✅已修。
> SP-0 §4 對帳（2026-07-09）後更新：B 類 2 項（SP-0 延後／worktree 併一）解消、worktree 拆回 25 段、C 類新增 fast_mode/agent_type backlog。

## A. Contract violations（未經授權之契約牴觸）
(none) — 原 2 項於 post-review fixes 清帳（WORKS 2026-07-09）：
- [x] ✅已修 **PUA 防線落錯層** — PUA 併入 `validateCustomText` 單一咽喉
  （PUA_RE `\u{E000}-\u{F8FF}`＋補充平面顯式轉義）；config 清洗＋main 自動
  受惠，持久化 PUA 前綴清洗期剔除、不再達 resolve/init 崩潰；補 PUA property
  ／roundtrip 測。resolve.containsPua 保留為第二道。
- [x] ✅已修 **emit-ps1 bare-head 多一 `ESC[0m`（byte 分岔）** — L428 reset
  收進 `head!==''` 分支，head 空時 ps1==oracle==bash 單 reset；補 pipeline
  三後端 byte-exact 回歸鎖（win32 真跑，修前會紅）。黃金未重生（無 config 落此格）。

## B. Below-the-contract decisions（授權記錄／契約沉默處選擇，審計留痕）
- [x] ✅SP-0 對帳完成（2026-07-09，WORKS）：73 筆真 fixture 逐欄核實、全 jqPath 命中；descriptor 拆 provisional（僅 vim-mode/pr 留）、4 mock 情境續標 provisional（合成非擷取派生）。原授權偏差（PLAN「SP-0 無降級/M2 hard-gate」，WORKS 2026-07-07）於此收束。
- [x] ✅worktree 雙表述於 SP-0 判定為**獨立並存**（fixture L22：git_worktree 名稱＋top-level worktree 物件含 branch 同時出現）→ 依 PLAN 名目拆回兩段（worktree 名稱＋worktree-branch，U+F418 subset 早備）；目錄 24→25，與 PLAN 名目一致，保守併一項解消。
- [ ] cost/duration/context-size ps1 `[double]` 轉型（於 $null 判定後）[SP-5 實證 Decimal 陷阱、已折入 PLAN §格式化對等規則，in-contract]
- [ ] emit-ps1 shell-out 存活守衛 `$null -ne $so -and $so -ne ''` [WORKS T2.7 coordinator 授權擴權 (A)]
- [ ] 字型 base64 inline 路 A（推翻 PLAN D4「Vite 搬 dist/assets＋<100KB byte 斷言」假設）[WORKS T3.2 裁定；TECHSTACK/verify-dist 已據此對齊]
- [ ] D6 例示 off-by-one（PLAN `ANSI 137 #af8787` 應 #af875f）[WORKS T1.2：公式為權威、PLAN 文字刻意留痕]
- [ ] bash 黃金集 7 份 > PLAN「少而精 2 份」指引 [每份對映特定契約條款，多覆蓋；ps1 維持 2 份]
- [ ] setHidden inline-display workaround [WORKS T3.3 授權；根治交本 review 裁——見 C]
- [ ] settings target 由副檔名推斷（無 target 選擇器）[契約沉默處，emit-settings 有記]

## C. Out-of-scope observations（實作期浮現、契約外新顧慮）
- [x] ✅已修 **`[hidden]{display:none!important}` 根治**——src/style.css reset 已補（src/style.css:53），setHidden 簡化為只切 hidden 屬性；四工具 build 綠，一併修好其餘三工具 .button-like 按鈕潛伏 bug（未改那三工具 JS，目視歸各工具 pending 人工 gate）
- [x] ✅已修 emit-bash 全段真執行（full-behavior 三情境含 worktree 兩 fallback，win32 真跑綠）
- [x] ✅已修 containsPua/PUA_RE \u 轉義（併入 PUA validate 修，字面字元→`\u{E000}-\u{F8FF}`）
- [x] ✅已修 golden:update npm 別名（package.json）／INSTRUCTIONS §4 25→24
- [ ] **SP-0 新欄位 → backlog**（未決，交 /magi:commit 升 backlog）：真 fixture 多出 `fast_mode`（73/73 boolean，/fast 旗標）與 `agent_type`（1/73 string，與 agent.name 同值、冗餘）兩欄，超 PLAN 25 段契約；使用者裁定（2026-07-09）記 backlog、v1 不設段（型別已加入 StatusData 存查）。
- [ ] **commit 期前置**（未決，交 /magi:commit）：`tools/statusline-builder/` 全 untracked——commit 須一併簽入全部測試檔＋harness＋`scripts/{statusline-golden-configs.ts,golden-*.mjs,subset-*.mjs}`＋`magi/05-statusline-builder/fixtures/stdin-dump.jsonl`（SP-0 對帳基準）＋package.json/lock，否則 CI 真執行 gate＋skipIf meta 靜默歸零；**便攜 jq（sp5/tools/jq-windows-amd64.exe）是否入 repo＝commit 期裁定（面板建議不入）**
- [ ] settings 路徑輸入未走驗證/無 shell 逸出——至少擋控制字元
- [ ] 複製路徑 .ps1 無 BOM（僅下載帶）——複製亦前置 BOM 或 README 明示
- [ ] settings 無 .json 黃金／ps1 黃金 config 雙源硬編碼／clock ps1 分支零真執行·無守衛／verify-dist inline 斷言對 subset 成長脆弱／truecolor 命名死 span／移位鈕邊界無回饋
- [ ] 三後端一致 ≠ 對真 stdin 正確（C3 provisional 體制根本限制）——SP-0 對帳（延後）前的測試可信度最大保留，WORKS 已認
