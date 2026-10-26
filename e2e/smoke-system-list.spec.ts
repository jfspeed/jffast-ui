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

test.describe('系统管理列表冒烟', () => {
  test('岗位管理页表格渲染', async ({ page }) => {
    await login(page);
    await page.goto('/system/post');

    await expect(page).toHaveURL(/\/system\/post/);
    // TDesign Table 渲染真实 table/thead/th，可用隐式角色定位
    await expect(page.getByRole('table').first()).toBeVisible();
    await expect(page.getByRole('columnheader', { name: '岗位编码' }).first()).toBeVisible();
    await expect(page.getByRole('columnheader', { name: '岗位名称' }).first()).toBeVisible();
  });
});
