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

import type * as echarts from 'echarts/core';
import type { Ref, ShallowRef } from 'vue';
import { onMounted, onUnmounted, ref, shallowRef } from 'vue';

export { useDict } from './useDict';
export { useForm } from './useForm';
export { useResponsive } from './useResponsive';
export { useTable } from './useTable';

/**
 * eChart hook
 * @param domId
 */
export const useChart = (domId: string): ShallowRef<echarts.ECharts | undefined> => {
  let chartContainer: HTMLElement | null = null;
  const selfChart = shallowRef<echarts.ECharts | undefined>();
  const updateContainer = () => {
    selfChart.value?.resize();
  };

  onMounted(async () => {
    if (!chartContainer) {
      chartContainer = document.getElementById(domId);
    }
    if (chartContainer) {
      // 动态引入 echarts：图表库不进公共 barrel / 首屏包，仅真正挂载图表时才加载
      const { init } = await import('echarts/core');
      selfChart.value = init(chartContainer);
    }
  });

  window.addEventListener('resize', updateContainer, false);

  onUnmounted(() => {
    window.removeEventListener('resize', updateContainer);
    // 释放图表实例，避免切页后监听器/画布泄漏
    selfChart.value?.dispose();
    selfChart.value = undefined;
    chartContainer = null;
  });

  return selfChart;
};

/**
 * counter utils
 * @param duration
 * @returns counter
 */
export const useCounter = (duration = 60): [Ref<number>, () => void] => {
  let intervalTimer: ReturnType<typeof setInterval>;
  onUnmounted(() => {
    clearInterval(intervalTimer);
  });
  const countDown = ref(0);

  return [
    countDown,
    () => {
      countDown.value = duration;
      intervalTimer = setInterval(() => {
        if (countDown.value > 0) {
          countDown.value -= 1;
        } else {
          clearInterval(intervalTimer);
          countDown.value = 0;
        }
      }, 1000);
    },
  ];
};
