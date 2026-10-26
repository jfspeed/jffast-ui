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

import { DialogPlugin, MessagePlugin } from 'tdesign-vue-next';
import { nextTick, reactive, ref } from 'vue';

export function useTable(api, options = {}) {
  const tableRef = ref(null);
  const loading = ref(false);
  const selection = ref([]);
  const searchForm = reactive({ ...(options.defaultSearch || {}) });
  const dialog = reactive({
    save: false,
    info: false,
  });
  const saveRef = ref(null);

  const pageParams = reactive({
    pageNum: 1,
    pageSize: 10,
    total: 0,
    list: [],
  });

  const handleSearch = () => {
    pageParams.pageNum = 1;
    fetchData();
  };

  const resetSearch = () => {
    Object.keys(searchForm).forEach((key) => {
      searchForm[key] = options.defaultSearch?.[key] ?? null;
    });
    handleSearch();
  };

  // 请求序号：快速切页/连续搜索时只接受最后一次请求的结果，旧响应直接丢弃
  let fetchSeq = 0;

  const fetchData = async () => {
    const seq = ++fetchSeq;
    loading.value = true;
    try {
      const params = {
        ...searchForm,
        pageNo: pageParams.pageNum,
        pageSize: pageParams.pageSize,
      };
      const res = await api.page(params);
      if (seq !== fetchSeq) return;
      const data = res?.data || res;
      const list = data?.list || [];
      const total = data?.total || 0;
      pageParams.list = list;
      pageParams.total = total;
    } catch {
      // 错误提示已由 request 拦截器统一弹出，此处不重复 toast、不向上抛（避免 unhandled rejection）
    } finally {
      if (seq === fetchSeq) {
        loading.value = false;
      }
    }
  };

  const handlePageChange = (page) => {
    pageParams.pageNum = page;
    fetchData();
  };

  const handleSizeChange = (size) => {
    pageParams.pageSize = size;
    pageParams.pageNum = 1;
    fetchData();
  };

  const add = () => {
    dialog.save = true;
    nextTick(() => {
      saveRef.value?.open('add');
    });
  };

  const edit = (row) => {
    dialog.save = true;
    nextTick(() => {
      saveRef.value?.open('edit');
      saveRef.value?.setData(row);
    });
  };

  const show = (row) => {
    dialog.save = true;
    nextTick(() => {
      saveRef.value?.open('show');
      saveRef.value?.setData(row);
    });
  };

  const handleDelete = async (row) => {
    try {
      const res = await api.delete(row.id);
      if (res.code === 200) {
        MessagePlugin.success('删除成功');
        fetchData();
      }
      return res;
    } catch {
      // 错误提示已由 request 拦截器统一弹出，此处不重复 toast
      return null;
    }
  };

  /**
   * 执行批量删除（不经确认弹窗）。
   *
   * 后端只为个别资源提供了 DELETE {base}/batch（如 /sys/file）。没有该端点时，
   * 逐条调用单删接口，而不是去打一个必定 404 的批量地址——404 又被 request 拦截器
   * 排除在全局提示之外，用户会看到「点了没反应」。
   *
   * @returns {Promise<number>} 成功删除的条数
   */
  const handleBatchDelete = async () => {
    const ids = selection.value.map((v) => v.id);
    if (ids.length === 0) return 0;
    try {
      if (typeof api.batchDelete === 'function') {
        const res = await api.batchDelete(ids);
        if (res.code === 200) {
          MessagePlugin.success('批量删除成功');
          fetchData();
          return ids.length;
        }
        return 0;
      }
      // 无批量端点：逐条删除，部分失败不影响其余条目
      let done = 0;
      for (const id of ids) {
        try {
          const res = await api.delete(id);
          if (res && res.code === 200) done += 1;
        } catch {
          // 错误提示已由 request 拦截器统一弹出，此处不重复 toast
        }
      }
      MessagePlugin.success(`批量删除完成，成功 ${done} 条`);
      fetchData();
      return done;
    } catch {
      // 错误提示已由 request 拦截器统一弹出，此处不重复 toast
      return 0;
    }
  };

  /**
   * 批量删除 + 二次确认。破坏性操作一律走这个入口，不要直接绑 handleBatchDelete。
   *
   * DialogPlugin.confirm 返回的是 **DialogInstance，不是 Promise**
   * （tdesign-vue-next es/dialog/type.d.ts：DialogConfirmMethod = (options, context) => DialogInstance）。
   * `await` 它只会立刻拿到那个实例对象（恒为真值）⇒ 「if (!confirmed) return」永不成立，
   * 破坏性操作会在用户还没点确认时就已经执行掉 —— 确认框形同虚设。
   * 正确写法是 onConfirm 回调（与 src/pages/system/file/index.vue 一致）。
   */
  const handleBatchDeleteConfirm = () => {
    const ids = selection.value.map((v) => v.id);
    if (ids.length === 0) return;
    const confirmDia = DialogPlugin.confirm({
      header: '批量删除',
      body: `确定要删除选中的 ${ids.length} 条数据吗？此操作不可恢复。`,
      theme: 'warning',
      confirmBtn: { content: '删除', theme: 'danger' },
      cancelBtn: { content: '取消' },
      onConfirm: () => {
        confirmDia.destroy();
        handleBatchDelete();
      },
    });
  };

  const selectionChange = (rows) => {
    selection.value = rows;
  };

  const handleSaveSuccess = () => {
    dialog.save = false;
    fetchData();
  };

  return {
    tableRef,
    loading,
    selection,
    searchForm,
    dialog,
    saveRef,
    pageParams,
    handleSearch,
    resetSearch,
    fetchData,
    handlePageChange,
    handleSizeChange,
    add,
    edit,
    show,
    handleDelete,
    handleBatchDelete,
    handleBatchDeleteConfirm,
    selectionChange,
    handleSaveSuccess,
  };
}
