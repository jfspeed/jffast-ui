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
  <div class="flow-todo-page">
    <t-card>
      <template #actions>
        <t-radio-group v-model="activeTab" variant="default-filled" @change="onTabChange">
          <t-radio-button value="todo">{{ t('pages.flow.task.tabTodo') }}</t-radio-button>
          <t-radio-button value="candidate">{{ t('pages.flow.task.tabCandidate') }}</t-radio-button>
        </t-radio-group>
      </template>

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

    <!-- 审批对话框 -->
    <t-dialog
      v-model:visible="completeVisible"
      :header="t('pages.flow.task.completeTitle')"
      :width="640"
      destroy-on-close
      :confirm-btn="{ content: t('pages.flow.task.submitApproval'), loading: completeSaving, onClick: handleComplete }"
    >
      <t-form :data="completeForm" label-width="100px">
        <t-form-item :label="t('pages.flow.task.taskName')">
          <span>{{ completeForm.taskName || '-' }}</span>
        </t-form-item>
        <t-form-item :label="t('pages.flow.task.processInstance')">
          <span>{{ completeForm.processInstanceId || '-' }}</span>
        </t-form-item>
        <t-form-item :label="t('pages.flow.task.comment')" name="comment">
          <t-textarea
            v-model="completeForm.comment"
            :autosize="{ minRows: 3, maxRows: 6 }"
            :placeholder="t('pages.flow.task.placeholder.comment')"
          />
        </t-form-item>
        <t-form-item :label="t('pages.flow.common.variables')" name="variablesText">
          <t-textarea
            v-model="completeForm.variablesText"
            :autosize="{ minRows: 3, maxRows: 8 }"
            :placeholder="t('pages.flow.task.placeholder.variables')"
          />
        </t-form-item>
      </t-form>
    </t-dialog>

    <!-- 转办对话框 -->
    <t-dialog
      v-model:visible="delegateVisible"
      :header="t('pages.flow.task.delegateTitle')"
      :width="480"
      destroy-on-close
      :confirm-btn="{
        content: t('pages.flow.task.delegateConfirmBtn'),
        loading: delegateSaving,
        onClick: handleDelegate,
      }"
    >
      <t-form :data="delegateForm" label-width="100px">
        <t-form-item :label="t('pages.flow.task.taskName')">
          <span>{{ delegateForm.taskName || '-' }}</span>
        </t-form-item>
        <t-form-item :label="t('pages.flow.task.toUserId')" name="toUserId" required>
          <t-input v-model="delegateForm.toUserId" :placeholder="t('pages.flow.task.placeholder.toUserId')" clearable />
        </t-form-item>
      </t-form>
    </t-dialog>
  </div>
