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

import { describe, expect, it } from 'vitest';

import type { DeptBindingRuleInput, PostOption } from '@/utils/user-edit-rules';
import {
  computeIsSelfEdit,
  computeSubmittedDeptIds,
  computeSubmittedPostIds,
  evaluateDeptBindingRules,
  mergePostOptions,
  normalizeDeptId,
  normalizeDeptIds,
} from '@/utils/user-edit-rules';

const rule = (overrides: Partial<DeptBindingRuleInput>): DeptBindingRuleInput => ({
  isEdit: true,
  canEditBindings: true,
  originalDeptId: null,
  originalDeptIds: [],
  newDeptId: null,
  submittedDeptIds: [],
  ...overrides,
});

const SNOWFLAKE_A = '13794145807417349';
const SNOWFLAKE_B = '13794145807417350';

describe('a-63 computeIsSelfEdit', () => {
  it('① 两侧 id 与姓名都为空时不得因空串相等判为自己', () => {
    expect(
      computeIsSelfEdit({
        isEdit: true,
        formId: undefined,
        formUserName: '',
        currentUserId: undefined,
        currentUserName: '',
      }),
    ).toBe(false);
  });

  it('② 缺少 id 时 userName 兜底可判为自己', () => {
    expect(
      computeIsSelfEdit({
        isEdit: true,
        formId: undefined,
        formUserName: 'alice',
        currentUserId: undefined,
        currentUserName: 'alice',
      }),
    ).toBe(true);
  });

  it('③ 创建态永远不是自助编辑', () => {
    expect(
      computeIsSelfEdit({
        isEdit: false,
        formId: 1,
        formUserName: 'alice',
        currentUserId: 1,
        currentUserName: 'alice',
      }),
    ).toBe(false);
  });

  it('④ 数字与字符串 id 归一后相等', () => {
    expect(
      computeIsSelfEdit({
        isEdit: true,
        formId: '1',
        formUserName: 'alice',
        currentUserId: 1,
        currentUserName: 'alice',
      }),
    ).toBe(true);
  });
});

describe('a-64 computeSubmittedDeptIds 与创建态判定', () => {
  it('不可编辑绑定时恒为空集合（非超管创建）', () => {
    expect(computeSubmittedDeptIds(false, [20])).toEqual([]);
  });

  it('非超管创建的防御性断言：不触发 R-EDIT-4', () => {
    expect(
      evaluateDeptBindingRules({
        isEdit: false,
        canEditBindings: false,
        originalDeptId: null,
        originalDeptIds: [],
        newDeptId: '10',
        submittedDeptIds: computeSubmittedDeptIds(false, [20]),
      }),
    ).toBeNull();
  });

  it('对照正例：可编辑但归属不在绑定集合内 ⇒ 拦截', () => {
    expect(
      evaluateDeptBindingRules(
        rule({
          isEdit: false,
          newDeptId: '10',
          submittedDeptIds: ['20'],
        }),
      ),
    ).toBe('deptMustBeInBindings');
  });

  it('对照正例：归属在绑定集合内 ⇒ 放行', () => {
    expect(
      evaluateDeptBindingRules(
        rule({
          isEdit: false,
          newDeptId: '10',
          submittedDeptIds: ['10', '20'],
        }),
      ),
    ).toBeNull();
  });

  it('空串 / null 不得被 Number() 折算成部门 0', () => {
    expect(computeSubmittedDeptIds(true, ['', null, undefined])).toEqual([]);
    expect(computeSubmittedDeptIds(true, ['10', 20])).toEqual(['10', '20']);
  });

  it('17 位雪花 id 原样返回，不经过 Number() 失真', () => {
    expect(computeSubmittedDeptIds(true, [SNOWFLAKE_A])).toEqual([SNOWFLAKE_A]);
    expect(computeSubmittedDeptIds(true, [{ id: SNOWFLAKE_A }, 20])).toEqual([SNOWFLAKE_A, '20']);
  });
});

