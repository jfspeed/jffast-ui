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
  <div class="flow-instance-page">
    <t-card class="search-card">
      <t-form :data="searchForm" layout="inline" @submit="handleSearch" @reset="resetSearch">
        <t-form-item :label="t('pages.flow.common.processKey')" name="processKey">
          <t-input
            v-model="searchForm.processKey"
            :placeholder="t('pages.flow.common.placeholder.processKey')"
            clearable
          />
        </t-form-item>
        <t-form-item :label="t('pages.flow.instance.initiatorId')" name="initiatorUserId">
          <t-input
            v-model="searchForm.initiatorUserId"
            :placeholder="t('pages.flow.instance.placeholder.initiatorId')"
            clearable
          />
        </t-form-item>
        <t-form-item>
          <t-button theme="default" type="reset">{{ t('common.reset') }}</t-button>
          <t-button theme="primary" type="submit">{{ t('common.query') }}</t-button>
          <t-button v-permission="'flow:process:start'" theme="success" @click="openStartDialog">{{
            t('pages.flow.instance.start')
          }}</t-button>
        </t-form-item>
      </t-form>
    </t-card>

    <t-card>
      <t-table :loading="loading" :data="pageParams.list" :columns="columns" row-key="id" stripe bordered />

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

    <!-- 发起流程对话框 -->
    <t-dialog
      v-model:visible="startVisible"
      :header="t('pages.flow.instance.start')"
      :width="640"
      destroy-on-close
      :confirm-btn="{ content: t('pages.flow.instance.startBtn'), loading: startSaving, onClick: handleStart }"
    >
      <t-form :data="startForm" label-width="100px">
        <t-form-item :label="t('pages.flow.instance.processDefinition')" name="processKey" required>
          <t-select
            v-model="startForm.processKey"
            :placeholder="t('pages.flow.instance.placeholder.processDefinition')"
            filterable
            clearable
            @change="onProcessKeyChange"
          >
            <t-option v-for="d in definitionOptions" :key="d.key" :value="d.key" :label="`${d.name} (v${d.version})`" />
          </t-select>
        </t-form-item>
        <t-form-item :label="t('pages.flow.instance.businessKey')" name="businessKey">
          <t-input
            v-model="startForm.businessKey"
            :placeholder="t('pages.flow.instance.placeholder.businessKey')"
            clearable
          />
        </t-form-item>
        <t-form-item :label="t('pages.flow.common.processName')" name="name">
          <t-input v-model="startForm.name" :placeholder="t('pages.flow.instance.placeholder.name')" clearable />
        </t-form-item>
        <t-form-item :label="t('pages.flow.common.variables')" name="variablesText">
          <t-textarea
            v-model="startForm.variablesText"
            :autosize="{ minRows: 4, maxRows: 10 }"
            :placeholder="t('pages.flow.common.placeholder.variables')"
          />
        </t-form-item>
      </t-form>
    </t-dialog>

    <!-- 审批历史对话框 -->
    <t-dialog
      v-model:visible="historyVisible"
      :header="t('pages.flow.common.historyTitle')"
      :width="900"
      :footer="false"
      destroy-on-close
    >
      <t-table :loading="historyLoading" :data="historyList" :columns="historyColumns" row-key="id" stripe bordered />
    </t-dialog>
  </div>
