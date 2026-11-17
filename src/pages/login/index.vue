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

        <t-form-item v-if="needCaptcha && !sliderEnabled" name="code">
          <!-- 图片验证码兜底：滑块 SDK 加载失败 / 用户主动切换时内联显示 -->
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

      <!-- 滑块验证弹窗：失败≥2次后点「登录」拉起，SDK 直接渲染在单层卡片内；通过即自动提交登录。
           自定义遮罩 + 白卡，对齐参考设计；SDK 原生外壳通过样式弱化，避免多层卡片叠加。 -->
      <teleport to="body">
        <transition name="slider-fade">
          <div v-if="sliderDialogVisible" class="slider-modal-mask" @click.self="onSliderDialogClose">
            <div class="slider-modal-card">
              <div class="slider-modal-header">
                <span class="slider-modal-title">{{ t('pages.login.sliderDialogTitle') }}</span>
                <t-icon name="close" class="slider-modal-close" @click="onSliderDialogClose" />
              </div>
              <div class="slider-captcha-mount"></div>
            </div>
          </div>
        </transition>
      </teleport>
    </div>

    <footer class="copyright">Copyright &copy; 2024 {{ appTitle }}</footer>
  </div>
</template>
<script setup lang="ts">
import type { FormInstanceFunctions, FormRule, SubmitContext } from 'tdesign-vue-next';
import { MessagePlugin } from 'tdesign-vue-next';
import { computed, nextTick, onMounted, ref } from 'vue';
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
  captchaId: '',
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

// ---- 滑块验证码（tianai-captcha）----
// sliderEnabled：当前是否走滑块。默认尝试滑块，SDK 加载失败/用户主动切换时降级为图片码。
// sliderPassed：滑块校验通过的凭证是否已拿到（拿到后随登录提交 captchaId）。
const sliderEnabled = ref(true);
const sliderPassed = ref(false);
const sliderDialogVisible = ref(false);
let sliderSdkLoading: Promise<unknown> | null = null;
let tacInstance: { destroyWindow: () => void; reloadCaptcha: () => void } | null = null;

const apiBase = import.meta.env.VITE_API_URL || '/jffast-api';
// SDK 静态资源（public/tac/ 下，构建后位于 <base>tac/）；loadTAC 会自动拼 js/tac.min.js 与 css/tac.css
const tacDir = `${import.meta.env.BASE_URL || '/'}tac/`;

/** 懒加载官方 load.js（首屏零成本；并发调用共享同一 Promise）。 */
const loadSliderSdk = (): Promise<unknown> => {
  if ((window as unknown as { loadTAC?: unknown }).loadTAC) {
    return Promise.resolve((window as unknown as { loadTAC: unknown }).loadTAC);
  }
  if (sliderSdkLoading) return sliderSdkLoading;
  sliderSdkLoading = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `${import.meta.env.BASE_URL || '/'}js/load.js`;
    script.async = true;
    script.onload = () => resolve((window as unknown as { loadTAC?: unknown }).loadTAC);
    script.onerror = () => reject(new Error('load.js load failed'));
    document.head.appendChild(script);
  }).catch((err) => {
    sliderSdkLoading = null; // 允许下次重试
    throw err;
  });
  return sliderSdkLoading;
};

/**
 * 拉起滑块验证弹窗并初始化 SDK。
 * mount 节点由 v-if 控制，必须等 visible=true 后的 nextTick 才有真实 DOM 可绑定，
 * 否则 bindEl 查不到、内容渲染到空节点。
 */
