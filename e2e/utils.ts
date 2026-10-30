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

import type { Page } from '@playwright/test';

/** 登录页 / 默认登录落点（登录成功后进入 dashboard） */
export const LOGIN_PATH = '/login';
export const HOME_PATH = '/dashboard';

/** 登录按钮文案「登 录」（中间有空格） */
const LOGIN_BUTTON_NAME = /登\s*录/;

/** 登录接口路径（后端失败时仍是 HTTP 200，成败只在 body.code 上体现） */
const LOGIN_API_PATH = '/sys/login';

/** 占位账号：仅供本地/CI 冒烟占位，真实环境用 E2E_USERNAME / E2E_PASSWORD 覆盖，切勿把真实凭据写进仓库 */
const DEFAULT_USERNAME = 'admin';
const DEFAULT_PASSWORD = 'change-me';

export interface E2eCredentials {
  userName: string;
  password: string;
}

export function getCredentials(): E2eCredentials {
  return {
    userName: process.env.E2E_USERNAME || DEFAULT_USERNAME,
    password: process.env.E2E_PASSWORD || DEFAULT_PASSWORD,
  };
}

/**
 * 验证码兜底 ①：登录前拦截 `/sys/needCaptcha` 固定返回「不需要验证码」，
 * 避免后端按失败次数随机要求验证码挡住表单自动化。
 * 注意：这只影响前端是否渲染验证码输入框，**后端仍会按失败次数强制校验**；
 * 命中后端的验证码锁会以 `body.message` 报出来（见 describeLoginFailure）。
 */
async function bypassCaptchaRequirement(page: Page): Promise<void> {
  await page.route('**/sys/needCaptcha**', (route) => route.fulfill({ json: { code: 200, data: false, msg: 'ok' } }));
}

/**
 * 验证码兜底 ②：若验证码输入框仍出现（如路由未命中），用 E2E_CAPTCHA_CODE 提供的值填写；
 * 未提供时填占位值，配合后端宽松校验或人工识别。
 */
async function fillCaptchaIfShown(page: Page): Promise<void> {
  const captchaInput = page.getByPlaceholder('请输入验证码');
  if (await captchaInput.isVisible().catch(() => false)) {
    await captchaInput.fill(process.env.E2E_CAPTCHA_CODE || '0000');
  }
}

/**
 * token 兜底：设置 E2E_TOKEN 时直接把登录态写入 `localStorage['token']`（应用内 token 单源），
 * 跳过登录表单。适用于验证码无法自动化、或不想依赖登录接口的场景。
 * 注意：需在页面加载前注入（addInitScript），否则应用首屏读不到 token。
 */
export async function seedLoginState(page: Page, token: string): Promise<void> {
  await page.addInitScript((value: string) => {
    window.localStorage.setItem('token', value);
  }, token);
}

/**
 * 把登录接口的失败响应翻译成可执行的报错。
 * 不打印密码本身，只说明来源，避免凭据进 CI 日志。
 */
function describeLoginFailure(status: number, body: Record<string, unknown>, userName: string): string {
  const code = body.code;
  const message = typeof body.message === 'string' ? body.message : typeof body.msg === 'string' ? body.msg : '';
  const passwordSource = process.env.E2E_PASSWORD
    ? '来自 E2E_PASSWORD'
    : `用的是占位值 ${DEFAULT_PASSWORD}（不是有效密码，必须设 E2E_PASSWORD）`;
  const lines = [
    `登录失败：POST ${LOGIN_API_PATH} -> http=${status} code=${String(code)}${message ? ` message=${message}` : ''}`,
    `账号 ${userName}（来自 ${process.env.E2E_USERNAME ? 'E2E_USERNAME' : '内置默认值'}），密码${passwordSource}`,
  ];
  if (message.includes('验证码')) {
    lines.push(
      '服务端已对该账号累计登录失败 ≥2 次并强制图形验证码（Redis 计数，约 7 分钟后过期）：' +
        '换正确密码也要等锁过期，或用 E2E_CAPTCHA_CODE 提供验证码，或直接用 E2E_TOKEN 跳过表单。',
    );
  }
  return lines.join('\n');
}

/**
 * 登录动作封装：
 * - 默认走真实表单登录（填用户名/密码 → 提交 → 等待离开登录页）；
 * - 验证码：先 mock needCaptcha，若仍出现验证码输入框则用 E2E_CAPTCHA_CODE 填写；
 * - 兜底：设置 E2E_TOKEN 时跳过表单，直接写入登录态 storage。
 */
export async function login(page: Page): Promise<void> {
  const token = process.env.E2E_TOKEN;
  if (token) {
    await seedLoginState(page, token);
    await page.goto(HOME_PATH);
    return;
  }

  await bypassCaptchaRequirement(page);
  await page.goto(LOGIN_PATH);

  const { userName, password } = getCredentials();
  await page.getByPlaceholder('请输入用户名').fill(userName);
  await page.getByPlaceholder('请输入密码').fill(password);
  await fillCaptchaIfShown(page);

  // 后端失败也是 HTTP 200 + code=500，只等 URL 变化会白等满超时且拿不到原因（2026-10-29 实测），
  // 所以先抓登录响应：拿到明确失败就立即抛，拿不到响应再退回原来的 URL 等待。
  const pendingResponse = page
    .waitForResponse((res) => res.url().includes(LOGIN_API_PATH) && res.request().method() === 'POST', {
      timeout: 20000,
    })
    .catch(() => null);

  await page.getByRole('button', { name: LOGIN_BUTTON_NAME }).click();

  const response = await pendingResponse;
  if (response) {
    const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    const code = Number(body.code);
    if (body.success === false || (Number.isFinite(code) && code !== 200)) {
      throw new Error(describeLoginFailure(response.status(), body, userName));
    }
  }

  await page.waitForURL((url) => !url.pathname.startsWith(LOGIN_PATH));
}
