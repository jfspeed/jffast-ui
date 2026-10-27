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
  <div class="personal-center-page">
    <t-card class="profile-card">
      <div class="profile-head">
        <div class="avatar-wrap">
          <t-avatar :image="userInfo.avatar" size="72px">{{ avatarText }}</t-avatar>
          <t-upload
            :show-upload-list="false"
            :auto-upload="false"
            accept="image/*"
            theme="file"
            @change="handleUploadHead"
          >
            <t-button size="small" variant="outline" class="avatar-btn">{{
              t('pages.user.profile.changeAvatar')
            }}</t-button>
          </t-upload>
        </div>
        <div class="profile-meta">
          <div class="profile-name">{{ userInfo.nickName || userInfo.userName || '-' }}</div>
          <div class="profile-role">{{ userInfo.roleName || t('pages.user.profile.normalUser') }}</div>
          <div class="profile-dept">{{ userInfo.deptName || '' }}</div>
        </div>
        <t-button theme="primary" variant="outline" @click="openProfile">{{
          t('pages.user.profile.editProfile')
        }}</t-button>
      </div>

      <t-descriptions bordered :column="2">
        <t-descriptions-item :label="t('common.userName')">{{ userInfo.userName || '-' }}</t-descriptions-item>
        <t-descriptions-item :label="t('common.realName')">{{ userInfo.realName || '-' }}</t-descriptions-item>
        <t-descriptions-item :label="t('common.phone')">{{ userInfo.phone || '-' }}</t-descriptions-item>
        <t-descriptions-item :label="t('common.email')">{{ userInfo.email || '-' }}</t-descriptions-item>
        <t-descriptions-item :label="t('common.status')">
          <span v-if="userInfo.state === 1" style="color: var(--td-success-color)">{{ t('common.normal') }}</span>
          <span v-else-if="userInfo.state === 2" style="color: var(--td-error-color)">{{ t('common.disable') }}</span>
          <span v-else>-</span>
        </t-descriptions-item>
      </t-descriptions>
    </t-card>

    <t-card :title="t('pages.user.profile.passwordTitle')" class="block-card">
      <t-form
        ref="passwordFormRef"
        :data="passwordForm"
        layout="vertical"
        :rules="passwordRules"
        style="max-width: 400px"
      >
        <t-form-item :label="t('pages.user.profile.oldPassword')" name="oldPassword">
          <t-input
            v-model="passwordForm.oldPassword"
            type="password"
            :placeholder="t('pages.user.profile.placeholder.oldPassword')"
          />
        </t-form-item>
        <t-form-item :label="t('pages.user.profile.newPassword')" name="newPassword">
          <t-input
            v-model="passwordForm.newPassword"
            type="password"
            :placeholder="t('pages.user.profile.placeholder.newPassword')"
          />
        </t-form-item>
        <t-form-item>
          <t-button theme="primary" :loading="isSaving" @click="handleUpdatePassword">
            {{ t('pages.user.profile.confirmUpdate') }}
          </t-button>
        </t-form-item>
      </t-form>
    </t-card>

    <t-card :title="t('pages.user.profile.loginLogTitle')" class="block-card">
      <t-table :data="loginLogs" :columns="logColumns" row-key="id" />
    </t-card>

    <t-card :title="t('pages.user.profile.socialTitle')" class="block-card">
      <t-loading :loading="socialLoading">
        <div class="social-bind-list">
          <div v-for="item in socialProviders" :key="item.key" class="social-bind-item">
            <div class="social-bind-info">
              <t-icon :name="item.icon" size="24px" :style="{ color: item.color }" />
              <span class="social-bind-name">{{ item.label }}</span>
            </div>
            <div class="social-bind-action">
              <template v-if="getBindInfo(item.key)">
                <span class="social-bind-status">
                  {{
                    t('pages.user.profile.boundTo', {
                      name: getBindInfo(item.key)?.nickname || getBindInfo(item.key)?.username,
                    })
                  }}
                </span>
                <t-button theme="danger" variant="text" size="small" @click="handleUnbind(item.key)">
                  {{ t('pages.user.profile.unbind') }}
                </t-button>
              </template>
              <template v-else>
                <span class="social-bind-status unbound">{{ t('pages.user.profile.notBound') }}</span>
                <t-button theme="primary" variant="text" size="small" @click="handleBind(item.key)">
                  {{ t('pages.user.profile.bind') }}
                </t-button>
              </template>
            </div>
          </div>
        </div>
      </t-loading>
    </t-card>

    <t-dialog
      v-model:visible="profileDialogVisible"
      :header="t('pages.user.profile.editProfile')"
      :width="520"
      destroy-on-close
    >
      <t-form ref="profileFormRef" :data="profileForm" :rules="profileRules" label-width="100px">
        <t-form-item :label="t('common.realName')" name="realName">
          <t-input
            v-model="profileForm.realName"
            :placeholder="t('pages.user.profile.placeholder.realName')"
            clearable
          />
        </t-form-item>
        <t-form-item :label="t('common.nickName')" name="nickName">
          <t-input
            v-model="profileForm.nickName"
            :placeholder="t('pages.user.profile.placeholder.nickName')"
            clearable
          />
        </t-form-item>
        <t-form-item :label="t('common.phone')" name="phone">
          <t-input v-model="profileForm.phone" :placeholder="t('pages.user.profile.placeholder.phone')" clearable />
        </t-form-item>
        <t-form-item :label="t('common.email')" name="email">
          <t-input v-model="profileForm.email" :placeholder="t('pages.user.profile.placeholder.email')" clearable />
        </t-form-item>
      </t-form>
      <template #footer>
        <t-button variant="outline" @click="profileDialogVisible = false">{{ t('common.dialogCancel') }}</t-button>
        <t-button theme="primary" :loading="profileSaving" @click="handleUpdateProfile">
          {{ t('common.dialogSave') }}
        </t-button>
      </template>
    </t-dialog>
  </div>
