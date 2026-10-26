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

import { ref } from 'vue';

import { http } from '@/api/core/crud';

// type -> Promise：缓存请求本身（而非结果），同 type 并发调用只发一次；失败不缓存，下次可重试
const cache = new Map();

export function useDict() {
  const dictData = ref({});
  const loading = ref(false);

  const getDict = async (type) => {
    if (!cache.has(type)) {
      const req = http
        .get('/sys/dict/getByTypeCode', { dictCode: type })
        .then((res) => {
          if (res.code !== 200) {
            cache.delete(type);
            return [];
          }
          return res.data || [];
        })
        .catch((e) => {
          cache.delete(type);
          throw e;
        });
      cache.set(type, req);
    }
    loading.value = true;
    try {
      const data = await cache.get(type);
      dictData.value[type] = data;
      return data;
    } finally {
      loading.value = false;
    }
  };

  const getDictList = async (types) => {
    const results = {};
    for (const type of types) {
      results[type] = await getDict(type);
    }
    return results;
  };

  const clearCache = () => {
    cache.clear();
  };

  return {
    dictData,
    loading,
    getDict,
    getDictList,
    clearCache,
  };
}