describe('a-65 evaluateDeptBindingRules 真值表', () => {
  it('#1 原空、新空 ⇒ 放行', () => {
    expect(evaluateDeptBindingRules(rule({}))).toBeNull();
  });

  it('#2 归属改为 10 但绑定为空 ⇒ deptListNotEmpty', () => {
    expect(evaluateDeptBindingRules(rule({ newDeptId: '10' }))).toBe('deptListNotEmpty');
  });

  it('#3 归属 10 + 绑定 {10} ⇒ 放行', () => {
    expect(evaluateDeptBindingRules(rule({ newDeptId: '10', submittedDeptIds: ['10'] }))).toBeNull();
  });

  it('#4 归属改 20 但绑定仍 {10} ⇒ deptMustBeInBindings', () => {
    expect(
      evaluateDeptBindingRules(
        rule({
          originalDeptId: '10',
          originalDeptIds: ['10'],
          newDeptId: '20',
          submittedDeptIds: ['10'],
        }),
      ),
    ).toBe('deptMustBeInBindings');
  });

  it('#5 移除归属绑定（{10,20} → {20}）⇒ deptMustBeInBindings', () => {
    expect(
      evaluateDeptBindingRules(
        rule({
          originalDeptId: '10',
          originalDeptIds: ['10', '20'],
          newDeptId: '10',
          submittedDeptIds: ['20'],
        }),
      ),
    ).toBe('deptMustBeInBindings');
  });

  it('#6 清空全部绑定（原非空）⇒ deptListNotEmpty', () => {
    expect(
      evaluateDeptBindingRules(
        rule({
          originalDeptId: '10',
          originalDeptIds: ['10'],
          newDeptId: '10',
          submittedDeptIds: [],
        }),
      ),
    ).toBe('deptListNotEmpty');
  });

  it('#7 仅移除其它绑定（{10,20} → {10}）⇒ 放行', () => {
    expect(
      evaluateDeptBindingRules(
        rule({
          originalDeptId: '10',
          originalDeptIds: ['10', '20'],
          newDeptId: '10',
          submittedDeptIds: ['10'],
        }),
      ),
    ).toBeNull();
  });

  it('#8 存量分叉未改动 ⇒ 放行', () => {
    expect(
      evaluateDeptBindingRules(
        rule({
          originalDeptId: '10',
          originalDeptIds: ['20'],
          newDeptId: '10',
          submittedDeptIds: ['20'],
        }),
      ),
    ).toBeNull();
  });

  it('#9 分叉修复方向 1：归属改为绑定内 20 ⇒ 放行', () => {
    expect(
      evaluateDeptBindingRules(
        rule({
          originalDeptId: '10',
          originalDeptIds: ['20'],
          newDeptId: '20',
          submittedDeptIds: ['20'],
        }),
      ),
    ).toBeNull();
  });

  it('#10 分叉修复方向 2：把 10 加进绑定 ⇒ 放行', () => {
    expect(
      evaluateDeptBindingRules(
        rule({
          originalDeptId: '10',
          originalDeptIds: ['20'],
          newDeptId: '10',
          submittedDeptIds: ['10', '20'],
        }),
      ),
    ).toBeNull();
  });

  it('#11 绑定-only 改动（归属为空）⇒ 放行', () => {
    expect(
      evaluateDeptBindingRules(
        rule({
          originalDeptId: null,
          originalDeptIds: ['10'],
          newDeptId: null,
          submittedDeptIds: ['10', '20'],
        }),
      ),
    ).toBeNull();
  });

  it('#12 不可编辑绑定（非超管 / 自助编辑）⇒ 整块跳过', () => {
    expect(
      evaluateDeptBindingRules(
        rule({
          canEditBindings: false,
          originalDeptId: '10',
          originalDeptIds: ['10'],
          newDeptId: '10',
          submittedDeptIds: [],
        }),
      ),
    ).toBeNull();
  });

  it('c1/C2 创建态绑定为空 ⇒ 放行（后端 D1 派生）', () => {
    expect(evaluateDeptBindingRules(rule({ isEdit: false, newDeptId: '10', submittedDeptIds: [] }))).toBeNull();
  });

  it('c3 创建态绑定包含归属 ⇒ 放行', () => {
    expect(
      evaluateDeptBindingRules(rule({ isEdit: false, newDeptId: '10', submittedDeptIds: ['10', '20'] })),
    ).toBeNull();
  });

  it('c4 创建态绑定不含归属 ⇒ deptMustBeInBindings', () => {
    expect(evaluateDeptBindingRules(rule({ isEdit: false, newDeptId: '10', submittedDeptIds: ['20'] }))).toBe(
      'deptMustBeInBindings',
    );
  });

  it('c5 创建态绑定-only（归属为空）⇒ 放行', () => {
    expect(evaluateDeptBindingRules(rule({ isEdit: false, newDeptId: null, submittedDeptIds: ['20'] }))).toBeNull();
  });

  it('17 位雪花 id 往返：回填集合与提交集合逐字相等时放行', () => {
    expect(
      evaluateDeptBindingRules(
        rule({
          originalDeptId: SNOWFLAKE_A,
          originalDeptIds: [SNOWFLAKE_A],
          newDeptId: SNOWFLAKE_A,
          submittedDeptIds: [SNOWFLAKE_A],
        }),
      ),
    ).toBeNull();
  });

  it('17 位雪花 id 变更：归属不在绑定集合时按字符串精确比较拦截', () => {
    expect(
      evaluateDeptBindingRules(
        rule({
          originalDeptId: SNOWFLAKE_A,
          originalDeptIds: [SNOWFLAKE_A],
          newDeptId: SNOWFLAKE_B,
          submittedDeptIds: [SNOWFLAKE_A],
        }),
      ),
    ).toBe('deptMustBeInBindings');
  });
});

