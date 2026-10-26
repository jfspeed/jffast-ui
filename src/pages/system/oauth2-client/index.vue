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
  <div class="oauth2-client-page">
    <t-card class="search-card">
      <t-form :data="searchForm" layout="inline" @submit="handleSearch" @reset="resetSearch">
        <t-form-item :label="t('pages.system.oauth2Client.name')" name="name">
          <t-input v-model="searchForm.name" :placeholder="t('pages.system.oauth2Client.placeholder.name')" clearable />
        </t-form-item>
        <t-form-item :label="t('pages.system.oauth2Client.provider')" name="provider">
          <t-input
            v-model="searchForm.provider"
            :placeholder="t('pages.system.oauth2Client.placeholder.provider')"
            clearable
          />
        </t-form-item>
        <t-form-item>
          <t-button theme="default" type="reset">{{ t('common.reset') }}</t-button>
          <t-button theme="primary" type="submit">{{ t('common.query') }}</t-button>
          <t-button v-permission="'system:oauth2client:add'" theme="success" @click="add">{{
            t('pages.system.oauth2Client.add')
          }}</t-button>
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

    <t-dialog
      v-model:visible="tokenDialogVisible"
      :header="t('pages.system.oauth2Client.tokenTitle')"
      :width="520"
      :footer="'' as any"
    >
      <t-textarea v-model="currentToken" disabled :autosize="{ minRows: 5 }" />
    </t-dialog>
  </div>
</template>
<script lang="ts" setup>
import type { PrimaryTableCol } from 'tdesign-vue-next';
import { DialogPlugin, MessagePlugin, Tag } from 'tdesign-vue-next';
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import oauth2Client from '@/api/oauth2Client';
import { useTable } from '@/hooks/useTable';
import { hasPermission } from '@/utils/permission';

import saveDialog from './save.vue';

const { t } = useI18n();

const tokenDialogVisible = ref(false);
const currentToken = ref('');

const handleToken = async (row: any) => {
  try {
    const res = await oauth2Client.token(row.provider);
    if (res && res.code === 200) {
      currentToken.value = res.data ?? '';
      tokenDialogVisible.value = true;
    } else {
      MessagePlugin.error(res?.message || t('pages.system.oauth2Client.message.tokenFail'));
    }
  } catch (e: any) {
    MessagePlugin.error(e.message || t('pages.system.oauth2Client.message.tokenFail'));
  }
};

const handleEvict = (row: any) => {
  const confirmDia = DialogPlugin.confirm({
    header: t('common.tips'),
    body: t('pages.system.oauth2Client.message.evictConfirm', { name: row.name }),
    onConfirm: async () => {
      confirmDia.destroy();
      try {
        const res = await oauth2Client.evict(row.provider);
        if (res && res.code === 200) {
          MessagePlugin.success(t('pages.system.oauth2Client.message.evictSuccess'));
        } else {
          MessagePlugin.error(res?.message || t('pages.system.oauth2Client.message.evictFail'));
        }
      } catch (e: any) {
        MessagePlugin.error(e.message || t('pages.system.oauth2Client.message.evictFail'));
      }
    },
  });
};

const columns = computed<PrimaryTableCol[]>(() => [
  { colKey: 'provider', title: t('pages.system.oauth2Client.provider'), width: 140 },
  { colKey: 'name', title: t('pages.system.oauth2Client.name'), width: 160 },
  { colKey: 'grantTypes', title: t('pages.system.oauth2Client.grantTypes'), width: 220 },
  { colKey: 'clientId', title: t('pages.system.oauth2Client.clientId'), width: 180 },
  { colKey: 'tokenUrl', title: t('pages.system.oauth2Client.tokenUrl'), ellipsis: true },
  {
    colKey: 'status',
    title: t('common.status'),
    width: 80,
    align: 'center',
    cell: (h: any, { row }: any) => {
      const on = row.status === 1;
      const theme = on ? 'success' : 'default';
      const label = on
        ? t('pages.system.oauth2Client.statusMap.enabled')
        : t('pages.system.oauth2Client.statusMap.disabled');
      return h(Tag, { theme, variant: 'light' }, () => label);
    },
  },
  { colKey: 'createTime', title: t('common.createTime'), width: 160 },
  {
    colKey: 'op',
    title: t('common.operation'),
    width: 200,
    align: 'center',
    fixed: 'right',
    cell: (h: any, { row }: any) => {
      const btns = [];
      // 权限码与后端 @SaCheckPermission 逐条对齐：
      // 修改=system:oauth2client:update / 读取凭据=system:oauth2client:token /
      // 清除令牌缓存=system:oauth2client:update（后端 evict 复用 update 权限）/
      // 删除=system:oauth2client:delete
      if (hasPermission('system:oauth2client:update')) {
        btns.push(h('a', { onClick: () => edit(row) }, t('common.edit')));
        btns.push(h('a', { onClick: () => handleEvict(row) }, t('pages.system.oauth2Client.evict')));
      }
      if (hasPermission('system:oauth2client:token')) {
        btns.push(h('a', { onClick: () => handleToken(row) }, t('pages.system.oauth2Client.token')));
      }
      if (hasPermission('system:oauth2client:delete')) {
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
  handlePageChange,
  handleSizeChange,
  fetchData,
} = useTable(oauth2Client, {
  defaultSearch: { name: '', provider: '' },
});

onMounted(() => {
  fetchData();
});
</script>
<style scoped lang="less">
.oauth2-client-page {
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
