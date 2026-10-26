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

import { createCrud, http } from '@/api/core/crud';

const demoExample = {
  ...createCrud('/demo/example'),
  export: (params) => http.download('/demo/example/export', params, '示例数据.xlsx'),
  importTemplate: () => http.download('/demo/example/import-template', {}, '示例导入模板.xlsx'),
  import: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return http.upload('/demo/example/import', formData);
  },
  upload: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return http.upload('/demo/example/upload', formData);
  },
  updateStatus: (id, status) => http.put('/demo/example/updateStatus', null, { params: { id, status } }),
};

const leaveApplication = createCrud('/demo/leave');

// 租户隔离示例（Base 下表现为普通 CRUD）
const demoTenantExample = createCrud('/demo/tenant-example');

export default { demoExample, leaveApplication, demoTenantExample };
