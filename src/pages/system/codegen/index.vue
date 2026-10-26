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
  <div class="codegen-container">
    <t-card :title="t('pages.system.codegen.title')" bordered>
      <t-alert
        v-if="envInfo"
        :theme="envInfo.isLocal ? 'success' : 'info'"
        :message="envInfo.mode"
        style="margin-bottom: 16px"
      >
        <template #default>
          <span>{{ envInfo.tip }}</span>
          <t-tag v-if="envInfo.projectType" theme="primary" variant="light" size="small" style="margin-left: 8px">
            {{ projectTypeLabel }}
          </t-tag>
        </template>
      </t-alert>

      <t-form :data="config" layout="inline" class="config-form">
        <t-form-item :label="t('pages.system.codegen.moduleName')">
          <div style="display: flex; gap: 4px; align-items: center">
            <t-select
              v-model="config.moduleName"
              filterable
              clearable
              :placeholder="t('pages.system.codegen.placeholder.module')"
              :loading="moduleLoading"
              style="width: 200px"
            >
              <t-option v-for="m in moduleList" :key="m" :value="m" :label="m" />
            </t-select>
            <t-button
              v-if="envInfo?.isLocal"
              v-permission="'system:codegen:generate'"
              theme="primary"
              variant="outline"
              size="small"
              @click="handleCreateModuleClick"
            >
              {{ t('pages.system.codegen.createModule') }}
            </t-button>
          </div>
        </t-form-item>
        <t-form-item :label="t('pages.system.codegen.packageName')">
          <t-input v-model="config.packageName" :placeholder="t('pages.system.codegen.placeholder.packageName')" />
        </t-form-item>
        <t-form-item :label="t('pages.system.codegen.author')">
          <t-input v-model="config.author" placeholder="jffast" />
        </t-form-item>
        <t-form-item :label="t('pages.system.codegen.includeDto')">
          <t-switch v-model="config.includeDto" />
        </t-form-item>
        <t-form-item>
          <t-button v-permission="'system:codegen:generate'" theme="primary" :loading="loading" @click="handleGenerate">
            {{ t('pages.system.codegen.generate') }}
          </t-button>
          <t-button
            v-permission="'system:codegen:generate'"
            theme="primary"
            variant="outline"
            :loading="zipLoading"
            style="margin-left: 8px"
            @click="handleDownloadZip"
          >
            {{ t('pages.system.codegen.downloadZip') }}
          </t-button>
        </t-form-item>
      </t-form>

      <t-tabs v-model="mainTab" class="main-tabs">
        <t-tab-panel value="table" :label="t('pages.system.codegen.tabs.table')">
          <table-select-panel v-model:selected-keys="selectedKeys" />
        </t-tab-panel>

        <t-tab-panel value="preview" :label="previewTabLabel" :disabled="!generatedCode">
          <code-preview-panel
            v-model:active-tab="activeTab"
            :generated-code="generatedCode"
            :module-name="config.moduleName"
            :is-local="!!envInfo?.isLocal"
            :save-loading="saveLoading"
            :table-name="selectedKeys[0] || ''"
            @save-local="handleSaveLocalClick"
          />
        </t-tab-panel>
      </t-tabs>

      <save-local-dialog
        v-model:visible="saveDialogVisible"
        :loading="saveLoading"
        :module-name="config.moduleName"
        :file-items="fileItems"
        :selected-files="selectedFiles"
        :all-selected="selectAll"
        @confirm="handleSaveConfirm"
        @toggle-all="handleSelectAll"
        @toggle-item="handleFileCheckChange"
      />

      <create-module-dialog
        v-model:visible="createModuleDialogVisible"
        v-model:module-name="newModuleName"
        :loading="createModuleLoading"
        :project-type-label="projectTypeLabel"
        :full-module-name="previewFullModuleName"
        :module-path="previewModulePath"
        @confirm="handleCreateModuleConfirm"
      />
    </t-card>
  </div>
</template>
<script lang="ts" setup>
import { MessagePlugin } from 'tdesign-vue-next';
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { checkLocal, createModule, downloadZip, getEnv, getModules, previewCode, saveLocal } from '@/api/codegen';

import CodePreviewPanel from './components/CodePreviewPanel.vue';
import CreateModuleDialog from './components/CreateModuleDialog.vue';
import SaveLocalDialog from './components/SaveLocalDialog.vue';
import TableSelectPanel from './components/TableSelectPanel.vue';

const { t } = useI18n();

