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

import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';

import { useUserStore } from '@/store/modules/user';

/**
 * A-42：`isSuperAdmin` 派生（7 组 / 8 个断言）。
 */
describe('a-42 user store isSuperAdmin', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
  });

  it('① 新 store 默认为 false', () => {
    expect(useUserStore().isSuperAdmin).toBe(false);
  });

  it('②a roleKey = super_admin 时派生为 true', () => {
    const store = useUserStore();
    store.setUserInfo({ roleList: [{ roleKey: 'super_admin' }] });
    expect(store.isSuperAdmin).toBe(true);
  });

  it('②b 角色 id = 1 时派生为 true（独立 store）', () => {
    setActivePinia(createPinia());
    const store = useUserStore();
    store.setUserInfo({ roleList: [{ id: 1 }] });
    expect(store.isSuperAdmin).toBe(true);
  });

  it('③ 换成普通角色后陈旧超管位被覆盖为 false', () => {
    const store = useUserStore();
    store.setUserInfo({ roleList: [{ roleKey: 'super_admin' }] });
    store.setUserInfo({ roleList: [{ id: 2, roleKey: 'ops' }] });
    expect(store.isSuperAdmin).toBe(false);
  });

  it('④ 未传 roleList 的局部更新保留派生值', () => {
    const store = useUserStore();
    store.setUserInfo({ roleList: [{ id: 2, roleKey: 'ops' }] });
    store.setUserInfo({ realName: 'x' });
    expect(store.isSuperAdmin).toBe(false);
  });

  it('⑤ roleList 显式 null 不抛错且保留旧派生值', () => {
    const store = useUserStore();
    store.setUserInfo({ roleList: [{ roleKey: 'super_admin' }] });
    expect(() => store.setUserInfo({ roleList: null })).not.toThrow();
    expect(store.isSuperAdmin).toBe(true);
  });

  it('⑥ getUserInfo 不覆盖派生位', async () => {
    const store = useUserStore();
    store.setUserInfo({ roleList: [{ roleKey: 'super_admin' }] });
    store.setToken('t');
    await store.getUserInfo();
    expect(store.isSuperAdmin).toBe(true);
  });

  it('⑥b getUserInfo 用通配权限兜底补出超管位（后端 user 不带 roleList 时）', async () => {
    const store = useUserStore();
    // 后端返回的 user 没有 roleList ⇒ setUserInfo 无法派生超管位
    store.setUserInfo({ userName: 'admin' });
    expect(store.isSuperAdmin).toBe(false);
    // 但 localStorage 里有通配权限
    localStorage.setItem('user_permissions', JSON.stringify(['system:*:*', 'other:list']));
    store.setToken('t');
    await store.getUserInfo();
    // 修复前：这里仍是 false（算出来的 isSuperAdmin 没写回），超管身份静默丢失
    expect(store.isSuperAdmin).toBe(true);
    expect(store.userInfo.roles).toContain('super_admin');
  });

  it('⑦ logout 用 InitUserInfo 重置为 false', async () => {
    const store = useUserStore();
    store.setUserInfo({ roleList: [{ roleKey: 'super_admin' }] });
    await store.logout();
    expect(store.isSuperAdmin).toBe(false);
  });
});
