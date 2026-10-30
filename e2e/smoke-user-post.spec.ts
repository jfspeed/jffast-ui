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

import type { Locator, Page, Route } from '@playwright/test';
import { expect, test } from '@playwright/test';

import { login } from './utils';

interface CrudPayload {
  code: number;
  message: string;
  data: unknown;
}

/** 停用岗位仍被绑定的详情样本：id 刻意不与登录账号相同，保证走「管理员编辑他人」分支 */
const DETAIL_WITH_DISABLED_POST: CrudPayload = {
  code: 200,
  message: 'ok',
  data: {
    id: '999999001',
    userName: 'e2e_post_probe',
    realName: '岗位冒烟用户',
    nickName: 'e2e',
    phone: '13000000000',
    email: 'e2e@example.com',
    state: 1,
    deptId: null,
    roleList: [],
    deptList: [],
    // 该岗位不在 postSelect 结果里（已停用），只能靠详情回填兜住
    postList: [{ id: '8880001', postName: '已停用岗位' }],
  },
};

/** 下拉只含启用中的岗位，用于验证「下拉 ∪ 回填」并集与多选可选性 */
const ENABLED_POST_OPTIONS: CrudPayload = {
  code: 200,
  message: 'ok',
  data: [
    { id: '8880002', postCode: 'arch', postName: '架构师' },
    { id: '8880003', postCode: 'dev', postName: '开发工程师' },
  ],
};

/** 后端失败也是 HTTP 200 + code≠200，所以 403 降级必须按 body.code 伪造 */
async function mockPostSelect(page: Page, payload: CrudPayload): Promise<void> {
  await page.route('**/sys/post/postSelect**', (route: Route) => route.fulfill({ json: payload }));
}

/**
 * 岗位多选控件本体。
 *
 * 定位口径 = tdesign-vue-next 按 `<t-form-item name="postList">` 生成的 `t-form-item__postList`
 * 类名（实测 DOM：`<div class="t-form__item t-form-item__postList">`）。三个坑都实测踩过：
 * - `getByPlaceholder('请选择岗位')`：岗位是 tag-input，有已选值时 inner input 的 placeholder
 *   被清空成 `""`，而本冒烟的详情恒带一个回填岗位 ⇒ placeholder 缺席是正常表现，拿它当断言
 *   会把「功能正常」误判成「控件没渲染」。
 * - `.t-form-item`：本仓安装的 tdesign-vue-next 没这个类名（是 `t-form__item`），整条定位会静默
 *   落到 0 个元素上，报出来像「控件不存在」。
 * - 点 inner input 打不开面板：它是 `t-input--soft-hidden` + readonly 的标签输入面，不可见。
 *   可见、可点的是外层 `.t-select-input`。
 */
function postControlItem(page: Page): Locator {
  return page.locator('.t-form-item__postList');
}

function postControl(page: Page): Locator {
  return postControlItem(page).locator('.t-select-input');
}

/** 已选岗位渲染成的标签：回填项有没有进选择结果，看这里 */
function postTag(page: Page, text: string): Locator {
  return postControlItem(page).locator('.t-tag', { hasText: text }).first();
}

/** 打开首行的编辑弹窗：详情走 mock，保证「回填项不在下拉里」这一形态在任意数据集上都成立 */
async function openEditDialog(page: import('@playwright/test').Page): Promise<void> {
  await page.route('**/sys/user/detail/**', (route: Route) => route.fulfill({ json: DETAIL_WITH_DISABLED_POST }));
  await page.goto('/system/user');
  await expect(page.getByRole('table').first()).toBeVisible();
  // 限定在表格内：整页还有其它「编辑」文本，全局 getByText 会挑到点不动的那个
  await page.getByRole('table').first().getByText('编辑', { exact: true }).first().click();
  await expect(postControl(page)).toBeVisible();
  // 详情的 postList 已回填进选择结果：这是 R-J 并集与「等值重提不丢绑定」的前提
  await expect(postTag(page, '已停用岗位')).toBeVisible();
}

/** t-button 会在两个中文字之间插入空格（可访问名是「保 存」），按 \\s* 匹配才不依赖渲染细节 */
function dialogButton(page: Page, text: string): Locator {
  return page.getByRole('button', { name: new RegExp(`^${text.split('').join('\\s*')}$`) });
}

