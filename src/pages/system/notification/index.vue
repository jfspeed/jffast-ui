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
  <div class="notification-page">
    <t-tabs v-model="activeTab" class="notification-tabs">
      <t-tab-panel value="list" :label="t('pages.system.notification.listTab')">
        <t-card class="search-card">
          <t-form :data="searchForm" layout="inline" @submit="handleSearch" @reset="resetSearch">
            <t-form-item :label="t('pages.system.notification.title')" name="title">
              <t-input
                v-model="searchForm.title"
                :placeholder="t('pages.system.notification.placeholder.title')"
                clearable
              />
            </t-form-item>
            <t-form-item :label="t('pages.system.notification.type')" name="type">
              <t-select
                v-model="searchForm.type"
                :placeholder="t('pages.system.notification.placeholder.type')"
                clearable
                :options="typeOptions"
              />
            </t-form-item>
            <t-form-item :label="t('pages.system.notification.recipientType')" name="recipientType">
              <t-select
                v-model="searchForm.recipientType"
                :placeholder="t('pages.system.notification.placeholder.recipientType')"
                clearable
                :options="recipientTypeOptions"
              />
            </t-form-item>
            <t-form-item :label="t('common.status')" name="status">
              <t-select
                v-model="searchForm.status"
                :placeholder="t('pages.system.notification.placeholder.status')"
                clearable
              >
                <t-option :value="0" :label="t('pages.system.notification.statusMap.unsent')" />
                <t-option :value="1" :label="t('pages.system.notification.statusMap.sent')" />
              </t-select>
            </t-form-item>
            <t-form-item>
              <t-button theme="default" type="reset">{{ t('common.reset') }}</t-button>
              <t-button theme="primary" type="submit">{{ t('common.query') }}</t-button>
            </t-form-item>
          </t-form>
        </t-card>

        <t-card>
          <template #header>
            <div class="flex-between">
              <div></div>
              <t-button v-permission="'system:notification:add'" theme="primary" @click="add">
                <template #icon><t-icon name="add" /></template>
                {{ t('pages.system.notification.add') }}
              </t-button>
            </div>
          </template>

          <t-table :loading="loading" :data="pageParams.list" :columns="columns" row-key="id" />

          <div class="pagination-container">
            <t-pagination
              :current="pageParams.pageNum"
              :page-size="pageParams.pageSize"
              :total="pageParams.total"
              :page-size-options="[10, 20, 50, 100]"
              show-jumper
              @current-change="handlePageChange"
              @page-size-change="handleSizeChange"
            />
          </div>
        </t-card>
      </t-tab-panel>

      <t-tab-panel value="template" :label="t('pages.system.notification.templateTab')">
        <template-manage v-if="activeTab === 'template'" />
      </t-tab-panel>
    </t-tabs>

    <save-dialog v-if="dialog.save" ref="saveRef" @success="handleSaveSuccess" @closed="dialog.save = false" />

    <send-dialog v-if="sendVisible" :row="sendRow" @success="handleSendSuccess" @closed="sendVisible = false" />

    <t-dialog
      v-model:visible="statsVisible"
      :header="t('pages.system.notification.statsTitle')"
      :width="800"
      :footer="false"
    >
      <t-form :data="statsSearch" layout="inline" @submit="handleStatsSearch" @reset="handleStatsReset">
        <t-form-item :label="t('pages.system.notification.stats.user')" name="userName">
          <t-input
            v-model="statsSearch.userName"
            :placeholder="t('pages.system.notification.stats.userNamePlaceholder')"
            clearable
          />
        </t-form-item>
        <t-form-item :label="t('common.status')" name="isRead">
          <t-select v-model="statsSearch.isRead" :placeholder="t('common.pleaseSelect')" clearable>
            <t-option :value="0" :label="t('pages.system.notification.stats.unread')" />
            <t-option :value="1" :label="t('pages.system.notification.stats.read')" />
          </t-select>
        </t-form-item>
        <t-form-item>
          <t-button theme="default" type="reset">{{ t('common.reset') }}</t-button>
          <t-button theme="primary" type="submit">{{ t('common.query') }}</t-button>
        </t-form-item>
      </t-form>
      <div class="stats-summary">
        <span
          >{{ t('pages.system.notification.stats.readCountLabel') }}<b>{{ statsReadCount }}</b></span
        >
        <span
          >{{ t('pages.system.notification.stats.unreadCountLabel') }}<b>{{ statsUnreadCount }}</b></span
        >
        <span
          >{{ t('pages.system.notification.stats.totalLabel') }}<b>{{ statsSummaryTotal }}</b></span
        >
      </div>
      <t-table :loading="statsLoading" :data="statsData" :columns="statsColumns" row-key="recordId" max-height="350" />
      <div class="pagination-container">
        <t-pagination
          :current="statsPage.pageNo"
          :page-size="statsPage.pageSize"
          :total="statsTotal"
          :page-size-options="[10, 20, 50]"
          show-jumper
          @current-change="handleStatsPageChange"
          @page-size-change="handleStatsSizeChange"
        />
      </div>
    </t-dialog>
  </div>
