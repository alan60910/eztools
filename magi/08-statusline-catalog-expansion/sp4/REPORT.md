# S4（T2.3）— bar run 粒度 byte 驗證

> Sprint: `magi/08-statusline-catalog-expansion/`　Task: T2.3（Milestone 2）
> 驗證腳本：`sp4/verify.mjs`（`node magi/08-statusline-catalog-expansion/sp4/verify.mjs`）
> 結果：**41 / 41 PASS**。未動任何 production 檔（`emit-ansi.ts`／`color.ts`
> 僅唯讀 import）；bar 功能本身尚未實作（M4 待辦），本 spike 驗證的是
> **PLAN.md §4 契約本身在「未來 resolve/emit 實作」下是否可達成
> byte-exact**，不是驗證現行程式碼（因為 bar 相關程式碼還不存在）。

## 方法論（誠實揭露）

「先手推、不是跑 toAnsi 再抄回來」在腳本中分兩層落實：

1. **每一案的 run 數量／文字／fg／bg 由本檔案作者依 PLAN §4 逐條手推**
   （run 粒度、bg 均一、fgOverride 停用、pad/suffix 併入 run4 等），這是
   本 spike 真正要驗證的東西——這部分不可能被「跑程式再抄」污染，因為
   bar 的 resolve/emit 實作根本不存在。
2. **「ColorSpec → SGR bytes」的機械轉換**：手動輸入數十組跳脫序列易有
   謄寫失誤，故另寫一組**不 import production join 邏輯**的小函式
   （`sgrParams`／`runBytes`，依 `emit-ansi.ts` 檔頭鎖死規則＋ANSI SGR
   標準獨立重刻），供系統性建構「手推 bytes」。為交叉驗證這組小函式本身
   沒有抄錯，額外對兩案（bar 0% plain、bar null plain）**逐字元手打字串
   常數**（不經任何輔助函式），與 `runBytes` 版本及 `toAnsi()` 三方比對
   全部一致——`emit-ansi.test.ts` 既有先例（如
   `'\x1b[0m\x1b[38;5;196mx\x1b[0m'`）採同一手打字串常數風格，本腳本沿用。
3. **腳本自洽性已驗證非「橡皮圖章」**：開發過程中 `check()` 一度誤用
   `===` 比較 `ColorSpec` 物件（`autoFg()` 每次呼叫回傳新物件實例），
   造成真實的 FAIL（案 10 的 autoFg 比對）——已修正為結構相等
   （JSON 比較）。另以獨立 sanity-check 腳本確認等價判定邏輯能正確
   分辨位元組差異（fg/bg 序交換案）。這兩點確認本次 41 PASS 是真陽性，
   非測試邏輯錯誤導致的假陽性。
4. `autoFg` 的 WCAG 對比數學本身**不**在本 spike 範圍內重新推導——依
   PLAN 指示直接呼叫 production `autoFg()` 並記錄結果（`autoFg(135) ===
   {kind:'ansi256', index:16}`，已於腳本輸出印出），該數學已由
   `color.test.ts` 把關。

## 四格結論

| 後端 | 模式 | 累加器策略 | 等價可達成？ |
|---|---|---|---|
| bash | plain | **逐 run push 4 元素**＋`segstart=[1,0,0,0]`（既有 `joinPlain` 迴圈不用改） | 可達成，且**不需修改 join 演算法本身**，只需 `emitSegment` 的 bar 分支改 push 4 次 |
| bash | powerline | **併單一累加器元素**：`fgs[i]`/`bgs[i]` 取 run1（head）的 fg/bg；`texts[i]` = run1 的**裸文字**（不烘色碼）+ run2/3/4 的**完整烘焗** `reset+fg+bg+text` | 可達成，但**有精確的烘焗順序要求**（見下方「關鍵發現」） |
| ps1 | plain | **併單一 `$s` 字串**（沿既有 2-run 閾值分裂先例逐字延伸為 4-run）：每個 run 的 `reset+fg+text`（plain 恆無 bg）逐一烘進同一字串，`pushLines` 呼叫一次 | 可達成，`joinPlain`（ps1）迴圈不用改（本就是「一段一元素」） |
| ps1 | powerline | 與 bash-powerline **同一套烘焗規則**（`joinPowerline` 兩後端逐位元組同構，已於程式碼比對確認：emit-bash.ts:361-397 與 emit-ps1.ts:522-552 演算法相同，僅語法差異） | 可達成 |