</template>
<script lang="ts" setup>
import type { FormRule } from 'tdesign-vue-next';
import { DialogPlugin, MessagePlugin } from 'tdesign-vue-next';
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import api from '@/api/system';
import { useUserStore } from '@/store';
import { encryptPassword, getRsaPublicKey } from '@/utils/rsa-key';

const { t } = useI18n();

const userStore = useUserStore();
const userInfo = ref<{
  id?: number | string;
  avatar?: string;
  userName?: string;
  nickName?: string;
  realName?: string;
  roleName?: string;
  deptName?: string;
  phone?: string;
  email?: string;
  state?: number;
  name?: string;
  roles?: string[];
}>({});

const avatarText = computed(() => (userInfo.value.nickName || userInfo.value.userName || 'U').slice(0, 1));

const getLoginUser = async () => {
  const res = await api.user.getLoginUser();
  if (res?.code === 200 && res.data?.user) {
    userInfo.value = res.data.user;
  } else {
    userInfo.value = userStore.userInfo || {};
  }
};

const refreshUser = async () => {
  await getLoginUser();
  // 扁平回填（姓名等展示字段由 setUserInfo 归一），不要塞进嵌套 userInfo 字段
  userStore.setUserInfo({ ...userStore.userInfo, ...userInfo.value });
};

// ---------- 头像上传 ----------
const handleUploadHead = async (files: unknown) => {
  // t-upload change 首参为文件数组（兼容直接传单文件的调用方）
  const file = (Array.isArray(files) ? files[0] : files) as { raw?: File } | undefined;
  if (!file?.raw) return false;
  const formData = new FormData();
  formData.append('file', file.raw);
  try {
    const res = await api.user.uploadHead(formData);
    if (res?.code === 200) {
      MessagePlugin.success(t('pages.user.profile.message.avatarUpdated'));
      await refreshUser();
    }
  } catch {
    // 错误提示已由 request 拦截器统一弹出，此处只避免未捕获的 rejection
  }
  return false;
};

// ---------- 编辑资料 ----------
const profileDialogVisible = ref(false);
const profileSaving = ref(false);
const profileFormRef = ref<{ validate?: () => Promise<unknown> } | null>(null);
const profileForm = ref<{ id: number | string; realName: string; nickName: string; email: string; phone: string }>({
  id: '',
  realName: '',
  nickName: '',
  email: '',
  phone: '',
});
// 校验规则随语言切换更新
const profileRules = computed<Record<string, FormRule[]>>(() => ({
  realName: [{ required: true, message: t('pages.user.profile.rules.realName'), trigger: 'blur' as const }],
}));

const openProfile = () => {
  profileForm.value = {
    id: userInfo.value.id!,
    realName: userInfo.value.realName || '',
    nickName: userInfo.value.nickName || '',
    email: userInfo.value.email || '',
    phone: userInfo.value.phone || '',
  };
  profileDialogVisible.value = true;
};

