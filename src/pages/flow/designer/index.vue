<!--
Copyright 2024-2026 jffast

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
-->

<template>
  <div class="flow-designer-page">
    <t-card>
      <template #header>
        <div class="designer-header">
          <span>{{ t('pages.flow.designer.title') }}</span>
          <div class="header-right">
            <t-select
              v-model="loadDefinitionId"
              :placeholder="t('pages.flow.designer.placeholder.loadDefinition')"
              clearable
              filterable
              style="width: 280px"
              :loading="definitionLoading"
              @change="onLoadDefinition"
            >
              <t-option
                v-for="d in definitionOptions"
                :key="d.id"
                :value="d.id"
                :label="`${d.name} v${d.version} (${d.key})`"
              />
            </t-select>
            <t-button theme="default" variant="outline" @click="handleNewDiagram">{{
              t('pages.flow.designer.newBlank')
            }}</t-button>
            <t-button theme="success" :loading="saving" @click="handleSave">{{
              t('pages.flow.common.deploy')
            }}</t-button>
          </div>
        </div>
      </template>

      <t-form :data="form" layout="inline" class="meta-form">
        <t-form-item :label="t('pages.flow.common.deployName')" name="name">
          <t-input
            v-model="form.name"
            :placeholder="t('pages.flow.designer.placeholder.deployName')"
            style="width: 200px"
          />
        </t-form-item>
        <t-form-item :label="t('pages.flow.common.category')" name="category">
          <t-select
            v-model="form.category"
            :placeholder="t('pages.flow.common.placeholder.categorySelect')"
            clearable
            style="width: 180px"
          >
            <t-option
              v-for="c in categoryOptions"
              :key="c.categoryCode"
              :value="c.categoryCode"
              :label="c.categoryName"
            />
          </t-select>
        </t-form-item>
        <t-form-item :label="t('pages.flow.common.resourceName')" name="resourceName">
          <t-input
            v-model="form.resourceName"
            :placeholder="t('pages.flow.common.placeholder.resourceName')"
            style="width: 200px"
          />
        </t-form-item>
      </t-form>

      <t-tabs v-model="activeTab" @change="onTabChange">
        <t-tab-panel value="visual" :label="t('pages.flow.designer.tabVisual')">
          <div class="visual-wrap">
            <div class="canvas-toolbar">
              <t-button size="small" variant="outline" @click="handleZoom(1)">{{
                t('pages.flow.designer.zoomIn')
              }}</t-button>
              <t-button size="small" variant="outline" @click="handleZoom(-1)">{{
                t('pages.flow.designer.zoomOut')
              }}</t-button>
              <t-button size="small" variant="outline" @click="handleZoomReset">{{
                t('pages.flow.designer.fitCanvas')
              }}</t-button>
              <t-button size="small" variant="outline" @click="handleDownloadXml">{{
                t('pages.flow.designer.downloadXml')
              }}</t-button>
              <t-upload
                :auto-upload="false"
                :show-upload-progress="false"
                :max="1"
                accept=".xml,.bpmn,.bpmn20.xml"
                @change="handleFileSelect"
              >
                <t-button size="small" variant="outline">{{ t('pages.flow.designer.importBpmn') }}</t-button>
              </t-upload>
            </div>
            <div class="visual-body">
              <div ref="canvasRef" class="bpmn-canvas" />
              <div class="props-panel">
                <div v-if="!selected.type" class="props-empty">{{ t('pages.flow.designer.propsEmpty') }}</div>
                <div v-else>
                  <div class="props-title">
                    {{ t('pages.flow.designer.propsTitle', { type: selected.typeName }) }}
                  </div>
                  <t-form label-width="80px" layout="vertical">
                    <t-form-item :label="t('pages.flow.designer.elementId')">
                      <t-input v-model="selected.id" @change="applyElementId" />
                    </t-form-item>
                    <t-form-item :label="t('common.name')">
                      <t-input v-model="selected.name" @change="applyElementName" />
                    </t-form-item>
                    <template v-if="selected.isUserTask">
                      <t-form-item :label="t('pages.flow.designer.assigneeType')">
                        <t-select
                          v-model="selected.assigneeType"
                          :options="assigneeTypeOptions"
                          @change="applyAssignee"
                        />
                      </t-form-item>
                      <t-form-item
                        v-if="selected.assigneeType !== 'initiator'"
                        :label="t('pages.flow.designer.assigneeValue')"
                      >
                        <t-input
                          v-model="selected.assigneeValue"
                          :placeholder="assigneeValuePlaceholder"
                          @change="applyAssignee"
                        />
                      </t-form-item>
                    </template>
                  </t-form>
                </div>
              </div>
            </div>
          </div>
        </t-tab-panel>
        <t-tab-panel value="code" :label="t('pages.flow.designer.tabCode')">
          <t-textarea
            v-model="form.bpmnXml"
            :autosize="{ minRows: 18, maxRows: 30 }"
            :placeholder="t('pages.flow.designer.placeholder.xmlCode')"
            class="bpmn-editor"
          />
        </t-tab-panel>
      </t-tabs>

      <div class="tips">
        <p>
          <strong>{{ t('pages.flow.designer.tips.title') }}</strong
          >{{ t('pages.flow.designer.tips.intro1') }}<code>{{ t('pages.flow.designer.assigneeType') }}</code
          >{{ t('pages.flow.designer.tips.intro2') }}<code>{{ t('pages.flow.designer.assigneeValue') }}</code
          >{{ t('pages.flow.designer.tips.intro3') }}<code>flowable:assigneeType</code> /
          <code>flowable:assigneeValue</code>{{ t('pages.flow.designer.tips.intro4') }}
        </p>
        <ul>
          <li><code>user</code>：{{ t('pages.flow.designer.tips.user') }}</li>
          <li><code>role</code>：{{ t('pages.flow.designer.tips.role') }}</li>
          <li><code>dept</code>：{{ t('pages.flow.designer.tips.dept') }}</li>
          <li><code>initiator</code>：{{ t('pages.flow.designer.tips.initiator') }}</li>
        </ul>
        <p>
          {{ t('pages.flow.designer.tips.engineP1') }}<code>assigneeType</code> / <code>assigneeValue</code
          >{{ t('pages.flow.designer.tips.engineP2') }}
        </p>
      </div>
    </t-card>
  </div>
