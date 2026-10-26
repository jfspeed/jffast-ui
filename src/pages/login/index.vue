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
  <div class="login-wrapper">
    <login-header />

    <div class="login-container">
      <div class="title-container">
        <h1 class="title margin-no">{{ t('pages.login.signIn') }}</h1>
        <h1 class="title">{{ appTitle }}</h1>
        <div class="sub-title">
          <p class="tip">{{ appSubtitle }}</p>
          <p v-if="isDemoMode" class="tip demo-tip">{{ t('pages.login.demoTip') }}</p>
        </div>
      </div>

      <t-form ref="form" class="item-container" :data="formData" :rules="FORM_RULES" label-width="0" @submit="onSubmit">
        <t-form-item name="userName">
          <t-input
            v-model="formData.userName"
            size="large"
            :placeholder="t('pages.login.userNamePlaceholder')"
            @blur="checkNeedCaptcha"
          >
            <template #prefix-icon>
              <t-icon name="user" />
            </template>
          </t-input>
        </t-form-item>

        <t-form-item name="password">
          <t-input
            v-model="formData.password"
            size="large"
            :type="showPsw ? 'text' : 'password'"
            clearable
            :placeholder="t('pages.login.passwordPlaceholder')"
          >
            <template #prefix-icon>
              <t-icon name="lock-on" />
            </template>
            <template #suffix-icon>
              <t-icon :name="showPsw ? 'browse' : 'browse-off'" @click="showPsw = !showPsw" />
            </template>
          </t-input>
        </t-form-item>

        <t-form-item v-if="needCaptcha" name="code">
          <div class="captcha-container">
            <t-input v-model="formData.code" size="large" :placeholder="t('pages.login.input.verification')">
              <template #prefix-icon>
                <t-icon name="security" />
              </template>
            </t-input>
            <img
              v-if="captchaUrl"
              :src="captchaUrl"
              :alt="t('pages.login.captcha')"
              class="captcha-img"
              @click="refreshCaptcha"
            />
          </div>
        </t-form-item>

        <div class="check-container remember-pwd">
          <t-checkbox v-model="rememberMe">{{ t('pages.login.rememberUserName') }}</t-checkbox>
        </div>

        <t-form-item class="btn-container">
          <t-button block size="large" type="submit" :loading="loading" class="btn-login">
            {{ t('pages.login.signIn') }}
          </t-button>
        </t-form-item>
      </t-form>

      <jffast-setting />
    </div>

    <footer class="copyright">Copyright &copy; 2024 {{ appTitle }}</footer>
  </div>
</template>
<script setup lang="ts">
import type { FormInstanceFunctions, FormRule, SubmitContext } from 'tdesign-vue-next';
import { MessagePlugin } from 'tdesign-vue-next';
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import { http } from '@/api/core/crud';
import JffastSetting from '@/layouts/setting.vue';
import { useUserStore } from '@/store';
import { decodeLoginRedirect } from '@/utils/login-redirect';
import { encryptPassword, getRsaPublicKey } from '@/utils/rsa-key';

import LoginHeader from './components/Header.vue';

defineOptions({
  name: 'LoginIndex',
});

const { t } = useI18n();

const appTitle = import.meta.env.VITE_APP_TITLE || '疾风'; // 疾风管理系统
const appSubtitle = import.meta.env.VITE_APP_SUBTITLE || 'jffast —— 极速开发，如风而至';
// 上线演示站提示：构建时注入 VITE_DEMO_MODE=true（见 jffast/docs/demo-mode.md）
const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';

const userStore = useUserStore();

const INITIAL_DATA = {
  userName: '',
  password: '',
  code: '',
  key: '',
};

const FORM_RULES = computed<Record<string, FormRule[]>>(() => ({
  userName: [{ required: true, message: t('pages.login.rules.userName'), type: 'error' }],
  password: [{ required: true, message: t('pages.login.rules.password'), type: 'error' }],
}));

const form = ref<FormInstanceFunctions>();
const formData = ref({ ...INITIAL_DATA });
const showPsw = ref(false);
const rememberMe = ref(false);
const loading = ref(false);
const needCaptcha = ref(false);
const captchaUrl = ref('');
const captchaKey = ref('');

const generateCaptchaKey = () => {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const refreshCaptcha = () => {
  captchaKey.value = generateCaptchaKey();
  formData.value.key = captchaKey.value;
  const apiBase = import.meta.env.VITE_API_URL || '/jffast-api';
  captchaUrl.value = `${apiBase}/sys/getCode?key=${captchaKey.value}&_t=${Date.now()}`;
};

const checkNeedCaptcha = async () => {
  if (!formData.value.userName) return;
  try {
    const res = await http.get('/sys/needCaptcha', { userName: formData.value.userName });
    if (res.code === 200 && res.data) {
      needCaptcha.value = true;
      refreshCaptcha();
    }
  } catch {
    // 忽略检查失败
  }
};

const router = useRouter();
const route = useRoute();

onMounted(() => {
  const saved = localStorage.getItem('remember_login');
  if (saved) {
    try {
      const data = JSON.parse(saved);
      formData.value.userName = data.userName || '';
      rememberMe.value = true;
    } catch {
      localStorage.removeItem('remember_login');
    }
  }
});

const onSubmit = async (ctx: SubmitContext) => {
  if (ctx.validateResult === true) {
    loading.value = true;
    try {
      // 公钥来源：构建期注入优先（生产），否则向后端动态拉取（dev/test 启动时自动生成）
      const publicKey = await getRsaPublicKey();
      if (!publicKey) {
        MessagePlugin.error(t('pages.login.rsaKeyMissing'));
        return;
      }
      const password = encryptPassword(formData.value.password, publicKey);
      if (!password) {
        MessagePlugin.error(t('pages.login.passwordEncryptFail'));
        return;
      }

      const res = await http.post('/sys/login', {
        userName: formData.value.userName,
        password,
        code: formData.value.code || undefined,
        key: formData.value.key || undefined,
      });

      // 登录成功（拦截器已确保 code === 200 才到这里）
      userStore.setToken(res.data.token);
      userStore.setUserInfo(res.data.user || { userName: formData.value.userName, roles: [] });

      if (res.data.tenantId) {
        localStorage.setItem('tenantId', res.data.tenantId);
      }

      if (rememberMe.value) {
        localStorage.setItem('remember_login', JSON.stringify({ userName: formData.value.userName }));
      } else {
        localStorage.removeItem('remember_login');
      }

      MessagePlugin.success(t('pages.login.loginSuccess'));
      router.push(decodeLoginRedirect(route.query.redirect));

      // 密码过期提醒
      if (res.data.passwordExpired) {
        MessagePlugin.warning(res.data.passwordExpiredMsg || t('pages.login.passwordExpiredTip'));
      }
    } catch {
      // 拦截器已弹出错误提示，这里不再重复提示
      // 登录失败后检查是否需要验证码
      await checkNeedCaptcha();
      // 如果已显示验证码，刷新验证码图片
      if (needCaptcha.value) {
        refreshCaptcha();
      }
    } finally {
      loading.value = false;
    }
  }
};
</script>
<style lang="less" scoped>
@import './index.less';
</style>
