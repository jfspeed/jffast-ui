<!--
Copyright 2024-2026 jffast

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
-->

<template>
  <t-popup
    v-if="store.enabled"
    v-model:visible="popupVisible"
    expand-animation
    placement="bottom-right"
    trigger="click"
  >
    <template #content>
      <div class="header-msg">
        <div class="header-msg-top">
          <span class="header-msg-title">
            {{ t('layout.notice.title') }}
            <span
              class="conn-dot"
              :class="[{ online: store.connected }]"
              :title="store.connected ? t('layout.notice.connected') : t('layout.notice.disconnected')"
            />
          </span>
          <div class="header-msg-actions">
            <t-button
              v-if="store.unreadCount > 0"
              size="small"
              variant="text"
              theme="primary"
              @click="setRead('all')"
              >{{ t('layout.notice.clear') }}</t-button
            >
            <t-button size="small" variant="text" theme="default" @click="goDetail">
              {{ t('layout.notice.viewAll') }}
            </t-button>
          </div>
        </div>
        <!-- 消息聚合：全部 / 未读 / 按通知类型 -->
        <div class="header-msg-tabs narrow-scrollbar">
          <span
            v-for="tab in store.typeTabs"
            :key="tab.key"
            class="tab-item"
            :class="[{ active: activeTab === tab.key }]"
            @click="activeTab = tab.key"
          >
            {{ tab.label }}
            <em v-if="tab.count > 0" class="tab-count">{{ tab.count > 99 ? '99+' : tab.count }}</em>
          </span>
        </div>
        <div v-if="displayList.length > 0" class="msg-list narrow-scrollbar">
          <div
            v-for="item in displayList"
            :key="item.id"
            class="msg-item"
            :class="[{ unread: item.status }]"
            @click="handleItemClick(item)"
          >
            <div class="msg-item-icon">
              <t-icon :name="getIcon(item)" size="20px" />
            </div>
            <div class="msg-item-body">
              <div class="msg-item-header">
                <span class="msg-item-title">{{ item.title }}</span>
                <span class="msg-item-time">{{ formatTime(item.date) }}</span>
              </div>
              <p class="msg-item-content">{{ item.content }}</p>
              <div class="msg-item-meta">
                <span class="msg-item-type">{{ item.typeLabel }}</span>
                <span v-if="item.sender" class="msg-item-sender">
                  {{ t('layout.notice.from', { sender: item.sender }) }}
                </span>
              </div>
            </div>
            <span v-if="item.status" class="msg-item-dot"></span>
          </div>
        </div>
        <div v-else class="empty-list">
          <img
            src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='41' viewBox='0 0 64 41'%3E%3Crect x='6' y='6' width='52' height='29' rx='4' fill='none' stroke='%23dcdcdc' stroke-width='2'/%3E%3Cpath d='M6 14h52' stroke='%23dcdcdc' stroke-width='2'/%3E%3Ccircle cx='32' cy='27' r='5' fill='none' stroke='%23dcdcdc' stroke-width='2'/%3E%3C/svg%3E"
            :alt="t('layout.notice.empty')"
          />
          <p>{{ emptyText }}</p>
        </div>
      </div>
    </template>
    <t-badge :count="store.unreadCount" :offset="[4, 4]">
      <t-button theme="default" shape="square" variant="text">
        <t-icon name="mail" />
      </t-button>
    </t-badge>
  </t-popup>
</template>
<script setup lang="ts">
import { NotifyPlugin } from 'tdesign-vue-next';
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { t } from '@/locales';
import { useNotificationStore } from '@/store';
import type { NotificationItem } from '@/types/interface';
import { connectNotificationSocket, onNotificationMessage, onNotificationStateChange } from '@/utils/websocket';

const router = useRouter();
const store = useNotificationStore();

const popupVisible = ref(false);
const activeTab = ref('all');

/** 当前 Tab 的列表（消息聚合后的取数） */
const displayList = computed<NotificationItem[]>(() => store.listByTab(activeTab.value));

const emptyText = computed(() => {
  if (activeTab.value === 'unread') return t('layout.notice.emptyUnread');
  if (activeTab.value === 'all') return t('layout.notice.emptyNotice');
  const label = store.typeTabs.find((tab) => tab.key === activeTab.value)?.label || '';
  return t('layout.notice.emptyByType', { type: label });
});

watch(popupVisible, (visible) => {
  if (visible) {
    store.fetchNotifications();
    store.fetchUnreadCount();
  }
});

/** 站内弹窗：实时通知到达时提醒，点击可直达通知中心 */
const showInAppPopup = (item: NotificationItem) => {
  if (!store.popupEnabled) return;
  NotifyPlugin.info({
    title: item.title,
    content: item.content,
    duration: 5000,
    onClick: () => {
      store.markAsRead(item.id);
      // 按路由名跳：本项目静态路由与菜单驱动路由是两套 URL，写死 path 在菜单调整后会静默失效
      router.push({ name: 'MyNotification' });
    },
  } as Parameters<typeof NotifyPlugin.info>[0]);
};

let disposeMessage: (() => void) | null = null;
let disposeState: (() => void) | null = null;

onMounted(async () => {
  disposeMessage = onNotificationMessage((message) => {
    if (message.type !== 'notification' || !message.data) return;
    const isNew = store.addNotification(message.data as Parameters<typeof store.addNotification>[0]);
    if (isNew) {
      showInAppPopup(store.latestMessage as NotificationItem);
    }
  });
  disposeState = onNotificationStateChange((connected) => {
    store.setConnected(connected);
  });

  await store.fetchUnreadCount();
  if (store.enabled) {
    connectNotificationSocket();
  }
});

