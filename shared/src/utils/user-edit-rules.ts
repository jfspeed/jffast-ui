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

/**
 * 用户编辑弹窗的纯规则函数。
 * <p>不读取 Vue / Pinia / i18n / 组件状态，全部入参显式传入，供 `save.vue` 包装与 Vitest 直接调用。</p>
 * <p>部门 id 全链路使用字符串：17 位雪花 id 超出 JS 安全整数范围，后端已按字符串序列化，
 * 任何 `Number()` 归一都会导致精度丢失。</p>
 */

export type DeptRuleViolation = 'deptListNotEmpty' | 'deptMustBeInBindings';

export interface SelfEditInput {
  isEdit: boolean;
  formId: unknown;
  formUserName?: string | null;
  currentUserId: unknown;
  currentUserName?: string | null;
}

export interface DeptBindingRuleInput {
  isEdit: boolean;
  canEditBindings: boolean;
  originalDeptId: string | null;
  originalDeptIds: readonly string[];
  newDeptId: string | null;
  submittedDeptIds: readonly string[];
}

const isPresent = (value: unknown): boolean => value !== null && value !== undefined && value !== '';

const DEPT_ID_PATTERN = /^\d+$/;

/** U-2：兼容标量 / 单元素数组 / '' / null / NaN；保留 id 原字面值，所有读取 form.deptId 的地方必须经它 */
export const normalizeDeptId = (value: unknown): string | null => {
  const raw = Array.isArray(value) ? (value.length > 0 ? value[0] : null) : value;
  if (raw === null || raw === undefined) {
    return null;
  }
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? String(raw) : null;
  }
  const text = String(raw).trim();
  return DEPT_ID_PATTERN.test(text) ? text : null;
};

/** 回填 / 提交共用：数组元素可为 `{ id }` 或标量，也接受后端逗号串；去掉空值，保留原字面值 */
export const normalizeDeptIds = (value: unknown): string[] => {
  if (value === null || value === undefined || value === '') {
    return [];
  }
  const list = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : [value];
  const ids: string[] = [];
  list.forEach((item) => {
    const raw = typeof item === 'object' && item !== null ? (item as { id?: unknown }).id : item;
    const id = normalizeDeptId(raw);
    if (id !== null) {
      ids.push(id);
    }
  });
  return ids;
};

/** P3-2：两侧 id 都非空才比较；userName 兜底也要求两侧非空 */
export const computeIsSelfEdit = (input: SelfEditInput): boolean => {
  if (!input.isEdit) {
    return false;
  }
  if (
    isPresent(input.formId) &&
    isPresent(input.currentUserId) &&
    String(input.formId) === String(input.currentUserId)
  ) {
    return true;
  }
  return !!input.formUserName && !!input.currentUserName && input.formUserName === input.currentUserName;
};

/** P3-9：实际会提交的集合；不可编辑绑定 ⇒ 恒 []（非超管创建 R-EDIT-4 不拦的关键） */
export const computeSubmittedDeptIds = (
  canEditBindings: boolean,
  deptIds: readonly unknown[] | null | undefined,
): string[] => {
  if (!canEditBindings) {
    return [];
  }
  return normalizeDeptIds(deptIds);
};

const sameId = (a: string | null, b: string | null): boolean => a === b;

const sameSet = (a: readonly string[], b: readonly string[]): boolean => {
  const left = new Set(a);
  const right = new Set(b);
  return left.size === right.size && [...left].every((item) => right.has(item));
};

/** R-EDIT-1 / R-EDIT-2 / R-EDIT-4 的唯一规则体 */
export const evaluateDeptBindingRules = (input: DeptBindingRuleInput): DeptRuleViolation | null => {
  if (input.isEdit) {
    // 非超管 / 自助编辑：两个键都不提交，不参与判定
    if (!input.canEditBindings) {
      return null;
    }

    const deptIdChanged = !sameId(input.originalDeptId, input.newDeptId);
    const deptIdsChanged = !sameSet(input.originalDeptIds, input.submittedDeptIds);

    // R-EDIT-1：本次把绑定清空且原集合非空
    if (deptIdsChanged && input.submittedDeptIds.length === 0 && input.originalDeptIds.length > 0) {
      return 'deptListNotEmpty';
    }
    // R-EDIT-2：deptId 或 deptList 任一改动 ⇒ 归属必须落在绑定集合内
    if ((deptIdChanged || deptIdsChanged) && input.newDeptId !== null) {
      if (input.submittedDeptIds.length === 0) {
        return 'deptListNotEmpty';
      }
      if (!input.submittedDeptIds.includes(input.newDeptId)) {
        return 'deptMustBeInBindings';
      }
    }
    return null;
  }

  // R-EDIT-4（创建态）：只在「实际会提交的集合」非空时校验；非超管恒 [] ⇒ 不拦，交后端 D1 派生
  if (
    input.newDeptId !== null &&
    input.submittedDeptIds.length > 0 &&
    !input.submittedDeptIds.includes(input.newDeptId)
  ) {
    return 'deptMustBeInBindings';
  }
  return null;
};
