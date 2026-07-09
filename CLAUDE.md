# CLAUDE.md

Project-wide instructions for AI agents working in this repo.

## What this is
EZTools — 純靜態網頁工具合集入口頁面（APNG→GIF 轉換、GIF 編輯、影片格式轉換、Claude Code statusline 產生器），部署於 GitHub Pages。Architecture and full feature spec live in
[SPEC.md](SPEC.md).

## Run / test commands
```bash
npm run dev      # 本地開發伺服器
npm run build    # 建置 dist/（GitHub Pages 部署用）
npm run preview  # 預覽建置結果
npm test         # vitest run --passWithNoTests
```

## Conventions
- 使用 TypeScript（strict、ESM）
- 全靜態前端：所有處理皆在瀏覽器端完成，不得依賴後端服務
- 產出必須可直接由 GitHub Pages 託管（純靜態檔案）
- 新增工具：建立 `tools/<slug>/` 並在 `src/tools.ts` 登記，詳見 SPEC.md

## Workflow rules
- Don't commit on the user's behalf without explicit confirmation.
- Use Conventional Commits.
- Use `/magi:commit` to commit (sprint mode for feature work, standalone
  mode for chore/docs/small fixes).
- push/merge 到 main 會自動部署至 GitHub Pages；日常開發在 DEV 分支。