const openSliderCaptcha = async () => {
  sliderDialogVisible.value = true;
  try {
    await nextTick();
    // SDK 会把提示文字渲染到图片上方；我们用 CSS 变量把它挪进滑块轨道，
    // 变量挂在 mount（不会被 SDK 重建），reloadCaptcha 重建 DOM 后文案依然正确。
    const mountEl = document.querySelector<HTMLElement>('.slider-captcha-mount');
    mountEl?.style.setProperty('--slider-tip-text', JSON.stringify(t('pages.login.sliderDragTip')));
    await loadSliderSdk();
    const loadTAC = (
      window as unknown as {
        loadTAC: (
          dir: string,
          config: Record<string, unknown>,
          style: Record<string, unknown>,
        ) => Promise<{
          init: () => void;
          destroyWindow: () => void;
          reloadCaptcha: () => void;
        }>;
      }
    ).loadTAC;
    if (typeof loadTAC !== 'function') throw new Error('loadTAC unavailable');
    // 重复拉起前先销毁旧实例
    tacInstance?.destroyWindow();
    tacInstance = null;
    const tac = await loadTAC(
      tacDir,
      {
        requestCaptchaDataUrl: `${apiBase}/sys/slider/gen`,
        validCaptchaUrl: `${apiBase}/sys/slider/check`,
        bindEl: '.slider-captcha-mount',
        // 滑块通过 → 记住凭证 → 关弹窗 → 自动提交登录（对齐参考设计"验证完即登录"）
        validSuccess: (res: { data?: { id?: string } }, _c: unknown, tacObj: { destroyWindow: () => void }) => {
          const id = res?.data?.id;
          if (id) {
            formData.value.captchaId = id;
            sliderPassed.value = true;
            MessagePlugin.success(t('pages.login.sliderPassed'));
            tacObj.destroyWindow();
            sliderDialogVisible.value = false;
            void doLogin();
          }
        },
        validFail: (_res: unknown, _c: unknown, tacObj: { reloadCaptcha: () => void }) => {
          tacObj.reloadCaptcha();
        },
        // SDK 自带关闭按钮：同步关掉外层 t-dialog，不留空壳
        btnCloseFun: () => {
          sliderDialogVisible.value = false;
        },
      },
      {
        // 参考图样式：文字落在滑块轨道里、滑块为清晰方按钮（详见 index.less 对 SDK 外壳的弱化）
        logoUrl: null,
        i18n: {
          slider_title: t('pages.login.sliderDragTip'),
        },
      },
    );
    tacInstance = tac;
    tac.init();
  } catch {
    // 滑块链路异常 → 降级图片码，保证登录不被阻断
    useImageCaptcha();
  }
};

/** 用户关闭弹窗：清掉未通过的凭证，下次点登录重新验证。 */
const onSliderDialogClose = () => {
  if (!sliderPassed.value) {
    formData.value.captchaId = '';
  }
};

/** 降级为图片验证码（并拉一张图）。 */
const useImageCaptcha = () => {
  sliderEnabled.value = false;
  sliderPassed.value = false;
  formData.value.captchaId = '';
  sliderDialogVisible.value = false;
  tacInstance?.destroyWindow();
  tacInstance = null;
  needCaptcha.value = true;
  refreshCaptcha();
};

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
      const firstTime = !needCaptcha.value;
      needCaptcha.value = true;
      // 图片码模式首次触发需要拉图；滑块模式是用户点击 Trigger 时才按需拉起弹窗
      if (firstTime && !sliderEnabled.value) {
        refreshCaptcha();
      }
    }
  } catch {
    // 忽略检查失败
  }
};

/** 重置验证码状态，供登录失败后重新验证。 */
const resetCaptcha = () => {
  formData.value.captchaId = '';
  sliderPassed.value = false;
  tacInstance?.destroyWindow();
  tacInstance = null;
  if (!sliderEnabled.value) {
    refreshCaptcha();
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

/** 真正发起登录请求；直接登录与滑块通过后自动登录共用这一条路径。 */
const doLogin = async () => {
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
      // 滑块通过凭证：滑块模式下由 validSuccess 回调写入；图片码模式下为空
      captchaId: formData.value.captchaId || undefined,
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
    // 登录失败后检查是否需要验证码；已显示则重置凭证让用户重新验证
    await checkNeedCaptcha();
    if (needCaptcha.value) {
      resetCaptcha();
    }
  } finally {
    loading.value = false;
  }
};

const onSubmit = async (ctx: SubmitContext) => {
  if (ctx.validateResult !== true) return;
  // 以服务端失败次数为准刷新一次，避免用户名回车/unmount 前 blur 未触发导致状态滞后
  await checkNeedCaptcha();
  if (needCaptcha.value && sliderEnabled.value && !sliderPassed.value) {
    // 失败≥2次：点登录先弹滑块，通过后由 validSuccess 自动调用 doLogin
    await openSliderCaptcha();
    return;
  }
  // 不需要验证码 / 已通过滑块 / 图片码兜底模式 → 直接登录
  await doLogin();
};
</script>
<style lang="less" scoped>
@import './index.less';
</style>
