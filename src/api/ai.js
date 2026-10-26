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

const knowledgeBase = createCrud('/ai/knowledge-base');

// 变量名用 aiDocument，避免遮蔽全局 document 对象
const aiDocument = createCrud('/ai/document');

const conversation = {
  ...createCrud('/ai/conversation'),
  // 查询某个对话下的全部消息
  messages: (conversationId) => http.get(`/ai/conversation/messages/${conversationId}`),
};

export default { knowledgeBase, document: aiDocument, conversation };