const selectedKeys = ref([]);
const mainTab = ref('table');

const config = reactive({
  packageName: '',
  author: 'jffast',
  includeDto: false,
  genType: 'crud',
  moduleName: '',
});

const moduleList = ref<string[]>([]);
const moduleLoading = ref(false);

const generatedCode = ref<Record<string, any> | null>(null);
const loading = ref(false);
const activeTab = ref('entity');

const envInfo = ref<{
  isLocal?: boolean;
  mode?: string;
  tip?: string;
  projectType?: string;
  namingPrefix?: string;
  projectRoot?: string;
  bizDirName?: string;
} | null>(null);
const saveLoading = ref(false);
const zipLoading = ref(false);

const saveDialogVisible = ref(false);
const selectedFiles = ref<string[]>([]);
const selectAll = ref(true);
const fileExists = reactive<Record<string, any>>({});
const overwrite = ref(false);

const createModuleDialogVisible = ref(false);
const createModuleLoading = ref(false);
const newModuleName = ref('');

const projectTypeLabel = computed(() => {
  return t('pages.system.codegen.projectTypeLabel');
});

// 命名前缀由后端统一下发，不同项目形态前缀不同，前端不再硬编码
const namingPrefix = computed(() => envInfo.value?.namingPrefix || 'jffast-');

const previewFullModuleName = computed(() => {
  if (!newModuleName.value) return '-';
  const name = newModuleName.value.trim();
  if (name.startsWith(namingPrefix.value)) return name;
  return namingPrefix.value + name;
});

const previewModulePath = computed(() => {
  if (!newModuleName.value || !envInfo.value?.projectRoot) return '-';
  // 业务聚合目录名由后端下发，前端不再硬编码
  const bizDir = envInfo.value?.bizDirName || 'jffast-biz';
  return `${envInfo.value.projectRoot}/${bizDir}/${previewFullModuleName.value}`;
});

const previewTabLabel = computed(() => {
  if (!generatedCode.value) return t('pages.system.codegen.tabs.preview');
  const count = Object.keys(visibleCodeTypes.value).length;
  return t('pages.system.codegen.tabs.previewWithCount', { count });
});

const allFileKeys = [
  'entity',
  'mapper',
  'service',
  'controller',
  'frontendApi',
  'frontendIndexPage',
  'frontendSavePage',
  'frontendRouter',
  'menuSql',
];

// 文件 / 代码类型标签随语言切换更新
const fileLabels = computed<Record<string, string>>(() => ({
  entity: t('pages.system.codegen.codeLabel.entity'),
  mapper: t('pages.system.codegen.codeLabel.mapper'),
  service: t('pages.system.codegen.codeLabel.service'),
  controller: t('pages.system.codegen.codeLabel.controller'),
  frontendApi: t('pages.system.codegen.codeLabel.frontendApi'),
  frontendIndexPage: t('pages.system.codegen.codeLabel.frontendIndexPage'),
  frontendSavePage: t('pages.system.codegen.codeLabel.frontendSavePage'),
  frontendRouter: t('pages.system.codegen.codeLabel.frontendRouter'),
  menuSql: t('pages.system.codegen.codeLabel.menuSql'),
}));

const fileItems = computed(() =>
  allFileKeys.map((key) => {
    const info = fileExists[key] || { exists: false, path: '' };
    let disabled = false;
    let contentExists = false;

    if (key === 'frontendApi') {
      contentExists = info.apiExists || false;
      disabled = contentExists;
    } else if (key === 'frontendRouter') {
      contentExists = info.routeExists || false;
      disabled = contentExists;
    }

    return {
      key,
      label: fileLabels.value[key] || key,
      path: info.path || '',
      exists: info.exists || false,
      contentExists,
      disabled,
    };
  }),
);

const allCodeTypeLabelSet = computed<Record<string, string>>(() => ({
  entity: t('pages.system.codegen.codeLabel.entity'),
  mapper: t('pages.system.codegen.codeLabel.mapper'),
  service: t('pages.system.codegen.codeLabel.service'),
  controller: t('pages.system.codegen.codeLabel.controller'),
  frontendApi: t('pages.system.codegen.codeLabel.frontendApi'),
  frontendIndexPage: t('pages.system.codegen.codeLabel.frontendIndexPage'),
  frontendSavePage: t('pages.system.codegen.codeLabel.frontendSavePage'),
  frontendRouter: t('pages.system.codegen.codeLabel.frontendRouter'),
  dtoRequest: t('pages.system.codegen.codeLabel.dtoRequest'),
  dtoQueryRequest: t('pages.system.codegen.codeLabel.dtoQueryRequest'),
}));

