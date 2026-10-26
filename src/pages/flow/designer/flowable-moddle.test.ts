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

import * as BpmnModdleModule from 'bpmn-moddle';
import { describe, expect, it } from 'vitest';

// bpmn-moddle 为 CJS 包，按互操作取构造器
const BpmnModdle: any = (BpmnModdleModule as any).default || (BpmnModdleModule as any).BpmnModdle || BpmnModdleModule;

import { flowableModdleDescriptor as FLOWABLE_MODDLE } from './flowable-moddle';

/**
 * Flowable moddle 描述符回路测试（纯 XML 层，无画布渲染）。
 * 设计器画布（bpmn-js Modeler）需要真实浏览器 SVG，本单测只锁定
 * `flowable:assigneeType/assigneeValue` 在导入/导出/回读三步不断链。
 */

const BLANK = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:flowable="http://flowable.org/bpmn" targetNamespace="http://jffast.io/flow">
  <process id="process_1" name="新流程" isExecutable="true">
    <startEvent id="start" name="开始" />
    <userTask id="task_1" name="审批" />
  </process>
</definitions>`;

function findTask(definitions: any) {
  const process = definitions.get('rootElements').find((e: any) => e.$type === 'bpmn:Process');
  return process.get('flowElements').find((e: any) => e.id === 'task_1');
}

describe('flowable moddle 描述符', () => {
  it('导入含 flowable 命名空间的空白图无警告', async () => {
    const moddle = new BpmnModdle({ flowable: FLOWABLE_MODDLE });
    const { warnings } = await moddle.fromXML(BLANK);
    expect(warnings.length).toBe(0);
  });

  it('审批人属性写读回路', async () => {
    const moddle = new BpmnModdle({ flowable: FLOWABLE_MODDLE });
    const { rootElement } = await moddle.fromXML(BLANK);
    const task = findTask(rootElement);
    task.set('flowable:assigneeType', 'role');
    task.set('flowable:assigneeValue', 'manager');
    const { xml } = await moddle.toXML(rootElement);
    expect(xml).toContain('flowable:assigneeType="role"');
    expect(xml).toContain('flowable:assigneeValue="manager"');
    // 回导入：属性可读
    const reloaded = await moddle.fromXML(xml);
    expect(findTask(reloaded.rootElement).get('flowable:assigneeType')).toBe('role');
  });
});
