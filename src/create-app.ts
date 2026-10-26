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

import 'tdesign-vue-next/es/style/index.css';
import '@/style/index.less';

import TDesign from 'tdesign-vue-next';
import { createApp } from 'vue';

import i18n from '@/locales';
import { setAppRuntime } from '@/runtime';
import { store } from '@/store';
import permissionDirective from '@/utils/permission';

import authApi from './api/modules/auth';
import systemApi from './api/system';
import App from './App.vue';
import router, { fixedRouterList, homepageRouterList } from './router';

export function createBaseApp() {
  // shared 反向依赖通过注入解耦：shared 不得静态 import src 的 router/API
  setAppRuntime({
    router,
    fixedRouterList,
    homepageRouterList,
    authApi,
    systemApi,
  });

  const app = createApp(App);

  app.use(TDesign);
  app.use(store);
  app.use(router);
  app.use(i18n);
  app.directive('permission', permissionDirective);

  return { app, router, store };
}
