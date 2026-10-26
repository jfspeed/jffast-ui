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

test.describe('登录冒烟', () => {
  test('登录成功后进入首页，左侧菜单可见', async ({ page }) => {
    await login(page);

    await expect(page).toHaveURL(/\/dashboard/);

    // 左侧菜单（TDesign Menu 根节点 ul.t-menu）渲染出菜单分组
    const sideMenu = page.locator('ul.t-menu');
    await expect(sideMenu).toBeVisible();
    await expect(sideMenu.getByText('系统管理')).toBeVisible();
  });
});