</template>
<script lang="ts" setup>
import type { PrimaryTableCol } from 'tdesign-vue-next';
import { DialogPlugin, MessagePlugin, Tag } from 'tdesign-vue-next';
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import systemApi from '@/api/system';
import { useTable } from '@/hooks/useTable';
import { typeLabelOf } from '@/store';
import { hasPermission } from '@/utils/permission';

import saveDialog from './save.vue';
import sendDialog from './send.vue';
import templateManage from './template.vue';

defineOptions({
  name: 'SystemNotification',
});

const { t } = useI18n();

const activeTab = ref('list');

// 通知类型标签走 i18n（typeLabelOf 未命中词条时回退中文常量，与铃铛一致）
const typeOptions = computed(() => ['system', 'biz', 'flow'].map((value) => ({ value, label: typeLabelOf(value) })));

const recipientTypeOptions = computed(() => [
  { value: 'all', label: t('pages.system.notification.recipientTypeMap.all') },
  { value: 'role', label: t('pages.system.notification.recipientTypeMap.role') },
  { value: 'dept', label: t('pages.system.notification.recipientTypeMap.dept') },
  { value: 'user', label: t('pages.system.notification.recipientTypeMap.user') },
]);

const recipientTypeMap = computed<Record<string, string>>(() => ({
  all: t('pages.system.notification.recipientTypeMap.all'),
  role: t('pages.system.notification.recipientTypeMap.role'),
  dept: t('pages.system.notification.recipientTypeMap.dept'),
  user: t('pages.system.notification.recipientTypeMap.user'),
}));

