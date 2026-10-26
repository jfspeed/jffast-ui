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
  <t-dialog v-model:visible="visible" :header="titleMap[mode]" :width="700" destroy-on-close @closed="emit('closed')">
    <t-form ref="dialogForm" :data="form" :rules="rules" label-width="100px" :disabled="mode === 'show'">
      <t-row :gutter="20">
        <t-col :span="6">
          <t-form-item :label="t('pages.system.role.roleName')" name="roleName">
            <t-input
              v-model="form.roleName"
              :placeholder="t('pages.system.role.placeholder.roleName')"
              clearable
              @blur="onRoleNameBlur"
            />
          </t-form-item>
        </t-col>
        <t-col :span="6">
          <t-form-item :label="t('pages.system.role.roleKey')" name="roleKey">
            <t-input
              v-model="form.roleKey"
              :placeholder="t('pages.system.role.placeholder.roleKey')"
              clearable
              :disabled="mode === 'edit'"
            />
          </t-form-item>
        </t-col>
      </t-row>
      <t-row :gutter="20">
        <t-col :span="6">
          <t-form-item :label="t('pages.system.role.dataScope')" name="dataScope">
            <t-select
              v-model="form.dataScope"
              :placeholder="t('pages.system.role.placeholder.dataScope')"
              clearable
              :options="dataScopeOptions"
              @change="onDataScopeChange"
            />
          </t-form-item>
        </t-col>
        <t-col :span="6">
          <t-form-item :label="t('common.remark')" name="remark">
            <t-input v-model="form.remark" :placeholder="t('pages.system.role.placeholder.remark')" clearable />
          </t-form-item>
        </t-col>
      </t-row>

      <t-divider>{{ t('pages.system.role.menuPermission') }}</t-divider>
      <div class="tree-toolbar">
        <t-checkbox v-model="menuCheckAll" :indeterminate="menuIndeterminate" @change="onMenuCheckAllChange">{{
          t('pages.system.role.checkAll')
        }}</t-checkbox>
        <t-button variant="text" size="small" @click="toggleMenuExpand">{{
          menuExpanded ? t('pages.system.role.collapse') : t('pages.system.role.expand')
        }}</t-button>
      </div>
      <div class="tree-container">
        <t-tree
          v-if="menuTreeData.length > 0"
          ref="menuTreeRef"
          :data="menuTreeData"
          :checkable="true"
          :value="checkedMenuKeys"
          :expand-all="menuExpanded"
          :keys="{ value: 'id', label: 'name', children: 'children' }"
          @change="onMenuCheck"
        />
      </div>

      <template v-if="form.dataScope === 5">
        <t-divider>{{ t('pages.system.role.deptPermission') }}</t-divider>
        <div class="tree-toolbar">
          <t-checkbox v-model="deptCheckAll" :indeterminate="deptIndeterminate" @change="onDeptCheckAllChange">{{
            t('pages.system.role.checkAll')
          }}</t-checkbox>
          <t-button variant="text" size="small" @click="toggleDeptExpand">{{
            deptExpanded ? t('pages.system.role.collapse') : t('pages.system.role.expand')
          }}</t-button>
        </div>
        <div class="tree-container">
          <t-tree
            v-if="deptTreeData.length > 0"
            ref="deptTreeRef"
            :data="deptTreeData"
            :checkable="true"
            :value="checkedDeptKeys"
            :expand-all="deptExpanded"
            :keys="{ value: 'id', label: 'deptName', children: 'children' }"
            @change="onDeptCheck"
          />
        </div>
      </template>
    </t-form>
    <template #footer>
      <t-button variant="outline" @click="visible = false">{{ t('common.dialogCancel') }}</t-button>
      <t-button v-if="mode !== 'show'" theme="primary" :loading="isSaving" @click="onSubmit">{{
        t('common.dialogSave')
      }}</t-button>
    </template>
  </t-dialog>
</template>
<script lang="ts" setup>
import type { FormRule } from 'tdesign-vue-next';
import { MessagePlugin } from 'tdesign-vue-next';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import api from '@/api/system';
import { useForm } from '@/hooks/useForm';

const emit = defineEmits(['success', 'closed']);

const { t } = useI18n();

/** 菜单 / 部门树节点：命名已知字段 + 索引签名，兼容后端动态 payload */
interface TreeNode {
  id: number | string;
  children?: TreeNode[];
  [key: string]: unknown;
}

