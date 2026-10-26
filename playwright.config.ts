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

import process from 'node:process';

import { defineConfig, devices } from '@playwright/test';

/** 前端 dev 地址（vite dev 端口 7201，接口经 vite 代理转发到后端） */
const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:7201';

export default defineConfig({
  testDir: './e2e',
  // 测试产物（trace / 报告）统一落在 e2e/.artifacts，不污染仓库其它目录
  outputDir: './e2e/.artifacts/test-results',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { outputFolder: './e2e/.artifacts/playwright-report', open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    // 失败保留 trace 便于回溯，成功不留产物
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    // 本地已起 dev 服务时直接复用（reuseExistingServer），否则自动拉起
    command: 'npm run dev',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
