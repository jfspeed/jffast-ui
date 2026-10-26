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

const auth = {
  login: (data) => http.post('/sys/login', data),
  getUserInfo: () => http.get('/sys/getUserInfo'),
  // 退出登录必须通知后端吊销会话：只清 localStorage 的话，旧 token 在有效期内仍能访问接口
  logout: () => http.delete('/sys/logout'),
};

export default { auth };