const menuTreeData = ref<TreeNode[]>([]);
const deptTreeData = ref<TreeNode[]>([]);
const checkedMenuKeys = ref<Array<number | string>>([]);
const checkedDeptKeys = ref<Array<number | string>>([]);
const menuTreeRef = ref(null);
const deptTreeRef = ref(null);
const menuExpanded = ref(true);
const deptExpanded = ref(true);

const dataScopeOptions = computed(() => [
  { label: t('pages.system.role.dataScopeMap.all'), value: 1 },
  { label: t('pages.system.role.dataScopeMap.deptAndChildren'), value: 2 },
  { label: t('pages.system.role.dataScopeMap.dept'), value: 3 },
  { label: t('pages.system.role.dataScopeMap.self'), value: 4 },
  { label: t('pages.system.role.dataScopeMap.custom'), value: 5 },
]);

const titleMap = computed<Record<string, string>>(() => ({
  add: t('common.add'),
  edit: t('common.edit'),
  show: t('common.view'),
}));

const rules = computed<Record<string, FormRule[]>>(() => ({
  roleName: [{ required: true, message: t('pages.system.role.placeholder.roleName'), trigger: 'blur' }],
  roleKey: [{ required: true, message: t('pages.system.role.placeholder.roleKey'), trigger: 'blur' }],
}));

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
    roleName: '',
    roleKey: '',
    dataScope: 1,
    remark: '',
    menuIds: [],
    deptIds: [],
  },
});

const getLeafNodeIds = (treeData: TreeNode[]) => {
  const ids: Array<number | string> = [];
  const traverse = (nodes: TreeNode[]) => {
    for (const node of nodes) {
      if (!node.children || node.children.length === 0) {
        ids.push(node.id);
      } else {
        traverse(node.children);
      }
    }
  };
  traverse(treeData);
  return ids;
};

const menuCheckAll = computed({
  get() {
    const allLeafIds = getLeafNodeIds(menuTreeData.value);
    if (allLeafIds.length === 0) return false;
    return allLeafIds.every((id) => checkedMenuKeys.value.includes(id));
  },
  set() {},
});
const menuIndeterminate = computed(() => {
  const allLeafIds = getLeafNodeIds(menuTreeData.value);
  if (allLeafIds.length === 0) return false;
  const checked = allLeafIds.filter((id) => checkedMenuKeys.value.includes(id));
  return checked.length > 0 && checked.length < allLeafIds.length;
});

const deptCheckAll = computed({
  get() {
    const allLeafIds = getLeafNodeIds(deptTreeData.value);
    if (allLeafIds.length === 0) return false;
    return allLeafIds.every((id) => checkedDeptKeys.value.includes(id));
  },
  set() {},
});
const deptIndeterminate = computed(() => {
  const allLeafIds = getLeafNodeIds(deptTreeData.value);
  if (allLeafIds.length === 0) return false;
  const checked = allLeafIds.filter((id) => checkedDeptKeys.value.includes(id));
  return checked.length > 0 && checked.length < allLeafIds.length;
});

const onMenuCheckAllChange = (checked: boolean) => {
  if (checked) {
    checkedMenuKeys.value = getLeafNodeIds(menuTreeData.value);
  } else {
    checkedMenuKeys.value = [];
  }
};

const onDeptCheckAllChange = (checked: boolean) => {
  if (checked) {
    checkedDeptKeys.value = getLeafNodeIds(deptTreeData.value);
  } else {
    checkedDeptKeys.value = [];
  }
};

const toggleMenuExpand = () => {
  menuExpanded.value = !menuExpanded.value;
};

const toggleDeptExpand = () => {
  deptExpanded.value = !deptExpanded.value;
};

const loadMenuTree = async () => {
  try {
    const res = await api.menu.page({});
    menuTreeData.value = res?.data || [];
  } catch (e) {
    console.warn('loadMenuTree failed', e);
  }
};

const loadDeptTree = async () => {
  try {
    const res = await api.dept.page({});
    deptTreeData.value = res?.data || [];
  } catch (e) {
    console.warn('loadDeptTree failed', e);
  }
};

const onDataScopeChange = (val: unknown) => {
  if (val === 5 && deptTreeData.value.length === 0) {
    loadDeptTree();
  }
};

