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

import type { TabValue } from 'tdesign-vue-next';
import type { Component, DefineComponent, FunctionalComponent } from 'vue';
import type { LocationQueryRaw, RouteMeta, RouteRecordName } from 'vue-router';

import type { LocalizedTitle } from '@/locales';

export interface MenuRoute {
  // 说明：TDesign menuitem 实际支持 string，但其类型声明有误，暂用 any 规避打包错误（待组件类型修复）
  path: any;
  /** 多语言标题对象，如 { zh_CN: '仪表盘', en_US: 'Dashboard' } */
  title?: LocalizedTitle;
  name?: string;
  icon?: string | Component | FunctionalComponent | DefineComponent;
  redirect?: string;
  children: MenuRoute[];
  meta: RouteMeta;
}

export type ModeType = 'dark' | 'light';

export interface UserInfo {
  name: string;
  roles: string[];
  /** 后端会话用户 id（自助编辑判定用；后端可能下发 number，老会话可能缺失） */
  id?: number | string;
  /**
   * 后端会话用户角色列表（/sys/getUserInfo 已返回）。
   * 允许 null：JSON 显式 null 时按「未提供」处理，不得抛错。
   */
  roleList?: Array<{ id?: number | string; roleKey?: string }> | null;
  /** 由 roleList 派生；仅 store 写入，页面只读 */
  isSuperAdmin?: boolean;
  /** 后端用户对象常用字段（登录/个人中心回填）；展示名取 realName > nickName > userName > name */
  userName?: string;
  realName?: string;
  nickName?: string;
  avatar?: string;
}

export interface NotificationItem {
  /** 通知 ID（标记已读时使用） */
  id: number | string;
  title: string;
  content: string;
  /** 通知类型：system / biz / flow，用于消息聚合分组 */
  type: string;
  /** 通知类型展示名 */
  typeLabel: string;
  /** true 表示未读 */
  status: boolean;
  collected?: boolean;
  date: string;
  /** 通知级别 info/warning/error */
  quality: string;
  sender?: string;
}

export interface TRouterInfo {
  path: string;
  query?: LocationQueryRaw;
  routeIdx?: number;
  /** 多语言标题对象，如 { zh_CN: '仪表盘', en_US: 'Dashboard' } */
  title?: LocalizedTitle;
  name?: RouteRecordName;
  isAlive?: boolean;
  isHome?: boolean;
  meta?: any;
}

export interface TTabRouterType {
  isRefreshing: boolean;
  tabRouterList: Array<TRouterInfo>;
}

export interface TTabRemoveOptions {
  value: TabValue;
  index: number;
  e: MouseEvent;
}
