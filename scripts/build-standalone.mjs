#!/usr/bin/env node
/**
 * build-standalone.mjs — 分離配置の HTML を単一ファイル HTML に変換する。
 *
 *   node tools/build-standalone.mjs example.html
 *   node tools/build-standalone.mjs example.html -o dist/report.html
 *   node tools/build-standalone.mjs docs/*.html --outdir dist
 *
 * やること:
 *   - <link rel="stylesheet" href="ローカルパス">  →  <style>…</style>
 *   - <script src="ローカルパス"></script>          →  <script>…</script>
 *   - CSS 内の url(ローカル画像) と <img src="ローカル画像"> → data: URI
 *   - http(s) の CDN 参照はそのまま残す（Mermaid / KaTeX などは実行時に取得）
 *
 * 依存パッケージなし。Node 18 以上。
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const MIME = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

/** 外部 URL・data: ならインライン化しない */
const isExternal = (url) => /^([a-z]+:)?\/\//i.test(url) || url.startsWith('data:') || url.startsWith('#');

function parseArgs(argv) {
  const inputs = [];
  let out = null;
  let outdir = null;
  let keepAssets = false;

  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '-o' || a === '--out') out = argv[++i];
    else if (a === '--outdir') outdir = argv[++i];
    else if (a === '--keep-assets') keepAssets = true;
    else if (a === '-h' || a === '--help') return { help: true };
    else inputs.push(a);
  }
  return { inputs, out, outdir, keepAssets, help: false };
}

const USAGE = `使い方:
  node tools/build-standalone.mjs <input.html> [...] [-o out.html | --outdir dir]

オプション:
  -o, --out <file>    出力ファイル（入力が 1 つのときのみ）
      --outdir <dir>  出力ディレクトリ（既定: dist）
      --keep-assets   画像を data: URI にせず参照のまま残す
  -h, --help          このヘルプ
`;

async function inlineAssetsInCss(css, cssDir, keepAssets) {
  if (keepAssets) return css;
  const urlRe = /url\(\s*(['"]?)([^'")]+)\1\s*\)/g;
  const jobs = [];
  css.replace(urlRe, (m, _q, url) => {
    if (!isExternal(url)) jobs.push(url);
    return m;
  });

  const table = new Map();
  for (const url of new Set(jobs)) {
    const clean = url.split('?')[0].split('#')[0];
    const file = path.resolve(cssDir, clean);
    if (!existsSync(file)) continue;
    const mime = MIME[path.extname(file).toLowerCase()];
    if (!mime) continue;
    const b64 = (await readFile(file)).toString('base64');
    table.set(url, `data:${mime};base64,${b64}`);
  }

  return css.replace(urlRe, (m, q, url) =>
    table.has(url) ? `url(${q}${table.get(url)}${q})` : m);
}

async function build(inputPath, outPath, keepAssets) {
  const baseDir = path.dirname(path.resolve(inputPath));
  let html = await readFile(inputPath, 'utf8');
  const missing = [];

  // --- <link rel="stylesheet" href="..."> -> <style>
  const linkRe = /[ \t]*<link\b[^>]*>/gi;
  const links = [...html.matchAll(linkRe)];
  for (const m of links.reverse()) {
    const tag = m[0];
    if (!/rel\s*=\s*["']?stylesheet/i.test(tag)) continue;
    const href = (tag.match(/href\s*=\s*["']([^"']+)["']/i) || [])[1];
    if (!href || isExternal(href)) continue;

    const file = path.resolve(baseDir, href.split('?')[0]);
    if (!existsSync(file)) { missing.push(href); continue; }

    let css = await readFile(file, 'utf8');
    css = await inlineAssetsInCss(css, path.dirname(file), keepAssets);
    css = css.replace(/^@charset[^;]*;\s*/i, '');

    const block = `<style>\n/* inlined from ${href} */\n${css.trim()}\n</style>`;
    html = html.slice(0, m.index) + block + html.slice(m.index + tag.length);
  }

  // --- <script src="..."></script> -> <script>
  const scriptRe = /[ \t]*<script\b([^>]*)>\s*<\/script>/gi;
  const scripts = [...html.matchAll(scriptRe)];
  for (const m of scripts.reverse()) {
    const attrs = m[1];
    const src = (attrs.match(/src\s*=\s*["']([^"']+)["']/i) || [])[1];
    if (!src || isExternal(src)) continue;

    const file = path.resolve(baseDir, src.split('?')[0]);
    if (!existsSync(file)) { missing.push(src); continue; }

    let js = await readFile(file, 'utf8');
    // </script> がスクリプト中に現れると HTML が壊れるのでエスケープする
    js = js.replace(/<\/script/gi, '<\\/script');

    const type = (attrs.match(/type\s*=\s*["']([^"']+)["']/i) || [])[1];
    const typeAttr = type ? ` type="${type}"` : '';
    const block = `<script${typeAttr}>\n/* inlined from ${src} */\n${js.trim()}\n</script>`;
    html = html.slice(0, m.index) + block + html.slice(m.index + m[0].length);
  }

  // --- <img src="ローカル画像"> -> data: URI
  if (!keepAssets) {
    const imgRe = /<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi;
    const imgs = [...html.matchAll(imgRe)];
    for (const m of imgs.reverse()) {
      const src = m[1];
      if (isExternal(src)) continue;
      const file = path.resolve(baseDir, src.split('?')[0]);
      if (!existsSync(file)) { missing.push(src); continue; }
      const mime = MIME[path.extname(file).toLowerCase()];
      if (!mime) continue;
      const b64 = (await readFile(file)).toString('base64');
      const replaced = m[0].replace(src, `data:${mime};base64,${b64}`);
      html = html.slice(0, m.index) + replaced + html.slice(m.index + m[0].length);
    }
  }

  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, html, 'utf8');

  const kb = (Buffer.byteLength(html, 'utf8') / 1024).toFixed(1);
  console.log(`✓ ${inputPath} → ${outPath} (${kb} KB)`);
  if (missing.length) {
    console.warn(`  ! 見つからなかった参照: ${[...new Set(missing)].join(', ')}`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.inputs.length) {
    console.log(USAGE);
    process.exit(args.help ? 0 : 1);
  }
  if (args.out && args.inputs.length > 1) {
    console.error('-o は入力が 1 つのときのみ使えます。--outdir を使ってください。');
    process.exit(1);
  }

  const outdir = args.outdir || 'dist';
  for (const input of args.inputs) {
    const base = path.basename(input, path.extname(input));
    const outPath = args.out || path.join(outdir, `${base}.standalone.html`);
    await build(input, outPath, args.keepAssets);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