const onRoleNameBlur = async () => {
  if (form.roleName && !form.roleKey) {
    const res = await api.role.createDictCode(form.roleName);
    // 二次确认：blur 触发到响应返回之间存在窗口，用户可能已手输角色字符；
    // 无条件回填会静默覆盖用户输入
    if (res?.data && !form.roleKey) {
      form.roleKey = res.data;
    }
  }
};

const collectWithAncestors = (treeData: TreeNode[], checkedKeys: Array<number | string>) => {
  const result = new Set(checkedKeys);
  const traverse = (nodes: TreeNode[], ancestors: Array<number | string> = []) => {
    for (const node of nodes) {
      if (result.has(node.id)) {
        ancestors.forEach((a) => result.add(a));
      }
      if (node.children?.length) {
        traverse(node.children, [...ancestors, node.id]);
      }
    }
  };
  traverse(treeData);
  return Array.from(result);
};

const filterLeafKeys = (treeData: TreeNode[], allKeys: Array<number | string>) => {
  const keySet = new Set(allKeys);
  const leafKeys: Array<number | string> = [];
  const traverse = (nodes: TreeNode[]) => {
    for (const node of nodes) {
      if (!node.children || node.children.length === 0) {
        if (keySet.has(node.id)) {
          leafKeys.push(node.id);
        }
      } else {
        traverse(node.children);
      }
    }
  };
  traverse(treeData);
  return leafKeys;
};

const onMenuCheck = (value: unknown) => {
  checkedMenuKeys.value = value as Array<number | string>;
};

const onDeptCheck = (value: unknown) => {
  checkedDeptKeys.value = value as Array<number | string>;
};

/** 角色表单 / 提交数据结构（与 defaultForm 对齐；可选以兼容后端动态 payload） */
interface RoleFormData {
  id?: number | string;
  roleName?: string;
  roleKey?: string;
  dataScope?: number;
  remark?: string;
  menuIds?: Array<number | string>;
  deptIds?: Array<number | string>;
}

const setDataEx = async (data: RoleFormData) => {
  setData(data);
  if (data.id) {
    let menuOk = false;
    let deptOk = false;
    try {
      const menuRes = await api.role.roleMenuTree(data.id);
      if (menuRes?.data) {
        menuTreeData.value = menuRes.data.menuList || [];
        checkedMenuKeys.value = filterLeafKeys(menuTreeData.value, menuRes.data.checkedKeys || []);
        menuOk = true;
      }
    } catch (e) {
      console.warn('roleMenuTree failed', e);
    }
    try {
      const deptRes = await api.role.roleDeptTree(data.id);
      if (deptRes?.data) {
        deptTreeData.value = deptRes.data.deptList || [];
        checkedDeptKeys.value = filterLeafKeys(deptTreeData.value, deptRes.data.checkedKeys || []);
        deptOk = true;
      }
    } catch (e) {
      console.warn('roleDeptTree failed', e);
    }
    if (!menuOk) await loadMenuTree();
    if (!deptOk) await loadDeptTree();
  } else {
    checkedMenuKeys.value = [];
    checkedDeptKeys.value = [];
    await Promise.all([loadMenuTree(), loadDeptTree()]);
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

  const submitData = { ...form } as RoleFormData;
  if (submitData.id === '' || submitData.id === undefined || submitData.id === null) {
    delete submitData.id;
  }

  submitData.menuIds = collectWithAncestors(menuTreeData.value, checkedMenuKeys.value);
  submitData.deptIds = checkedDeptKeys.value;

  isSaving.value = true;
  try {
    const res = mode.value === 'add' ? await api.role.create(submitData) : await api.role.update(submitData);
    if (res && res.code === 200) {
      MessagePlugin.success(mode.value === 'add' ? t('common.addSuccess') : t('common.updateSuccess'));
      visible.value = false;
      emit('success', form, mode.value);
    }
  } finally {
    isSaving.value = false;
  }
};

defineExpose({ open, setData: setDataEx });
</script>
<style scoped>
.tree-toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 8px;
}

.tree-container {
  max-height: 600px;
  overflow-y: auto;
  border: 1px solid var(--td-border-level-1-color);
  border-radius: var(--td-radius-medium);
  padding: 8px;
}
</style>
