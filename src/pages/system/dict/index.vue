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
  <div class="system-dict-page">
    <t-row :gutter="16">
      <t-col :span="4">
        <t-card :title="t('pages.system.dict.typeTitle')">
          <template #actions>
            <t-button v-permission="'system:dict:add'" theme="primary" size="small" @click="addType">{{
              t('pages.system.dict.addType')
            }}</t-button>
          </template>
          <t-tree
            :data="typeTreeData"
            :active-multiple="false"
            :expand-all="true"
            :hover="true"
            :activable="true"
            :keys="{ label: 'name', value: 'id', children: 'children' }"
            @active="onTypeSelect"
          />
        </t-card>
      </t-col>
      <t-col :span="8">
        <t-card
          :title="
            currentTypeName
              ? t('pages.system.dict.itemTitleWith', { name: currentTypeName })
              : t('pages.system.dict.itemTitle')
          "
        >
          <template #actions>
            <t-button
              v-permission="'system:dict:add'"
              theme="primary"
              size="small"
              :disabled="!currentTypeId"
              @click="addItem"
              >{{ t('pages.system.dict.addItem') }}</t-button
            >
          </template>
          <t-table :loading="itemLoading" :data="itemData" :columns="itemColumns" row-key="id" stripe bordered />

          <div v-if="itemTotal > 0" class="pagination-container">
            <t-pagination
              :current="itemPage.pageNum"
              :page-size="itemPage.pageSize"
              :total="itemTotal"
              :page-size-options="[10, 20, 50]"
              show-jumper
              @current-change="
                (p: number) => {
                  itemPage.pageNum = p;
                  loadItems();
                }
              "
              @page-size-change="
                (s: number) => {
                  itemPage.pageSize = s;
                  itemPage.pageNum = 1;
                  loadItems();
                }
              "
            />
          </div>
        </t-card>
      </t-col>
    </t-row>

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

/** 字典类型树节点 */
interface DictTypeNode {
  id?: number | string;
  name?: string;
  children?: DictTypeNode[];
  [key: string]: unknown;
}

/** 字典项行（字段全可选，兼容 TDesign TableRowData） */
interface DictItemRow {
  id?: number | string;
  [key: string]: unknown;
}

/** save.vue 通过 defineExpose 暴露的方法 */
interface DictSaveRef {
  open: (mode?: string) => void;
  setData: (row: unknown) => void;
  setIsType: (isType: number) => void;
  setParentId: (parentId: unknown) => void;
}

const dialog = ref({ save: false });
const saveRef = ref<DictSaveRef | null>(null);
const typeTreeData = ref<DictTypeNode[]>([]);
const currentTypeId = ref<number | string | null>(null);
const currentTypeName = ref('');
const itemLoading = ref(false);
const itemData = ref<DictItemRow[]>([]);
const itemTotal = ref(0);
const itemPage = ref({ pageNum: 1, pageSize: 10 });

const itemColumns = computed<PrimaryTableCol[]>(() => [
  { colKey: 'name', title: t('pages.system.dict.dictName'), width: 150 },
  { colKey: 'code', title: t('pages.system.dict.dictCode'), width: 150 },
  { colKey: 'value', title: t('pages.system.dict.dictValue'), width: 100 },
  { colKey: 'sort', title: t('common.sort'), width: 80, align: 'center' },
  { colKey: 'remark', title: t('common.remark'), ellipsis: true },
  {
    colKey: 'op',
    title: t('common.operation'),
    width: 150,
    align: 'center',
    fixed: 'right',
    cell: (h, { row }) => {
      const btns = [];
      if (hasPermission('system:dict:update')) {
        btns.push(h('a', { onClick: () => editItem(row) }, t('common.edit')));
      }
      if (hasPermission('system:dict:delete')) {
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

const loadTypes = async () => {
  const res = await api.dict.dictTypeList({});
  typeTreeData.value = res?.data || [];
};

const onTypeSelect = (value: unknown) => {
  const id = (Array.isArray(value) ? value[0] : value) as number | string | null | undefined;
  if (id !== undefined && id !== null && id !== '') {
    const findNode = (nodes: DictTypeNode[]) => {
      for (const node of nodes) {
        if (node.id === id) {
          currentTypeId.value = id;
          currentTypeName.value = node.name ?? '';
          return;
        }
        if (node.children) findNode(node.children);
      }
    };
    findNode(typeTreeData.value);
    itemPage.value.pageNum = 1;
    loadItems();
  }
};

const loadItems = async () => {
  if (!currentTypeId.value) return;
  itemLoading.value = true;
  try {
    const res = await api.dict.page({
      parentId: currentTypeId.value,
      pageNo: itemPage.value.pageNum,
      pageSize: itemPage.value.pageSize,
    });
    const data = res?.data || {};
    itemData.value = data.list || [];
    itemTotal.value = data.total || 0;
  } finally {
    itemLoading.value = false;
  }
};

const addType = () => {
  dialog.value.save = true;
  setTimeout(() => {
    saveRef.value?.open('add');
    saveRef.value?.setIsType(1);
  }, 0);
};

const addItem = () => {
  dialog.value.save = true;
  setTimeout(() => {
    saveRef.value?.open('add');
    saveRef.value?.setIsType(2);
    saveRef.value?.setParentId(currentTypeId.value);
  }, 0);
};

const editItem = (row: DictItemRow) => {
  dialog.value.save = true;
  setTimeout(() => {
    saveRef.value?.open('edit');
    saveRef.value?.setData(row);
  }, 0);
};

const handleDelete = async (row: DictItemRow) => {
  if (row.id == null) return;
  try {
    const res = await api.dict.delete(row.id);
    if (res.code === 200) {
      MessagePlugin.success(t('common.deleteSuccess'));
      loadItems();
    } else {
      MessagePlugin.error(res.message || t('common.deleteFail'));
    }
  } catch (e) {
    MessagePlugin.error((e as Error).message || t('common.deleteFail'));
  }
};

const handleSaveSuccess = () => {
  dialog.value.save = false;
  loadTypes();
  if (currentTypeId.value) {
    loadItems();
  }
};

onMounted(() => {
  loadTypes();
});
</script>
<style scoped lang="less">
.system-dict-page {
  .pagination-container {
    margin-top: 16px;
    display: flex;
    justify-content: flex-end;
  }
}
</style>
