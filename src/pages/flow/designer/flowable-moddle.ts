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
 * Flowable 扩展属性的 moddle 描述：在 `bpmn:UserTask` 上挂审批人类型 / 取值，
 * 导出为 `flowable:assigneeType` / `flowable:assigneeValue`（与后端审批人 SPI 对齐）。
 *
 * 设计器画布与单测共用本文件，勿各写一份（漂移会导致画布写出的 XML 单测覆盖不到）。
 */
export const flowableModdleDescriptor = {
  name: 'Flowable',
  uri: 'http://flowable.org/bpmn',
  prefix: 'flowable',
  types: [
    {
      name: 'FlowableUserTaskAttrs',
      extends: ['bpmn:UserTask'],
      properties: [
        { name: 'assigneeType', isAttr: true, type: 'String' },
        { name: 'assigneeValue', isAttr: true, type: 'String' },
      ],
    },
  ],
};