const handleUpdateProfile = async () => {
  const validate = await profileFormRef.value?.validate?.().then(
    () => true,
    () => false,
  );
  if (validate === false) return;
  profileSaving.value = true;
  try {
    const res = await api.user.updateProfile(profileForm.value);
    if (res?.code === 200) {
      MessagePlugin.success(t('pages.user.profile.message.profileUpdated'));
      profileDialogVisible.value = false;
      await refreshUser();
    } else {
      MessagePlugin.error(res?.message || t('pages.user.profile.message.updateFail'));
    }
  } finally {
    profileSaving.value = false;
  }
};

// ---------- 修改密码 ----------
const passwordForm = ref({ oldPassword: '', newPassword: '' });
const passwordFormRef = ref<{ validate: () => Promise<unknown> } | null>(null);
// 与后端 SysUserController#validatePasswordStrength 同口径
const PASSWORD_STRENGTH_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,20}$/;
const passwordRules = computed<Record<string, FormRule[]>>(() => ({
  oldPassword: [{ required: true, message: t('pages.user.profile.rules.oldPassword') }],
  newPassword: [
    { required: true, message: t('pages.user.profile.rules.newPassword') },
    {
      pattern: PASSWORD_STRENGTH_PATTERN,
      message: t('pages.user.profile.rules.minLen'),
    },
  ],
}));
const isSaving = ref(false);

const handleUpdatePassword = async () => {
  try {
    if ((await passwordFormRef.value?.validate()) !== true) return;
  } catch {
    return;
  }
  isSaving.value = true;
  try {
    // 后端要求带时间戳的 RSA 密文（RSAUtil.decryptPwdWithTimestamp），明文直传会被当密文解密失败。
    // 公钥来源：构建期注入优先（生产），否则向后端动态拉取（dev/test 一次性密钥对）；
    // 取不到公钥时**不降级明文**——宁可提示，也不把口令裸露到网络上。
    const publicKey = await getRsaPublicKey();
    if (!publicKey) {
      MessagePlugin.error(t('pages.user.profile.message.passwordEncryptFail'));
      return;
    }
    const oldPassword = encryptPassword(passwordForm.value.oldPassword, publicKey);
    const newPassword = encryptPassword(passwordForm.value.newPassword, publicKey);
    if (!oldPassword || !newPassword) {
      MessagePlugin.error(t('pages.user.profile.message.passwordEncryptFail'));
      return;
    }
    const res = await api.user.updatePassword({ oldPassword, newPassword });
    if (res?.code === 200) {
      MessagePlugin.success(t('pages.user.profile.message.passwordUpdated'));
      passwordForm.value = { oldPassword: '', newPassword: '' };
    } else {
      MessagePlugin.error(res?.message || t('pages.user.profile.message.passwordUpdateFail'));
    }
  } catch {
    MessagePlugin.error(t('pages.user.profile.message.passwordUpdateFail'));
  } finally {
    isSaving.value = false;
  }
};

// ---------- 登录日志 ----------
const loginLogs = ref([]);
// 列头随语言切换更新
const logColumns = computed(() => [
  { colKey: 'ip', title: t('pages.user.profile.loginLog.ip'), width: 160 },
  { colKey: 'info', title: t('pages.user.profile.loginLog.info'), ellipsis: true },
  { colKey: 'state', title: t('common.status'), width: 90 },
  { colKey: 'createTime', title: t('pages.user.profile.loginLog.loginTime'), width: 200 },
]);

const loadLoginLogs = async () => {
  const res = await api.user.loginLogs();
  loginLogs.value = res?.code === 200 ? res.data || [] : [];
};

// ---------- 社交绑定 ----------
const socialProviders = [
  { key: 'github', label: 'GitHub', icon: 'logo-github', color: '#24292e' },
  { key: 'gitee', label: 'Gitee', icon: 'link', color: '#c71d23' },
];
/** 已绑定的第三方账号（后端 socialBind 返回） */
interface SocialBind {
  provider?: string;
  nickName?: string;
  userName?: string;
  /** 后端部分实现返回小写字段名，两种都保留 */
  nickname?: string;
  username?: string;
  avatar?: string;
  [key: string]: unknown;
}

const socialBinds = ref<SocialBind[]>([]);
// 当前生效的社交授权回传监听，便于卸载时统一回收，避免泄漏
let socialMessageHandler: ((e: MessageEvent) => void) | null = null;
const socialLoading = ref(false);

