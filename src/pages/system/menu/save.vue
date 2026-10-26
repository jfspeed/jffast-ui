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
  <t-dialog v-model:visible="visible" :header="titleMap[mode]" :width="650" destroy-on-close @closed="emit('closed')">
    <t-form ref="dialogForm" :data="form" :rules="rules" label-width="100px" :disabled="mode === 'show'">
      <t-form-item :label="t('pages.system.menu.parent')" name="parentId">
        <t-tree-select
          v-model="form.parentId"
          :data="menuTreeOptions"
          :tree-props="{ keys: { label: 'name', value: 'id', children: 'children' } }"
          :placeholder="t('pages.system.menu.placeholder.parent')"
          clearable
          @change="onParentIdChange"
        />
      </t-form-item>
      <t-form-item :label="t('pages.system.menu.menuType')" name="type">
        <t-radio-group v-model="form.type" :options="typeOptions" @change="onTypeChange" />
      </t-form-item>
      <t-row :gutter="20">
        <t-col :span="6">
          <t-form-item :label="t('pages.system.menu.name')" name="name">
            <t-input v-model="form.name" :placeholder="t('pages.system.menu.placeholder.name')" clearable />
          </t-form-item>
        </t-col>
      </t-row>
      <t-row :gutter="20">
        <t-col :span="6">
          <t-form-item :label="t('pages.system.menu.path')" name="path">
            <t-input v-model="form.path" :placeholder="t('pages.system.menu.placeholder.path')" clearable />
          </t-form-item>
        </t-col>
        <t-col :span="6">
          <t-form-item :label="t('pages.system.menu.url')" name="url">
            <t-input v-model="form.url" :placeholder="t('pages.system.menu.placeholder.url')" clearable />
          </t-form-item>
        </t-col>
      </t-row>
      <t-row :gutter="20">
        <t-col :span="12">
          <t-form-item :label="t('pages.system.menu.activeMenu')" name="activeMenu">
            <t-input v-model="form.activeMenu" :placeholder="t('common.pleaseInput')" clearable />
          </t-form-item>
        </t-col>
      </t-row>
      <t-row v-if="form.type === 'F'" :gutter="20">
        <t-col :span="6">
          <t-form-item :label="t('pages.system.menu.perms')" name="perms">
            <t-input v-model="form.perms" :placeholder="t('pages.system.menu.placeholder.perms')" clearable />
          </t-form-item>
        </t-col>
      </t-row>
      <t-row :gutter="20">
        <t-col :span="6">
          <t-form-item :label="t('common.sort')" name="sort">
            <t-input-number v-model="form.sort" :min="0" style="width: 100%" />
          </t-form-item>
        </t-col>
        <t-col :span="6">
          <t-form-item :label="t('pages.system.menu.icon')" name="icon">
            <div class="icon-picker-trigger" @click="showIconPicker = true">
              <t-icon :name="form.icon || 'app'" class="trigger-icon" />
              <span class="trigger-text" :class="{ placeholder: !form.icon }">
                {{ form.icon || t('pages.system.menu.iconPlaceholder') }}
              </span>
              <t-icon name="chevron-down" class="trigger-arrow" />
            </div>
          </t-form-item>
        </t-col>
      </t-row>
      <t-row :gutter="20">
        <t-col :span="6">
          <t-form-item :label="t('common.status')" name="state">
            <t-radio-group v-model="form.state" :options="stateOptions" />
          </t-form-item>
        </t-col>
        <t-col :span="6">
          <t-form-item :label="t('pages.system.menu.visible')" name="visible">
            <t-switch v-model="form.visible" :custom-value="[true, false]" />
          </t-form-item>
        </t-col>
      </t-row>
      <t-row :gutter="20">
        <t-col :span="12">
          <t-form-item :label="t('common.remark')" name="remark">
            <t-textarea
              v-model="form.remark"
              :placeholder="t('pages.system.menu.placeholder.remark')"
              :autosize="{ minRows: 2 }"
            />
          </t-form-item>
        </t-col>
      </t-row>
    </t-form>
    <template #footer>
      <t-button variant="outline" @click="visible = false">{{ t('common.dialogCancel') }}</t-button>
      <t-button v-if="mode !== 'show'" theme="primary" :loading="isSaving" @click="onSubmit">{{
        t('common.dialogSave')
      }}</t-button>
    </template>
  </t-dialog>

  <t-dialog
    v-model:visible="showIconPicker"
    :header="t('pages.system.menu.iconPicker')"
    width="800px"
    :footer="false"
    destroy-on-close
  >
    <t-input
      v-model="iconSearch"
      :placeholder="t('pages.system.menu.iconSearchPlaceholder')"
      clearable
      style="margin-bottom: 16px"
    />
    <div class="icon-picker-grid">
      <div
        v-for="name in filteredIcons"
        :key="name"
        class="icon-picker-item"
        :class="{ active: form.icon === name }"
        @click="selectIcon(name)"
      >
        <t-icon :name="name" />
        <div class="icon-picker-label">{{ name }}</div>
      </div>
    </div>
  </t-dialog>
</template>
<script lang="ts" setup>
import { manifest } from 'tdesign-icons-vue-next';
import type { FormRule, TreeOptionData } from 'tdesign-vue-next';
import { MessagePlugin } from 'tdesign-vue-next';
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import api from '@/api/system';
import { useForm } from '@/hooks/useForm';

const emit = defineEmits(['success', 'closed']);

const { t } = useI18n();

const menuList = ref<TreeOptionData[]>([]);

const menuTreeOptions = computed(() => [{ id: 0, name: t('common.root'), children: menuList.value }]);

const showIconPicker = ref(false);
const iconSearch = ref('');

