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

  await page.getByRole('button', { name: LOGIN_BUTTON_NAME }).click();
  await page.waitForURL((url) => !url.pathname.startsWith(LOGIN_PATH));
}