onUnmounted(() => {
  // ⚠️ 只取消自己的订阅，**不要**关连接：WS 是全应用单例，
  //    布局切换 / 组件重建 / HMR 都会触发 onUnmounted，关掉会让整站推送静默断开（2026-09-24 评审发现）。
  //    连接由 token 变化（登出断开、换账号重连）与显式登出流程管理。
  disposeMessage?.();
  disposeState?.();
});

const setRead = (type: string, item?: NotificationItem) => {
  if (type === 'all') {
    store.markAllAsRead();
  } else if (item) {
    store.markAsRead(item.id);
  }
};

const handleItemClick = (item: NotificationItem) => {
  if (item.status) {
    store.markAsRead(item.id);
  }
};

const getIcon = (item: NotificationItem) => {
  if (item.quality === 'error') return 'error-circle';
  if (item.quality === 'warning') return 'info-circle';
  if (item.type === 'flow') return 'check-circle';
  if (item.type === 'biz') return 'task';
  return 'notification';
};

const formatTime = (dateStr: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return t('layout.notice.justNow');
  if (minutes < 60) return t('layout.notice.minutesAgo', { n: minutes });
  if (hours < 24) return t('layout.notice.hoursAgo', { n: hours });
  if (days < 7) return t('layout.notice.daysAgo', { n: days });
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}-${day}`;
};

const goDetail = () => {
  popupVisible.value = false;
  nextTick(() => {
    router.push({ name: 'MyNotification' });
  });
};
</script>
<style lang="less" scoped>
.header-msg {
  width: 420px;
  margin: calc(0px - var(--td-comp-paddingTB-xs)) calc(0px - var(--td-comp-paddingLR-s));

  &-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--td-comp-paddingTB-l) var(--td-comp-paddingLR-l) 0;

    &-title {
      display: flex;
      align-items: center;
      gap: var(--td-comp-margin-xs);
      font: var(--td-font-title-medium);
      color: var(--td-text-color-primary);

      .conn-dot {
        width: 8px;
        height: 8px;
        border-radius: var(--td-radius-circle);
        background-color: var(--td-text-color-disabled);

        &.online {
          background-color: var(--td-success-color);
        }
      }
    }

    &-actions {
      display: flex;
      gap: var(--td-comp-margin-xs);
    }
  }

  &-tabs {
    display: flex;
    gap: var(--td-comp-margin-l);
    padding: var(--td-comp-paddingTB-m) var(--td-comp-paddingLR-l);
    border-bottom: 1px solid var(--td-component-stroke);
    overflow-x: auto;
    white-space: nowrap;

    .tab-item {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      font: var(--td-font-body-medium);
      color: var(--td-text-color-secondary);
      cursor: pointer;
      padding-bottom: var(--td-comp-paddingTB-s);
      border-bottom: 2px solid transparent;
      transition: all 0.2s;

      .tab-count {
        font-style: normal;
        font-size: 12px;
        color: var(--td-text-color-placeholder);
      }

      &:hover {
        color: var(--td-brand-color);
      }

      &.active {
        color: var(--td-brand-color);
        border-bottom-color: var(--td-brand-color);

        .tab-count {
          color: var(--td-brand-color);
        }
      }
    }
  }

  .msg-list {
    max-height: 360px;
    overflow-y: auto;
    padding: var(--td-comp-paddingTB-s) 0;
  }

  .msg-item {
    display: flex;
    align-items: flex-start;
    padding: var(--td-comp-paddingTB-m) var(--td-comp-paddingLR-l);
    cursor: pointer;
    transition: background-color 0.2s;
    position: relative;

    &:hover {
      background-color: var(--td-bg-color-container-hover);
    }

    &.unread {
      background-color: var(--td-brand-color-light);

      &:hover {
        background-color: var(--td-brand-color-focus);
      }
    }

    &-icon {
      flex-shrink: 0;
      width: 36px;
      height: 36px;
      border-radius: var(--td-radius-circle);
      background-color: var(--td-bg-color-component);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: var(--td-comp-margin-m);
      color: var(--td-brand-color);
    }

    &-body {
      flex: 1;
      min-width: 0;
    }

    &-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: var(--td-comp-margin-xs);
    }

    &-title {
      font: var(--td-font-body-medium);
      color: var(--td-text-color-primary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 220px;
    }

    &-time {
      font: var(--td-font-body-small);
      color: var(--td-text-color-placeholder);
      flex-shrink: 0;
      margin-left: var(--td-comp-margin-s);
    }

    &-content {
      font: var(--td-font-body-small);
      color: var(--td-text-color-secondary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      margin: 0;
    }

    &-meta {
      display: flex;
      align-items: center;
      gap: var(--td-comp-margin-s);
      margin-top: 2px;
      font: var(--td-font-body-small);
      color: var(--td-text-color-placeholder);
    }

    &-type {
      padding: 0 6px;
      border-radius: var(--td-radius-small);
      background-color: var(--td-bg-color-component);
    }

    &-dot {
      position: absolute;
      top: 50%;
      right: var(--td-comp-paddingLR-m);
      transform: translateY(-50%);
      width: 8px;
      height: 8px;
      border-radius: var(--td-radius-circle);
      background-color: var(--td-brand-color);
    }
  }

  .empty-list {
    text-align: center;
    padding: var(--td-comp-paddingTB-xxl) 0;
    font: var(--td-font-body-medium);
    color: var(--td-text-color-secondary);

    img {
      width: var(--td-comp-size-xxxxl);
    }

    p {
      margin-top: var(--td-comp-margin-xs);
    }
  }
}
</style>