test.describe('用户岗位绑定冒烟', () => {
  test('编辑弹窗的岗位多选可见、可选，且回填的停用岗位留在选项里', async ({ page }) => {
    const updateRequests: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/sys/user/update')) updateRequests.push(request.url());
    });
    await login(page);
    await mockPostSelect(page, ENABLED_POST_OPTIONS);
    await openEditDialog(page);

    const postSelect = postControl(page);
    // 可编辑看 .t-input 上有没有禁用类：tag-input 的 inner input 恒带 readonly（它只是标签输入面），
    // 拿 toBeEnabled 判会读到一个恒真的「可编辑」，等于没断言
    await expect(postSelect).toBeVisible();
    await expect(postControlItem(page).locator('.t-input').first()).not.toHaveClass(/t-is-disabled/);
    await postSelect.click();

    // R-J：选项 = 下拉结果 ∪ 详情回填项。停用岗位不在 postSelect 里也必须出现在面板中，
    // 否则保存时提交集合少了它，后端按整组替换会静默解绑。
    const architectOption = page.locator('.t-select-option', { hasText: '架构师' }).first();
    const disabledOption = page.locator('.t-select-option', { hasText: '已停用岗位' }).first();
    await expect(architectOption).toBeVisible();
    await expect(disabledOption).toBeVisible();

    await architectOption.click();
    await expect(architectOption).toHaveClass(/t-is-selected/);
    // 回填项仍是已选状态（等值重提不丢绑定）
    await expect(disabledOption).toHaveClass(/t-is-selected/);

    // 只验交互，不落库
    await dialogButton(page, '取消').click();
    // 「取消」必须真的不发更新请求：否则这条冒烟只证明了面板能开能勾，
    // 用户点取消后绑定已被整组替换也照样全绿。
    // （负向对照已实测：同一监听器下改点「保存」会记录到 1 次 /sys/user/update。）
    await expect(postControl(page)).toBeHidden();
    await page.waitForTimeout(500);
    expect(updateRequests, `点「取消」不得发出 /sys/user/update，实际发出 ${updateRequests.length} 次`).toHaveLength(0);
  });

  test('岗位下拉 403 时不得提交空数组清空既有绑定', async ({ page }) => {
    await login(page);
    await mockPostSelect(page, { code: 403, message: '无权限', data: null });
    await openEditDialog(page);

    const submitted: Array<Record<string, unknown>> = [];
    // 拦截更新请求：断言提交体，同时绝不把冒烟数据写进真实库
    await page.route('**/sys/user/update**', (route: Route) => {
      submitted.push(JSON.parse(route.request().postData() || '{}') as Record<string, unknown>);
      return route.fulfill({ json: { code: 200, message: 'ok', data: null } });
    });

    await dialogButton(page, '保存').click();
    await expect.poll(() => submitted.length, { timeout: 15000 }).toBe(1);

    const postList = submitted[0].postList as Array<{ id: string }> | undefined;
    // 拿不到下拉 ⇒ 回填项是唯一来源：键存在且含原绑定，绝不是 []
    expect(postList, '403 降级后仍必须把既有绑定等值提交').toBeDefined();
    expect(postList?.map((item) => item.id)).toContain('8880001');
  });

  test('自助编辑（管理员改自己）：岗位控件只读，且提交体不含 postList 键', async ({ page }) => {
    await login(page);
    await page.goto('/system/user');
    await expect(page.getByRole('table').first()).toBeVisible();
    // 当前登录账号所在行（userName 与登录名同源），走的是 isSelfEdit 分支
    const selfRow = page.getByRole('table').first().locator('tr', { hasText: 'admin' }).first();
    await selfRow.getByText('编辑', { exact: true }).first().click();
    await expect(postControl(page)).toBeVisible();

    // 只读：自助编辑不得允许改岗位（canEditPosts = !isSelfEdit）
    await expect(postControlItem(page).locator('.t-input').first()).toHaveClass(/t-is-disabled/);

    const submitted: Array<Record<string, unknown>> = [];
    const responses: number[] = [];
    await page.route('**/sys/user/update**', async (route: Route) => {
      submitted.push(JSON.parse(route.request().postData() || '{}') as Record<string, unknown>);
      // 真实打到后端：这条冒烟要证明「键缺席 ⇒ 既有绑定不被触碰」，不能靠拦截假成功
      const response = await route.fetch();
      const body = (await response.json()) as { code?: number };
      responses.push(body.code ?? -1);
      return route.fulfill({ response });
    });

    await dialogButton(page, '保存').click();
    await expect.poll(() => submitted.length, { timeout: 15000 }).toBe(1);
    // 必须是**成功**的更新：否则「绑定没被清掉」只是请求被拒的假证据
    await expect.poll(() => responses[0], { timeout: 15000 }).toBe(200);
    // 键必须缺席（不是 null、不是 []）：后端据此不触碰 sys_user_post
    expect(submitted[0], '自助编辑不得提交 postList 键').not.toHaveProperty('postList');
  });
});
