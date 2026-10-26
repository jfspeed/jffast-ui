/*
 * Copyright 2024-2026 jffast
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { ComputedRef, Ref } from 'vue';
import { computed, onMounted, onUnmounted, ref } from 'vue';

/**
 * 响应式断点（px）：JS 判定与样式媒体查询共用同一套口径，样式侧对应写法见 shared/src/style/layout.less
 * - 手机：宽度 ≤ 768px（侧边栏改抽屉、顶栏压缩、内容区收窄）
 * - 平板：768px < 宽度 ≤ 960px（保留侧栏，布局最小宽与栅格适配）
 * - 桌面：宽度 > 960px（保持桌面布局形态，不做任何响应式改动）
 */
export const RESPONSIVE_BREAKPOINTS = {
  mobile: 768,
  tablet: 960,
} as const;

/** resize 防抖间隔（ms），避免拖动窗口高频重算 */
const RESIZE_DEBOUNCE_MS = 150;

// 视口宽度在模块级共享：多个组件同时使用时只挂一个 resize 监听
const width = ref(typeof window === 'undefined' ? RESPONSIVE_BREAKPOINTS.tablet + 1 : window.innerWidth);

let resizeTimer: ReturnType<typeof setTimeout> | undefined;
let listenerCount = 0;

const handleResize = () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    width.value = window.innerWidth;
  }, RESIZE_DEBOUNCE_MS);
};

export interface UseResponsiveReturn {
  /** 当前视口宽度（resize 防抖后更新） */
  width: Ref<number>;
  /** 手机：宽度 ≤ 768px */
  isMobile: ComputedRef<boolean>;
  /** 平板：768px < 宽度 ≤ 960px */
  isTablet: ComputedRef<boolean>;
  /** 桌面：宽度 > 960px */
  isDesktop: ComputedRef<boolean>;
}

/**
 * 响应式断点 composable：移动端 / 平板判定统一从这里取，业务代码不要散写 window.innerWidth。
 * 需在组件 setup 内调用（内部注册生命周期卸载监听）。
 */
export function useResponsive(): UseResponsiveReturn {
  onMounted(() => {
    width.value = window.innerWidth;
    if (listenerCount === 0) {
      window.addEventListener('resize', handleResize);
    }
    listenerCount += 1;
  });

  onUnmounted(() => {
    listenerCount -= 1;
    if (listenerCount === 0) {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimer);
      resizeTimer = undefined;
    }
  });

  const isMobile = computed(() => width.value <= RESPONSIVE_BREAKPOINTS.mobile);
  const isTablet = computed(
    () => width.value > RESPONSIVE_BREAKPOINTS.mobile && width.value <= RESPONSIVE_BREAKPOINTS.tablet,
  );
  const isDesktop = computed(() => width.value > RESPONSIVE_BREAKPOINTS.tablet);

  return { width, isMobile, isTablet, isDesktop };
}
