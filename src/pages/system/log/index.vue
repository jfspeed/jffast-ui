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
  <div class="system-log-page">
    <t-card class="search-card">
      <t-form :data="searchForm" layout="inline" @submit="handleSearch" @reset="resetSearchEx">
        <t-form-item :label="t('pages.system.log.createBy')" name="createByName">
          <t-input
            v-model="searchForm.createByName"
            :placeholder="t('pages.system.log.placeholder.createBy')"
            clearable
          />
        </t-form-item>
        <t-form-item :label="t('pages.system.log.title')" name="title">
          <t-select
            v-model="searchForm.title"
            :placeholder="t('pages.system.log.placeholder.title')"
            clearable
            filterable
          >
            <t-option v-for="item in titleOptions" :key="item" :value="item" :label="item" />
          </t-select>
        </t-form-item>
        <t-form-item :label="t('common.status')" name="state">
          <t-select v-model="searchForm.state" :placeholder="t('pages.system.log.placeholder.state')" clearable>
            <!-- 状态值是后端约定的中文串，保持 value 不变，仅翻译展示文案 -->
            <t-option value="成功" :label="t('common.success')" />
            <t-option value="失败" :label="t('common.fail')" />
          </t-select>
        </t-form-item>
        <t-form-item :label="t('pages.system.log.level')" name="level">
          <t-select v-model="searchForm.level" :placeholder="t('pages.system.log.placeholder.level')" clearable>
            <t-option value="info" :label="t('pages.system.log.levelMap.info')" />
            <t-option value="warning" :label="t('pages.system.log.levelMap.warning')" />
            <t-option value="error" :label="t('pages.system.log.levelMap.error')" />
          </t-select>
        </t-form-item>
        <t-form-item :label="t('pages.system.log.operateTime')" name="dateRange">
          <t-date-range-picker v-model="dateRange" separator="~" clearable @change="onDateRangeChange" />
        </t-form-item>
        <t-form-item>
          <t-button theme="default" type="reset">{{ t('common.reset') }}</t-button>
          <t-button theme="primary" type="submit">{{ t('common.query') }}</t-button>
          <t-button v-permission="'system:log:view'" theme="success" :loading="exporting" @click="handleExport">{{
            t('common.export')
          }}</t-button>
          <t-button v-permission="'system:log:delete'" theme="danger" variant="outline" @click="openCleanDialog">
            {{ t('pages.system.log.clean') }}
          </t-button>
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

    <!-- 清理历史日志：后端 SysLogController#clean（DELETE /sys/log/clean?days=），
         权限 system:log:delete；此前后端与菜单种子都有，前端没有入口，能力等于半残 -->
    <t-dialog
      v-model:visible="cleanDialogVisible"
      :header="t('pages.system.log.message.cleanConfirmHeader')"
      :confirm-btn="{ content: t('common.confirm'), loading: cleaning, onClick: handleClean }"
      @close="cleanDialogVisible = false"
    >
      <p>{{ t('pages.system.log.message.cleanConfirmTip') }}</p>
      <t-form-item :label="t('pages.system.log.message.daysLabel')">
        <t-input-number v-model="cleanDays" :min="1" :max="3650" :step="30" style="width: 200px" />
      </t-form-item>
    </t-dialog>
  </div>
</template>
<script lang="ts" setup>
import type { PrimaryTableCol } from 'tdesign-vue-next';
import { MessagePlugin, Tag } from 'tdesign-vue-next';
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import api from '@/api/system';
import { useTable } from '@/hooks/useTable';

const { t } = useI18n();

const dateRange = ref([]);
const titleOptions = ref([]);
const exporting = ref(false);

// 清理历史日志（后端 SysLogController#clean，权限 system:log:delete）
const cleanDialogVisible = ref(false);
const cleanDays = ref(90);
const cleaning = ref(false);

const openCleanDialog = () => {
  cleanDialogVisible.value = true;
};

const handleClean = async () => {
  cleaning.value = true;
  try {
    const res = await api.log.cleanLog(cleanDays.value);
    if (res?.code === 200) {
      MessagePlugin.success(t('pages.system.log.message.cleanSuccess'));
      cleanDialogVisible.value = false;
      fetchData();
    } else {
      MessagePlugin.error(res?.message || t('pages.system.log.message.cleanFail'));
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : t('pages.system.log.message.cleanFail');
    MessagePlugin.error(msg);
  } finally {
    cleaning.value = false;
  }
};

const handleExport = async () => {
  exporting.value = true;
  try {
    await api.log.exportLog({ ...searchForm });
  } finally {
    exporting.value = false;
  }
};

const onDateRangeChange = (value: unknown) => {
  const range = value as string[] | undefined;
  if (range && range.length === 2) {
    searchForm.startTime = range[0];
    searchForm.endTime = range[1];
  } else {
    searchForm.startTime = '';
    searchForm.endTime = '';
  }
};

// 状态列：后端存中文串（成功/失败），按值映射成词条，未知值原样透出
const stateLabel = (state: string) => {
  if (state === '成功') return t('common.success');
  if (state === '失败') return t('common.fail');
  return state || '-';
};

const columns = computed<PrimaryTableCol[]>(() => [
  { colKey: 'createBy', title: t('pages.system.log.createBy'), width: 120 },
  { colKey: 'title', title: t('pages.system.log.title'), width: 120 },
  { colKey: 'method', title: t('pages.system.log.method'), width: 150, ellipsis: true },
  { colKey: 'ip', title: t('pages.system.log.ip'), width: 130 },
  {
    colKey: 'state',
    title: t('common.status'),
    width: 100,
    align: 'center',
    cell: (h, { row }) =>
      h(Tag, { theme: row.state === '成功' ? 'success' : 'danger', variant: 'light' }, () => stateLabel(row.state)),
  },
  { colKey: 'info', title: t('common.detail'), ellipsis: true },
  {
    colKey: 'createTime',
    title: t('pages.system.log.operateTime'),
    width: 170,
    cell: (h, { row }) => row.createTime || '-',
  },
]);

const { loading, searchForm, pageParams, handleSearch, resetSearch, handlePageChange, handleSizeChange, fetchData } =
  useTable(api.log, {
    defaultSearch: { createByName: '', title: '', state: '', level: '', startTime: '', endTime: '' },
  });

const originResetSearch = resetSearch;
const resetSearchEx = () => {
  dateRange.value = [];
  originResetSearch();
};

onMounted(() => {
  fetchData();
  api.log
    .titleList()
    .then((res) => {
      if (res.code === 200) {
        titleOptions.value = res.data || [];
      }
    })
    .catch(() => {
      // 错误提示已由 request 拦截器统一弹出，此处不重复 toast
    });
});
</script>
<style scoped lang="less">
.system-log-page {
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