</template>
<script lang="ts" setup>
import { DialogPlugin, MessagePlugin } from 'tdesign-vue-next';
import { computed, onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { task } from '@/api/flow';
import { hasPermission } from '@/utils/permission';

const { t } = useI18n();

const loading = ref(false);
const activeTab = ref('todo');
const pageParams = reactive({
  pageNum: 1,
  pageSize: 10,
  total: 0,
  list: [],
});

// ─── 审批 ─────────────────────────────────────
const completeVisible = ref(false);
const completeSaving = ref(false);
const completeForm = reactive({
  taskId: '',
  taskName: '',
  processInstanceId: '',
  comment: '',
  variablesText: '',
});

// ─── 转办 ─────────────────────────────────────
const delegateVisible = ref(false);
const delegateSaving = ref(false);
const delegateForm = reactive({
  taskId: '',
  taskName: '',
  toUserId: '',
});

const fetchData = async () => {
  loading.value = true;
  try {
    const params = {
      pageNo: pageParams.pageNum,
      pageSize: pageParams.pageSize,
    };
    const res = activeTab.value === 'todo' ? await task.todoPage(params) : await task.candidatePage(params);
    const data = res?.data || {};
    pageParams.list = data.list || [];
    pageParams.total = data.total || 0;
  } finally {
    loading.value = false;
  }
};

const onTabChange = () => {
  pageParams.pageNum = 1;
  fetchData();
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

// ─── 签收 ─────────────────────────────────────
const handleClaim = (row: any) => {
  const confirmDia = DialogPlugin.confirm({
    header: t('pages.flow.task.message.claimTitle'),
    body: t('pages.flow.task.message.claimConfirm', { name: row.name }),
    onConfirm: async () => {
      confirmDia.destroy();
      try {
        const res = await task.claim(row.id);
        if (res && res.code === 200) {
          MessagePlugin.success(t('pages.flow.task.message.claimSuccess'));
          fetchData();
        }
      } catch {
        // 错误提示已由 request 响应拦截器统一弹出，这里只吞掉 rejection，避免未捕获告警
      }
    },
  });
};

// ─── 审批 ─────────────────────────────────────
const openCompleteDialog = (row: any) => {
  completeForm.taskId = row.id;
  completeForm.taskName = row.name;
  completeForm.processInstanceId = row.processInstanceId;
  completeForm.comment = '';
  completeForm.variablesText = '';
  completeVisible.value = true;
};

const handleComplete = async () => {
  let variables = {};
  if (completeForm.variablesText) {
    try {
      variables = JSON.parse(completeForm.variablesText);
    } catch {
      MessagePlugin.error(t('pages.flow.common.message.jsonInvalid'));
      return;
    }
  }
  completeSaving.value = true;
  try {
    const res = await task.complete({
      taskId: completeForm.taskId,
      comment: completeForm.comment || undefined,
      variables,
    });
    if (res && res.code === 200) {
      MessagePlugin.success(t('pages.flow.task.message.completeSuccess'));
      completeVisible.value = false;
      fetchData();
    }
  } finally {
    completeSaving.value = false;
  }
};

// ─── 转办 ─────────────────────────────────────
const openDelegateDialog = (row: any) => {
  delegateForm.taskId = row.id;
  delegateForm.taskName = row.name;
  delegateForm.toUserId = '';
  delegateVisible.value = true;
};

const handleDelegate = async () => {
  if (!delegateForm.toUserId) {
    MessagePlugin.warning(t('pages.flow.task.placeholder.toUserId'));
    return;
  }
  delegateSaving.value = true;
  try {
    const res = await task.delegate(delegateForm.taskId, delegateForm.toUserId);
    if (res && res.code === 200) {
      MessagePlugin.success(t('pages.flow.task.message.delegateSuccess'));
      delegateVisible.value = false;
      fetchData();
    }
  } finally {
    delegateSaving.value = false;
  }
};

const columns = computed<any[]>(() => [
  { colKey: 'id', title: t('pages.flow.task.taskId'), width: 120, ellipsis: true },
  { colKey: 'name', title: t('pages.flow.task.taskName'), width: 160, ellipsis: true },
  { colKey: 'processInstanceId', title: t('pages.flow.common.processInstanceId'), width: 120, ellipsis: true },
  { colKey: 'processDefinitionName', title: t('pages.flow.common.processName'), width: 160, ellipsis: true },
  { colKey: 'assignee', title: t('pages.flow.common.assignee'), width: 100 },
  { colKey: 'createTime', title: t('common.createTime'), width: 170 },
  {
    colKey: 'op',
    title: t('common.operation'),
    width: 240,
    align: 'center',
    fixed: 'right',
    cell: (h: any, { row }: any) => {
      const btns = [];
      // 任务池模式（无 assignee）先签收；已签收可直接审批/转办
      if (!row.assignee && activeTab.value === 'candidate' && hasPermission('flow:task:claim')) {
        btns.push(
          h(
            'a',
            { style: 'color:var(--td-success-color)', onClick: () => handleClaim(row) },
            t('pages.flow.task.claim'),
          ),
        );
      }
      if (hasPermission('flow:task:complete')) {
        btns.push(h('a', { theme: 'primary', onClick: () => openCompleteDialog(row) }, t('pages.flow.task.approve')));
      }
      if (hasPermission('flow:task:delegate')) {
        btns.push(h('a', { onClick: () => openDelegateDialog(row) }, t('pages.flow.task.delegate')));
      }
      return h('div', { style: 'display:flex;gap:8px;justify-content:center;' }, btns);
    },
  },
]);

onMounted(() => {
  fetchData();
});
</script>
<style scoped lang="less">
.flow-todo-page {
  .pagination-container {
    margin-top: 16px;
    display: flex;
    justify-content: flex-end;
  }
}
</style>
