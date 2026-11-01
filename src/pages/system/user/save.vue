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
      <t-form-item :label="t('common.userName')" name="userName">
        <t-input
          v-model="form.userName"
          :placeholder="t('pages.system.user.placeholder.userName')"
          clearable
          :disabled="mode === 'edit'"
        />
      </t-form-item>
      <t-form-item :label="t('common.realName')" name="realName">
        <t-input v-model="form.realName" :placeholder="t('pages.system.user.placeholder.realName')" clearable />
      </t-form-item>
      <t-form-item :label="t('common.nickName')" name="nickName">
        <t-input v-model="form.nickName" :placeholder="t('pages.system.user.placeholder.nickName')" clearable />
      </t-form-item>
      <t-form-item v-if="mode === 'add'" :label="t('pages.system.user.field.password')" name="password">
        <t-input
          v-model="form.password"
          type="password"
          :placeholder="t('pages.system.user.placeholder.password')"
          clearable
        />
      </t-form-item>
      <t-form-item :label="t('common.status')" name="state">
        <t-switch v-model="form.state" :custom-value="[1, 2]" :label="[t('common.normal'), t('common.disabled')]" />
      </t-form-item>
      <t-form-item :label="t('common.phone')" name="phone">
        <t-input v-model="form.phone" :placeholder="t('pages.system.user.placeholder.phone')" clearable />
      </t-form-item>
      <t-form-item :label="t('common.email')" name="email">
        <t-input v-model="form.email" :placeholder="t('pages.system.user.placeholder.email')" clearable />
      </t-form-item>
      <t-form-item :label="t('pages.system.user.field.dept')" name="deptId">
        <t-tree-select
          v-model="form.deptId"
          :data="deptTreeOptions"
          :tree-props="{ keys: { label: 'deptName', value: 'id', children: 'children' } }"
          :placeholder="t('pages.system.user.placeholder.dept')"
          :disabled="!canEditDept"
          :loading="deptLoading"
        />
      </t-form-item>
      <t-form-item v-if="canEditBindings" :label="t('pages.system.user.field.deptBindings')" name="deptList">
        <t-tree-select
          v-model="deptIds"
          :data="deptTreeOptions"
          :tree-props="{ keys: { label: 'deptName', value: 'id', children: 'children' } }"
          :placeholder="t('pages.system.user.placeholder.dept')"
          multiple
          clearable
          :loading="deptLoading"
        />
      </t-form-item>
      <t-form-item :label="t('pages.system.user.field.role')" name="roleList">
        <t-select
          v-model="roleIds"
          :placeholder="t('pages.system.user.placeholder.role')"
          multiple
          clearable
          :disabled="isSelfEdit || (isSuperAdmin && isBuiltinAdminTarget)"
          :options="roleOptions"
          :loading="roleLoading"
        />
      </t-form-item>
      <t-form-item :label="t('pages.system.user.field.post')" name="postList">
        <t-select
          v-model="postIds"
          :placeholder="t('pages.system.user.placeholder.post')"
          multiple
          clearable
          :disabled="!canEditPosts"
          :options="postOptions"
          :loading="postLoading"
        />
      </t-form-item>
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
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import api from '@/api/system';
import { useForm } from '@/hooks/useForm';
import { useUserStore } from '@/store';
import { encryptPassword, getRsaPublicKey } from '@/utils/rsa-key';
import type { PostOption } from '@/utils/user-edit-rules';
import {
  computeIsSelfEdit,
  computeSubmittedDeptIds,
  computeSubmittedPostIds,
  evaluateDeptBindingRules,
  mergePostOptions,
  normalizeDeptId,
  normalizeDeptIds,
} from '@/utils/user-edit-rules';

const emit = defineEmits(['success', 'closed']);

const { t } = useI18n();

/** 用户表单 / 提交数据结构（与 defaultForm 对齐；可选以兼容后端动态 payload） */
interface SysUserFormData {
  id?: number | string;
  userName?: string;
  realName?: string;
  nickName?: string;
  password?: string;
  phone?: string;
  email?: string;
  state?: number;
  /** 归属部门：字符串 id（后端 Long 超出安全整数范围时序列化为字符串）；空值省略键 */
  deptId?: string | null;
  roleList?: Array<{ id: number | string }>;
  deptList?: Array<{ id: number | string }>;
  /** 岗位绑定：详情回填带 postName，提交只带 id；键缺席 = 后端不触碰 sys_user_post */
  postList?: Array<{ id: number | string; postName?: string }>;
  /** 后端下发的逗号分隔部门串（兼容字段，前端不主动提交） */
  deptIds?: string;
}

const roleIds = ref<Array<number | string>>([]);
const roleOptions = ref<Array<{ label: string; value: number | string }>>([]);
const roleLoading = ref(false);

const deptIds = ref<string[]>([]);
const deptTreeOptions = ref([]);
const deptLoading = ref(false);

