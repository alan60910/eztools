# post-fix 三項一行級修正 — 執行報告

執行者：post-fix 派工 agent
範圍：`tools/statusline-builder/messages.ts`、`messages.test.ts`、`main.ts`（僅補 `*/`）、`.gitignore`（僅該行）。經 team-lead 核准後追加擴大：`index.html`（:164/:170 兩處字面）、`mock-data.ts`（:183 一處字面），收尾 zh Early 字面漂移的殘留兩處。未 commit。

## Fix 1 — en「Cond.」WCAG 2.5.3（MAGI_CODE_REVIEW Important #1，DRIFT A 類）

選項：採 **(a)**——`scenarioCondShort` 不動，改 `scenarioCondFull`：

```
- scenarioCondFull: 'All conditional fields absent',
+ scenarioCondFull: 'Cond. — all conditional fields absent',
```

理由：(a) 不改動可見 pill 寬度（`scenarioCondShort` 維持 `'Cond.'`），只調整 aria-label 全文前綴，風險最低、不需自證版面；(b)（改 Short 為 `'Conditional'`）會加寬頂帶 pill，需額外版面自證，非必要。

**同步 meta 案**（messages.test.ts，`meta：zh-Hant／en key 集合相等` describe 區塊內新增一案）：

```ts
it('情境縮短文字（Short）為對應全文（Full）的前綴子字串（WCAG 2.5.3 Label in Name，兩語言四組全掃）', () => {
  const scenarioKeys = ['scenarioFull', 'scenarioEarly', 'scenarioCond', 'scenarioWin'] as const
  for (const locale of LOCALES) {
    const ui = t(locale).ui
    for (const key of scenarioKeys) {
      const short = ui[`${key}Short`]
      const full = ui[`${key}Full`]
      expect(full.startsWith(short)).toBe(true)
    }
  }
})
```

用 `startsWith`（較嚴）而非 `includes`，四組 × 兩語言全掃。

**額外發現（超出原派工範圍，但屬同類 DRIFT，已一併修正）**：加上此案後跑測試，發現 **zh-Hant 的 `scenarioEarlyFull`** 其實也不合規——原文 `'session 早期（可 null 欄全 null）'` 開頭是 `session`，並非以 `scenarioEarlyShort`＝`'早期'` 起始（與派工訊息「zh 與 en 其餘三段皆合規」的假設不符，其餘三組——滿血／條件／Windows——zh 端才是真的合規）。因 `messages.ts` 未被限定只改 Cond. 一行，且同一批 WCAG 修正理應四組×兩語言全掃過關，故一併改為：

```
- scenarioEarlyFull: 'session 早期（可 null 欄全 null）',
+ scenarioEarlyFull: '早期 session（可 null 欄全 null）',
```

僅調整詞序（呼應 en 版 `'Early session (all nullable fields null)'` 的語序），語意不變，SR 播報內容仍完整。

**殘留兩處字面漂移 — 已於 team-lead 核准後追加收尾**：

1. `index.html:164`／`:170` — `#preview-scenario-group` 內 `scenario-early-null` 選項的靜態 fallback `title`（:164）與 `aria-label`（:170），JS 尚未跑 `applyI18n` 前的初始態內容，原為舊字面 `'session 早期（可 null 欄全 null）'`，已同步改為 `'早期 session（可 null 欄全 null）'`（與 `messages.ts` 新字典一致，確保 pre-JS 初始態即正確，非僅依賴執行期覆寫）。
2. `mock-data.ts:183` — `MOCK_SCENARIO_LIST` 中 `id: 'early-null'` 項目的 `label` 欄位（依該欄位上方既有 JSDoc 註記：非渲染副本，`main.ts` 不讀此欄位填 DOM，僅供本模組文件／測試可讀性參照），同步由 `'session 早期（可 null 欄全 null）'` 改為 `'早期 session（可 null 欄全 null）'`，避免舊字面誤導。

兩處皆為單一字面值替換，未動周邊結構／邏輯。

## Fix 2 — main.ts 缺 `*/`（Important #3）

於 :151（`` `THRESHOLD_TEMPLATE_LABELS` 早於 T5.4 收斂為 `thresholdTemplateLabel`。`` 後）補一行 `*/`，還原被吞併的 `ColorMode` docstring 為獨立區塊。純註解修正，diff 僅新增 1 行。

（注意：`main.ts` 在本次派工前即有其他開發者 agent 的大量未提交變更（T5.5/T5.6 文案遷移等），`git diff --stat` 因此顯示整體 1138 行變動；本項僅負責其中新增 `*/` 的那 1 行，其餘為既有未提交工作，非本次修正範圍。）

## Fix 3 — .gitignore 放寬（Important #4 的機制半）

```
- **/.xreview-prompt.md
+ **/.xreview-*.md
```

驗證：
```
$ git check-ignore -v magi/01-entry-page-skeleton/.xreview-code-prompt.md
.gitignore:9:**/.xreview-*.md	magi/01-entry-page-skeleton/.xreview-code-prompt.md
```
命中，符合預期。未動 `forailook/` 或 `magi/05` 遺留檔案本身。

## git diff --stat

`messages.ts`／`messages.test.ts` 為本 sprint 既有未加入版控的新檔（`git status --porcelain` 顯示 `??`），故不會出現在 `git diff --stat`（僅追蹤檔案）。追蹤檔案部分：

```
 .gitignore                            |    2 +-
 tools/statusline-builder/index.html   |  692 +++++++++++++-------
 tools/statusline-builder/main.ts      | 1138 ++++++++++++++++++++++++++++-----
 tools/statusline-builder/mock-data.ts |    9 +-
 4 files changed, 1472 insertions(+), 369 deletions(-)
```

`index.html`／`main.ts` 在本次派工前即有其他開發者 agent 的大量既有未提交變更（06c/T5.5/T5.6 等），故整檔 diff 很大；本次修正在這兩檔各僅貢獻 1 行字面值替換（index.html :164 `title`＋:170 `aria-label`；main.ts 補 `*/` 那 1 行），其餘非本次產生。`mock-data.ts` 的 7 行新增中，1 行是本次字面替換，其餘為既有 JSDoc 擴充。`.gitignore` 全部 1 行皆本次產生。

## 測試

初次三修（Fix 1/2/3）完成後與 index.html／mock-data.ts 擴大收尾完成後，皆各自重跑一輪，結果一致，以下為擴大收尾後的最終輪。

`npx vitest run tools/statusline-builder/messages.test.ts tools/statusline-builder/lang-switch.dom.test.ts tools/statusline-builder/i18n-dom.dom.test.ts`：

```
 Test Files  3 passed (3)
      Tests  80 passed (80)
   Start at  11:13:50
```
exit code 0

`npm run typecheck`（擴大收尾後重跑，含 mock-data.ts 型別）：兩個 `tsc --noEmit` 皆無輸出、exit code 0。

`npm test`（全量，擴大收尾後）：

```
 Test Files  55 passed (55)
      Tests  1738 passed | 19 skipped (1757)
   Start at  11:14:16
```
exit code 0

## DONE
Fix 1（含額外發現並經核准修正的 zh Early 同類 WCAG drift，及其在 `index.html`／`mock-data.ts` 的兩處殘留字面同步收尾）／Fix 2／Fix 3 皆完成並驗證綠燈；未 commit。