const visibleCodeTypes = computed(() => {
  const result: Record<string, any> = {};
  if (!generatedCode.value) return result;
  const labels =
    generatedCode.value.genType === 'tree'
      ? {
          ...allCodeTypeLabelSet.value,
          frontendIndexPage: t('pages.system.codegen.codeLabel.treeFrontendIndexPage'),
          frontendSavePage: t('pages.system.codegen.codeLabel.treeFrontendSavePage'),
        }
      : allCodeTypeLabelSet.value;
  for (const [key, label] of Object.entries(labels)) {
    if (generatedCode.value[key] != null) {
      result[key] = label;
    }
  }
  return result;
});

function handleSelectAll(checked: boolean) {
  if (checked) {
    selectedFiles.value = fileItems.value.filter((item) => !item.disabled).map((item) => item.key);
  } else {
    selectedFiles.value = [];
  }
}

function handleFileCheckChange(key: string, checked: boolean) {
  if (checked) {
    if (!selectedFiles.value.includes(key)) {
      selectedFiles.value.push(key);
    }
  } else {
    selectedFiles.value = selectedFiles.value.filter((k) => k !== key);
  }
}

watch(selectedFiles, (val) => {
  const selectableKeys = fileItems.value.filter((item) => !item.disabled).map((item) => item.key);
  selectAll.value = selectableKeys.length > 0 && selectableKeys.every((k) => val.includes(k));
});

async function handleGenerate() {
  if (selectedKeys.value.length === 0) {
    MessagePlugin.warning(t('pages.system.codegen.message.selectTableFirst'));
    return;
  }

  loading.value = true;
  try {
    const tableName = selectedKeys.value[0];
    const res = await previewCode(
      tableName,
      config.packageName,
      config.author,
      config.includeDto,

      config.genType,
      null,
      null,
      null,
      null,
      null,
      config.moduleName,
    );
    generatedCode.value = res.data;
    const firstKey = Object.keys(visibleCodeTypes.value)[0];
    if (firstKey) activeTab.value = firstKey;
    mainTab.value = 'preview';

    // 检测到树形字段时提示用户
    if (res.data?.genType === 'tree' && config.genType !== 'tree') {
      MessagePlugin.success({ content: t('pages.system.codegen.message.treeDetected'), duration: 5000 });
    } else {
      MessagePlugin.success(t('pages.system.codegen.message.generateSuccess'));
    }
  } catch {
    MessagePlugin.error(t('pages.system.codegen.message.generateFail'));
  } finally {
    loading.value = false;
  }
}

async function loadEnv() {
  try {
    const res = await getEnv();
    envInfo.value = res.data;
  } catch (error) {
    console.error('加载环境信息失败', error);
  }
}

function handleCreateModuleClick() {
  newModuleName.value = '';
  createModuleDialogVisible.value = true;
}

async function handleCreateModuleConfirm() {
  if (!newModuleName.value || !newModuleName.value.trim()) {
    MessagePlugin.warning(t('pages.system.codegen.message.moduleNameRequired'));
    return;
  }

  const inputName = newModuleName.value.trim();
  const fullName = inputName.startsWith(namingPrefix.value) ? inputName : namingPrefix.value + inputName;

  if (moduleList.value.includes(fullName)) {
    MessagePlugin.warning(t('pages.system.codegen.message.moduleExists', { name: fullName }));
    return;
  }

  createModuleLoading.value = true;
  try {
    const res = await createModule(inputName);
    const data = res.data || {};
    if (data.moduleName) {
      config.moduleName = data.moduleName;
      if (!moduleList.value.includes(data.moduleName)) {
        moduleList.value.push(data.moduleName);
      }
    }
    createModuleDialogVisible.value = false;
    MessagePlugin.success(
      t('pages.system.codegen.message.moduleCreateSuccess', {
        name: data.moduleName || fullName,
        path: data.path || '',
      }),
    );
  } catch (e: any) {
    MessagePlugin.error(
      t('pages.system.codegen.message.moduleCreateFail', { msg: e.response?.data?.message || e.message }),
    );
  } finally {
    createModuleLoading.value = false;
  }
}

/**
 * /save-local 与 /download-zip 共用的请求体（对应后端 SaveLocalRequest）。
 * 两条链路的字段完全一致，共用同一个构造器，避免参数漂移。
 */
