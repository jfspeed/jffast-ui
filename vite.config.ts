/*
 * Copyright 2024-2026 jffast
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Buffer } from 'node:buffer';
import path from 'node:path';

import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';
import type { ConfigEnv, UserConfig } from 'vite';
import { loadEnv } from 'vite';
import svgLoader from 'vite-svg-loader';

const CWD = process.cwd();
const sharedDir = path.resolve(__dirname, './shared/src');
const srcDir = path.resolve(__dirname, './src');

/** 去掉 Base64 尾部 padding，便于做严格回环比对 */
const BASE64_PADDING_RE = /=+$/;

function stripBase64Padding(value: string): string {
  return value.replace(BASE64_PADDING_RE, '');
}

/**
 * 判断一个字符串是不是一把**真实可用的 RSA 公钥**。
 *
 * 判据：严格 Base64 字符集 + Base64 严格回环 + ASN.1 SEQUENCE 头 + 长度下限
 * （RSA-2048 的 X.509 SPKI 约 294 字节）。
 *
 * 为什么不再比「是否等于仓库曾公开的示例公钥」：那把示例公钥已随历史清理一并移除
 * （仓库内已无任何密钥材料），拿它当哨兵等于比一个永远命不中的字符串，守卫会静默失效。
 * 结构校验比等值比较更强：空值、占位符（***REMOVED*** 之类）、截断串、乱码一律拦得住。
 */
function isRsaPublicKey(candidate: string): boolean {
  const trimmed = (candidate || '').trim();
  if (!trimmed) {
    return false;
  }
  let der: Buffer;
  try {
    der = Buffer.from(trimmed, 'base64');
  } catch {
    return false;
  }
  if (der.length < 250 || der[0] !== 0x30) {
    return false;
  }
  // Buffer.from 会静默忽略非法字符，必须重新编码比对才能发现「伪 Base64」
  return stripBase64Padding(der.toString('base64')) === stripBase64Padding(trimmed);
}

/**
 * 生产构建前校验 RSA 公钥（fail-fast）。
 *
 * 此前 `npm run build`（--mode release）只读 `.env`，`VITE_RSA_PUBLIC_KEY` 恒为空 →
 * 产物里根本没有公钥，登录时 `publicKey` 为空直接走**明文密码**分支，安全上不可接受。
 * 现改为：构建时公钥缺失或不是一把合法 RSA 公钥一律失败，强制构建方自行注入。
 *
 * 注入方式：`VITE_RSA_PUBLIC_KEY=<公钥> npm run build`，或写入 `.env.release.local`（不入库）。
 */
function assertRsaPublicKeyForBuild(mode: string, publicKey: string): void {
  const key = (publicKey || '').trim();
  if (!key) {
    throw new Error(
      `[build] VITE_RSA_PUBLIC_KEY 未配置：构建产物将无 RSA 公钥，登录只能发送明文密码。\n` +
        `  请用 RsaKeyGenerator 生成密钥对，然后：\n` +
        `    - 环境变量：VITE_RSA_PUBLIC_KEY=<公钥> npm run build\n` +
        `    - 或写入 .env.release.local（已 gitignore，不入库）\n` +
        `  （当前 mode=${mode}；dev/test 由后端启动时生成一次性密钥对并经 GET /sys/rsaPublicKey 下发，无需前端注入）`,
    );
  }
  if (!isRsaPublicKey(key)) {
    throw new Error(
      `[build] VITE_RSA_PUBLIC_KEY 不是一把合法的 RSA 公钥（要求 Base64 编码的 X.509 SPKI DER）。\n` +
        `  当前值长度 ${key.length}，可能为空值残留、占位符或截断串。\n` +
        `  生产/交付构建必须注入自己生成的密钥对（后端对应 RSA_PRIVATE_KEY 同步更换）。`,
    );
  }
}

