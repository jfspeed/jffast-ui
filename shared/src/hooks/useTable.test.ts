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

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useTable } from '@/hooks/useTable';

/**
 * 批量删除二次确认的契约。
 *
 * 背景：TDesign 的 `DialogPlugin.confirm` 返回的是 **DialogInstance，不是 Promise**
 * （tdesign-vue-next es/dialog/type.d.ts：DialogConfirmMethod = (options, context) => DialogInstance）。
 * 旧实现写成：
 *   const confirmed = await DialogPlugin.confirm({ ... });
 *   if (!confirmed) return;
 *   await handleBatchDelete();
 * `await` 一个非 thenable 只会立刻拿到那个实例对象（恒为真值）⇒ 判断永不成立
 * ⇒ 破坏性操作在用户点确认之前就已经执行掉了，确认框形同虚设。
 *
 * 这条测试把「只有点了确定才删除」锁死：mock 的 confirm 返回的是实例对象
 * （不是 Promise），一旦实现退回 await 写法，本用例会立刻变红。
 */
const { confirmMock } = vi.hoisted(() => ({
  confirmMock: vi.fn(),
}));

vi.mock('tdesign-vue-next', () => ({
  DialogPlugin: {
    confirm: confirmMock,
    alert: vi.fn(),
  },
  MessagePlugin: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

describe('useTable.handleBatchDeleteConfirm 的二次确认', () => {
  const destroy = vi.fn();

  beforeEach(() => {
    confirmMock.mockReset();
    destroy.mockReset();
    // 与 TDesign 真实行为一致：返回 DialogInstance，不返回 Promise
    confirmMock.mockImplementation(() => ({ destroy }));
  });

  it('弹窗打开后一个都不删，触发 onConfirm 才真正删除', async () => {
    const batchDelete = vi.fn().mockResolvedValue({ code: 200 });
    const api = {
      page: vi.fn().mockResolvedValue({ code: 200, data: { list: [], total: 0 } }),
      batchDelete,
    };
    const table = useTable(api);
    table.selectionChange([{ id: 1 }, { id: 2 }]);

    table.handleBatchDeleteConfirm();

    // 关键回归点：确认框还开着，删除绝不能已经发生
    expect(confirmMock).toHaveBeenCalledTimes(1);
    expect(batchDelete).not.toHaveBeenCalled();

    // 用户点「确定」才真正删除
    const options = confirmMock.mock.calls[0][0];
    options.onConfirm();
    await Promise.resolve();

    expect(destroy).toHaveBeenCalled();
    expect(batchDelete).toHaveBeenCalledTimes(1);
  });

  it('没有选中数据时既不弹窗也不删除', () => {
    const batchDelete = vi.fn();
    const api = { page: vi.fn(), batchDelete };
    const table = useTable(api);

    table.handleBatchDeleteConfirm();

    expect(confirmMock).not.toHaveBeenCalled();
    expect(batchDelete).not.toHaveBeenCalled();
  });

  it('直接关掉弹窗（未点确定）不会删除', () => {
    const batchDelete = vi.fn();
    const api = { page: vi.fn(), batchDelete };
    const table = useTable(api);
    table.selectionChange([{ id: 9 }]);

    table.handleBatchDeleteConfirm();

    // 没触发 onConfirm ⇒ 不该有任何删除动作
    expect(confirmMock).toHaveBeenCalledTimes(1);
    expect(batchDelete).not.toHaveBeenCalled();
  });
});
