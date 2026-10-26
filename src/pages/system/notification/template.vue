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
  <div class="notification-template">
    <t-row :gutter="16">
      <t-col :span="4">
        <GroupPanel
          :group-list="groupList"
          :active-id="groupId"
          @add-group="openGroupDialog()"
          @select="selectGroup"
          @edit-group="openGroupDialog"
          @remove-group="removeGroup"
        />
      </t-col>

      <t-col :span="8">
        <t-card :bordered="true">
          <template #header>
            <div class="flex-between">
              <t-space>
                <t-input
                  v-model="searchForm.name"
                  :placeholder="t('pages.system.notification.templatePage.namePlaceholder')"
                  clearable
                  style="width: 160px"
                  @clear="onSearch"
                  @enter="onSearch"
                />
                <t-input
                  v-model="searchForm.code"
                  :placeholder="t('pages.system.notification.templatePage.codePlaceholder')"
                  clearable
                  style="width: 160px"
                  @clear="onSearch"
                  @enter="onSearch"
                />
                <t-button theme="default" @click="onSearch">{{ t('common.query') }}</t-button>
              </t-space>
              <t-space>
                <t-button theme="default" @click="resetSearch">{{ t('common.reset') }}</t-button>
                <t-button
                  v-permission="'system:notification:template:add'"
                  theme="primary"
                  @click="openTemplateDialog()"
                >
                  <template #icon><t-icon name="add" /></template>
                  {{ t('pages.system.notification.templatePage.add') }}
                </t-button>
              </t-space>
            </div>
          </template>

          <t-table :loading="loading" :data="tableData" :columns="columns" row-key="id" />

          <div class="pagination-container">
            <t-pagination
              :current="pagination.pageNo"
              :page-size="pagination.pageSize"
              :total="total"
              :page-size-options="[10, 20, 50]"
              show-jumper
              @current-change="
                (p: number) => {
                  pagination.pageNo = p;
                  loadTemplates();
                }
              "
              @page-size-change="
                (s: number) => {
                  pagination.pageSize = s;
                  pagination.pageNo = 1;
                  loadTemplates();
                }
              "
            />
          </div>
        </t-card>
      </t-col>
    </t-row>

    <GroupDialog ref="groupDialogRef" v-model:visible="groupDialogVisible" @confirm="submitGroup" />

    <TemplateDialog
      ref="templateDialogRef"
      v-model:visible="templateDialogVisible"
      :group-select-options="groupSelectOptions"
      @confirm="submitTemplate"
    />
  </div>
</template>

<script lang="ts" setup>
import type { PrimaryTableCol } from 'tdesign-vue-next';

