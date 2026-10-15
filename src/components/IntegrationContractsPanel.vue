<script setup lang="ts">
import type { TableColumnsType } from "ant-design-vue";
import type { FormInstance, Rule } from "ant-design-vue/es/form";
import type { SelectValue } from "ant-design-vue/es/select";

import { ArrowLeftOutlined, DeleteOutlined, PlusOutlined, ReloadOutlined } from "@ant-design/icons-vue";
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { message, Modal } from "ant-design-vue";
import { computed, reactive, ref, watch } from "vue";

import type {
  Contract,
  ContractFieldType,
  ContractPayload,
  ContractRule,
  ContractVersion,
  CreateContractVersionPayload,
} from "@/api/contracts";

import { ApiError } from "@/api/client";
import {
  createContract,
  createContractVersion,
  getContracts,
  getContractVersions,
  publishContractVersion,
} from "@/api/contracts";
import { useAuthStore } from "@/stores/auth";

const props = defineProps<{ integrationId: string }>();

const authStore = useAuthStore();
const queryClient = useQueryClient();

const integrationId = computed(() => props.integrationId);
const selectedContractId = ref<null | string>(null);

const formRef = ref<FormInstance>();
const form = reactive({ description: "", name: "", slug: "" });
const createModalOpen = ref(false);
const contractRules: Record<string, Rule[]> = {
  description: [{ max: 1000, message: "Не больше 1000 символов", trigger: "blur" }],
  name: [
    { message: "Введите название", required: true, trigger: "blur" },
    { max: 200, message: "Не больше 200 символов", trigger: "blur" },
  ],
  slug: [
    { message: "Введите код контракта", required: true, trigger: "blur" },
    { message: "Только строчные латинские буквы, цифры и дефис", pattern: /^[a-z0-9-]+$/, trigger: "blur" },
    { max: 100, message: "Не больше 100 символов", trigger: "blur" },
  ],
};

interface EditorRule extends ContractRule {
  key: number;
}

const editorOpen = ref(false);
const editorRules = ref<EditorRule[]>([]);
const editorComment = ref("");
const editorKeyCounter = ref(0);
const editorSource = ref<"none" | number>("none");
const rulesBaseline = ref<string>("[]");

const viewOpen = ref(false);
const viewedVersion = ref<ContractVersion | null>(null);

const fieldTypeOptions: { label: string; value: ContractFieldType }[] = [
  { label: "String", value: "String" },
  { label: "Number", value: "Number" },
  { label: "Boolean", value: "Boolean" },
  { label: "Object", value: "Object" },
  { label: "Array", value: "Array" },
];

const contractColumns: TableColumnsType<Contract> = [
  { dataIndex: "slug", key: "slug", title: "Код" },
  { dataIndex: "name", key: "name", title: "Название" },
  { key: "latestVersion", title: "Последняя версия" },
  { dataIndex: "createdAt", key: "createdAt", title: "Создан" },
  { key: "actions", title: "" },
];

const versionColumns: TableColumnsType<ContractVersion> = [
  { dataIndex: "version", key: "version", title: "Версия" },
  { key: "comment", title: "Комментарий" },
  { dataIndex: "createdAt", key: "createdAt", title: "Создан" },
  { key: "publish", title: "Публикация" },
  { key: "actions", title: "" },
];

const ruleColumns: TableColumnsType<ContractRule> = [
  { dataIndex: "fieldName", key: "fieldName", title: "Поле" },
  { dataIndex: "type", key: "type", title: "Тип", width: 110 },
  { key: "required", title: "Обязательное", width: 140 },
  { key: "nullable", title: "Nullable", width: 110 },
];

const editorColumns: TableColumnsType<ContractRule> = [
  { key: "fieldName", title: "Поле" },
  { key: "type", title: "Тип", width: 140 },
  { key: "required", title: "Обязательное", width: 130 },
  { key: "nullable", title: "Nullable", width: 100 },
  { key: "actions", title: "", width: 48 },
];

const {
  data: contractsData,
  isError: isContractsError,
  isPending: isContractsPending,
  refetch: refetchContracts,
} = useQuery({
  queryKey: ["contracts", integrationId],
  queryFn: () => getContracts(integrationId.value, authStore.accessToken),
});
const contracts = computed(() => contractsData.value ?? []);

const selectedContract = computed(() => contracts.value.find((item) => item.id === selectedContractId.value) ?? null);

const {
  data: versionsData,
  isError: isVersionsError,
  isPending: isVersionsPending,
  refetch: refetchVersions,
} = useQuery({
  queryKey: ["contract-versions", selectedContractId],
  queryFn: () => getContractVersions(selectedContractId.value ?? "", authStore.accessToken),
  enabled: computed(() => selectedContractId.value !== null),
});
const versions = computed(() => versionsData.value ?? []);