describe('normalizeDeptId', () => {
  it('兼容标量 / 单元素数组 / 空值 / 非数字串', () => {
    expect(normalizeDeptId(10)).toBe('10');
    expect(normalizeDeptId([10])).toBe('10');
    expect(normalizeDeptId([])).toBeNull();
    expect(normalizeDeptId('')).toBeNull();
    expect(normalizeDeptId(null)).toBeNull();
    expect(normalizeDeptId(undefined)).toBeNull();
    expect(normalizeDeptId('abc')).toBeNull();
    expect(normalizeDeptId('10')).toBe('10');
  });

  it('17 位雪花 id 保留字符串原值（不做 Number 转换）', () => {
    expect(normalizeDeptId(SNOWFLAKE_A)).toBe(SNOWFLAKE_A);
    expect(normalizeDeptId([SNOWFLAKE_A])).toBe(SNOWFLAKE_A);
    expect(normalizeDeptId(` ${SNOWFLAKE_A} `)).toBe(SNOWFLAKE_A);
  });
});

describe('a-66 id 值域边界（CO-3）', () => {
  it('② Number.MAX_SAFE_INTEGER 仍按十进制原样转字符串', () => {
    expect(normalizeDeptId(Number.MAX_SAFE_INTEGER)).toBe('9007199254740991');
    expect(normalizeDeptId([Number.MAX_SAFE_INTEGER])).toBe('9007199254740991');
    // 超出安全范围的 id 必须以字符串传入，字符串通道逐字保真
    expect(normalizeDeptId('9007199254740993')).toBe('9007199254740993');
  });

  it('③ 小整数允许首尾空白，trim 后归一', () => {
    expect(normalizeDeptId(' 20 ')).toBe('20');
    expect(normalizeDeptIds([' 10 ', ' 20 '])).toEqual(['10', '20']);
  });

  it('④ 小数与负数不是合法部门 id，归一为 null / 被剔除', () => {
    expect(normalizeDeptId('1.5')).toBeNull();
    expect(normalizeDeptId('-1')).toBeNull();
    expect(normalizeDeptIds(['1.5', '-1', '10'])).toEqual(['10']);
  });
});

describe('normalizeDeptIds 回填归一（编辑态 deptList / deptIds 双向保真）', () => {
  it('数组元素 { id } / 标量均保留字符串原值', () => {
    expect(normalizeDeptIds([{ id: SNOWFLAKE_A }])).toEqual([SNOWFLAKE_A]);
    expect(normalizeDeptIds([SNOWFLAKE_A, 20])).toEqual([SNOWFLAKE_A, '20']);
  });

  it('后端逗号串回退分支逐字保真', () => {
    expect(normalizeDeptIds(`${SNOWFLAKE_A},${SNOWFLAKE_B}`)).toEqual([SNOWFLAKE_A, SNOWFLAKE_B]);
  });

  it('空值与非数字项被剔除', () => {
    expect(normalizeDeptIds(null)).toEqual([]);
    expect(normalizeDeptIds('')).toEqual([]);
    expect(normalizeDeptIds(['', null, undefined, 'abc'])).toEqual([]);
  });

  it('编辑回填 → 提交判定：详情原值经归一后原样放行', () => {
    const detail = { deptId: SNOWFLAKE_A, deptList: [{ id: SNOWFLAKE_A }, { id: SNOWFLAKE_B }] };
    const originalDeptId = normalizeDeptId(detail.deptId);
    const originalDeptIds = normalizeDeptIds(detail.deptList);
    const submittedDeptIds = computeSubmittedDeptIds(true, originalDeptIds);
    expect(originalDeptId).toBe(SNOWFLAKE_A);
    expect(originalDeptIds).toEqual([SNOWFLAKE_A, SNOWFLAKE_B]);
    expect(submittedDeptIds).toEqual([SNOWFLAKE_A, SNOWFLAKE_B]);
    expect(
      evaluateDeptBindingRules({
        isEdit: true,
        canEditBindings: true,
        originalDeptId,
        originalDeptIds,
        newDeptId: normalizeDeptId(originalDeptId),
        submittedDeptIds,
      }),
    ).toBeNull();
  });
});