const iconList = computed(() => {
  const names = manifest.map((item) => item.stem);
  return [...new Set(names)];
});

const filteredIcons = computed(() => {
  if (!iconSearch.value) return iconList.value;
  const keyword = iconSearch.value.toLowerCase();
  return iconList.value.filter((name) => name.includes(keyword));
});

const selectIcon = (name: string) => {
  form.icon = name;
  showIconPicker.value = false;
  iconSearch.value = '';
};

const typeOptions = computed(() => [
  { label: t('pages.system.menu.typeMap.dir'), value: 'M' },
  { label: t('pages.system.menu.typeMap.menu'), value: 'C' },
  { label: t('pages.system.menu.typeMap.button'), value: 'F' },
]);

const stateOptions = computed(() => [
  { label: t('common.normal'), value: 1 },
  { label: t('common.disabled'), value: 2 },
]);

const titleMap = computed<Record<string, string>>(() => ({
  add: t('common.add'),
  edit: t('common.edit'),
  show: t('common.view'),
}));

const rules = computed<Record<string, FormRule[]>>(() => ({
  name: [{ required: true, message: t('pages.system.menu.placeholder.name'), trigger: 'blur' }],
  type: [{ required: true, message: t('pages.system.menu.message.selectMenuType'), trigger: 'change' }],
}));

const onTypeChange = (val: unknown) => {
  if (val === 'M' && (form.parentId === 0 || form.parentId === '0')) {
    form.url = 'LAYOUT';
  }
};

const onParentIdChange = (val: unknown) => {
  if (form.type === 'M' && (val === 0 || val === '0')) {
    form.url = 'LAYOUT';
  }
};

const {
  visible,
  mode,
  isSaving,
  formRef: dialogForm,
  form,
  open,
  setData,
  submit: _formSubmit,
} = useForm({
  defaultForm: {
    id: '',
    parentId: 0,
    name: '',
    path: '',
    url: '',
    type: 'C',
    perms: '',
    sort: 0,
    icon: '',
    state: 1,
    visible: true,
    remark: '',
    activeMenu: '',
  },
});

const loadMenuTree = async () => {
  const res = await api.menu.page({});
  const list = res?.data || [];
  menuList.value = list;
};

const setParentId = (parentId: unknown) => {
  form.parentId = parentId as number;
  if (form.type === 'M' && (parentId === 0 || parentId === '0')) {
    form.url = 'LAYOUT';
  }
};

/** 菜单表单数据（与 defaultForm 对齐；可选以兼容后端动态 payload） */
interface MenuFormData {
  id?: number | string;
  parentId?: number;
  name?: string;
  path?: string;
  url?: string;
  type?: string;
  perms?: string;
  sort?: number;
  icon?: string;
  state?: number;
  visible?: boolean;
  remark?: string;
  /** 高亮菜单：详情页保持父级菜单高亮，后端写入 MetaVo.activeMenu */
  activeMenu?: string;
}

const setDataEx = (data: MenuFormData) => {
  setData(data);
  if (data.visible === undefined || data.visible === null) {
    form.visible = true;
  }
};

const onSubmit = async () => {
  let valid;
  try {
    valid = await (dialogForm.value as { validate: () => Promise<boolean> } | null)?.validate();
  } catch {
    valid = false;
  }
  if (valid !== true) return;

  const submitData = { ...form };
  if (submitData.id === '' || submitData.id === undefined || submitData.id === null) {
    delete submitData.id;
  }

  isSaving.value = true;
  try {
    const res = mode.value === 'add' ? await api.menu.create(submitData) : await api.menu.update(submitData);
    if (res && res.code === 200) {
      MessagePlugin.success(mode.value === 'add' ? t('common.addSuccess') : t('common.updateSuccess'));
      visible.value = false;
      emit('success', form, mode.value);
    }
  } finally {
    isSaving.value = false;
  }
};

onMounted(() => {
  loadMenuTree();
});

defineExpose({ open, setData: setDataEx, setParentId });
</script>
<style scoped>
.icon-picker-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  height: var(--td-comp-size-m, 36px);
  padding: 0 12px;
  border: 1px solid var(--td-border-level-2-color, #dcdcdc);
  border-radius: var(--td-radius-default, 6px);
  background: var(--td-bg-color-special-component, #fff);
  cursor: pointer;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.icon-picker-trigger:hover {
  border-color: var(--td-brand-color, #0052d9);
}

.trigger-icon {
  font-size: 18px;
  color: var(--td-text-color-primary, #333);
}

.trigger-text {
  flex: 1;
  font-size: 14px;
  color: var(--td-text-color-primary, #333);
}

.trigger-text.placeholder {
  color: var(--td-text-color-placeholder, #bbb);
}

.trigger-arrow {
  font-size: 16px;
  color: var(--td-text-color-placeholder, #bbb);
}

.icon-picker-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, 62px);
  gap: 6px;
  max-height: 420px;
  overflow-y: auto;
}

.icon-picker-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6px 2px;
  cursor: pointer;
  border-radius: var(--td-radius-default, 6px);
  border: 1px solid transparent;
  transition: all 0.2s;
}

.icon-picker-item:hover {
  background: var(--td-bg-color-container-hover, #f5f5f5);
  border-color: var(--td-brand-color, #0052d9);
}

.icon-picker-item.active {
  background: var(--td-brand-color-light, #f2f3ff);
  border-color: var(--td-brand-color, #0052d9);
}

.icon-picker-item .t-icon {
  font-size: 20px;
  margin-bottom: 2px;
}

.icon-picker-label {
  font-size: 10px;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
  line-height: 1.4;
  color: var(--td-text-color-secondary, #999);
}
</style>