/** 岗位：下拉结果与详情回填项各存一份，选项由二者并集而来（R-J，见 user-edit-rules.mergePostOptions） */
const postIds = ref<string[]>([]);
const postDropdownOptions = ref<PostOption[]>([]);
const postBackfilledOptions = ref<PostOption[]>([]);
const postLoading = ref(false);

const titleMap = computed<Record<string, string>>(() => ({
  add: t('common.add'),
  edit: t('common.edit'),
  show: t('common.view'),
}));

const rules = computed<Record<string, FormRule[]>>(() => ({
  userName: [{ required: true, message: t('pages.system.user.placeholder.userName'), trigger: 'blur' }],
  realName: [{ required: true, message: t('pages.system.user.placeholder.realName'), trigger: 'blur' }],
  password: [{ required: true, message: t('pages.system.user.placeholder.password'), trigger: 'blur' }],
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
    userName: '',
    realName: '',
    nickName: '',
    password: '',
    phone: '',
    email: '',
    state: 1,
    deptId: null,
    roleList: [],
    deptList: [],
    postList: [],
  },
});

const userStore = useUserStore();

const isSuperAdmin = computed<boolean>(() => userStore.isSuperAdmin);

/** 唯一 isEdit 声明；onSubmit 内不得再声明同名局部量 */
const isEdit = computed<boolean>(() => mode.value === 'edit');

const isSelfEdit = computed<boolean>(() =>
  computeIsSelfEdit({
    isEdit: isEdit.value,
    formId: form.id,
    formUserName: form.userName,
    currentUserId: userStore.userInfo?.id,
    currentUserName: userStore.userInfo?.userName,
  }),
);

/** 部门绑定：可见性 / 可编辑性 / 提交裁剪三处同源 */
const canEditBindings = computed<boolean>(() => isSuperAdmin.value && !isSelfEdit.value);

/** 归属部门：新增态两种身份都可选；编辑态仅超管编辑他人 */
const canEditDept = computed<boolean>(() => !isEdit.value || canEditBindings.value);

/** R-EDIT-1/2/4 与提交体共用：实际会提交的集合 */
const submittedDeptIds = computed<string[]>(() => computeSubmittedDeptIds(canEditBindings.value, deptIds.value));

/**
 * 岗位：自助编辑不提交该键（岗位是组织归属，由管理员维护）。
 * <p>与角色项的有意差异：角色任何身份都等值重提，岗位在自助编辑时键缺席 = 后端不改。</p>
 */
const canEditPosts = computed<boolean>(() => !isSelfEdit.value);

/** null ⇒ 键缺席；[] ⇒ 显式清空；非空 ⇒ 整组替换 */
const submittedPostIds = computed<Array<{ id: string }> | null>(() =>
  computeSubmittedPostIds(canEditPosts.value, postIds.value),
);

/** R-J：下拉 ∪ 回填，按 id 去重——停用岗位若仍被绑定必须留在选项里 */
const postOptions = computed<PostOption[]>(() =>
  mergePostOptions(postDropdownOptions.value, postBackfilledOptions.value),
);

/** 内置 admin 目标：角色控件只读的来源之二 */
const isBuiltinAdminTarget = computed<boolean>(() => isEdit.value && form.userName === 'admin');

/** 规则违例 → i18n 键；键集合由 DeptRuleViolation 穷尽约束 */
const DEPT_RULE_MESSAGE = {
  deptListNotEmpty: 'pages.system.user.message.deptListNotEmpty',
  deptMustBeInBindings: 'pages.system.user.message.deptMustBeInBindings',
} as const;

const originalDeptId = ref<string | null>(null);
const originalDeptIds = ref<string[]>([]);

const loadRoles = async () => {
  roleLoading.value = true;
  try {
    const res = await api.role.roleSelect();
    const list = res?.data || res || [];
    if (!Array.isArray(list)) {
      roleOptions.value = [];
      return;
    }
    roleOptions.value = list.map((item) => ({ label: item.roleName, value: item.id }));
  } finally {
    roleLoading.value = false;
  }
};

const loadDeptTree = async () => {
  deptLoading.value = true;
  try {
    const res = await api.dept.page({});
    deptTreeOptions.value = res?.data || res || [];
  } finally {
    deptLoading.value = false;
  }
};

/**
 * 岗位下拉：只列启用中的岗位。
 * <p>能改用户 ≠ 能读岗位下拉——缺 `system:post:view` 时这里 403，按设计降级为空选项；
 * 已绑定的（含停用）岗位仍由详情回填项兜住，且 `canEditPosts` 为假时键根本不会提交，
 * 不会因拿不到选项就把既有绑定清空。</p>
 */
const loadPosts = async () => {
  postLoading.value = true;
  try {
    const res = await api.post.postSelect();
    const list = res?.data || res || [];
    postDropdownOptions.value = Array.isArray(list)
      ? list.map((item) => ({ label: item.postName, value: String(item.id) }))
      : [];
  } catch {
    postDropdownOptions.value = [];
  } finally {
    postLoading.value = false;
  }
};

