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

import { http } from '@/api/core/crud';
import { request } from '@/utils/request';

// zip 打包下载走全局 axios 实例：响应拦截器对 responseType='blob' 的响应
// 直接返回 Blob 本身（不走业务 code 检查），失败时由拦截器解析 blob 里的
// JSON 业务体并统一弹错。与 src/api/flow.js 的 blobClient 同口径。
const blobClient = {
  post: (url, data, config) => request.post(url, data, { responseType: 'blob', ...config }),
};

export function getTables() {
  return http.get('/sys/codegen/tables');
}

export function getColumns(tableName) {
  return http.get('/sys/codegen/columns', { tableName });
}

export function previewCode(
  tableName,
  packageName = '',
  author = 'jffast',
  includeDto = false,

  genType = 'crud',
  parentField,
  nameField,
  childTableName,
  childForeignKey,
  childPackageName,
  moduleName,
) {
  return http.get('/sys/codegen/preview', {
    tableName,
    packageName,
    author,
    includeDto,
    genType,
    parentField,
    nameField,
    childTableName,
    childForeignKey,
    childPackageName,

    moduleName,
  });
}

export function getEnv() {
  return http.get('/sys/codegen/env');
}

/**
 * 保存代码到本地（仅本地开发环境可用；JAR 运行时会返回业务错误）。
 *
 * @param {object} body SaveLocalRequest 请求体
 */
export function saveLocal(body) {
  return http.post('/sys/codegen/save-local', body);
}

/**
 * 打包下载生成代码（zip）。
 *
 * JAR / Docker / K8s 部署下没有可写的工程目录，/save-local 只能拒绝，
 * 此时用本接口一次性下载整个模块（entity / mapper / service / controller /
 * 前端 api / 页面 / 路由 / 菜单 SQL）。请求体与 /save-local 完全一致。
 *
 * 后端直接返回 application/zip 二进制流；失败时返回的 JSON 业务体会被
 * 响应拦截器识别 → 统一弹错并 reject，不会把错误 JSON 当成 zip 存盘。
 *
 * @param {object} body SaveLocalRequest 请求体
 * @returns {Promise<Blob>} zip 二进制流
 */
export async function downloadZip(body) {
  const res = await blobClient.post('/sys/codegen/download-zip', body);
  // 拦截器在 blob 模式下 resolve 的是 Blob 本身（不是 AxiosResponse）
  return res;
}

export function checkLocal(tableName, packageName = '', moduleName) {
  return http.get('/sys/codegen/check-local', { tableName, packageName, moduleName });
}

export function getModules() {
  return http.get('/sys/codegen/modules');
}

export function createModule(moduleName) {
  return http.post('/sys/codegen/create-module', null, { params: { moduleName } });
}
