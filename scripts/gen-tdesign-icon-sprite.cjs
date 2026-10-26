/*
 * 本地生成 TDesign 图标 sprite（离线，不依赖 tdesign.gtimg.com）
 *
 * 背景：
 *   `<t-icon name="xxx" />` 渲染的是 `<svg class="t-icon t-icon-xxx"><use href="#t-icon-xxx" /></svg>`，
 *   依赖文档内存在 `<symbol id="t-icon-xxx">`。TDesign 默认在运行时从 CDN
 *   （https://tdesign.gtimg.com/icon/<ver>/fonts/index.js）注入该 sprite；
 *   但本仓的 CSP（script-src 'self'）会拦截该外部脚本，且内网/离线环境也访问不到 CDN，
 *   导致所有 name 方式声明的图标（含 sys_menu.icon 驱动的左侧菜单图标）渲染为空白。
 *
 * 做法：
 *   从本地已安装的 tdesign-icons-vue-next 渲染出全部图标，生成同源 sprite 文件，
 *   由 index.html 以 <script src="/tdesign-icons-sprite.js"> 引入（同源，CSP 放行）。
 *
 * 许可与归属：
 *   产物是第三方作品（Tencent TDesign 图标，MIT）的再分发，**不是** jffast 自己的作品。
 *   生成的 sprite 文件头部会保留 Tencent 的 MIT 版权与许可声明——这是 MIT 的硬性要求，
 *   不要在重新生成时把它替换成本仓的 Apache-2.0 头。
 *
 * 用法（图标包升级后重新生成）：
 *   node scripts/gen-tdesign-icon-sprite.cjs
 */
const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');

// 脚本位于 <repo>/scripts/ ⇒ UI 根目录是上一级
const UI_DIR = path.resolve(__dirname, '..');
const OUT_FILE = path.join(UI_DIR, 'public', 'tdesign-icons-sprite.js');

// 从本仓解析依赖（脚本自身在 scripts/ 下，直接 require 本仓 node_modules 即可）
const uiRequire = createRequire(path.join(UI_DIR, 'package.json'));
const icons = uiRequire('tdesign-icons-vue-next');
const { createSSRApp, h } = uiRequire('vue');
const { renderToString } = uiRequire('@vue/server-renderer');

const manifest = uiRequire('tdesign-icons-vue-next/lib/manifest.js').manifest;

function collectComponents() {
  const pairs = [];
  const missing = [];
  for (const { stem, icon } of manifest) {
    const component = icons[`${icon}Icon`];
    if (typeof component === 'function' || (component && typeof component === 'object')) {
      pairs.push({ stem, component });
    } else {
      missing.push(icon);
    }
  }
  return { pairs, missing };
}

/** 把单个渲染出的 <svg> 转成 <symbol>（去掉根上的 class/style，保留 viewBox 等几何属性） */
function svgToSymbol(stem, svg) {
  const open = svg.match(/^<svg\b([^>]*)>/);
  if (!open) return null;
  let inner = svg.slice(open[0].length, svg.lastIndexOf('</svg>'));
  const attrs = open[1]
    .replace(/\s(?:class|style)="[^"]*"/g, '')
    .trim();

  // 图标自带的内部 id 会与页面 id 冲突：例如 App 图标的 <g id="app"> 会抢在真正的
  // <div id="app"> 之前被 getElementById/querySelector 命中，导致 Vue 把整个应用
  // 挂载进 SVG 里（页面白屏）。因此统一加 symbol 前缀，并同步改写内部的 url(#id) 引用。
  const innerIds = new Set([...inner.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
  if (innerIds.size) {
    const prefixId = id => `${stem}__${id}`;
    inner = inner.replace(/\bid="([^"]+)"/g, (_, id) => `id="${prefixId(id)}"`);
    inner = inner.replace(/url\(#([^)]+)\)/g, (match, id) =>
      innerIds.has(id) ? `url(#${prefixId(id)})` : match);
  }

  return `<symbol id="t-icon-${stem}" ${attrs}>${inner}</symbol>`;
}

async function main() {
  const { pairs, missing } = collectComponents();
  if (missing.length) {
    console.warn(`[warn] ${missing.length} 个 manifest 条目无对应导出，已跳过: ${missing.slice(0, 5).join(', ')}...`);
  }

  // 一次性 SSR 渲染全部图标，避免逐个渲染的开销
  const app = createSSRApp({ render: () => pairs.map(({ component }) => h(component)) });
  const html = await renderToString(app);

  const svgs = html.match(/<svg\b[\s\S]*?<\/svg>/g) || [];
  if (svgs.length !== pairs.length) {
    throw new Error(`渲染数量不匹配：期望 ${pairs.length}，实际 ${svgs.length}`);
  }

  const symbols = svgs.map((svg, index) => svgToSymbol(pairs[index].stem, svg)).filter(Boolean);
  const sprite = `<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="position:absolute;width:0;height:0;overflow:hidden">${symbols.join('')}</svg>`;

  const version = uiRequire('tdesign-icons-vue-next/package.json').version;
  const banner = [
    '/*',
    ' * TDesign 图标 sprite（离线同源版）',
    ' *',
    ' * ⚠️ 本文件是**第三方作品的再分发产物**，不是 jffast 自己的作品：',
    ' *   图标来源：tdesign-icons-vue-next@' + version + '（Tencent TDesign）',
    ' *   上游许可：MIT License, Copyright (c) 2021-present TDesign',
    ' *   （完整许可文本见本仓 NOTICE 与 node_modules/tdesign-icons-vue-next/LICENSE）',
    ' *',
    ' * 本文件不适用 jffast 的 Apache-2.0 声明——那是对本仓自有代码的声明。',
    ' * 再分发时必须保留上面这段 Tencent 的 MIT 版权与许可声明。',
    ' *',
    ' * 生成方式（请勿手工编辑）：',
    ' *   node scripts/gen-tdesign-icon-sprite.cjs',
    ' */',
    '/**',
    ' * TDesign 图标 sprite —— 由本地脚本从图标包生成，请勿手工编辑。',
    ` * 图标包版本：tdesign-icons-vue-next@${version}`,
    ` * 图标数量：${symbols.length}`,
    ' */',
  ].join('\n');

  const content = `${banner}\n(function () {\n  var sprite = ${JSON.stringify(sprite)};\n  var holder = document.createElement('div');\n  holder.setAttribute('aria-hidden', 'true');\n  holder.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';\n  holder.innerHTML = sprite;\n  document.body.appendChild(holder);\n})();\n`;

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, content, 'utf8');

  const kb = (Buffer.byteLength(content, 'utf8') / 1024).toFixed(1);
  console.log(`[ok] ${symbols.length} symbols -> ${path.relative(process.cwd(), OUT_FILE)} (${kb} KB)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
