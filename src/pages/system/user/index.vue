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
  <div class="system-user-page">
    <t-card class="search-card">
      <t-form :data="searchForm" layout="inline" @submit="handleSearch" @reset="resetSearchEx">
        <t-form-item :label="t('common.userName')" name="userName">
          <t-input v-model="searchForm.userName" :placeholder="t('pages.system.user.placeholder.userName')" clearable />
        </t-form-item>
        <t-form-item :label="t('common.realName')" name="realName">
          <t-input v-model="searchForm.realName" :placeholder="t('pages.system.user.placeholder.realName')" clearable />
        </t-form-item>
        <t-form-item :label="t('common.phone')" name="phone">
          <t-input v-model="searchForm.phone" :placeholder="t('pages.system.user.placeholder.phone')" clearable />
        </t-form-item>
        <t-form-item :label="t('common.createTime')">
          <t-date-range-picker
            v-model="dateRange"
            allow-input
            clearable
            style="width: 240px"
            @change="onDateRangeChange"
          />
        </t-form-item>
        <t-form-item :label="t('common.status')" name="state">
          <t-select
            v-model="searchForm.state"
            :placeholder="t('pages.system.user.placeholder.state')"
            clearable
            style="width: 120px"
          >
            <t-option :value="1" :label="t('common.normal')" />
            <t-option :value="2" :label="t('common.disabled')" />
          </t-select>
        </t-form-item>
        <t-form-item>
          <t-button theme="default" type="reset">{{ t('common.reset') }}</t-button>
          <t-button theme="primary" type="submit">{{ t('common.query') }}</t-button>
          <t-button v-permission="'system:user:add'" theme="success" @click="add">{{ t('common.add') }}</t-button>
          <t-button v-permission="'system:user:view'" theme="primary" variant="outline" @click="handleExport">{{
            t('common.export')
          }}</t-button>
          <t-button v-permission="'system:user:add'" theme="primary" variant="text" @click="handleImportTemplate">{{
            t('pages.system.user.action.downloadTemplate')
          }}</t-button>
          <t-upload
            v-permission="'system:user:add'"
            :auto-upload="false"
            :show-upload-list="false"
            accept=".xlsx,.xls"
            theme="custom"
            @change="handleImportFile"
          >
            <t-button theme="warning" variant="outline">{{ t('common.import') }}</t-button>
          </t-upload>
          <t-button v-permission="'system:user:view'" theme="default" variant="outline" @click="handleExportAsync">{{
            t('pages.system.user.action.exportAsync')
          }}</t-button>
          <t-upload
            v-permission="'system:user:add'"
            :auto-upload="false"
            :show-upload-list="false"
            accept=".xlsx,.xls"
            theme="custom"
            @change="handleImportAsyncFile"
          >
            <t-button theme="default" variant="outline">{{ t('pages.system.user.action.importAsync') }}</t-button>
          </t-upload>
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

    <save-dialog v-if="dialog.save" ref="saveRef" @success="handleSaveSuccess" @closed="dialog.save = false" />
  </div>