const loadSocialBinds = async () => {
  socialLoading.value = true;
  try {
    const res = await api.social.listBinds();
    socialBinds.value = res?.code === 200 ? res.data || [] : [];
  } catch {
    socialBinds.value = [];
  } finally {
    socialLoading.value = false;
  }
};

const getBindInfo = (provider: string) => socialBinds.value.find((b) => b.provider === provider);

const handleBind = async (provider: string) => {
  const res = await api.social.authorize(provider);
  if (res?.code === 200 && res.data) {
    const width = 600;
    const height = 700;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;
    // ⚠️ 这里**故意不加** `noopener`：回调校验靠 `window.open` 的返回值 `popup` 与
    // `event.source` 做身份比对（见下方 handleCallback）。`noopener` 会把返回值置为 null，
    // 于是所有回调消息都会被当成第三方窗口丢弃 ⇒ 社交账号绑定静默失败。
    // 其它地方的 `window.open`（如文件预览）才应该加 `noopener`。
    const popup = window.open(
      res.data,
      'social-auth',
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,resizable=yes`,
    );
    const handleCallback = async (event: MessageEvent) => {
      // 只接受我们打开的授权弹窗回传的消息，防止恶意第三方窗口投递伪造 social-callback 绑定他人社交号
      if (event.source !== popup) return;
      if (event.data?.type === 'social-callback') {
        window.removeEventListener('message', handleCallback);
        socialMessageHandler = null;
        popup?.close();
        const { code, state } = event.data;
        if (code && state) {
          const callbackRes = await api.social.callback(code, state);
          if (callbackRes?.code === 200 && callbackRes.data?.bindTicket) {
            const bindRes = await api.social.bind(callbackRes.data.bindTicket);
            if (bindRes?.code === 200) {
              MessagePlugin.success(t('pages.user.profile.message.bindSuccess'));
              loadSocialBinds();
            } else {
              MessagePlugin.error(bindRes?.message || t('pages.user.profile.message.bindFail'));
            }
          } else {
            MessagePlugin.error(callbackRes?.message || t('pages.user.profile.message.bindFail'));
          }
        }
      }
    };
    // 先清掉上一次未回收的监听，避免重复绑定叠加
    if (socialMessageHandler) window.removeEventListener('message', socialMessageHandler);
    socialMessageHandler = handleCallback;
    window.addEventListener('message', handleCallback);
  }
};

const handleUnbind = (provider: string) => {
  const confirmDia = DialogPlugin.confirm({
    header: t('common.tips'),
    body: t('pages.user.profile.message.unbindConfirm', {
      name: socialProviders.find((p) => p.key === provider)?.label || provider,
    }),
    onConfirm: async () => {
      confirmDia.destroy();
      const res = await api.social.unbind(provider);
      if (res?.code === 200) {
        MessagePlugin.success(t('pages.user.profile.message.unbindSuccess'));
        loadSocialBinds();
      } else {
        MessagePlugin.error(res?.message || t('pages.user.profile.message.unbindFail'));
      }
    },
  });
};

onMounted(() => {
  getLoginUser();
  loadLoginLogs();
  loadSocialBinds();
});

onUnmounted(() => {
  if (socialMessageHandler) {
    window.removeEventListener('message', socialMessageHandler);
    socialMessageHandler = null;
  }
});
</script>
<style scoped lang="less">
.personal-center-page {
  max-width: 900px;
  margin: 24px auto;

  .profile-card {
    margin-bottom: 16px;

    .profile-head {
      display: flex;
      align-items: center;
      gap: 24px;
      margin-bottom: 24px;

      .avatar-wrap {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
      }

      .profile-meta {
        flex: 1;

        .profile-name {
          font-size: 20px;
          font-weight: 600;
        }

        .profile-role,
        .profile-dept {
          color: var(--td-text-color-secondary);
          margin-top: 4px;
          font-size: 13px;
        }
      }
    }
  }

  .block-card {
    margin-bottom: 16px;
  }

  .social-bind-list {
    .social-bind-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid var(--td-border-level-1-color);

      &:last-child {
        border-bottom: none;
      }

      .social-bind-info {
        display: flex;
        align-items: center;
        gap: 8px;

        .social-bind-name {
          font-size: 14px;
          font-weight: 500;
        }
      }

      .social-bind-action {
        display: flex;
        align-items: center;
        gap: 8px;

        .social-bind-status {
          font-size: 13px;
          color: var(--td-text-color-secondary);

          &.unbound {
            color: var(--td-text-color-placeholder);
          }
        }
      }
    }
  }
}
</style>
