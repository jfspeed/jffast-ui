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

import { defineStore } from 'pinia';

import { PERM_WILDCARD, ROLE_ID_SUPER_ADMIN, ROLE_SUPER_ADMIN } from '@/constants';
import type { UserInfo } from '@/types/interface';

const InitUserInfo: UserInfo = {
  name: '',
  roles: [],
  isSuperAdmin: false,
};

export const useUserStore = defineStore('user', {
  state: () => ({
    token: localStorage.getItem('token') || '',
    userInfo: { ...InitUserInfo } as UserInfo,
  }),
  getters: {
    roles: (state): string[] => {
      return state.userInfo?.roles || [];
    },
    isLoggedIn: (state): boolean => {
      return !!state.token;
    },
    /** 唯一读取路径：页面一律用 `useUserStore().isSuperAdmin` */
    isSuperAdmin: (state): boolean => state.userInfo?.isSuperAdmin === true,
  },
  actions: {
    setToken(val: string) {
      this.token = val;
      localStorage.setItem('token', val);
    },
    setUserInfo(val: Partial<UserInfo>) {
      const roleList = val.roleList;
      // Array.isArray 同时收口 undefined 与 null；null 按「未提供」处理，保留旧派生值
      const isSuperAdmin = Array.isArray(roleList)
        ? roleList.some((r) => r?.roleKey === ROLE_SUPER_ADMIN || Number(r?.id) === ROLE_ID_SUPER_ADMIN)
        : this.userInfo?.isSuperAdmin === true;
      // 扁平化回填：兼容直接传后端用户对象的调用方，展示名取 realName > nickName > userName > name
      this.userInfo = {
        ...val,
        name: val.realName || val.nickName || val.userName || val.name || '',
        roles: val.roles || this.userInfo?.roles || [],
        isSuperAdmin,
      };
    },
    async getUserInfo() {
      if (!this.token) return;
      try {
        const permStr = localStorage.getItem('user_permissions');
        const permissions: string[] = permStr ? JSON.parse(permStr) : [];
        const hasWildcard = permissions.some((p) => p === ROLE_SUPER_ADMIN || p.includes(PERM_WILDCARD));
        // 兜底：后端返回的 user 若不带 roleList，isSuperAdmin 会保持旧值。
        // 这里用 localStorage 里的通配权限补上，避免超管身份在刷新后静默丢失
        // （页面据此决定「可编辑超管专属字段」，丢了就变成只读）。
        const isSuperAdmin = hasWildcard || this.userInfo?.isSuperAdmin === true;
        this.userInfo = {
          ...this.userInfo,
          name: this.userInfo?.name || '',
          roles: hasWildcard ? [ROLE_SUPER_ADMIN] : this.userInfo?.roles || [],
          isSuperAdmin,
        };
      } catch {
        // 权限解析失败不影响已回填的用户信息
      }
    },
    async logout() {
      this.token = '';
      this.userInfo = { ...InitUserInfo };
      localStorage.removeItem('token');
      localStorage.removeItem('tenantId');
      localStorage.removeItem('user_menu');
      localStorage.removeItem('user_permissions');
      // 登录时 Sa-Token 会下发同名 token cookie（cookie 不区分端口）。
      // 只清 localStorage 的话，其它标签页仍会被 cookie 认成已登录，必须一并清掉。
      document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      // 顺带断开站内通知的 WebSocket：它按 token 鉴权，登出后留着连接既无意义、也会按旧 token 持续重连。
      // 用动态 import 避免 store ←→ utils 之间的循环初始化。
      void import('@/utils/websocket')
        .then(({ closeNotificationSocket }) => closeNotificationSocket())
        .catch(() => undefined);
    },
  },
  // token 单源：localStorage['token']（request/websocket 只读它）；pinia 内存态由 state 初始化 hydrate，不再双写。
  persist: false,
});