</template>
<script lang="ts" setup>
import type { PrimaryTableCol } from 'tdesign-vue-next';
import { DialogPlugin, MessagePlugin } from 'tdesign-vue-next';
import { computed, h, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import api from '@/api/system';
import { useTable } from '@/hooks/useTable';
import { hasPermission } from '@/utils/permission';

import saveDialog from './save.vue';

const { t } = useI18n();

/** 用户列表行：命名已知字段 + 索引签名，兼容后端动态 payload 与 TDesign TableRowData */
interface SysUserRow {
  id?: number | string;
  userName?: string;
  realName?: string;
  nickName?: string;
  state?: number;
  createTime?: string;
  [key: string]: unknown;
}

/** 搜索表单：useTable 的 searchForm 为宽松类型，这里显式化以支持字段解构 */
interface UserSearchForm {
  userName: string;
  realName: string;
  phone: string;
  beginTime: string;
  endTime: string;
  state: number | string;
}

const columns = computed<PrimaryTableCol[]>(() => [
  { colKey: 'userName', title: t('common.userName'), width: 120 },
  { colKey: 'realName', title: t('common.realName'), width: 100 },
  { colKey: 'nickName', title: t('common.nickName'), width: 100 },
  { colKey: 'deptName', title: t('pages.system.user.field.dept'), width: 120 },
  { colKey: 'roleName', title: t('pages.system.user.field.role'), width: 120 },
  { colKey: 'phone', title: t('common.phone'), width: 130 },
  { colKey: 'email', title: t('common.email'), width: 160 },
  {
    colKey: 'state',
    title: t('common.status'),
    width: 80,
    cell: (h, { row }) =>
      row.state === 1
        ? h('span', { style: 'color:var(--td-success-color)' }, t('common.normal'))
        : h('span', { style: 'color:var(--td-error-color)' }, t('common.disabled')),
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
    width: 250,
    align: 'center',
    fixed: 'right',
    cell: (h, { row }) => {
      const btns = [];
      if (hasPermission('system:user:update')) {
        btns.push(h('a', { onClick: () => edit(row) }, t('common.edit')));
      }
      if (hasPermission('system:user:resetPassword')) {
        btns.push(
          h(
            'a',
            { style: 'color:var(--td-warning-color)', onClick: () => handleResetPassword(row) },
            t('pages.system.user.action.resetPassword'),
          ),
        );
      }
      if (hasPermission('system:user:unlock') && row.userName !== 'admin') {
        btns.push(
          h(
            'a',
            { style: 'color:var(--td-success-color)', onClick: () => handleUnlock(row) },
            t('pages.system.user.action.unlock'),
          ),
        );
      }
      if (hasPermission('system:user:delete') && row.userName !== 'admin') {
        btns.push(
          h(
            'a',
            {
              style: 'color:var(--td-error-color)',
              onClick: () => {
                const confirmDia = DialogPlugin.confirm({
                  header: t('common.tips'),
                  body: t('pages.system.user.message.confirmDelete'),
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
} = useTable(api.user, {
  defaultSearch: { userName: '', realName: '', phone: '', beginTime: '', endTime: '', state: '' },
});

/**
 * 创建时间范围：日期选择器的值**不能**直接放进 searchForm。
 * 原因：axios 默认序列化扁平数组会加 `[]` 后缀（createTime[]=…），后端
 * `@RequestParam Map<String,Object>` 收到的键是 "createTime[]" ⇒
 * `map.get("createTime") instanceof List` 恒 false ⇒ beginTime/endTime 永不生成 ⇒
 * 列表按创建时间筛选静默失效（无任何报错）。
 * 口径与 log 页一致：选择器值落 dateRange，@change 时归一化成 beginTime/endTime。
 */
const dateRange = ref<string[]>([]);

const onDateRangeChange = (value: unknown) => {
  const range = value as string[] | undefined;
  const form = searchForm as unknown as UserSearchForm;
  if (range && range.length === 2) {
    form.beginTime = range[0];
    form.endTime = range[1];
  } else {
    form.beginTime = '';
    form.endTime = '';
  }
};

/** 重置：日期范围在独立的 dateRange 上，useTable 的 resetSearch 不管它，需一并清空 */
const resetSearchEx = () => {
  dateRange.value = [];
  resetSearch();
};

const handleResetPassword = async (row: SysUserRow) => {
  const confirmDia = DialogPlugin.confirm({
    header: t('common.tips'),
    body: t('pages.system.user.message.resetPasswordConfirm'),
    onConfirm: async () => {
      confirmDia.destroy();
      const res = await api.user.resetPassword({ userId: row.id });
      if (res && res.code === 200) {
        const password = res.data?.password || '';
        // 一次性随机密码只在本次响应里出现，关闭弹窗后无法再次查看
        const pwdDia: ReturnType<typeof DialogPlugin> = DialogPlugin({
          header: t('pages.system.user.message.resetPasswordResultHeader'),
          body: () =>
            h('div', [
              h('p', { style: 'margin-bottom:8px;' }, t('pages.system.user.message.resetPasswordResultTip')),
              h(
                'div',
                {
                  style:
                    'font-family:var(--td-font-family-code,monospace);font-size:16px;padding:8px 12px;' +
                    'background:var(--td-bg-color-secondarycontainer);border-radius:4px;word-break:break-all;user-select:all;',
                },
                password,
              ),
            ]),
          confirmBtn: t('common.confirm'),
          onConfirm: () => pwdDia.destroy(),
          onClose: () => pwdDia.destroy(),
        });
      }
    },
  });
};

const handleUnlock = async (row: SysUserRow) => {
  const confirmDia = DialogPlugin.confirm({
    header: t('common.tips'),
    body: t('pages.system.user.message.unlockConfirm', { name: row.userName }),
    onConfirm: async () => {
      confirmDia.destroy();
      const res = await api.user.unlock(row.id);
      if (res && res.code === 200) {
        MessagePlugin.success(t('pages.system.user.message.unlockSuccess'));
      }
    },
  });
};

const handleExport = () => {
  // beginTime/endTime 已由 onDateRangeChange 归一化进 searchForm，直接透传即可
  api.user
    .exportUser({ ...(searchForm as unknown as UserSearchForm) })
    .then(() => {
      MessagePlugin.success(t('pages.system.user.message.exportSuccess'));
    })
    .catch(() => {
      // 错误提示已由 request 拦截器统一弹出，此处不重复 toast
    });
};

const handleImportTemplate = () => {
  api.user
    .importTemplate()
    .then(() => {
      MessagePlugin.success(t('pages.system.user.message.templateDownloaded'));
    })
    .catch(() => {
      // 错误提示已由 request 拦截器统一弹出，此处不重复 toast
    });
};

/** t-upload change 首参为文件数组（TDesign 签名 `(value, context) => void`），只取第一个 */
const handleImportFile = (files: unknown) => {
  const file = (Array.isArray(files) ? files[0] : files) as { raw?: File } | undefined;
  if (!file) return;
  api.user
    .importUser(file.raw || file)
    .then((res) => {
      const data = res?.data || {};
      if (data.failureCount > 0) {
        const first = (data.failures || []).slice(0, 3).join('；');
        MessagePlugin.warning(
          t('pages.system.user.message.importPartial', {
            success: data.successCount,
            failure: data.failureCount,
            detail: first,
          }),
        );
      } else {
        MessagePlugin.success(t('pages.system.user.message.importSuccess', { count: data.successCount }));
      }
      fetchData();
    })
    .catch(() => {
      // 错误提示已由 request 拦截器统一弹出，此处不重复 toast
    });
};

const handleExportAsync = () => {
  // beginTime/endTime 已由 onDateRangeChange 归一化进 searchForm，直接透传即可
  api.user
    .exportUserAsync({ ...(searchForm as unknown as UserSearchForm) })
    .then(() => {
      MessagePlugin.success(t('pages.system.user.message.asyncExportCreated'));
    })
    .catch(() => {
      // 错误提示已由 request 拦截器统一弹出，此处不重复 toast
    });
};

const handleImportAsyncFile = (files: unknown) => {
  const file = (Array.isArray(files) ? files[0] : files) as { raw?: File } | undefined;
  if (!file) return;
  api.user
    .importUserAsync(file.raw || file)
    .then(() => {
      MessagePlugin.success(t('pages.system.user.message.asyncImportCreated'));
    })
    .catch(() => {
      // 错误提示已由 request 拦截器统一弹出，此处不重复 toast
    });
};

onMounted(() => {
  fetchData();
});
</script>
<style scoped lang="less">
.system-user-page {
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
