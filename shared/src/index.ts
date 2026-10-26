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

/** @jfspeed/shared 公共导出入口（package.json main/types） */

export { createCrud, http } from './api/core/crud';
export { default as httpApi } from './api/core/http';
export * from './config/color';
export * from './config/global';
export { default as styleConfig } from './config/style';
export * from './constants';
export * from './hooks';
export type { LocalizedTitle, SupportedLocale } from './locales';
export {
  default as i18n,
  i18n as i18nInstance,
  langCode,
  languageList,
  localeConfigKey,
  supportedLocales,
  t,
} from './locales';
export { useLocale } from './locales/useLocale';
export * from './runtime';
export * from './store';
export type * from './types/interface';
export * from './utils/charts';
export * from './utils/color';
export { rsaEncrypt } from './utils/crypto';
export * from './utils/date';
export * from './utils/error-logger';
export { hasPermission, hasRole, default as permissionDirective } from './utils/permission';
export { handleSessionExpired, notifySessionExpired, default as request } from './utils/request';
export * from './utils/route';
export * from './utils/route/constant';
export * from './utils/websocket';