import { DialogPlugin, MessagePlugin } from 'tdesign-vue-next';
import { computed, h, onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import systemApi from '@/api/system';
import { typeLabelOf } from '@/store';
import { hasPermission } from '@/utils/permission';

import GroupDialog from './components/GroupDialog.vue';
import GroupPanel from './components/GroupPanel.vue';
import TemplateDialog from './components/TemplateDialog.vue';

const { t } = useI18n();

// 模板编码合法性正则（模块级常量，避免重复编译）
const TEMPLATE_CODE_PATTERN = /^[a-zA-Z][a-zA-Z0-9_]*$/;

const groupList = ref<{ id: string | number; name: string; code: string }[]>([]);
const groupId = ref<string | number | null>(null);
const loading = ref(false);
const tableData = ref([]);
const total = ref(0);
const pagination = ref({ pageNo: 1, pageSize: 10 });
const searchForm = ref({ name: '', code: '' });

const groupDialogRef = ref<InstanceType<typeof GroupDialog>>();
const templateDialogRef = ref<InstanceType<typeof TemplateDialog>>();
const groupDialogVisible = ref(false);
const templateDialogVisible = ref(false);
// 提交中标记：按钮 loading + 阻止重复提交（双击 / 回车连发）
const submittingGroup = ref(false);
const submittingTemplate = ref(false);

const groupSelectOptions = computed(() => groupList.value.map((g) => ({ label: g.name, value: g.id })));

const columns = computed<PrimaryTableCol[]>(() => [
  { colKey: 'name', title: t('pages.system.notification.templatePage.name'), ellipsis: true },
  { colKey: 'code', title: t('pages.system.notification.templatePage.code'), width: 160 },
  {
    colKey: 'groupId',
    title: t('pages.system.notification.templatePage.group'),
    width: 120,
    cell: (h, { row }) => groupName(row.groupId),
  },
  { colKey: 'type', title: t('common.type'), width: 100, cell: (h, { row }) => typeLabelOf(row.type) || row.type },
  { colKey: 'level', title: t('pages.system.notification.templatePage.level'), width: 80 },
  {
    colKey: 'status',
    title: t('common.status'),
    width: 80,
    cell: (h, { row }) =>
      row.status === 1
        ? h('t-tag', { theme: 'success', variant: 'light' }, t('pages.system.notification.statusMap.enabled'))
        : h('t-tag', { theme: 'default', variant: 'light' }, t('pages.system.notification.statusMap.disabled')),
  },
  {
    colKey: 'op',
    title: t('common.operation'),
    width: 140,
    fixed: 'right',
    // 行级按钮与页面上方"新增模板"按钮（`v-permission`）保持一致：无权限则不渲染
    // （2026-09-24 评审发现这里原先是不受控的裸 <a>，与分组区权限指令不一致）
    cell: (h, { row }) =>
      h('div', { style: 'display:flex;gap:8px;' }, [
        ...(hasPermission('system:notification:template:edit')
          ? [h('a', { style: 'color:var(--td-brand-color)', onClick: () => openTemplateDialog(row) }, t('common.edit'))]
          : []),
        ...(hasPermission('system:notification:template:delete')
          ? [h('a', { style: 'color:var(--td-error-color)', onClick: () => removeTemplate(row) }, t('common.delete'))]
          : []),
      ]),
  },
]);

const groupName = (id: string | number) => groupList.value.find((g) => g.id === id)?.name || '-';

const loadGroups = async () => {
  const res = await systemApi.notificationTemplateGroup.listEnabled();
  if (res.code === 200) {
    groupList.value = res.data || [];
  }
};

const loadTemplates = async () => {
  loading.value = true;
  try {
    const res = await systemApi.notificationTemplate.page({
      name: searchForm.value.name || undefined,
      code: searchForm.value.code || undefined,
      groupId: groupId.value || undefined,
      pageNo: pagination.value.pageNo,
      pageSize: pagination.value.pageSize,
    });
    if (res.code === 200) {
      tableData.value = res.data?.list || [];
      total.value = res.data?.total || 0;
    }
  } finally {
    loading.value = false;
  }
};

const selectGroup = (group: any) => {
  // 再次点击同一分组即取消筛选
  groupId.value = groupId.value === group.id ? null : group.id;
  pagination.value.pageNo = 1;
  loadTemplates();
};

const onSearch = () => {
  pagination.value.pageNo = 1;
  loadTemplates();
};

const resetSearch = () => {
  searchForm.value = { name: '', code: '' };
  groupId.value = null;
  onSearch();
};

const openGroupDialog = (group?: any) => {
  groupDialogRef.value?.open(group);
  groupDialogVisible.value = true;
};

const submitGroup = async (form: any) => {
  if (submittingGroup.value) return;
  form.name = (form.name || '').trim();
  form.code = (form.code || '').trim();
  if (!form.name || !form.code) {
    MessagePlugin.warning(t('pages.system.notification.message.groupNameCodeRequired'));
    return;
  }
  submittingGroup.value = true;
  try {
    const res = form.id
      ? await systemApi.notificationTemplateGroup.update(form)
      : await systemApi.notificationTemplateGroup.create(form);
    if (res.code === 200) {
      MessagePlugin.success(t('common.saveSuccess'));
      groupDialogVisible.value = false;
      loadGroups();
    }
  } finally {
    submittingGroup.value = false;
  }
};

const removeGroup = (group: any) => {
  const confirmDia = DialogPlugin.confirm({
    header: t('common.tips'),
    body: t('pages.system.notification.message.deleteGroupConfirm', { name: group.name }),
    onConfirm: async () => {
      confirmDia.destroy();
      const res = await systemApi.notificationTemplateGroup.delete(group.id);
      if (res.code === 200) {
        MessagePlugin.success(t('common.deleteSuccess'));
        if (groupId.value === group.id) groupId.value = null;
        loadGroups();
        loadTemplates();
      }
    },
  });
};

const openTemplateDialog = (row?: any) => {
  templateDialogRef.value?.open(row, groupId.value);
  templateDialogVisible.value = true;
};

const submitTemplate = async (form: any) => {
  if (submittingTemplate.value) return;
  form.name = (form.name || '').trim();
  form.code = (form.code || '').trim();
  if (!form.name || !form.code) {
    MessagePlugin.warning(t('pages.system.notification.message.templateNameCodeRequired'));
    return;
  }
  if (!TEMPLATE_CODE_PATTERN.test(form.code)) {
    MessagePlugin.warning(t('pages.system.notification.message.codePattern'));
    return;
  }
  submittingTemplate.value = true;
  try {
    const res = form.id
      ? await systemApi.notificationTemplate.update(form)
      : await systemApi.notificationTemplate.create(form);
    if (res.code === 200) {
      MessagePlugin.success(t('common.saveSuccess'));
      templateDialogVisible.value = false;
      loadTemplates();
    }
  } finally {
    submittingTemplate.value = false;
  }
};

const removeTemplate = (row: any) => {
  const confirmDia = DialogPlugin.confirm({
    header: t('common.tips'),
    body: t('pages.system.notification.message.deleteTemplateConfirm', { name: row.name }),
    onConfirm: async () => {
      confirmDia.destroy();
      const res = await systemApi.notificationTemplate.delete(row.id);
      if (res.code === 200) {
        MessagePlugin.success(t('common.deleteSuccess'));
        loadTemplates();
      }
    },
  });
};

onMounted(() => {
  loadGroups();
  loadTemplates();
});

defineExpose({ loadGroups, loadTemplates });
</script>

<style scoped lang="less">
.notification-template {
  .flex-between {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
  }

  .pagination-container {
    margin-top: 16px;
    display: flex;
    justify-content: flex-end;
  }
}
</style>