export default ({ mode, command }: ConfigEnv): UserConfig => {
  // VITE_API_URL / VITE_PROXY_TARGET 决定 dev 代理指向哪个后端，
  // 可用 Vite mode（--mode xxx 加载 .env.xxx）切换不同后端地址。
  const env = loadEnv(mode, CWD);
  const { VITE_BASE_URL, VITE_API_URL = '/jffast-api', VITE_PROXY_TARGET = 'http://localhost:7200' } = env;

  // 仅 release 构建强制校验 RSA 公钥：build:test / build:prod 属于内部环境打包，
  // 走 .env 里的配置即可，不应被 release 专属的「必须注入自有公钥」要求挡住
  // （此前条件是 command === 'build'，导致 npm run build:test 必然失败）。
  if (command === 'build' && mode === 'release') {
    assertRsaPublicKeyForBuild(mode, env.VITE_RSA_PUBLIC_KEY);
  }

  return {
    base: VITE_BASE_URL,
    resolve: {
      alias: {
        '@/api/core': path.resolve(sharedDir, 'api/core'),
        '@/api/modules': path.resolve(srcDir, 'api/modules'),
        '@/api/system': path.resolve(srcDir, 'api/system.js'),
        '@/api/codegen': path.resolve(srcDir, 'api/codegen.js'),
        '@/api': path.resolve(srcDir, 'api'),
        '@/hooks': path.resolve(sharedDir, 'hooks'),
        '@/utils': path.resolve(sharedDir, 'utils'),
        '@/components': path.resolve(sharedDir, 'components'),
        '@/store': path.resolve(sharedDir, 'store'),
        '@/layouts': path.resolve(sharedDir, 'layouts'),
        '@/style': path.resolve(sharedDir, 'style'),
        '@/locales': path.resolve(sharedDir, 'locales'),
        '@/config': path.resolve(sharedDir, 'config'),
        '@/constants': path.resolve(sharedDir, 'constants'),
        '@/runtime': path.resolve(sharedDir, 'runtime'),
        '@/types': path.resolve(sharedDir, 'types'),
        '@/pages': path.resolve(srcDir, 'pages'),
        '@/router': path.resolve(srcDir, 'router'),
        '@/assets': path.resolve(srcDir, 'assets'),
        '@jfspeed/shared': path.resolve(sharedDir),
        '@jfspeed/base': path.resolve(srcDir, 'create-app.ts'),
        '@': path.resolve(srcDir),
      },
    },

    css: {
      preprocessorOptions: {
        less: {
          modifyVars: {
            hack: `true; @import (reference) "${path.resolve(sharedDir, 'style/variables.less')}";`,
          },
          math: 'strict',
          javascriptEnabled: true,
        },
      },
    },

    plugins: [vue(), vueJsx(), svgLoader()],

    server: {
      port: 7201,
      // 端口被占用时直接报错退出，不再自动 +1（否则会悄悄起出 7202 这类幽灵实例）
      strictPort: true,
      host: '0.0.0.0',
      open: true,
      proxy: {
        // 代理按 .env 的 VITE_API_URL / VITE_PROXY_TARGET 生成（默认 /jffast-api → :7200）。
        [VITE_API_URL]: {
          target: VITE_PROXY_TARGET,
          changeOrigin: true,
          // ws: true —— 站内通知 WebSocket 走 ${VITE_API_URL}/ws，不开启 upgrade 转发则
          // 前端永远连不上实时推送（且不会报错，只是永远没有推送）
          ws: true,
        },
        // 上传文件（/upload/**）由后端静态映射提供（WebMvcConfig → 磁盘 / MinIO）。
        // 后端返回的是**无前缀绝对路径** /upload/xxx，前端按原样渲染，所以这里必须把 /upload
        // 转发到「后端 API 前缀」之下。漏掉这条表现为「图片全裂、但接口全都正常」，极易误判。
        '/upload': {
          target: `${VITE_PROXY_TARGET}${VITE_API_URL}`,
          changeOrigin: true,
        },
      },
    },

    build: {
      target: 'es2015',
      sourcemap: false,
      // 阈值下调：原 4000 会把真实的体积告警一起吞掉。当前最大块为 tdesign-vendor（约 1.4 MB），
      // 1500 既能容纳已知的第三方大块，又能在新增超大依赖时如实告警。
      chunkSizeWarningLimit: 1500,
      rollupOptions: {
        output: {
          chunkFileNames: 'static/js/[name]-[hash].js',
          entryFileNames: 'static/js/[name]-[hash].js',
          assetFileNames: 'static/[ext]/[name]-[hash].[ext]',
          manualChunks: {
            'vue-vendor': ['vue', 'vue-router', 'pinia'],
            'tdesign-vendor': ['tdesign-vue-next'],
            // 体积最大的两个库单独成块：echarts 仅仪表盘用、bpmn-js 仅流程设计器用，
            // 拆出后不影响首屏加载，也便于按需缓存
            'echarts-vendor': ['echarts'],
            'bpmn-vendor': ['bpmn-js'],
          },
        },
      },
      minify: 'terser',
      terserOptions: {
        compress: {
          // 只丢弃 log / debug，保留 error / warn：
          // RSA 加密失败、HTTP 500 详情等关键排障信息都走 console.error，
          // 用 drop_console: true 会把它们一并抹掉，导致线上静默失败无法定位。
          pure_funcs: ['console.log', 'console.debug'],
          drop_debugger: true,
        },
      },
    },
  };
};