describe('computeSubmittedPostIds 三态（键缺席 / 显式清空 / 整组替换）', () => {
  it('自助编辑 ⇒ null：postList 键必须缺席，后端不触碰 sys_user_post', () => {
    expect(computeSubmittedPostIds(false, [SNOWFLAKE_A])).toBeNull();
    expect(computeSubmittedPostIds(false, [])).toBeNull();
    expect(computeSubmittedPostIds(false, null)).toBeNull();
  });

  it('空选 ⇒ 空数组：清空意图必须显式，不得退化成 null', () => {
    expect(computeSubmittedPostIds(true, [])).toEqual([]);
  });

  it('管理员等值重提：回填原样提交，顺序无关且 id 保留字符串字面值', () => {
    expect(computeSubmittedPostIds(true, [{ id: SNOWFLAKE_A }, { id: SNOWFLAKE_B }])).toEqual([
      { id: SNOWFLAKE_A },
      { id: SNOWFLAKE_B },
    ]);
    expect(computeSubmittedPostIds(true, [SNOWFLAKE_B, SNOWFLAKE_A])).toEqual([
      { id: SNOWFLAKE_B },
      { id: SNOWFLAKE_A },
    ]);
  });

  it('新集合：新增与移除都落进提交体，非数字项与空 id 被剔除', () => {
    expect(computeSubmittedPostIds(true, [SNOWFLAKE_A, 'abc', '', null, undefined])).toEqual([{ id: SNOWFLAKE_A }]);
  });

  it('雪花 id 不经 Number()，17 位以上仍逐字保真', () => {
    const longId = '1379414580741734912';
    expect(computeSubmittedPostIds(true, [longId])).toEqual([{ id: longId }]);
  });

  it('后端逗号串回填形态同样可用', () => {
    expect(computeSubmittedPostIds(true, `${SNOWFLAKE_A},${SNOWFLAKE_B}` as never)).toEqual([
      { id: SNOWFLAKE_A },
      { id: SNOWFLAKE_B },
    ]);
  });
});

describe('mergePostOptions 并集（R-J：停用岗位的绑定不得被顺手抹掉）', () => {
  const dropdown: PostOption[] = [
    { label: '架构师', value: SNOWFLAKE_A },
    { label: '开发工程师', value: SNOWFLAKE_B },
  ];

  it('下拉未含的回填项必须补进选项，否则提交集合少了它 = 静默解绑', () => {
    const backfilled: PostOption[] = [
      { label: '已停用岗位', value: SNOWFLAKE_B },
      { label: '产品经理', value: '99' },
    ];
    expect(mergePostOptions(dropdown, backfilled)).toEqual([
      { label: '架构师', value: SNOWFLAKE_A },
      { label: '开发工程师', value: SNOWFLAKE_B },
      { label: '产品经理', value: '99' },
    ]);
  });

  it('同 id 以下拉标签为准，顺序保持下拉在前', () => {
    const backfilled: PostOption[] = [{ label: '旧标签', value: SNOWFLAKE_A }];
    expect(mergePostOptions(dropdown, backfilled)).toEqual(dropdown);
  });

  it('两侧皆空 ⇒ 空选项；下拉为空时回填项全量兜住', () => {
    expect(mergePostOptions([], [])).toEqual([]);
    const backfilled: PostOption[] = [{ label: '已停用岗位', value: SNOWFLAKE_B }];
    expect(mergePostOptions([], backfilled)).toEqual(backfilled);
  });

  it('并集结果直接喂提交函数：等值重提不丢停用岗位', () => {
    const options = mergePostOptions(dropdown, [{ label: '已停用岗位', value: SNOWFLAKE_B }]);
    const selected = options.map((option) => option.value);
    expect(computeSubmittedPostIds(true, selected)).toEqual([{ id: SNOWFLAKE_A }, { id: SNOWFLAKE_B }]);
  });
});
