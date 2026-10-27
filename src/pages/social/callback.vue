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
  <div class="social-callback">
    <p v-if="status === 'success'" class="social-callback__text">{{ t('pages.social.callback.success') }}</p>
    <p v-else-if="status === 'error'" class="social-callback__text social-callback__text--error">
      {{ errorMessage }}
    </p>
    <p v-else class="social-callback__text">{{ t('pages.social.callback.processing') }}</p>
  </div>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

import { t } from '@/locales';

defineOptions({
  name: 'SocialCallback',
});

type CallbackStatus = 'pending' | 'success' | 'error';

const route = useRoute();
const status = ref<CallbackStatus>('pending');
const errorMessage = ref('');

/**
 * 社交平台授权完成后的中转页：把授权码回传给打开它的同源窗口。
 *
 * <p>为什么需要这一页：OAuth 平台按 `redirect-uri` 回跳，而授权码只能用一次、
 * 必须由**后端**兑换成 access_token。因此回跳地址指向本页，本页只做「取出 code/state
 * → 交给后端去兑换」这一段中转，兑换动作由发起绑定的那个窗口（已登录态）调用
 * `/social/callback` 完成。
 *
 * <p>安全边界：`postMessage` 的 targetOrigin 取**本页自身的 origin**，
 * 于是消息只可能投递给与本应用同源的接收方。第三方页面即使把本页开成自己的子窗口，
 * 也收不到这条消息（浏览器按 targetOrigin 直接丢弃），拿不到授权码。
 */
onMounted(() => {
  const code = route.query.code;
  const state = route.query.state;
  if (typeof code !== 'string' || !code || typeof state !== 'string' || !state) {
    status.value = 'error';
    errorMessage.value = t('pages.social.callback.missingParams');
    return;
  }
  const opener = window.opener;
  if (!opener) {
    status.value = 'error';
    errorMessage.value = t('pages.social.callback.noOpener');
    return;
  }
  opener.postMessage({ type: 'social-callback', code, state }, window.location.origin);
  status.value = 'success';
  window.setTimeout(() => window.close(), 200);
});
</script>
<style scoped>
.social-callback {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  padding: 24px;
}

.social-callback__text {
  color: var(--td-text-color-primary);
  font-size: 14px;
  text-align: center;
}

.social-callback__text--error {
  color: var(--td-error-color);
}
</style>