const columns = computed<PrimaryTableCol[]>(() => [
  { colKey: 'title', title: t('pages.system.notification.title'), ellipsis: true },
  {
    colKey: 'type',
    title: t('pages.system.notification.type'),
    width: 110,
    cell: (h, { row }) => typeLabelOf(row.type) || row.type || '-',
  },
  { colKey: 'level', title: t('pages.system.notification.level'), width: 80 },
  {
    colKey: 'recipientType',
    title: t('pages.system.notification.recipientType'),
    width: 100,
    cell: (h, { row }) =>
      recipientTypeMap.value[row.recipientType] ||
      row.recipientType ||
      t('pages.system.notification.recipientTypeMap.all'),
  },
  {
    colKey: 'status',
    title: t('common.status'),
    width: 80,
    cell: (h, { row }) => {
      return row.status === 1
        ? h(Tag, { theme: 'success', variant: 'light' }, t('pages.system.notification.statusMap.sent'))
        : h(Tag, { theme: 'default', variant: 'light' }, t('pages.system.notification.statusMap.unsent'));
    },
  },
  { colKey: 'sender', title: t('pages.system.notification.sender'), width: 100 },
  { colKey: 'sendTime', title: t('pages.system.notification.sendTime'), width: 180 },
  { colKey: 'createTime', title: t('common.createTime'), width: 180 },
  {
    colKey: 'op',
    title: t('common.operation'),
    width: 320,
    align: 'center',
    fixed: 'right',
    cell: (h, { row }) => {
      const sent = row.status === 1;
      const btns = [];
      // 权限码与后端 @SaCheckPermission 逐条对齐：
      // 修改=system:notification:update / 发送=system:notification:send /
      // 删除=system:notification:delete / 统计=system:notification:view /
      // 复制=system:notification:add
      if (sent) {
        btns.push(h('a', { style: 'color:var(--td-brand-color)', onClick: () => handleView(row) }, t('common.view')));
      } else if (hasPermission('system:notification:update')) {
        btns.push(h('a', { onClick: () => edit(row) }, t('common.edit')));
      }
      if (hasPermission('system:notification:send')) {
        btns.push(
          h(
            'a',
            {
              style: sent ? 'color:var(--td-text-color-disabled);cursor:not-allowed' : 'color:var(--td-success-color)',
              onClick: () => {
                if (!sent) handleSend(row);
              },
            },
            sent ? t('pages.system.notification.statusMap.sent') : t('pages.system.notification.action.send'),
          ),
        );
      }
      if (sent && hasPermission('system:notification:view')) {
        btns.push(
          h(
            'a',
            { style: 'color:var(--td-brand-color)', onClick: () => handleStats(row) },
            t('pages.system.notification.action.stats'),
          ),
        );
      }
      if (hasPermission('system:notification:delete')) {
        btns.push(
          sent
            ? h('span', { style: 'color:var(--td-text-color-disabled);cursor:not-allowed' }, t('common.delete'))
            : h(
                'a',
                {
                  style: 'color:var(--td-error-color)',
                  onClick: () => {
                    const confirmDia = DialogPlugin.confirm({
                      header: t('common.tips'),
                      body: t('common.confirmDelete'),
                      onConfirm: () => {
                        confirmDia.destroy();
                        handleDelete(row);
                      },
                    });
                  },
                },
                t('common.delete'),
              ),
        );
      }
      if (hasPermission('system:notification:add')) {
        btns.push(h('a', { style: 'color:var(--td-brand-color)', onClick: () => handleCopy(row) }, t('common.copy')));
      }
      return h('div', { style: 'display:flex;gap:8px;justify-content:center;' }, btns);
    },
  },
]);

const {
  loading,
  dialog,
  saveRef,
  searchForm,
  pageParams,
  fetchData,
  handleSearch,
  resetSearch,
  handleDelete,
  handleSaveSuccess,
  add,
  edit,
  handlePageChange,
  handleSizeChange,
} = useTable(systemApi.notification, {
  defaultSearch: {
    title: '',
    type: '',
    recipientType: '',
    status: null,
  },
});

/** 通知行：命名已知字段（全可选，兼容 TDesign TableRowData）+ 索引签名兜底动态 payload */
interface NotificationRow {
  id?: number | string;
  title?: string;
  type?: string;
  recipientType?: string;
  status?: number;
  [key: string]: unknown;
}

const sendVisible = ref(false);
const sendRow = ref<NotificationRow>({});

const handleSend = (row: NotificationRow) => {
  sendRow.value = row;
  sendVisible.value = true;
};

const handleSendSuccess = () => {
  sendVisible.value = false;
  fetchData();
};

const handleView = (row: NotificationRow) => {
  dialog.save = true;
  setTimeout(() => {
    const dlg = saveRef.value as { open: (mode?: string) => void; setData: (row: unknown) => void } | null;
    dlg?.open('show');
    dlg?.setData(row);
  }, 0);
};

const handleCopy = async (row: NotificationRow) => {
  try {
    const res = await systemApi.notification.copy(row.id);
    if (res.code === 200) {
      MessagePlugin.success(t('common.copySuccess'));
      fetchData();
    }
  } catch {
    // ignore
  }
};

