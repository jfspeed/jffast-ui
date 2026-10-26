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
  <div class="system-dept-page">
    <t-card class="search-card">
      <t-form :data="searchForm" layout="inline" @submit="handleSearch" @reset="resetSearch">
        <t-form-item :label="t('pages.system.dept.deptName')" name="deptName">
          <t-input v-model="searchForm.deptName" :placeholder="t('pages.system.dept.placeholder.deptName')" clearable />
        </t-form-item>
        <t-form-item>
          <t-button theme="default" type="reset">{{ t('common.reset') }}</t-button>
          <t-button theme="primary" type="submit">{{ t('common.query') }}</t-button>
          <t-button v-permission="'system:dept:add'" theme="success" @click="add">{{ t('common.add') }}</t-button>
        </t-form-item>
      </t-form>
    </t-card>

    <t-card>
      <t-enhanced-table
        :loading="loading"
        :data="treeData"
        :columns="columns"
        row-key="id"
        :tree="{ childrenKey: 'children', treeNodeColumnIndex: 0 }"
        stripe
        bordered
      />
    </t-card>

    <save-dialog v-if="dialog.save" ref="saveRef" @success="handleSaveSuccess" @closed="dialog.save = false" />
  </div>
</template>
<script lang="ts" setup>
import type { PrimaryTableCol } from 'tdesign-vue-next';
import { DialogPlugin, MessagePlugin } from 'tdesign-vue-next';
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import api from '@/api/system';
import { hasPermission } from '@/utils/permission';

import saveDialog from './save.vue';

const { t } = useI18n();

/** 部门树行：命名已知字段（全可选，兼容 TDesign TableRowData）+ 索引签名兜底动态 payload */
interface SysDeptRow {
  id?: number | string;
  level?: number;
  createTime?: string;
  [key: string]: unknown;
}

/** save.vue 通过 defineExpose 暴露的方法 */
interface DeptSaveRef {
  open: (mode?: string) => void;
  setData: (row: unknown) => void;
  setParentId: (parentId: unknown) => void;
}

const dialog = ref({ save: false });
const saveRef = ref<DeptSaveRef | null>(null);
const loading = ref(false);
const treeData = ref([]);
const searchForm = ref({ deptName: '' });

const levelMap = computed<Record<string, string>>(() => ({
  1: t('common.root'),
  2: t('pages.system.dept.level.unit'),
  3: t('pages.system.dept.level.dept'),
}));

const columns = computed<PrimaryTableCol[]>(() => [
  { colKey: 'deptName', title: t('pages.system.dept.deptName'), width: 200 },
  {
    colKey: 'level',
    title: t('pages.system.dept.levelTitle'),
    width: 100,
    align: 'center',
    cell: (h, { row }) => levelMap.value[row.level] || '-',
  },
  {
    colKey: 'createTime',
    title: t('common.createTime'),
    width: 170,
    cell: (h, { row }) => row.createTime || '-',
  },
  {
    colKey: 'op',
    title: t('common.operation'),
    width: 200,
    align: 'center',
    fixed: 'right',
    cell: (h, { row }) => {
      const btns = [];
      if (hasPermission('system:dept:add')) {
        btns.push(h('a', { onClick: () => addChild(row) }, t('pages.system.dept.action.addChild')));
      }
      if (hasPermission('system:dept:update')) {
        btns.push(h('a', { onClick: () => edit(row) }, t('common.edit')));
      }
      if (hasPermission('system:dept:delete')) {
        btns.push(
          h(
            'a',
            {
              style: 'color:var(--td-error-color)',
              onClick: () => {
                const confirmDia = DialogPlugin.confirm({
                  header: t('common.tips'),
                  body: t('pages.system.dept.message.confirmDelete'),
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

const fetchData = async () => {
  loading.value = true;
  try {
    const res = await api.dept.page(searchForm.value);
    treeData.value = res?.data || [];
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  fetchData();
};

const resetSearch = () => {
  searchForm.value = { deptName: '' };
  fetchData();
};

const add = () => {
  dialog.value.save = true;
  setTimeout(() => {
    saveRef.value?.open('add');
  }, 0);
};

const addChild = (row: SysDeptRow) => {
  dialog.value.save = true;
  setTimeout(() => {
    saveRef.value?.open('add');
    saveRef.value?.setParentId(row.id);
  }, 0);
};

const edit = (row: SysDeptRow) => {
  dialog.value.save = true;
  setTimeout(() => {
    saveRef.value?.open('edit');
    saveRef.value?.setData(row);
  }, 0);
};

const handleDelete = async (row: SysDeptRow) => {
  if (row.id == null) return;
  try {
    const res = await api.dept.delete(row.id);
    if (res.code === 200) {
      MessagePlugin.success(t('common.deleteSuccess'));
      fetchData();
    } else {
      MessagePlugin.error(res.message || t('common.deleteFail'));
    }
  } catch (e) {
    MessagePlugin.error((e as Error).message || t('common.deleteFail'));
  }
};

const handleSaveSuccess = () => {
  dialog.value.save = false;
  fetchData();
};

onMounted(() => {
  fetchData();
});
</script>
<style scoped lang="less">
.system-dept-page {
  .search-card {
    margin-bottom: 16px;
  }
}
</style>
