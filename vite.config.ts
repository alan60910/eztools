import { existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import { tools } from './src/tools.js';
import { renderToolList } from './src/render.js';
import { injectToolList } from './src/inject.js';

const toolsDir = resolve(import.meta.dirname, 'tools');
const rootIndexPath = resolve(import.meta.dirname, 'index.html');

function discoverToolEntries(): Record<string, string> {
  const entries: Record<string, string> = {};
  if (!existsSync(toolsDir)) return entries;

  for (const dirent of readdirSync(toolsDir, { withFileTypes: true })) {
    if (!dirent.isDirectory()) continue;
    const slug = dirent.name;
    const entryPath = resolve(toolsDir, slug, 'index.html');
    if (existsSync(entryPath)) {
      // Prefixed so a tool directory named "main" (or any other reserved
      // key) can never silently overwrite the root index.html entry below.
      entries[`tool-${slug}`] = entryPath;
    }
  }

  return entries;
}

function assertAvailableToolsHaveEntries(entries: Record<string, string>): void {
  const missing = tools
    .filter((tool) => tool.status === 'available')
    .filter((tool) => !(`tool-${tool.slug}` in entries));

  if (missing.length > 0) {
    const slugs = missing.map((tool) => tool.slug).join(', ');
    throw new Error(
      `src/tools.ts marks ${slugs} as "available", but no matching tools/<slug>/index.html was found. ` +
        'Add the tool page or set its status back to "planned".',
    );
  }
}

function injectToolListPlugin(): Plugin {
  // Vite runs transformIndexHtml for every HTML entry (root + each
  // tools/<slug>/index.html), so only inject into the root page — tool
  // pages never carry the placeholder and must not be touched.
  const normalize = (path: string) => path.replace(/\\/g, '/');

  return {
    name: 'inject-tool-list',
    transformIndexHtml: {
      order: 'pre',
      handler: (html, ctx) => {
        if (normalize(ctx.filename) !== normalize(rootIndexPath)) return html;
        return injectToolList(html, renderToolList(tools));
      },
    },
  };
}

const toolEntries = discoverToolEntries();
assertAvailableToolsHaveEntries(toolEntries);

export default defineConfig({
  base: './',
  plugins: [injectToolListPlugin()],
  optimizeDeps: {
    // Dev pre-bundling breaks @ffmpeg/ffmpeg's internal worker's
    // import.meta.url resolution — known community issue.
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        ...toolEntries,
      },
    },
  },
});