**一句話結論**：四格皆可達成 byte-exact；bash-plain／ps1-plain 完全不需
碰 join 迴圈本身（既有機制天然支援，只是 push 次數/組字串範圍改變）；
bash-powerline／ps1-powerline 需要 emit 期依循「run1 進累加器欄位、
run2-4 烘進 text 尾端」的精確組裝順序，否則會產生**多餘或重複的 SGR
位元組**（見下）。

## 關鍵發現：powerline 併元素的精確烘焗順序

這是本 spike 最重要、契約原文未明確拆解到位元組層級的部分。`joinPowerline`
的既有迴圈對每個累加器元素固定產生：

```
reset
if fgs[i] != '': fg
if bgs[i] != '': bg
text[i]
```

若天真地把 4 個 run **全部**烘進 `text[i]`（`fgs[i]`/`bgs[i]` 皆設為
run1 的值以滿足箭頭交接需求），會導致：

- `fgs[i]`/`bgs[i]` 非空 ⇒ 迴圈自己先吐一次 `reset+fg1+bg1`；
- 緊接著 `text[i]` 開頭若也內嵌 run1 自己的 `reset+fg1+bg1`（比照
  oracle 逐 run 規則），兩者**重複**（bg 尤其會出現兩次相同的
  `ESC[48;...]m`），bytes 比 oracle 多出一截，並非 byte-exact。

**正確組裝**（腳本 `mergeBarPowerlineElement` 實作、41 案全數驗證通過）：

- `fgs[i]` = run1.fg、`bgs[i]` = run1.bg（滿足箭頭交接需要——bar 段 bg
  全段均一＝segColor，run1.bg 即可代表整段，故箭頭色一定正確）；
- `text[i]` = run1 的**裸文字**（不含任何跳脫序列）+ run2/run3/run4 各自
  完整的 `reset+fg+bg+text`（各自獨立烘焗，因為它們的 fg 可能互不相同
  ——run2/run4 走桶色、run3 無色）。

這樣迴圈自己吐的 `reset+fg1+bg1` 剛好等於 oracle run1 該有的前綴，
`text[i]` 接上裸文字後緊接 run2/3/4 各自完整前綴，逐位元組等於
oracle 的 `R1+R2+R3+R4`。**這個「run1 特殊處理、run2-4 全烘」的不對稱
規則是實作 T4.3/T4.4 時必須遵守的精確配方**，建議內容併入 T4.3/T4.4
實作備忘（若 T2.6 彙整時認為值得回寫 PLAN，可補一句話鎖死）。

## 各案 bytes 摘要

以下摘要皆取自 `verify.mjs` 實際輸出（41 案全 PASS，逐案列於下；bytes
以 `\x1bxxx` escape 顯示）。

- **案 1**（bar 60% plain，2 段 `M |ctx:` + bar）：`oracle 自洽`／
  `bash-plain 累加器`／`ps1-plain 累加器` 三者皆與
  `toAnsi([[{M },{|},{ctx:},{█×12},{░×8},{ 60%}]])` 位元組相同。
- **案 2**（bar 60% powerline arrow=true，2 段＋cap）：驗證箭頭（fg=前段
  bg／bg=本段 bg）與收尾 cap（fg=末段 bg／無 bg）在「本段是合併元素」
  時依然正確——關鍵即上述「run1 進欄位、run2-4 烘 text」配方。
- **案 3**（bar 60% powerline-noarrow，2 段）：確認 D1 gating 下無箭頭
  ／無 cap，且 pad（`' '`）正確併入 run4（`' 60% '`），其餘段（非 bar）
  pad 直接併入該段唯一 run。
- **案 4**（bar 0% plain，head 空）：填格 0（`fillCount(0)=0`）、
  run1 為**空文字佔位 run**（非省略，4-run 恆定形），逐字手打
  spot-check 三方一致。
- **案 5/6/7**（bar 49%／50%／100% plain）：填格數字錨點
  `floor(49/5)=9`、`floor(50/5)=10`、`min(20,floor(100/5))=20`，與
  PLAN §Verification 數字錨點吻合。
- **案 8a/8b**（bar null，plain／powerline）：主值 null → 整段退化為
  單一 `--` run（非 4-run），plain 逐字手打 spot-check 一致；powerline
  另驗單元素仍可正確觸發收尾 cap。
- **案 9**（percent-reset × bar，plain）：run4 = `' 60% (14:30)'`
  （`' ' + pct% + suffix`，本案 pad 為空），suffix 正確落在 pct% 之後、
  且仍為單一 run（沿 run4 桶色，不因帶後綴而多開一 run）。
