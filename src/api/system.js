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

const user = createCrud('/sys/user', {
  getLoginUser: () => http.get('/sys/user/getLoginUser'),
  updateProfile: (data) => http.post('/sys/user/updateProfile', data),
  loginLogs: () => http.get('/sys/user/loginLogs'),
  updatePassword: (data) => http.post('/sys/user/updatePassword', data),
  resetPassword: (data) => http.post('/sys/user/resetPassword', data),
  unlock: (userId) => http.post('/sys/user/unlock', null, { params: { userId } }),
  upload: (formData) => http.upload('/sys/user/upload', formData),
  uploadHead: (formData) => http.upload('/sys/user/uploadHead', formData),
  // 按查询条件导出用户 Excel / 导入模板下载 / 导入用户（密码为初始密码）
  exportUser: (params) => http.download('/sys/user/export', params, '用户数据.xlsx'),
  importTemplate: () => http.download('/sys/user/import-template', {}, '用户导入模板.xlsx'),
  importUser: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return http.upload('/sys/user/import', formData);
  },
  // 异步导出/异步导入：提交后在「异步任务」页查看进度
  exportUserAsync: (params) => http.post('/sys/user/export-async', null, { params }),
  importUserAsync: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return http.upload('/sys/user/import-async', formData);
  },
});

const role = createCrud('/sys/role', {
  roleSelect: () => http.get('/sys/role/roleSelect'),
  createDictCode: (dictName) => http.get('/sys/role/createDictCode', { dictName }),
  roleMenuTree: (roleId) => http.get(`/sys/menu/roleMenuTree/${roleId}`),
  roleDeptTree: (roleId) => http.get(`/sys/dept/roleDeptTree/${roleId}`),
});

const menu = createCrud('/sys/menu', {
  roleMenuTree: (roleId) => http.get(`/sys/menu/roleMenuTree/${roleId}`),
});

const dept = createCrud('/sys/dept', {
  roleDeptTree: (roleId) => http.get(`/sys/dept/roleDeptTree/${roleId}`),
  userDeptTree: (userId) => http.get(`/sys/dept/userDeptTree/${userId}`),
  deptUserTree: () => http.get('/sys/dept/deptUserTree'),
});

const dict = createCrud('/sys/dict', {
  dictTypeList: (params) => http.get('/sys/dict/dictTypeList', params),
  createDictCode: (dictName) => http.get('/sys/dict/createDictCode', { dictName }),
  hasDictByName: (dictName, id) => http.get('/sys/dict/hasDictByName', { dictName, id }),
  hasDictByCode: (dictCode, id) => http.get('/sys/dict/hasDictByCode', { dictCode, id }),
  getByTypeCode: (dictCode) => http.get('/sys/dict/getByTypeCode', { dictCode }),
});

const log = createCrud('/sys/log', {
  titleList: () => http.get('/sys/log/titleList'),
  // 按查询条件导出操作/登录日志 Excel
  exportLog: (params) => http.download('/sys/log/export', params, '系统日志.xlsx'),
  // 清理指定天数前的历史日志（后端 SysLogController#clean，权限 system:log:delete）
  // http.delete(url, data?, config?) —— 查询参数走 config.params
  cleanLog: (days) => http.delete('/sys/log/clean', undefined, { params: { days } }),
});

const config = createCrud('/sys/config');

const post = createCrud('/sys/post');

// 异步任务（后端 /sys/task）
const task = createCrud('/sys/task', {
  download: (id, filename) => http.download(`/sys/task/download/${id}`, {}, filename),
  delete: (id) => http.delete(`/sys/task/delete/${id}`),
});

// 文件管理（后端 /sys/file，上传由文件存储 Starter 自动登记）
const file = createCrud('/sys/file', {
  download: (id, filename) => http.download(`/sys/file/download/${id}`, {}, filename),
  delete: (id) => http.delete(`/sys/file/delete/${id}`),
  // 批量删除：后端确实实现了 DELETE /sys/file/batch（全仓唯一），故在此显式声明。
  // createCrud 不再默认注入它——绝大多数资源并没有这个端点。
  // 请求体必须是**裸数组**：后端签名是 @RequestBody List<Long> ids，
  // 而 http.delete(url, data) 的 data 直接就是 body —— 写成 { data: ids }
  // 会被包成 {"data":[...]}，Jackson 反序列化成 List<Long> 直接 400。
  batchDelete: (ids) => http.delete('/sys/file/batch', ids),
});

const online = {
  list: () => http.get('/sys/online/list'),
  kick: (loginId) => http.delete(`/sys/online/kick/${loginId}`),
  kickBatch: (loginIds) => http.delete('/sys/online/kickBatch', loginIds),
};

const notification = createCrud('/sys/notification', {
  send: (data) => http.post('/sys/notification/send', data),
  copy: (id) => http.post(`/sys/notification/copy/${id}`),
  stats: (id, params) => http.get(`/sys/notification/stats/${id}`, params),
  userNotifications: () => http.get('/sys/notification/userNotifications'),
  userNotificationPage: (params) => http.get('/sys/notification/userNotificationPage', params),
  unreadCount: () => http.get('/sys/notification/unreadCount'),
  markAsRead: (notificationId) => http.put(`/sys/notification/markAsRead/${notificationId}`),
  markAllAsRead: () => http.put('/sys/notification/markAllAsRead'),
});

// 通知模板（后端 /sys/notification/template）
const notificationTemplate = createCrud('/sys/notification/template', {
  // 按模板编码渲染标题/内容（占位符 ${var} 由 params 替换）
  render: (code, params) => http.post(`/sys/notification/template/render/${code}`, params || {}),
});

// 通知模板分组（后端 /sys/notification/template/group）
const notificationTemplateGroup = createCrud('/sys/notification/template/group', {
  listEnabled: () => http.get('/sys/notification/template/group/list'),
});

const social = {
  authorize: (provider) => http.get('/social/authorize', { provider }),
  callback: (provider, code, state) => http.get('/social/callback', { provider, code, state }),
  bind: (ticket) => http.post('/social/bind', { ticket }),
  unbind: (provider) => http.delete(`/social/unbind/${provider}`),
  listBinds: () => http.get('/social/binds'),
};

const dashboard = {
  stats: () => http.get('/sys/dashboard/stats'),
  logTrend: () => http.get('/sys/dashboard/logTrend'),
  recentLogs: () => http.get('/sys/dashboard/recentLogs'),
};

const monitor = {
  info: () => http.get('/sys/monitor/info'),
};

const cache = {
  redisInfo: () => http.get('/sys/cache/redis/info'),
  cacheNames: () => http.get('/sys/cache/names'),
  cacheKeys: (cacheName) => http.get(`/sys/cache/keys/${cacheName}`),
  cacheValue: (cacheName, key) => http.get('/sys/cache/value', { cacheName, key }),
  deleteCache: (cacheName, key) => http.delete('/sys/cache/delete', null, { params: { cacheName, key } }),
  clearCacheName: (cacheName) => http.delete(`/sys/cache/clear/${cacheName}`),
  clearAll: () => http.delete('/sys/cache/clearAll'),
};

export default {
  user,
  role,
  menu,
  dept,
  dict,
  log,
  config,
  post,
  task,
  file,
  online,
  notification,
  notificationTemplate,
  notificationTemplateGroup,
  social,
  dashboard,
  monitor,
  cache,
};
