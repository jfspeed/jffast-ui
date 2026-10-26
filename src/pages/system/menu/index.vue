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
  <div class="system-menu-page">
    <t-card class="search-card">
      <t-form :data="searchForm" layout="inline" @submit="handleSearch" @reset="resetSearch">
        <t-form-item :label="t('pages.system.menu.name')" name="name">
          <t-input v-model="searchForm.name" :placeholder="t('pages.system.menu.placeholder.name')" clearable />
        </t-form-item>
        <t-form-item :label="t('common.status')" name="state">
          <t-select
            v-model="searchForm.state"
            :placeholder="t('common.pleaseSelect')"
            clearable
            :options="stateOptions"
          />
        </t-form-item>
        <t-form-item>
          <t-button theme="default" type="reset">{{ t('common.reset') }}</t-button>
          <t-button theme="primary" type="submit">{{ t('common.query') }}</t-button>
          <t-button v-permission="'system:menu:add'" theme="success" @click="add">{{ t('common.add') }}</t-button>
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

    <save-dialog v-show="dialog.save" ref="saveRef" @success="handleSaveSuccess" @closed="dialog.save = false" />
  </div>
</template>
<script lang="ts" setup>
import type { PrimaryTableCol } from 'tdesign-vue-next';
import { DialogPlugin, Icon, MessagePlugin, Tag } from 'tdesign-vue-next';
import { computed, nextTick, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import api from '@/api/system';
import { hasPermission } from '@/utils/permission';

import saveDialog from './save.vue';

const { t } = useI18n();

/** 菜单树行：命名已知字段（全可选，兼容 TDesign TableRowData）+ 索引签名兜底动态 payload */
interface SysMenuRow {
  id?: number | string;
  type?: string;
  icon?: string;
  state?: number;
  children?: SysMenuRow[];
  [key: string]: unknown;
}

/** save.vue 通过 defineExpose 暴露的方法 */
interface MenuSaveRef {
  open: (mode?: string) => void;
  setData: (row: unknown) => void;
  setParentId: (parentId: unknown) => void;
}

const dialog = ref({ save: false });
const saveRef = ref<MenuSaveRef | null>(null);
const loading = ref(false);
const treeData = ref([]);
const searchForm = ref({ name: '', state: '' });

const stateOptions = computed(() => [
  { label: t('common.normal'), value: 1 },
  { label: t('common.disabled'), value: 2 },
]);

const typeMap = computed<Record<string, string>>(() => ({
  M: t('pages.system.menu.typeMap.dir'),
  C: t('pages.system.menu.typeMap.menu'),
  F: t('pages.system.menu.typeMap.button'),
}));
const typeTagTheme: Record<string, 'primary' | 'success' | 'warning' | 'default'> = {
  M: 'primary',
  C: 'success',
  F: 'warning',
};

const columns = computed<PrimaryTableCol[]>(() => [
  { colKey: 'name', title: t('pages.system.menu.name'), width: 200 },
  {
    colKey: 'type',
    title: t('common.type'),
    width: 80,
    align: 'center',
    cell: (h, { row }) =>
      h(
        Tag,
        { theme: typeTagTheme[row.type] || 'default', variant: 'light' },
        () => typeMap.value[row.type] || row.type,
      ),
  },
  {
    colKey: 'icon',
    title: t('pages.system.menu.icon'),
    width: 80,
    align: 'center',
    cell: (h, { row }) => (row.icon ? h(Icon, { name: row.icon }) : ''),
  },
  { colKey: 'path', title: t('pages.system.menu.path'), width: 120 },
  { colKey: 'url', title: t('pages.system.menu.url'), width: 180, ellipsis: true },
  { colKey: 'perms', title: t('pages.system.menu.perms'), width: 160, ellipsis: true },
  { colKey: 'sort', title: t('common.sort'), width: 70, align: 'center' },
  {
    colKey: 'state',
    title: t('common.status'),
    width: 80,
    align: 'center',
    cell: (h, { row }) => {
      const ok = row.state === 1;
      const theme = ok ? ('success' as const) : ('danger' as const);
      const label = ok ? t('common.normal') : t('common.disabled');
      return h(Tag, { theme, variant: 'light' }, () => label);
    },
  },
  {
    colKey: 'op',
    title: t('common.operation'),
    width: 200,
    align: 'center',
    fixed: 'right',
    cell: (h, { row }) => {
      const btns = [];
      if (row.type !== 'F' && hasPermission('system:menu:add')) {
        btns.push(h('a', { onClick: () => addChild(row) }, t('pages.system.menu.action.addChild')));
      }
      if (hasPermission('system:menu:update')) {
        btns.push(h('a', { onClick: () => edit(row) }, t('common.edit')));
      }
      if (hasPermission('system:menu:delete')) {
        btns.push(
          h(
            'a',
            {
              style: 'color:var(--td-error-color)',
              onClick: () => {
                const confirmDia = DialogPlugin.confirm({
                  header: t('common.tips'),
                  body: t('pages.system.menu.message.confirmDelete'),
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
    const res = await api.menu.page(searchForm.value);
    treeData.value = res?.data || [];
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  fetchData();
};

const resetSearch = () => {
  searchForm.value = { name: '', state: '' };
  fetchData();
};

const add = () => {
  dialog.value.save = true;
  nextTick(() => {
    saveRef.value?.open('add');
  });
};

const addChild = (row: SysMenuRow) => {
  dialog.value.save = true;
  nextTick(() => {
    saveRef.value?.open('add');
    saveRef.value?.setParentId(row.id);
  });
};

const edit = (row: SysMenuRow) => {
  dialog.value.save = true;
  nextTick(() => {
    saveRef.value?.open('edit');
    saveRef.value?.setData(row);
  });
};

const handleDelete = async (row: SysMenuRow) => {
  if (row.id == null) return;
  try {
    const res = await api.menu.delete(row.id);
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
.system-menu-page {
  .search-card {
    margin-bottom: 16px;
  }
}
</style>