const setDataEx = async (data: SysUserFormData) => {
  // 1) 先**同步**用列表行设置基础数据（编辑前最新标量），让弹窗即时显示且作为「用户尚未修改」基准
  setData(data);
  const rowValues: Record<string, unknown> = {};
  Object.keys(form).forEach((k) => {
    rowValues[k] = (form as Record<string, unknown>)[k];
  });

  if (data.id) {
    const res = await api.user.detail(data.id);
    if (res?.data) {
      const d = res.data as SysUserFormData;
      // 2) 详情回来前用户/自动化可能已填值（如编辑弹窗立即可见即填）：这些字段不得被详情覆盖。
      //    否则并发/程序化填充时详情晚回会覆盖 → 提交旧值（见 test_user_crud_full_flow）。
      const userOverrides: Record<string, unknown> = {};
      Object.keys(form).forEach((k) => {
        const v = (form as Record<string, unknown>)[k];
        if (v !== rowValues[k]) userOverrides[k] = v;
      });
      // 3) 详情整体回填（修正 userName/isSelfEdit 等标量，并补全关联集合）
      setData(d);
      // 4) 恢复详情回来前已修改的字段（如 nickName），避免被详情的旧值覆盖
      Object.keys(userOverrides).forEach((k) => {
        (form as Record<string, unknown>)[k] = userOverrides[k];
      });
      // 关联集合以详情为准（提交用这些 ref，而非 form 内数组）
      if (d.roleList?.length) {
        roleIds.value = d.roleList.map((r) => r.id);
      }
      if (d.postList?.length) {
        postBackfilledOptions.value = d.postList.map((p) => ({ label: p.postName ?? '', value: String(p.id) }));
        postIds.value = d.postList.map((p) => String(p.id));
      }
      if (d.deptList?.length || d.deptIds) {
        originalDeptIds.value = normalizeDeptIds(d.deptList?.length ? d.deptList : d.deptIds);
        deptIds.value = [...originalDeptIds.value];
        const deptId = normalizeDeptId(d.deptId ?? null);
        form.deptId = deptId;
        originalDeptId.value = deptId;
      }
    }
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

  const violation = evaluateDeptBindingRules({
    isEdit: isEdit.value,
    canEditBindings: canEditBindings.value,
    originalDeptId: originalDeptId.value,
    originalDeptIds: originalDeptIds.value,
    newDeptId: normalizeDeptId(form.deptId),
    submittedDeptIds: submittedDeptIds.value,
  });
  if (violation !== null) {
    MessagePlugin.warning(t(DEPT_RULE_MESSAGE[violation]));
    return;
  }

  const submitData = { ...form } as SysUserFormData;
  if (submitData.id === '' || submitData.id === undefined || submitData.id === null) {
    delete submitData.id;
  }

  // 归属部门：canEditDept 为真且归一后非空才提交；否则键必须消失
  delete submitData.deptId;
  if (canEditDept.value) {
    const deptId = normalizeDeptId(form.deptId);
    if (deptId !== null) submitData.deptId = deptId;
  }

  // 部门绑定：canEditBindings 为真才提交；否则键必须消失
  delete submitData.deptList;
  delete submitData.deptIds;
  if (canEditBindings.value) {
    submitData.deptList = submittedDeptIds.value.map((id) => ({ id }));
  }

  // 角色：任何身份都提交（非超管 / 自助为等值重提）
  submitData.roleList = roleIds.value.map((id) => ({ id }));

  // 岗位：null ⇒ 键缺席（后端不触碰 sys_user_post）；[] ⇒ 显式清空；非空 ⇒ 整组替换
  delete submitData.postList;
  const submittedPosts = submittedPostIds.value;
  if (submittedPosts !== null) {
    submitData.postList = submittedPosts;
  }

  delete submitData.password;
  if (mode.value === 'add' && form.password) {
    // 公钥来源：构建期注入优先（生产），否则向后端动态拉取（dev/test 启动时自动生成）。
    // 取不到公钥时**不降级明文**——宁可提示，也不把口令裸露到网络上。
    const publicKey = await getRsaPublicKey();
    if (!publicKey) {
      MessagePlugin.error(t('pages.system.user.message.passwordEncryptFail'));
      isSaving.value = false;
      return;
    }
    const encrypted = encryptPassword(form.password, publicKey);
    if (!encrypted) {
      MessagePlugin.warning(t('pages.system.user.message.passwordEncryptFail'));
      isSaving.value = false;
      return;
    }
    submitData.password = encrypted;
  }

  isSaving.value = true;
  try {
    if (mode.value === 'add') await api.user.create(submitData);
    else await api.user.update(submitData);
    MessagePlugin.success(mode.value === 'add' ? t('common.addSuccess') : t('common.updateSuccess'));
    visible.value = false;
    emit('success', form, mode.value);
  } catch {
  } finally {
    isSaving.value = false;
  }
};

onMounted(() => {
  loadRoles();
  loadDeptTree();
  loadPosts();
});

defineExpose({ open, setData: setDataEx });
</script>
