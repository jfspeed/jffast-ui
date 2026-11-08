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

interface ImportMetaEnv {
  readonly VITE_IS_REQUEST_PROXY: string;
  readonly VITE_API_URL: string;
  readonly VITE_BASE_URL?: string;
  readonly VITE_PROXY_TARGET?: string;
  readonly VITE_APP_TITLE?: string;
  readonly VITE_APP_SUBTITLE?: string;
  readonly VITE_ENABLE_MULTI_TENANT?: string;
  readonly VITE_USE_STATIC_ROUTES?: string;
  readonly VITE_DEMO_MODE?: string;
  readonly VITE_RSA_PUBLIC_KEY?: string;
  /** 右上角「GitHub / 帮助文档」入口：开源发行版默认展示，非开源发行版在 .env 里置 false */
  readonly VITE_SHOW_OPEN_SOURCE_LINKS?: string;
  readonly VITE_GITHUB_URL?: string;
  readonly VITE_DOCS_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
