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

import { t } from '@/locales';
import type { NotificationPayload } from '@/runtime';
import { getSystemApi } from '@/runtime';
import type { NotificationItem } from '@/types/interface';

/**
 * 通知类型 → 中文展示名（与后端 NotificationConstant.TYPE_* 对齐）。
 * <p>仅用于不走 i18n 的管理端页面（通知管理列表等）；铃铛等共享组件请用 {@link typeLabelOf}。
 */
export const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  system: '系统通知',
  biz: '业务通知',
  flow: '流程通知',
};

/** 通知类型聚合顺序（消息聚合的 Tab 顺序） */
const TYPE_ORDER = ['system', 'biz', 'flow'];

/**
 * 取通知类型的多语言展示名。
 * <p>vue-i18n 命中不到词条时会原样返回 key，这里据此回退到中文常量，
 * 避免新增通知类型但忘了补词条时界面出现 `layout.notice.type.xxx` 这种噪声。
 */
export function typeLabelOf(type: string): string {
  const key = `layout.notice.type.${type}`;
  const translated = t(key);
  return translated === key ? NOTIFICATION_TYPE_LABELS[type] || type : translated;
}

export const useNotificationStore = defineStore('notification', {
  state: () => ({
    /** 当前用户的通知列表（含已读/未读） */
    msgData: [] as NotificationItem[],
    /** 未读数（后端计数，WebSocket 新消息本地累加） */
    unreadCount: 0,
    loading: false,
    /** 后端是否提供通知能力（404 时关闭，避免持续请求） */
    enabled: true,
    /** WebSocket 是否已连接 */
    connected: false,
    /** 是否开启站内弹窗提醒 */
    popupEnabled: true,
    /** 最近一条通过 WebSocket 实时到达的通知，供弹窗组件消费 */
    latestMessage: null as NotificationItem | null,
    /** 最近一条消息的自增序号，避免同一条消息重复触发弹窗 */
    latestSeq: 0,
  }),
  getters: {
    unreadMsg: (state) => state.msgData.filter((item) => item.status),
    readMsg: (state) => state.msgData.filter((item) => !item.status),
    /**
     * 消息聚合 Tab：全部 / 未读 / 按通知类型分组（只显示有数据的类型）。
     */
    typeTabs(state): Array<{ key: string; label: string; count: number }> {
      const tabs = [
        { key: 'all', label: t('layout.notice.tabAll'), count: state.msgData.length },
        { key: 'unread', label: t('layout.notice.tabUnread'), count: state.unreadCount },
      ];
      TYPE_ORDER.forEach((type) => {
        const list = state.msgData.filter((item) => item.type === type);
        if (list.length > 0) {
          tabs.push({ key: type, label: typeLabelOf(type), count: list.length });
        }
      });
      return tabs;
    },
  },
  actions: {
    /** 按 Tab 过滤列表（消息聚合的取数入口） */
    listByTab(tab: string): NotificationItem[] {
      if (tab === 'unread') return this.unreadMsg;
      if (tab === 'all') return this.msgData;
      return this.msgData.filter((item) => item.type === tab);
    },

    async fetchNotifications() {
      if (!this.enabled) return;
      this.loading = true;
      try {
        const res = await getSystemApi().notification.userNotifications();
        const list = res?.data || [];
        this.msgData = list.map((item) => normalizeNotification(item));
      } catch {
        this.msgData = [];
      } finally {
        this.loading = false;
      }
    },

    async fetchUnreadCount() {
      if (!this.enabled) return;
      try {
        const res = await getSystemApi().notification.unreadCount();
        this.unreadCount = res?.data || 0;
      } catch (e) {
        const err = e as { response?: { status?: number }; code?: number };
        if (err?.response?.status === 404 || err?.code === 404) {
          this.enabled = false;
        }
        this.unreadCount = 0;
      }
    },

    /**
     * 切换语言后重新拉取通知列表与未读角标，让已入库的通知文案按新语言重新渲染。
     * 2026-09-28 由 typecheck 发现：`useLocale.changeLocale` 一直在调它，但该动作从未存在
     * ⇒ 每次切换语言都会抛 `refreshMsgData is not a function`。
     */
    async refreshMsgData() {
      await this.fetchNotifications();
      await this.fetchUnreadCount();
    },

    async markAsRead(notificationId: number | string) {
      try {
        await getSystemApi().notification.markAsRead(notificationId);
        const item = this.msgData.find((m) => m.id === notificationId);
        if (item && item.status) {
          item.status = false;
          this.unreadCount = Math.max(0, this.unreadCount - 1);
        }
      } catch {
        // ignore
      }
    },

    async markAllAsRead() {
      try {
        await getSystemApi().notification.markAllAsRead();
        this.msgData.forEach((item) => {
          item.status = false;
        });
        this.unreadCount = 0;
      } catch {
        // ignore
      }
    },

    /**
     * 登出 / 会话清理：清空通知列表与角标。
     *
     * <p>本 store 不进 localStorage（persist: false），只在 App 生命周期内存活；但登出时不重置的话，
     * 「退出 A 账号 → 同一个标签页登录 B 账号」会继续显示 A 的通知标题、正文与未读角标，
     * 直到用户手动触发一次重新拉取。
     */
    resetState() {
      this.msgData = [];
      this.unreadCount = 0;
      this.latestMessage = null;
      this.latestSeq = 0;
    },

    setConnected(connected: boolean) {
      this.connected = connected;
    },

    /**
     * 收到 WebSocket 实时通知：去重后置顶，并记录 latestMessage 供站内弹窗消费。
     *
     * @returns 是否为新消息（重复推送返回 false）
     */
    addNotification(notification: NotificationPayload): boolean {
      if (!notification) return false;
      const item = normalizeNotification(notification);
      const existIndex = this.msgData.findIndex((m) => m.id === item.id);
      if (existIndex >= 0) {
        // 同一条通知重复推送：仅刷新内容，不重复计数
        this.msgData.splice(existIndex, 1, { ...this.msgData[existIndex], ...item });
        return false;
      }
      item.status = true;
      this.msgData.unshift(item);
      this.unreadCount += 1;
      this.latestMessage = item;
      this.latestSeq += 1;
      return true;
    },
  },
  persist: false,
});

/** 把后端通知对象（UserNotificationVO / SysNotification / WS payload）统一成列表项 */
function normalizeNotification(item: NotificationPayload): NotificationItem {
  const type = item.type || 'system';
  return {
    id: item.id ?? '',
    title: item.title ?? '',
    content: item.content || item.title || '',
    type,
    typeLabel: typeLabelOf(type),
    quality: item.level || 'info',
    // isRead === 0 表示未读；WebSocket 直推的通知不带 isRead，视为未读
    status: item.isRead === undefined ? true : item.isRead === 0,
    date: item.sendTime || item.createTime || new Date().toISOString(),
    sender: item.sender,
  };
}