- **案 10**（auto(opus→135) × powerline arrow=true）：`autoFg({ansi256,
  135})` 實際呼叫結果為 `{kind:'ansi256', index:16}`；run1/run3 的 fg
  即此值，run3 的 bg 仍 = 展開後的 135（bg 全段均一，auto 亦不例外）；
  cap 箭頭 fg = 135。
- **案 11**（auto(opus→135) × powerline-noarrow）：run4 尾 pad 正確併入
  （`' 60% '`），無箭頭/cap。

## 契約縫隙（如實列出，供 T2.6 彙整）

1. **null 退化路徑是否也受「fgOverride 停用」約束，PLAN 原文未明確**：
   §4「powerline 模式：bar 段桶色套 fg、bg 全段維持段主色、停用
   fgOverride」這句緊跟在「bar 啟用且主值存活＝靜態 4-run」段落之後，
   字面上像是專指 4-run 路徑；但 null 退化仍是「bar 啟用」狀態下的
   同一 segment，若 4-run 路徑禁用 fgOverride、null 路徑卻仍
   `fgOverride ?? autoFg(...)`，會造成「同一段設定 fgOverride，切換
   pct 是否為 null 時視覺色會跳變」的使用者困惑。本 spike **採保守
   解讀**（null 路徑也停用 fgOverride、恆用 autoFg），已在腳本
   `buildDashRun` 標註此假設。**建議 T4.1/T4.2 實作時明確擇一並補一句
   話回寫 PLAN §4**，避免 resolve.test.ts 與本 spike 假設不一致。

2. **run3（empty）在 threshold undefined 時的「退段主色」是否仍是「無
   fg」**：PLAN §4 另有一句「`threshold === undefined` 而 bar 開（手改
   存檔可達）→ filled／pct 退段主色」，本 spike **未涵蓋此組合**（未在
   brief 明確要求的案例清單內，時間所限）。若 run2/run4 的 fg 從「桶色」
   退為「段主色」，那 run3（empty，一律 default／無 fg）與 run2/run4
   （此時 fg=段主色，即與 run1 head 同色）在 plain 模式下會產生
   「head／filled／value 三個 run 顏色相同、empty 唯一無色」的觀感——
   結構上仍是 4-run（未退化成 3-run 合併），但這點在 PLAN 原文與本
   spike 都只是推論、未逐位元組驗證，建議 T4.2 補一組單元測試釘死。

3. **powerline 併元素的精確烘焗順序（run1 進欄位／run2-4 全烘）未見於
   PLAN 原文逐位元組拆解**：PLAN §4 只寫「把 4 run 的 SGR 編碼併單一
   累加器元素……bytes 與 oracle 逐 run reset+fg+bg+text 序列等價」，
   沒有拆到「為什麼不能 4 run 全烘」「為什麼 run1 必須留在
   fgs[i]/bgs[i] 欄位」這個精確配方（本 spike 的核心發現，見上節）。
   **不是矛盾**，但屬於「留給實作者摸索、若摸錯方向會產生多餘 reset/bg
   位元組」的縫隙，已在本文件明確補上配方，建議 T4.3/T4.4 直接引用本
   文件的配方描述，不需重新推導。

4. **bash-plain 是否真的完全不用改 join 迴圈**：PLAN §4 原文「bash-plain
   逐 run push 四元素＋segstart 1/0/0/0」已隱含這點，本 spike 的
   `simulateBashPlain` 直接沿用**未修改**的既有 `joinPlain`（bash）演算法
   即可產生等價 bytes（見案 1／4-9 的 bash-plain 累加器檢查皆通過），
   證實這不是隱含假設而是可驗證事實——**T4.3 實作時可放心只改
   `emitSegment` 的 bar 分支（push 4 次），`joinPlain` 函式本體零改動**。
   此點原屬「契約沉默處」，本 spike 已補閉，記錄於此供 T2.6 確認不需
   回寫 PLAN（因為驗證結果與 PLAN 描述一致，非縫隙，僅記錄佐證來源）。

## 產物

- `sp4/verify.mjs`：可重跑驗證腳本（41 案，全 PASS）。
- `sp4/REPORT.md`：本檔。

## Verification

```
$ node magi/08-statusline-catalog-expansion/sp4/verify.mjs
...
41 passed, 0 failed (41 total)
```

未修改 `tools/statusline-builder/emit-ansi.ts`／`color.ts`／任何
production 檔；`git status --short` 只新增 `magi/08-statusline-catalog-
expansion/sp4/`（該上層目錄本身在本任務開始前即為 untracked 狀態，其他
lane 的既有改動未受影響）。
