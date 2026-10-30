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
  <div class="leave-application-page">
    <t-card class="search-card">
      <t-form :data="searchForm" layout="inline" @submit="handleSearch" @reset="resetSearch">
        <t-form-item :label="t('pages.demo.leaveApplication.applicant')" name="userName">
          <t-input
            v-model="searchForm.userName"
            :placeholder="t('pages.demo.leaveApplication.placeholder.applicant')"
            clearable
          />
        </t-form-item>
        <t-form-item :label="t('pages.demo.leaveApplication.leaveType')" name="leaveType">
          <t-select
            v-model="searchForm.leaveType"
            :placeholder="t('common.pleaseSelect')"
            clearable
            :options="leaveTypeOptions"
          />
        </t-form-item>
        <t-form-item :label="t('common.status')" name="status">
          <t-select
            v-model="searchForm.status"
            :placeholder="t('common.pleaseSelect')"
            clearable
            :options="statusOptions"
          />
        </t-form-item>
        <t-form-item>
          <t-button theme="default" type="reset">{{ t('common.reset') }}</t-button>
          <t-button v-permission="'demo:leave:view'" theme="primary" type="submit">{{ t('common.query') }}</t-button>
          <t-button v-permission="'demo:leave:add'" theme="success" @click="add">{{ t('common.add') }}</t-button>
        </t-form-item>
      </t-form>
    </t-card>

    <t-card>
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

    <save-dialog v-if="dialog.save" ref="saveRef" @success="handleSaveSuccess" @closed="dialog.save = false" />
  </div>
</template>
<script lang="ts" setup>
import type { PrimaryTableCol } from 'tdesign-vue-next';
import { DialogPlugin, Tag } from 'tdesign-vue-next';
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';

import api from '@/api/demo';
import { useTable } from '@/hooks/useTable';
import { hasPermission } from '@/utils/permission';

import saveDialog from './save.vue';

defineOptions({
  name: 'DemoLeaveApplication',
});

const { t } = useI18n();

// 请假类型下拉（响应语言切换）
const leaveTypeOptions = computed(() => [
  { label: t('pages.demo.leaveApplication.leaveTypeMap.annual'), value: 'annual' },
  { label: t('pages.demo.leaveApplication.leaveTypeMap.sick'), value: 'sick' },
  { label: t('pages.demo.leaveApplication.leaveTypeMap.personal'), value: 'personal' },
  { label: t('pages.demo.leaveApplication.leaveTypeMap.maternity'), value: 'maternity' },
  { label: t('pages.demo.leaveApplication.leaveTypeMap.other'), value: 'other' },
]);

// 状态下拉（响应语言切换）
const statusOptions = computed(() => [
  { label: t('pages.demo.leaveApplication.statusMap.pending'), value: 0 },
  { label: t('pages.demo.leaveApplication.statusMap.approved'), value: 1 },
  { label: t('pages.demo.leaveApplication.statusMap.rejected'), value: 2 },
  { label: t('pages.demo.leaveApplication.statusMap.canceled'), value: 3 },
]);

// 状态文案与主题（响应语言切换）
const statusMap = computed<Record<string, { label: string; theme: string }>>(() => ({
  0: { label: t('pages.demo.leaveApplication.statusMap.pending'), theme: 'warning' },
  1: { label: t('pages.demo.leaveApplication.statusMap.approved'), theme: 'success' },
  2: { label: t('pages.demo.leaveApplication.statusMap.rejected'), theme: 'danger' },
  3: { label: t('pages.demo.leaveApplication.statusMap.canceled'), theme: 'default' },
}));

// 请假类型文案（响应语言切换）
const leaveTypeMap = computed<Record<string, string>>(() => ({
  annual: t('pages.demo.leaveApplication.leaveTypeMap.annual'),
  sick: t('pages.demo.leaveApplication.leaveTypeMap.sick'),
  personal: t('pages.demo.leaveApplication.leaveTypeMap.personal'),
  maternity: t('pages.demo.leaveApplication.leaveTypeMap.maternity'),
  other: t('pages.demo.leaveApplication.leaveTypeMap.other'),
}));

const {
  loading,
  searchForm,
  dialog,
  saveRef,
  pageParams,
  handleSearch,
  resetSearch,
  handleDelete,
  handleSaveSuccess,
  add,
  edit,
  show,
  handlePageChange,
  handleSizeChange,
  fetchData,
} = useTable(api.leaveApplication, {
  defaultSearch: { userName: '', leaveType: '', status: '' },
});

// 表格列（响应语言切换）
const columns = computed<PrimaryTableCol[]>(() => [
  { colKey: 'userName', title: t('pages.demo.leaveApplication.applicant'), width: 120 },
  {
    colKey: 'leaveType',
    title: t('pages.demo.leaveApplication.leaveType'),
    width: 100,
    cell: (h: any, { row }: any) => leaveTypeMap.value[row.leaveType] || row.leaveType,
  },
  { colKey: 'startTime', title: t('pages.demo.leaveApplication.startTime'), width: 160 },
  { colKey: 'endTime', title: t('pages.demo.leaveApplication.endTime'), width: 160 },
  { colKey: 'duration', title: t('pages.demo.leaveApplication.duration'), width: 80, align: 'center' },
  { colKey: 'reason', title: t('pages.demo.leaveApplication.reason'), ellipsis: true },
  {
    colKey: 'status',
    title: t('common.status'),
    width: 100,
    align: 'center',
    cell: (h: any, { row }: any) => {
      const status = statusMap.value[row.status] || {
        label: t('pages.demo.leaveApplication.unknown'),
        theme: 'default',
      };
      return h(Tag, { theme: status.theme, variant: 'light' }, () => status.label);
    },
  },
  { colKey: 'approverName', title: t('pages.demo.leaveApplication.approver'), width: 100 },
  { colKey: 'approveTime', title: t('pages.demo.leaveApplication.approveTime'), width: 160 },
  { colKey: 'createTime', title: t('common.createTime'), width: 160 },
  {
    colKey: 'op',
    title: t('common.operation'),
    width: 180,
    align: 'center',
    fixed: 'right',
    cell: (h: any, { row }: any) => {
      const btns = [];
      // 权限码与后端 @SaCheckPermission 逐条对齐：
      // 修改=demo:leave:edit / 删除=demo:leave:delete（后端同时用 demo:leave:view 校验分页与详情）
      btns.push(h('a', { onClick: () => show(row) }, t('common.view')));
      if (row.status === 0 && hasPermission('demo:leave:edit')) {
        btns.push(h('a', { onClick: () => edit(row) }, t('common.edit')));
      }
      if (row.status === 0 && hasPermission('demo:leave:delete')) {
        btns.push(
          h(
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
      return h('div', { style: 'display:flex;gap:8px;justify-content:center;' }, btns);
    },
  },
]);

onMounted(() => {
  fetchData();
});
</script>
<style scoped lang="less">
.leave-application-page {
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