</template>
<script lang="ts" setup>
import { DialogPlugin, MessagePlugin, Tag } from 'tdesign-vue-next';
import { computed, onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { history as historyApi, process } from '@/api/flow';
import { hasPermission } from '@/utils/permission';

defineOptions({
  name: 'FlowInstance',
});

const { t } = useI18n();

const loading = ref(false);
const pageParams = reactive({
  pageNum: 1,
  pageSize: 10,
  total: 0,
  list: [],
});
const searchForm = reactive({ processKey: '', initiatorUserId: '' });

// ─── 发起流程 ─────────────────────────────────
const startVisible = ref(false);
const startSaving = ref(false);
const definitionOptions = ref<{ key: string; name: string; version: number; suspended?: boolean }[]>([]);
const startForm = reactive({
  processKey: '',
  businessKey: '',
  name: '',
  variablesText: '',
});

// ─── 审批历史 ─────────────────────────────────
const historyVisible = ref(false);
const historyLoading = ref(false);
const historyList = ref([]);

const fetchData = async () => {
  loading.value = true;
  try {
    const res = await process.instancePage({
      processKey: searchForm.processKey || undefined,
      initiatorUserId: searchForm.initiatorUserId || undefined,
      pageNo: pageParams.pageNum,
      pageSize: pageParams.pageSize,
    });
    const data = res?.data || {};
    pageParams.list = data.list || [];
    pageParams.total = data.total || 0;
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  pageParams.pageNum = 1;
  fetchData();
};

const resetSearch = () => {
  searchForm.processKey = '';
  searchForm.initiatorUserId = '';
  handleSearch();
};

const handlePageChange = (page: number) => {
  pageParams.pageNum = page;
  fetchData();
};

const handleSizeChange = (size: number) => {
  pageParams.pageSize = size;
  pageParams.pageNum = 1;
  fetchData();
};

// ─── 发起流程 ─────────────────────────────────
const loadDefinitions = async () => {
  try {
    const res = await process.definitionPage({ pageNo: 1, pageSize: 200 });
    definitionOptions.value = (res?.data?.list || []).filter((d: any) => !d.suspended);
  } catch {
    definitionOptions.value = [];
  }
};

const openStartDialog = async () => {
  startForm.processKey = '';
  startForm.businessKey = '';
  startForm.name = '';
  startForm.variablesText = '';
  await loadDefinitions();
  startVisible.value = true;
};

const onProcessKeyChange = (val: any) => {
  const def = definitionOptions.value.find((d) => d.key === val);
  if (def && !startForm.name) {
    startForm.name = def.name;
  }
};

const handleStart = async () => {
  if (!startForm.processKey) {
    MessagePlugin.warning(t('pages.flow.instance.placeholder.processDefinition'));
    return;
  }
  let variables = {};
  if (startForm.variablesText) {
    try {
      variables = JSON.parse(startForm.variablesText);
    } catch {
      MessagePlugin.error(t('pages.flow.common.message.jsonInvalid'));
      return;
    }
  }
  startSaving.value = true;
  try {
    const res = await process.startInstance({
      processKey: startForm.processKey,
      businessKey: startForm.businessKey || undefined,
      name: startForm.name || undefined,
      variables,
    });
    if (res && res.code === 200) {
      MessagePlugin.success(t('pages.flow.instance.message.startSuccess', { id: res.data || '' }));
      startVisible.value = false;
      fetchData();
    }
  } finally {
    startSaving.value = false;
  }
};

// ─── 取消流程 ─────────────────────────────────
const handleCancel = (row: any) => {
  const reason = '';
  const confirmDia = DialogPlugin.confirm({
    header: t('pages.flow.instance.message.cancelTitle'),
    body: t('pages.flow.instance.message.cancelConfirm'),
    onConfirm: async () => {
      confirmDia.destroy();
      try {
        const res = await process.cancelInstance(
          row.id,
          reason || t('pages.flow.instance.message.defaultCancelReason'),
        );
        if (res && res.code === 200) {
          MessagePlugin.success(t('pages.flow.instance.message.cancelSuccess'));
          fetchData();
        }
      } catch {
        // 错误提示已由 request 响应拦截器统一弹出，这里只吞掉 rejection，避免未捕获告警
      }
    },
  });
};

// ─── 查看审批历史 ─────────────────────────────
const handleViewHistory = async (row: any) => {
  historyVisible.value = true;
  historyLoading.value = true;
  historyList.value = [];
  try {
    const res = await historyApi.instanceHistory(row.id);
    historyList.value = res?.data || res || [];
  } catch {
    historyList.value = [];
  } finally {
    historyLoading.value = false;
  }
};

const columns = computed<any[]>(() => [
  { colKey: 'id', title: t('pages.flow.instance.instanceId'), width: 120, ellipsis: true },
  { colKey: 'processDefinitionName', title: t('pages.flow.common.processName'), width: 180, ellipsis: true },
  { colKey: 'processDefinitionKey', title: t('pages.flow.common.processKey'), width: 120 },
  { colKey: 'businessKey', title: t('pages.flow.instance.businessKey'), width: 140, ellipsis: true },
  { colKey: 'startUserId', title: t('pages.flow.instance.initiator'), width: 100 },
  {
    colKey: 'startTime',
    title: t('pages.flow.instance.startTime'),
    width: 170,
    cell: (h: any, { row }: any) => row.startTime || '-',
  },
  {
    colKey: 'suspended',
    title: t('common.status'),
    width: 100,
    align: 'center',
    cell: (h: any, { row }: any) => {
      const s = !!row.suspended;
      const label = s ? t('pages.flow.common.statusMap.suspended') : t('pages.flow.common.statusMap.running');
      const theme = s ? 'warning' : 'success';
      return h(Tag, { theme, variant: 'light' }, () => label);
    },
  },
  {
    colKey: 'op',
    title: t('common.operation'),
    width: 180,
    align: 'center',
    fixed: 'right',
    cell: (h: any, { row }: any) => {
      const btns = [];
      btns.push(h('a', { onClick: () => handleViewHistory(row) }, t('pages.flow.common.historyTitle')));
      if (hasPermission('flow:process:cancel')) {
        btns.push(
          h('a', { style: 'color:var(--td-error-color)', onClick: () => handleCancel(row) }, t('common.cancel')),
        );
      }
      return h('div', { style: 'display:flex;gap:8px;justify-content:center;' }, btns);
    },
  },
]);

const historyColumns = computed<any[]>(() => [
  { colKey: 'name', title: t('pages.flow.common.nodeName'), width: 160, ellipsis: true },
  { colKey: 'assignee', title: t('pages.flow.common.assignee'), width: 100 },
  { colKey: 'startTime', title: t('pages.flow.common.startTime'), width: 170 },
  {
    colKey: 'endTime',
    title: t('pages.flow.common.endTime'),
    width: 170,
    cell: (h: any, { row }: any) => row.endTime || '-',
  },
  {
    colKey: 'durationInMillis',
    title: t('pages.flow.common.duration'),
    width: 120,
    cell: (h: any, { row }: any) => (row.durationInMillis ? `${Math.round(row.durationInMillis / 1000)}s` : '-'),
  },
  {
    colKey: 'deleteReason',
    title: t('pages.flow.common.result'),
    ellipsis: true,
    cell: (h: any, { row }: any) => row.deleteReason || '-',
  },
]);

onMounted(() => {
  fetchData();
});
</script>
<style scoped lang="less">
.flow-instance-page {
  .search-card {
    margin-bottom: 16px;
  }

  .pagination-container {
    margin-top: 16px;
    display: flex;
    justify-content: flex-end;
  }
}
</style>
