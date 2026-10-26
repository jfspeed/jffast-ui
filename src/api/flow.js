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
import { request } from '@/utils/request';

// 流程图是二进制流（image/png）。请求走全局 axios 实例，但响应拦截器对 blob 响应
// 直接返回 Blob 本身（不走业务 code 检查），因此这里单独包一层只负责声明 responseType。
const blobClient = {
  get: (url, config) => request.get(url, { responseType: 'blob', ...config }),
};

// 流程分类：标准 CRUD（/flow/category）
const category = createCrud('/flow/category', {
  // 启用分类下拉（部署/发起流程时使用）
  listEnabled: () => http.get('/flow/category/list'),
});

// 流程定义 / 部署 / 实例（/flow/process）
const process = {
  // ─── 部署 ───────────────────────────────
  // 部署 BPMN XML（设计器保存或上传文件）
  deploy: (data) => http.post('/flow/process/deploy', data),
  // 删除流程部署（级联删除实例）
  deleteDeployment: (deploymentId) => http.delete(`/flow/process/deployment/${deploymentId}`),

  // ─── 流程定义 ───────────────────────────
  // 流程定义分页查询（最新版本）
  definitionPage: (params) => http.get('/flow/process/definition/page', params),
  // 获取流程定义 BPMN XML（设计器回显/查看）
  getBpmnXml: (processDefinitionId) => http.get(`/flow/process/definition/${processDefinitionId}/xml`),
  // 获取流程图（PNG，返回 blob）
  getDiagramUrl: (processDefinitionId) => `/flow/process/definition/${processDefinitionId}/diagram`,
  // 挂起流程定义
  suspendDefinition: (processDefinitionId) => http.put(`/flow/process/definition/${processDefinitionId}/suspend`),
  // 激活流程定义
  activateDefinition: (processDefinitionId) => http.put(`/flow/process/definition/${processDefinitionId}/activate`),

  // ─── 流程实例 ───────────────────────────
  // 发起流程实例
  startInstance: (data) => http.post('/flow/process/instance/start', data),
  // 运行中流程实例分页查询
  instancePage: (params) => http.get('/flow/process/instance/page', params),
  // 取消流程实例
  // 后端 reason 是 @RequestParam（查询参数），不是请求体 —— 放进 body 里 Spring 收不到，
  // 取消原因会被静默丢掉（流程实例里记成空），而页面照样提示「取消成功」。
  cancelInstance: (processInstanceId, reason) =>
    http.delete(`/flow/process/instance/${processInstanceId}`, null, { params: { reason } }),
};

// 任务管理（/flow/task）
const task = {
  // 我的待办任务（分页）
  todoPage: (params) => http.get('/flow/task/todo/page', params),
  // 我的候选任务（任务池，未签收）
  candidatePage: (params) => http.get('/flow/task/candidate/page', params),
  // 签收任务
  claim: (taskId) => http.post(`/flow/task/claim/${taskId}`),
  // 完成任务（审批）
  complete: (data) => http.post('/flow/task/complete', data),
  // 转办任务
  delegate: (taskId, toUserId) => http.post(`/flow/task/delegate/${taskId}`, null, { params: { toUserId } }),
  // 任务详情
  detail: (taskId) => http.get(`/flow/task/detail/${taskId}`),
};

// 历史查询（/flow/history）
const history = {
  // 我的已办任务（分页）
  donePage: (params) => http.get('/flow/history/done/page', params),
  // 历史流程实例分页查询
  instancePage: (params) => http.get('/flow/history/instance/page', params),
  // 流程实例审批历史（任务列表）
  instanceHistory: (processInstanceId) => http.get(`/flow/history/instance/${processInstanceId}/tasks`),
  // 历史流程实例详情
  instanceDetail: (processInstanceId) => http.get(`/flow/history/instance/${processInstanceId}`),
};

/**
 * 加载流程图图片（PNG），返回浏览器可用的 ObjectURL。
 *
 * 后端 /flow/process/definition/{id}/diagram 直接返回 image/png 二进制流。
 * 注意：响应拦截器对 blob 响应返回的就是 **Blob 本身**（不是 AxiosResponse），
 * 所以这里必须从返回值直接取 Blob，取 .data 会拿到 undefined。
 * 同口径写法见 shared/src/utils/request.ts 的 http.download。
 */
export async function loadDiagramObjectUrl(url) {
  const res = await blobClient.get(url);
  // res 就是 Blob 本身（拦截器在 blob 模式下直接返回二进制数据），不能取 res.data
  return URL.createObjectURL(res);
}

export { category, history, process, task };
