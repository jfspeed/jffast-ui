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
  <slot />
  <t-watermark
    v-if="visible"
    :key="refreshKey"
    class="watermark-overlay"
    :style="overlayStyle"
    :watermark-content="watermarkContent"
    :width="200"
    :height="48"
    :x="280"
    :y="180"
    :line-space="24"
    :rotate="-22"
    :removable="false"
    :z-index="zIndex"
  />
</template>
<script lang="ts" setup>
import dayjs from 'dayjs';
import type { WatermarkText } from 'tdesign-vue-next';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

import { useUserStore } from '@/store';

const props = defineProps({
  // 是否启用水印（默认登录后显示）
  enabled: {
    type: Boolean,
    default: true,
  },
  // 自定义水印行；为空时用「应用名 + 用户名 + 时间」
  content: {
    type: Array as () => string[],
    default: () => [],
  },
  // 覆盖层级：需高于弹层（TDesign 弹窗约 2500），保证水印盖住弹窗内容
  zIndex: {
    type: Number,
    default: 6000,
  },
});

const userStore = useUserStore();

// 应用名与登录页 / Header 同源：产品在 .env 覆盖 VITE_APP_TITLE
const appName = import.meta.env.VITE_APP_TITLE || '疾风管理系统';

// 用户名取登录态（与 Header 同源：userName 优先）
const userName = computed(() => {
  const info = userStore.userInfo as { userName?: string; nickName?: string; name?: string } | null;
  return info?.userName || info?.nickName || info?.name || '管理员';
});

// 当前时间动态刷新，水印带时刻便于追溯
const now = ref(dayjs().format('YYYY-MM-DD HH:mm'));
const refreshKey = ref(0);

const watermarkContent = computed<WatermarkText[]>(() => {
  const lines = props.content.length > 0 ? props.content : [appName, `${userName.value} · ${now.value}`];
  return lines.map((text, index) => ({ text, fontSize: index === 0 ? 14 : 12 }));
});

// 登录后才显示水印
const visible = computed(() => props.enabled && userStore.isLoggedIn);

// z-index 经 CSS 变量交给覆盖层样式，避免与 t-watermark 内联 style 合并顺序不确定
const overlayStyle = computed(() => ({ '--watermark-z': props.zIndex }));

let timer = 0;
let resizeTimer = 0;

// 时间每 30s 刷新一次
const tick = () => {
  now.value = dayjs().format('YYYY-MM-DD HH:mm');
};

// 窗口 resize 防抖后重建水印层，适配尺寸 / 缩放比变化
const handleResize = () => {
  window.clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(() => {
    tick();
    refreshKey.value += 1;
  }, 200);
};

onMounted(() => {
  timer = window.setInterval(tick, 30 * 1000);
  window.addEventListener('resize', handleResize);
});

onBeforeUnmount(() => {
  window.clearInterval(timer);
  window.clearTimeout(resizeTimer);
  window.removeEventListener('resize', handleResize);
});
</script>
<style lang="less" scoped>
/* 全屏固定水印层：铺满视口、不拦截点击 */
.watermark-overlay {
  position: fixed !important; // 覆盖 t-watermark 内联 relative，改挂到视口
  top: 0;
  left: 0;
  width: 100% !important;
  height: 100%;
  z-index: var(--watermark-z, 6000);
  pointer-events: none !important;
}
</style>
