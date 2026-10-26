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

import { ROLE_SUPER_ADMIN } from '@/constants';
import { useUserStore } from '@/store';

const getPermissions = () => {
  try {
    const stored = localStorage.getItem('user_permissions');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // ignore
  }
  return [];
};

export function hasPermission(permission) {
  // fail-closed：空/错字 perm 与「故意开放」不可区分，一律按无权限处理
  if (!permission) return false;

  const userStore = useUserStore();
  const roles = userStore?.userInfo?.roles || [];
  if (roles.includes(ROLE_SUPER_ADMIN)) return true;

  const permissions = getPermissions();
  if (!permissions || permissions.length === 0) return false;

  if (Array.isArray(permission)) {
    return permission.some((p) => permissions.includes(p));
  }
  return permissions.includes(permission);
}

export function hasRole(role) {
  const userStore = useUserStore();
  const roles = userStore?.userInfo?.roles || [];
  if (Array.isArray(role)) {
    return role.some((r) => roles.includes(r));
  }
  return roles.includes(role);
}

function applyPermission(el, value) {
  // fail-closed：与 hasPermission 同口径。权限标识为空 / 拼错 / 常量没导入（value 为
  // undefined）时一律按「无权限」移除元素 —— 原先这里 `if (!value) return` 直接放行，
  // 于是写错权限标识的按钮反而永久可见，等于把 fail-closed 又开了个口子。
  if (!value || !hasPermission(value)) {
    el.parentNode?.removeChild(el);
  }
}

export default {
  mounted(el, binding) {
    applyPermission(el, binding.value);
  },
  // 权限是异步拉取后写入 localStorage 的：已挂载元素在重渲染时必须复核，
  // 否则拿着过期缓存放行的按钮在权限被收回后永久可见
  updated(el, binding) {
    applyPermission(el, binding.value);
  },
};
