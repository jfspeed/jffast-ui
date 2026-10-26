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

import { request } from '@/utils/request';

export function createCrud(baseUrl, options = {}) {
  const fullUrl = (path) => `${baseUrl}${path}`;

  return {
    create: (data) => request.post(fullUrl('/create'), data),
    update: (data) => request.put(fullUrl('/update'), data),
    delete: (id) => request.delete(fullUrl(`/${id}`)),
    detail: (id) => request.get(fullUrl(`/detail/${id}`)),
    page: (params) => request.get(fullUrl('/page'), { params }),
    list: (params) => request.get(fullUrl('/all'), { params }),
    // 注意：这里**不**提供 batchDelete。批量删除不是通用能力——后端只有一个资源
    // （/sys/file）真正实现了 DELETE {base}/batch。公共工厂凭空注入一个注定 404 的方法，
    // 后果是页面上的「批量删除」点了毫无反应（404 又被 request 拦截器排除在全局提示外，
    // 用户全程零感知）。需要批量删除的资源请在自己的 options 里显式声明。
    ...options,
  };
}

/**
 * 与 `@/utils/request` 的 `http` 同一份实现（原先这里是逐字副本：两份 download
 * 各自处理 blob，修一处漏一处）。业务 API 继续从本模块 import `http`，
 * 类型口径见 `types/globals.d.ts` 的 `declare module '@/api/core/crud'`。
 */
export { http } from '@/utils/request';