const statsVisible = ref(false);
const statsLoading = ref(false);
const statsData = ref([]);
const statsReadCount = ref(0);
const statsUnreadCount = ref(0);
const statsTotal = ref(0);
// 摘要区的「总计」= 已读 + 未读（按用户名过滤的总量）。
// 不能直接用后端的 total：那个是**筛选后**的条数（isRead 过滤已下推到 SQL），
// 一旦按已读/未读筛选，total ≠ 已读 + 未读，界面三个数字对不上。
const statsSummaryTotal = computed(() => statsReadCount.value + statsUnreadCount.value);
const statsSearch = ref({ userName: '', isRead: undefined });
const statsPage = ref({ pageNo: 1, pageSize: 10 });
let currentStatsId: number | string | null = null;

const statsColumns = computed<PrimaryTableCol[]>(() => [
  { colKey: 'userName', title: t('common.userName'), width: 120 },
  { colKey: 'realName', title: t('pages.system.notification.stats.realName'), width: 120 },
  {
    colKey: 'isRead',
    title: t('common.status'),
    width: 100,
    cell: (h, { row }) => {
      return row.isRead === 1
        ? h(Tag, { theme: 'success', variant: 'light' }, t('pages.system.notification.stats.read'))
        : h(Tag, { theme: 'warning', variant: 'light' }, t('pages.system.notification.stats.unread'));
    },
  },
  { colKey: 'readTime', title: t('pages.system.notification.stats.readTime'), width: 180 },
]);

const fetchStats = async () => {
  if (!currentStatsId) return;
  statsLoading.value = true;
  try {
    const res = await systemApi.notification.stats(currentStatsId, {
      userName: statsSearch.value.userName || undefined,
      isRead: statsSearch.value.isRead,
      pageNo: statsPage.value.pageNo,
      pageSize: statsPage.value.pageSize,
    });
    if (res.code === 200) {
      statsData.value = res.data?.list || [];
      statsReadCount.value = res.data?.readCount || 0;
      statsUnreadCount.value = res.data?.unreadCount || 0;
      // total 是**筛选后**的条数（isRead 过滤已下推），只用于分页；
      // 摘要区的「总计」另有来源：已读 + 未读（按用户名过滤的总量，不受 isRead 影响）。
      statsTotal.value = res.data?.total || 0;
    }
  } catch {
    // ignore
  } finally {
    statsLoading.value = false;
  }
};

const handleStats = (row: NotificationRow) => {
  currentStatsId = row.id ?? null;
  statsSearch.value = { userName: '', isRead: undefined };
  statsPage.value = { pageNo: 1, pageSize: 10 };
  statsVisible.value = true;
  fetchStats();
};

const handleStatsSearch = () => {
  statsPage.value.pageNo = 1;
  fetchStats();
};

const handleStatsReset = () => {
  statsSearch.value = { userName: '', isRead: undefined };
  statsPage.value.pageNo = 1;
  fetchStats();
};

const handleStatsPageChange = (pageNo: number) => {
  statsPage.value.pageNo = pageNo;
  fetchStats();
};

const handleStatsSizeChange = (pageSize: number) => {
  statsPage.value.pageSize = pageSize;
  statsPage.value.pageNo = 1;
  fetchStats();
};

onMounted(() => {
  fetchData();
});
</script>
<style scoped lang="less">
.notification-page {
  .search-card {
    margin-bottom: 16px;
  }

  .flex-between {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .pagination-container {
    margin-top: 16px;
    display: flex;
    justify-content: flex-end;
  }

  .stats-summary {
    display: flex;
    gap: 24px;
    padding: 12px 0;
    font: var(--td-font-body-medium);
    color: var(--td-text-color-secondary);

    b {
      color: var(--td-brand-color);
      margin-left: 4px;
    }
  }
}
</style>