interface SaveLocalBody {
  tableName: string;
  packageName: string;
  author: string;
  overwrite: boolean;
  /** 生成的文件类型；传 null 表示全部类型（后端按 types 为空即全量处理） */
  types: string[] | null;
  includeDto: boolean;
  genType: string;
  parentField: string | null;
  nameField: string | null;
  childTableName: string | null;
  childForeignKey: string | null;
  childPackageName: string | null;
  moduleName: string;
}

const buildSavePayload = (types: string[] | null): SaveLocalBody => ({
  tableName: selectedKeys.value[0],
  packageName: config.packageName,
  author: config.author,
  overwrite: overwrite.value,
  types,
  includeDto: config.includeDto,
  genType: config.genType,
  parentField: null,
  nameField: null,
  childTableName: null,
  childForeignKey: null,
  childPackageName: null,
  moduleName: config.moduleName,
});

async function handleSaveLocalClick() {
  if (selectedKeys.value.length === 0) {
    MessagePlugin.warning(t('pages.system.codegen.message.selectTableFirst'));
    return;
  }

  const tableName = selectedKeys.value[0];
  saveDialogVisible.value = true;
  selectedFiles.value = [...allFileKeys];
  selectAll.value = true;
  overwrite.value = false;

  try {
    const res = await checkLocal(tableName, config.packageName, config.moduleName);
    const data = res.data || {};
    Object.keys(fileExists).forEach((k) => delete fileExists[k]);
    Object.assign(fileExists, data);
  } catch (error) {
    console.error('检查本地文件失败', error);
  }
}

async function handleSaveConfirm() {
  if (selectedFiles.value.length === 0) {
    MessagePlugin.warning(t('pages.system.codegen.message.selectFileFirst'));
    return;
  }

  saveLoading.value = true;
  try {
    await saveLocal(buildSavePayload(selectedFiles.value));
    MessagePlugin.success(t('common.saveSuccess'));
    saveDialogVisible.value = false;
  } catch (error: any) {
    MessagePlugin.error(
      t('pages.system.codegen.message.saveFail', { msg: error.response?.data?.message || error.message }),
    );
  } finally {
    saveLoading.value = false;
  }
}

/**
 * 打包下载（zip）。JAR / 容器部署下 /save-local 不可用，走本入口。
 *
 * 文件名与后端 Content-Disposition 的 filename* 一致：{表名}-code.zip
 * （响应拦截器只透出 Blob，响应头拿不到，故在前端按同一规则拼）。
 */
async function handleDownloadZip() {
  if (selectedKeys.value.length === 0) {
    MessagePlugin.warning(t('pages.system.codegen.message.selectTableFirst'));
    return;
  }

  const tableName = selectedKeys.value[0];
  zipLoading.value = true;
  try {
    // types 传 null：后端按「全部类型」打包整个模块
    const blob = await downloadZip(buildSavePayload(null));
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${tableName}-code.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    MessagePlugin.success(t('pages.system.codegen.message.downloadZipSuccess'));
  } catch {
    // 错误提示已由 request 拦截器统一弹出，此处不重复 toast
  } finally {
    zipLoading.value = false;
  }
}

onMounted(() => {
  loadEnv();
  loadModules();
});

async function loadModules() {
  moduleLoading.value = true;
  try {
    const res = await getModules();
    moduleList.value = res.data || [];
    if (moduleList.value.length > 0 && !config.moduleName) {
      config.moduleName = moduleList.value[0];
    }
  } catch {
    // ignore
  } finally {
    moduleLoading.value = false;
  }
}

// 选中模块时自动推导包名（去 jffast- 前缀）。只覆盖「上一次自动推导的值」，
// 用户手输过的包名保持不变；包名留空会让生成器拼出非法包 `cn.jfspeed..entity`。
let autoPackage = '';
watch(
  () => config.moduleName,
  (moduleName) => {
    if (!moduleName) return;
    const derived = moduleName.startsWith('jffast-') ? moduleName.slice('jffast-'.length) : moduleName;
    if (!derived) return;
    if (!config.packageName || config.packageName === autoPackage) {
      config.packageName = derived;
      autoPackage = derived;
    }
  },
  { immediate: true },
);
</script>
<style scoped lang="less">
.codegen-container {
  padding: 16px;
}

.config-form {
  margin-bottom: 8px;
}

.main-tabs {
  margin-top: 16px;
}
</style>
