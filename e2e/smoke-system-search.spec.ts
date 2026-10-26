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

import { expect, test } from '@playwright/test';

import { login } from './utils';

test.describe('系统管理交互冒烟', () => {
  test('岗位搜索触发查询请求，重置清空条件', async ({ page }) => {
    await login(page);
    await page.goto('/system/post');
    await expect(page.getByRole('table').first()).toBeVisible();

    const codeInput = page.getByPlaceholder('请输入岗位编码');
    const keyword = 'E2E-SMOKE';
    await codeInput.fill(keyword);

    // 交互生效的证据：查询按钮触发带搜索条件的列表请求
    const listRequest = page.waitForRequest(
      (req) => req.url().includes('/sys/post/page') && req.url().includes(`postCode=${keyword}`),
    );
    await page.getByRole('button', { name: '查询' }).click();
    await listRequest;

    // 重置清空搜索条件
    await page.getByRole('button', { name: '重置' }).click();
    await expect(codeInput).toHaveValue('');
  });
});
