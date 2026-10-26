/*
 * global shim（同源静态脚本）
 *
 * 目的：把 window 暴露成 CommonJS 语境里的 `global`。部分依赖（UMD / Node 风格包）在浏览器里
 * 判断 `typeof global !== 'undefined'` 来决定挂载点，缺这个别名时会落到 undefined 分支。
 *
 * 为什么必须是**外置文件**而不是 index.html 里的内联 <script>：
 * 内联脚本要求 CSP 的 script-src 放开 'unsafe-inline'，等于把 XSS 的纵深防御直接拆掉。
 * 外置后本文件走同源 '/global-shim.js'，script-src 收紧到 'self' 即可，功能完全等价。
 *
 * 加载顺序：与原先放在文档末尾的内联脚本一致地早于模块化入口 main.ts 执行 ——
 * 经典脚本在解析到时立即执行，而 type="module" 天然延迟到文档解析完成后才执行。
 */
window.global = window;