const sourceOptions = computed(() => [
  { label: "Начать с нуля", value: "none" as const },
  ...versions.value.map((version) => ({
    label: `Версия ${version.version}`,
    value: version.version,
  })),
]);

watch(integrationId, () => {
  editorOpen.value = false;
  selectedContractId.value = null;
});

const { isPending: isCreatingContract, mutate: createContractMutation } = useMutation({
  mutationFn: (payload: ContractPayload) => createContract(integrationId.value, payload, authStore.accessToken),
  onSuccess: async (created) => {
    message.success("Контракт создан");
    createModalOpen.value = false;
    selectedContractId.value = created.id;
    await queryClient.invalidateQueries({ queryKey: ["contracts", integrationId.value] });
  },
  onError: (error) => {
    message.error(contractErrorMessage(error));
  },
});

const { isPending: isCreatingVersion, mutate: createVersionMutation } = useMutation({
  mutationFn: (payload: CreateContractVersionPayload) =>
    createContractVersion(selectedContractId.value ?? "", payload, authStore.accessToken),
  onSuccess: async () => {
    message.success("Версия создана");
    editorOpen.value = false;
    await queryClient.invalidateQueries({ queryKey: ["contract-versions", selectedContractId.value] });
    await queryClient.invalidateQueries({ queryKey: ["contracts", integrationId.value] });
  },
  onError: (error) => {
    message.error(errorMessage(error));
  },
});

const { mutate: publishVersionMutation } = useMutation({
  mutationFn: (version: number) =>
    publishContractVersion(selectedContractId.value ?? "", version, authStore.accessToken),
  onSuccess: async () => {
    message.success("Версия опубликована");
    await queryClient.invalidateQueries({ queryKey: ["contract-versions", selectedContractId.value] });
  },
  onError: (error) => {
    message.error(errorMessage(error));
  },
});

function addRuleField(): void {
  editorKeyCounter.value += 1;
  editorRules.value.unshift({
    fieldName: "",
    key: editorKeyCounter.value,
    nullable: false,
    required: false,
    type: "String",
  });
}

function applySource(value: "none" | number): void {
  if (value === "none") {
    editorRules.value = [];
  } else {
    const source = versions.value.find((version) => version.version === value);
    editorRules.value = (source?.rules ?? []).map((rule) => {
      editorKeyCounter.value += 1;
      return { ...rule, key: editorKeyCounter.value };
    });
  }

  rulesBaseline.value = JSON.stringify(editorRules.value);
  editorSource.value = value;
}

function backToContracts(): void {
  selectedContractId.value = null;
}

function closeEditor(): void {
  const hasChanges = JSON.stringify(editorRules.value) !== rulesBaseline.value;
  if (!hasChanges) {
    editorOpen.value = false;
    return;
  }

  Modal.confirm({
    cancelText: "Остаться",
    content: "Изменения в полях новой версии не сохранятся.",
    okText: "Выйти",
    onOk: () => {
      editorOpen.value = false;
    },
    title: "Выйти без сохранения?",
  });
}

function confirmPublish(version: ContractVersion): void {
  Modal.confirm({
    cancelText: "Отмена",
    content: `Версия ${version.version} станет опубликованной и будет доступна SDK.`,
    okText: "Опубликовать",
    onOk: () => publishVersionMutation(version.version),
    title: "Опубликовать версию?",
  });
}

function contractErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 409) {
      return "Такой код уже занят в этой интеграции";
    }
    return error.status === 400 ? "Проверьте заполненные поля" : error.message;
  }
  return "Что-то пошло не так, попробуйте ещё раз";
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.status === 400 ? "Проверьте заполненные поля" : error.message;
  }
  return "Что-то пошло не так, попробуйте ещё раз";
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("ru-RU", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function onSourceChange(value: SelectValue): void {
  if (value !== "none" && typeof value !== "number") {
    return;
  }

  const hasChanges = JSON.stringify(editorRules.value) !== rulesBaseline.value;
  if (!hasChanges) {
    applySource(value);
    return;
  }

  Modal.confirm({
    cancelText: "Отмена",
    content: "Текущие поля будут заменены данными выбранного источника.",
    okText: "Заменить",
    onOk: () => applySource(value),
    title: "Заменить поля?",
  });
}

function openContract(contractId: string): void {
  selectedContractId.value = contractId;
}

function openCreateModal(): void {
  form.description = "";
  form.name = "";
  form.slug = "";
  createModalOpen.value = true;
}

function openEditorModal(): void {
  editorComment.value = "";
  editorRules.value = [];
  editorSource.value = "none";
  rulesBaseline.value = "[]";
  editorOpen.value = true;
}

function openViewModal(version: ContractVersion): void {
  viewedVersion.value = version;
  viewOpen.value = true;
}

function removeRuleField(index: number): void {
  editorRules.value.splice(index, 1);
}

async function submitCreateContract(): Promise<void> {
  if (!formRef.value) {
    return;
  }

  try {
    await formRef.value.validate();
  } catch {
    return;
  }

  createContractMutation({
    description: form.description.trim() || undefined,
    name: form.name,
    slug: form.slug,
  });
}

function submitCreateVersion(): void {
  if (selectedContractId.value === null) {
    return;
  }

  const validationError = validateRules();
  if (validationError) {
    message.error(validationError);
    return;
  }

  createVersionMutation({
    comment: editorComment.value.trim() || undefined,
    rules: editorRules.value.map((rule) => ({
      fieldName: rule.fieldName.trim(),
      nullable: rule.nullable,
      required: rule.required,
      type: rule.type,
    })),
  });
}

function validateRules(): null | string {
  if (editorRules.value.length === 0) {
    return "Добавьте хотя бы одно поле";
  }
  if (editorRules.value.some((rule) => rule.fieldName.trim() === "")) {
    return "У всех полей должно быть имя";
  }

  const names = editorRules.value.map((rule) => rule.fieldName.trim());
  return new Set(names).size === names.length ? null : "Имена полей должны быть уникальны";
}
</script>

<template>
  <div class="integration-contracts-panel">
    <a-card v-if="!selectedContract" title="Контракты">
      <template #extra>
        <a-button type="primary" @click="openCreateModal">Создать контракт</a-button>
      </template>

      <a-alert v-if="isContractsError" message="Не удалось загрузить контракты" show-icon type="error">
        <template #action>
          <a-button size="small" type="text" @click="refetchContracts()">
            <template #icon>
              <ReloadOutlined />
            </template>
            Повторить
          </a-button>
        </template>
      </a-alert>

      <a-table
        v-else
        :columns="contractColumns"
        :data-source="contracts"
        :loading="isContractsPending"
        :pagination="false"
        :scroll="{ x: 640 }"
        row-key="id"
      >
        <template #emptyText>
          <a-empty description="Контрактов пока нет" />
        </template>
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'slug'">
            <a-typography-text code>{{ record.slug }}</a-typography-text>
          </template>
          <template v-else-if="column.key === 'latestVersion'">
            {{ record.latestVersion ?? "—" }}
          </template>
          <template v-else-if="column.key === 'createdAt'">
            {{ formatDate(record.createdAt) }}
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-button size="small" type="text" @click="openContract(record.id)">Открыть</a-button>
          </template>
        </template>
      </a-table>
    </a-card>

    <template v-if="selectedContract && editorOpen">
      <a-card title="Новая версия">
        <template #extra>
          <a-space>
            <a-button @click="closeEditor">Отмена</a-button>
            <a-button :loading="isCreatingVersion" type="primary" @click="submitCreateVersion">Создать версию</a-button>
          </a-space>
        </template>

        <div v-if="versions.length > 0" class="integration-contracts-panel__source">
          <a-typography-text type="secondary">Поля из версии</a-typography-text>
          <a-select
            :options="sourceOptions"
            :value="editorSource"
            class="integration-contracts-panel__source-select"
            @change="onSourceChange"
          />
        </div>

        <div class="integration-contracts-panel__comment">
          <a-typography-text type="secondary">Комментарий к изменению</a-typography-text>
          <a-textarea v-model:value="editorComment" :maxlength="500" :rows="2" placeholder="Необязательно" show-count />
        </div>

        <a-button block class="integration-contracts-panel__add-rule" type="dashed" @click="addRuleField">
          <template #icon>
            <PlusOutlined />
          </template>
          Добавить поле
        </a-button>

        <a-table
          :columns="editorColumns"
          :data-source="editorRules"
          :pagination="false"
          :scroll="{ x: 560 }"
          row-key="key"
        >
          <template #emptyText>
            <a-typography-text type="secondary">Добавьте первое поле</a-typography-text>
          </template>
          <template #bodyCell="{ column, record, index }">
            <template v-if="column.key === 'fieldName'">
              <a-input v-model:value="record.fieldName" placeholder="Например, amount" />
            </template>
            <template v-else-if="column.key === 'type'">
              <a-select v-model:value="record.type" :options="fieldTypeOptions" />
            </template>
            <template v-else-if="column.key === 'required'">
              <a-checkbox v-model:checked="record.required" />
            </template>
            <template v-else-if="column.key === 'nullable'">
              <a-checkbox v-model:checked="record.nullable" />
            </template>
            <template v-else-if="column.key === 'actions'">
              <a-button danger type="text" @click="removeRuleField(index)">
                <template #icon>
                  <DeleteOutlined />
                </template>
              </a-button>
            </template>
          </template>
        </a-table>
      </a-card>
    </template>

    <template v-if="selectedContract && !editorOpen">
      <a-button class="integration-contracts-panel__back" type="text" @click="backToContracts">
        <template #icon>
          <ArrowLeftOutlined />
        </template>
        Все контракты
      </a-button>

      <a-card>
        <template #title>
          {{ selectedContract.name }}
          <a-typography-text code>{{ selectedContract.slug }}</a-typography-text>
        </template>
        <template #extra>
          <a-button type="primary" @click="openEditorModal">Новая версия</a-button>
        </template>

        <a-typography-title class="integration-contracts-panel__history-title" :level="5">
          История версий
        </a-typography-title>

        <a-alert v-if="isVersionsError" message="Не удалось загрузить версии" show-icon type="error">
          <template #action>
            <a-button size="small" type="text" @click="refetchVersions()">
              <template #icon>
                <ReloadOutlined />
              </template>
              Повторить
            </a-button>
          </template>
        </a-alert>

        <a-table
          v-else
          :columns="versionColumns"
          :data-source="versions"
          :loading="isVersionsPending"
          :pagination="false"
          :scroll="{ x: 640 }"
          row-key="id"
        >
          <template #emptyText>
            <a-empty description="Версий пока нет" />
          </template>
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'comment'">
              {{ record.comment || "—" }}
            </template>
            <template v-else-if="column.key === 'createdAt'">
              {{ formatDate(record.createdAt) }}
            </template>
            <template v-else-if="column.key === 'publish'">
              <a-tooltip v-if="record.publishedAt" :title="`Опубликована: ${formatDateTime(record.publishedAt)}`">
                <a-tag color="success">Опубликована</a-tag>
              </a-tooltip>
              <a-button v-else size="small" type="text" @click="confirmPublish(record as ContractVersion)">
                Опубликовать
              </a-button>
            </template>
            <template v-else-if="column.key === 'actions'">
              <a-button size="small" type="text" @click="openViewModal(record as ContractVersion)">Смотреть</a-button>
            </template>
          </template>
        </a-table>
      </a-card>
    </template>

    <a-modal
      v-model:open="createModalOpen"
      :confirm-loading="isCreatingContract"
      cancel-text="Отмена"
      ok-text="Создать"
      title="Новый контракт"
      @ok="submitCreateContract"
    >
      <a-form ref="formRef" :model="form" :rules="contractRules" layout="vertical" @finish="submitCreateContract">
        <a-form-item label="Название" name="name">
          <a-input v-model:value="form.name" placeholder="Например, «Платежи»" />
        </a-form-item>
        <a-form-item label="Код контракта" name="slug">
          <a-input v-model:value="form.slug" placeholder="payments" />
        </a-form-item>
        <a-form-item label="Описание" name="description">
          <a-textarea v-model:value="form.description" :rows="3" placeholder="Необязательно" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      :footer="null"
      :open="viewOpen"
      :title="`Версия ${viewedVersion?.version ?? ''}`"
      :width="640"
      @cancel="viewOpen = false"
    >
      <a-descriptions :column="1" size="small">
        <a-descriptions-item label="Статус">
          <a-tag v-if="viewedVersion?.publishedAt" color="success">Опубликована</a-tag>
          <a-tag v-else color="default">Не опубликовано</a-tag>
        </a-descriptions-item>
        <a-descriptions-item v-if="viewedVersion" label="Создана">{{
          formatDate(viewedVersion.createdAt)
        }}</a-descriptions-item>
        <a-descriptions-item label="Комментарий">{{ viewedVersion?.comment || "—" }}</a-descriptions-item>
      </a-descriptions>

      <a-table
        :columns="ruleColumns"
        :data-source="viewedVersion?.rules ?? []"
        :pagination="false"
        :scroll="{ x: 420 }"
        row-key="fieldName"
        size="small"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'required'">{{ record.required ? "Да" : "Нет" }}</template>
          <template v-else-if="column.key === 'nullable'">{{ record.nullable ? "Да" : "Нет" }}</template>
        </template>
      </a-table>
    </a-modal>
  </div>
</template>

<style scoped>
.integration-contracts-panel__back {
  margin-bottom: 8px;
  padding-inline: 0;
}

.integration-contracts-panel__history-title {
  margin-bottom: 16px;
  margin-top: 0;
}

.integration-contracts-panel__source {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.integration-contracts-panel__source-select {
  width: 220px;
}

.integration-contracts-panel__add-rule {
  margin-bottom: 16px;
}

.integration-contracts-panel__comment {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 8px;
  margin-top: 8px;
}
</style>
