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

import { beforeEach, describe, expect, it, vi } from 'vitest';

const userState = vi.hoisted(() => ({
  roles: [] as string[],
}));

vi.mock('@/store', () => ({
  useUserStore: () => ({ userInfo: { roles: userState.roles } }),
}));

import permissionDirective, { hasPermission, hasRole } from './permission';

describe('hasPermission', () => {
  beforeEach(() => {
    localStorage.clear();
    userState.roles = [];
  });

  // fail-closed（2026-10-14）：空/错字 perm 与「故意开放」不可区分，一律按无权限处理
  it('empty permission returns false', () => {
    expect(hasPermission(undefined)).toBe(false);
    expect(hasPermission('')).toBe(false);
    expect(hasPermission(null)).toBe(false);
  });

  it('super_admin bypasses permission list', () => {
    userState.roles = ['super_admin'];
    expect(hasPermission('system:user:delete')).toBe(true);
  });

  it('matches exact permission from localStorage', () => {
    localStorage.setItem('user_permissions', JSON.stringify(['demo:list', 'demo:add']));
    expect(hasPermission('demo:add')).toBe(true);
    expect(hasPermission('demo:delete')).toBe(false);
  });

  it('array permission uses some()', () => {
    localStorage.setItem('user_permissions', JSON.stringify(['a', 'b']));
    expect(hasPermission(['b', 'z'])).toBe(true);
    expect(hasPermission(['x', 'y'])).toBe(false);
  });

  it('empty permissions non-super returns false', () => {
    expect(hasPermission('any')).toBe(false);
  });

  it('corrupted JSON falls back to empty list', () => {
    localStorage.setItem('user_permissions', '{bad');
    expect(hasPermission('any')).toBe(false);
  });
});

// 指令层（v-permission）的 fail-closed。2026-10-16 之前 applyPermission 里是
// `if (!value) return`，权限标识拼错 / PERMS 没导入（value 为 undefined）时按钮**永久可见**，
// 而函数层 hasPermission 早已是 fail-closed —— 两处口径打架。这组用例专门钉住这个分支，
// 防止它再次悄悄退回「空值放行」。
describe('v-permission 指令（applyPermission）', () => {
  beforeEach(() => {
    localStorage.clear();
    userState.roles = [];
  });

  const mount = () => {
    const parent = document.createElement('div');
    const el = document.createElement('button');
    parent.appendChild(el);
    document.body.appendChild(parent);
    return { parent, el };
  };

  it('value 为空 / undefined / null 时移除元素（fail-closed）', () => {
    for (const value of [undefined, '', null]) {
      const { parent, el } = mount();
      permissionDirective.mounted(el, { value });
      expect(parent.contains(el)).toBe(false);
    }
  });

  it('有权限时保留元素', () => {
    localStorage.setItem('user_permissions', JSON.stringify(['demo:add']));
    const { parent, el } = mount();
    permissionDirective.mounted(el, { value: 'demo:add' });
    expect(parent.contains(el)).toBe(true);
  });

  it('无权限时移除元素', () => {
    localStorage.setItem('user_permissions', JSON.stringify(['demo:add']));
    const { parent, el } = mount();
    permissionDirective.mounted(el, { value: 'demo:delete' });
    expect(parent.contains(el)).toBe(false);
  });

  it('updated 钩子会复核：权限被收回后移除已挂载元素', () => {
    localStorage.setItem('user_permissions', JSON.stringify(['demo:add']));
    const { parent, el } = mount();
    permissionDirective.mounted(el, { value: 'demo:add' });
    expect(parent.contains(el)).toBe(true);

    localStorage.setItem('user_permissions', JSON.stringify([]));
    permissionDirective.updated(el, { value: 'demo:add' });
    expect(parent.contains(el)).toBe(false);
  });
});

describe('hasRole', () => {
  beforeEach(() => {
    userState.roles = [];
  });

  it('matches single role', () => {
    userState.roles = ['admin'];
    expect(hasRole('admin')).toBe(true);
    expect(hasRole('ops')).toBe(false);
  });

  it('array role uses some()', () => {
    userState.roles = ['viewer'];
    expect(hasRole(['admin', 'viewer'])).toBe(true);
    expect(hasRole(['admin', 'ops'])).toBe(false);
  });
});