</template>
<script lang="ts" setup>
import 'bpmn-js/dist/assets/bpmn-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css';
import 'bpmn-js/dist/assets/diagram-js.css';

import Modeler from 'bpmn-js/lib/Modeler';
import { MessagePlugin } from 'tdesign-vue-next';
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { category as categoryApi, process } from '@/api/flow';

import { flowableModdleDescriptor } from './flowable-moddle';

defineOptions({
  name: 'FlowDesigner',
});

const { t } = useI18n();

const BLANK_DIAGRAM = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:flowable="http://flowable.org/bpmn" targetNamespace="http://jffast.io/flow">
  <process id="process_1" name="新流程" isExecutable="true">
    <startEvent id="start" name="开始" />
  </process>
</definitions>`;

const saving = ref(false);
const activeTab = ref('visual');
const form = reactive({
  name: '',
  category: '',
  resourceName: '',
  bpmnXml: BLANK_DIAGRAM,
});

const categoryOptions = ref<{ categoryCode: string; categoryName: string }[]>([]);
const definitionOptions = ref<{ id: string | number; name: string; version: number; key: string; category?: string }[]>(
  [],
);
const definitionLoading = ref(false);
const loadDefinitionId = ref('');

const canvasRef = ref<HTMLElement | null>(null);
let modeler: any = null;
let canvasDirty = false;

const selected = reactive({
  elementId: '',
  type: '',
  typeName: '',
  id: '',
  name: '',
  isUserTask: false,
  assigneeType: '',
  assigneeValue: '',
});

// 审批人类型下拉（响应语言切换）
const assigneeTypeOptions = computed(() => [
  { label: t('pages.flow.designer.assigneeTypeMap.user'), value: 'user' },
  { label: t('pages.flow.designer.assigneeTypeMap.role'), value: 'role' },
  { label: t('pages.flow.designer.assigneeTypeMap.dept'), value: 'dept' },
  { label: t('pages.flow.designer.assigneeTypeMap.initiator'), value: 'initiator' },
]);

const assigneeValuePlaceholder = computed(() => {
  switch (selected.assigneeType) {
    case 'user':
      return t('pages.flow.designer.assigneeValuePlaceholder.user');
    case 'role':
      return t('pages.flow.designer.assigneeValuePlaceholder.role');
    case 'dept':
      return t('pages.flow.designer.assigneeValuePlaceholder.dept');
    default:
      return t('pages.flow.designer.assigneeValue');
  }
});

// BPMN 元素类型中文名（响应语言切换）
const TYPE_NAMES = computed<Record<string, string>>(() => ({
  'bpmn:UserTask': t('pages.flow.designer.typeMap.userTask'),
  'bpmn:ServiceTask': t('pages.flow.designer.typeMap.serviceTask'),
  'bpmn:StartEvent': t('pages.flow.designer.typeMap.startEvent'),
  'bpmn:EndEvent': t('pages.flow.designer.typeMap.endEvent'),
  'bpmn:ExclusiveGateway': t('pages.flow.designer.typeMap.exclusiveGateway'),
  'bpmn:ParallelGateway': t('pages.flow.designer.typeMap.parallelGateway'),
  'bpmn:SequenceFlow': t('pages.flow.designer.typeMap.sequenceFlow'),
  'bpmn:Process': t('pages.flow.designer.typeMap.process'),
}));

function getModelerServices() {
  if (!modeler) return null;
  return {
    modeling: modeler.get('modeling'),
    eventBus: modeler.get('eventBus'),
    canvas: modeler.get('canvas'),
    elementRegistry: modeler.get('elementRegistry'),
  };
}

async function importXmlToCanvas(xml: string): Promise<boolean> {
  if (!modeler) return false;
  try {
    const result = await modeler.importXML(xml);
    if (result?.warnings?.length) {
      console.warn('BPMN 导入警告:', result.warnings);
    }
    canvasDirty = false;
    clearSelection();
    return true;
  } catch (e: any) {
    MessagePlugin.error(
      t('pages.flow.designer.message.parseFail', { msg: e?.message || t('pages.flow.designer.message.unknownError') }),
    );
    return false;
  }
}

async function exportCanvasXml(): Promise<string | null> {
  if (!modeler) return form.bpmnXml;
  try {
    const { xml } = await modeler.saveXML({ format: true });
    if (!xml) return null;
    form.bpmnXml = xml;
    canvasDirty = false;
    return form.bpmnXml;
  } catch (e: any) {
    MessagePlugin.error(
      t('pages.flow.designer.message.exportXmlFail', {
        msg: e?.message || t('pages.flow.designer.message.unknownError'),
      }),
    );
    return null;
  }
}

function clearSelection() {
  selected.elementId = '';
  selected.type = '';
  selected.typeName = '';
  selected.id = '';
  selected.name = '';
  selected.isUserTask = false;
  selected.assigneeType = '';
  selected.assigneeValue = '';
}

function onSelectionChanged(e: any) {
  const element = e?.newSelection?.[0];
  if (!element?.businessObject) {
    clearSelection();
    return;
  }
  const bo = element.businessObject;
  selected.elementId = element.id;
  selected.type = bo.$type || '';
  selected.typeName = TYPE_NAMES.value[bo.$type] || bo.$type || t('pages.flow.designer.element');
  selected.id = bo.id || '';
  selected.name = bo.name || '';
  selected.isUserTask = bo.$type === 'bpmn:UserTask';
  selected.assigneeType = bo.get?.('flowable:assigneeType') || '';
  selected.assigneeValue = bo.get?.('flowable:assigneeValue') || '';
}

function findElement() {
  const services = getModelerServices();
  if (!services || !selected.elementId) return null;
  try {
    return services.elementRegistry.get(selected.elementId) || null;
  } catch {
    return null;
  }
}

function applyElementId() {
  const services = getModelerServices();
  const element = findElement();
  if (!services || !element || !selected.id) return;
  try {
    services.modeling.updateProperties(element, { id: selected.id });
    selected.elementId = selected.id;
    canvasDirty = true;
  } catch (e: any) {
    MessagePlugin.error(
      t('pages.flow.designer.message.updateIdFail', {
        msg: e?.message || t('pages.flow.designer.message.unknownError'),
      }),
    );
  }
}

function applyElementName() {
  const services = getModelerServices();
  const element = findElement();
  if (!services || !element) return;
  try {
    services.modeling.updateProperties(element, { name: selected.name });
    canvasDirty = true;
  } catch (e: any) {
    MessagePlugin.error(
      t('pages.flow.designer.message.updateNameFail', {
        msg: e?.message || t('pages.flow.designer.message.unknownError'),
      }),
    );
  }
}

function applyAssignee() {
  const services = getModelerServices();
  const element = findElement();
  if (!services || !element || !selected.isUserTask) return;
  try {
    services.modeling.updateModdleProperties(element, element.businessObject, {
      'flowable:assigneeType': selected.assigneeType || undefined,
      'flowable:assigneeValue': selected.assigneeType === 'initiator' ? undefined : selected.assigneeValue || undefined,
    });
    canvasDirty = true;
  } catch (e: any) {
    MessagePlugin.error(
      t('pages.flow.designer.message.updateAssigneeFail', {
        msg: e?.message || t('pages.flow.designer.message.unknownError'),
      }),
    );
  }
}

function handleZoom(direction: 1 | -1 | 0) {
  const services = getModelerServices();
  if (!services) return;
  if (direction === 0) {
    services.canvas.zoom('fit-viewport', 'auto');
  } else {
    const current = services.canvas.zoom();
    services.canvas.zoom(Math.max(0.2, Math.min(2, current + direction * 0.1)));
  }
}

function handleZoomReset() {
  handleZoom(0);
}

async function handleDownloadXml() {
  const xml = await exportCanvasXml();
  if (!xml) return;
  const blob = new Blob([xml], { type: 'application/xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = form.resourceName || 'process.bpmn20.xml';
  a.click();
  URL.revokeObjectURL(url);
}

async function onTabChange(value: any) {
  if (value === 'code') {
    // 可视化 → 代码：导出画布 XML
    await exportCanvasXml();
  } else if (value === 'visual' && canvasDirty === false && form.bpmnXml) {
    // 代码 → 可视化：仅当 XML 可能被外部改过时重新导入（以文本域为准）
    await importXmlToCanvas(form.bpmnXml);
  } else if (value === 'visual') {
    await importXmlToCanvas(form.bpmnXml);
  }
}

async function handleNewDiagram() {
  form.bpmnXml = BLANK_DIAGRAM;
  if (activeTab.value === 'visual') {
    await importXmlToCanvas(BLANK_DIAGRAM);
  }
  MessagePlugin.success(t('pages.flow.designer.message.newBlankSuccess'));
}

const BPMN_EXT_RE = /\.(bpmn20\.xml|bpmn|xml)$/i;
const BPMN_DEFS_RE = /<definitions[\s\S]*<\/definitions>/;
const BPMN_TAG_RE = /<bpmn[\s\S]*<\/bpmn/;

const handleFileSelect = (files: any) => {
  // TDesign Upload 的 onChange 首参是**数组**（不是 { files } 对象），且 Upload 没有 select 事件。
  const file = (Array.isArray(files) ? files[0] : files)?.raw as File | undefined;
  if (!file) return;
  if (!form.resourceName) {
    form.resourceName = file.name;
  }
  if (!form.name) {
    form.name = file.name.replace(BPMN_EXT_RE, '');
  }
  const reader = new FileReader();
  reader.onload = async () => {
    form.bpmnXml = String(reader.result || '');
    if (activeTab.value === 'visual') {
      await importXmlToCanvas(form.bpmnXml);
    }
  };
  reader.readAsText(file);
};

const onLoadDefinition = async (val: any) => {
  if (!val) return;
  try {
    const res = await process.getBpmnXml(val);
    const xml = res?.data || res || '';
    form.bpmnXml = xml;
    if (activeTab.value === 'visual') {
      await importXmlToCanvas(xml);
    }
    // 自动填充部署名称（加 v 后缀，提示是新版）
    const def = definitionOptions.value.find((d) => d.id === val);
    if (def) {
      form.name = `${def.name} v${def.version + 1}`;
      form.category = def.category || form.category;
      form.resourceName = `${def.key}.bpmn20.xml`;
    }
    MessagePlugin.success(t('pages.flow.designer.message.loadedTip'));
  } catch {
    // 错误提示已由 request 响应拦截器统一弹出，这里只吞掉 rejection，避免未捕获告警
  }
};

const loadCategoryOptions = async () => {
  try {
    const res = await categoryApi.listEnabled();
    categoryOptions.value = res?.data || res || [];
  } catch {
    categoryOptions.value = [];
  }
};

const loadDefinitions = async () => {
  definitionLoading.value = true;
  try {
    const res = await process.definitionPage({ pageNo: 1, pageSize: 200 });
    definitionOptions.value = res?.data?.list || [];
  } catch {
    definitionOptions.value = [];
  } finally {
    definitionLoading.value = false;
  }
};

const handleSave = async () => {
  let xml: string | null = form.bpmnXml;
  if (activeTab.value === 'visual') {
    xml = await exportCanvasXml();
    if (!xml) return;
  }
  if (!xml) {
    MessagePlugin.warning(t('pages.flow.designer.message.needBpmnXml'));
    return;
  }
  // 简单校验 XML 格式
  if (!BPMN_DEFS_RE.test(xml) && !BPMN_TAG_RE.test(xml)) {
    MessagePlugin.error(t('pages.flow.designer.message.xmlRootRequired'));
    return;
  }
  saving.value = true;
  try {
    const res = await process.deploy({
      name: form.name || undefined,
      category: form.category || undefined,
      resourceName: form.resourceName || 'process.bpmn20.xml',
      bpmnXml: xml,
    });
    if (res && res.code === 200) {
      MessagePlugin.success(t('pages.flow.common.message.deploySuccess'));
      loadDefinitionId.value = '';
      await loadDefinitions();
    }
  } finally {
    saving.value = false;
  }
};

onMounted(async () => {
  loadCategoryOptions();
  loadDefinitions();
  if (!canvasRef.value) return;
  try {
    modeler = new Modeler({
      container: canvasRef.value,
      moddleExtensions: {
        flowable: flowableModdleDescriptor,
      },
    });
    const services = getModelerServices();
    services?.eventBus.on('selection.changed', onSelectionChanged);
    services?.eventBus.on('commandStack.changed', () => {
      canvasDirty = true;
    });
    await importXmlToCanvas(form.bpmnXml);
    handleZoomReset();
  } catch (e: any) {
    console.error('流程设计器初始化失败:', e);
    MessagePlugin.error(t('pages.flow.designer.message.initFail'));
  }
});

onBeforeUnmount(() => {
  try {
    modeler?.destroy();
  } catch {
    // 实例可能已随页面卸载被销毁，destroy 失败不影响离开页面
  }
  modeler = null;
});
</script>
<style scoped lang="less">
.flow-designer-page {
  .designer-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;

    .header-right {
      display: flex;
      gap: 8px;
      align-items: center;
    }
  }

  .meta-form {
    margin-bottom: 12px;
  }

  .visual-wrap {
    .canvas-toolbar {
      display: flex;
      gap: 8px;
      margin-bottom: 8px;
      align-items: center;
    }

    .visual-body {
      display: flex;
      gap: 12px;
      min-height: 480px;

      .bpmn-canvas {
        flex: 1;
        min-height: 480px;
        border: 1px solid var(--td-border-level-1-color);
        border-radius: 4px;
        background: #fff;
      }

      .props-panel {
        width: 280px;
        flex-shrink: 0;
        padding: 12px;
        border: 1px solid var(--td-border-level-1-color);
        border-radius: 4px;
        background: var(--td-bg-color-container);
        align-self: flex-start;

        .props-empty {
          color: var(--td-text-color-placeholder);
          font-size: 13px;
        }

        .props-title {
          font-weight: 600;
          margin-bottom: 8px;
        }
      }
    }
  }

  .bpmn-editor {
    font-family: Consolas, Monaco, monospace;
    font-size: 13px;
  }

  .tips {
    margin-top: 16px;
    padding: 12px 16px;
    background: var(--td-bg-color-container);
    border-radius: 4px;
    font-size: 13px;
    color: var(--td-text-color-secondary);

    code {
      padding: 1px 6px;
      background: var(--td-bg-color-component);
      border-radius: 2px;
      font-family: Consolas, Monaco, monospace;
      color: var(--td-brand-color);
    }

    ul {
      margin: 8px 0 0;
      padding-left: 20px;
      line-height: 1.8;
    }
  }
}
</style>
