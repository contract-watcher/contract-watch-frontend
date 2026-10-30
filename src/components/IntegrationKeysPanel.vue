<script setup lang="ts">
import type { TableColumnsType } from "ant-design-vue";
import type { FormInstance, Rule } from "ant-design-vue/es/form";

import { ArrowLeftOutlined, ReloadOutlined } from "@ant-design/icons-vue";
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { message, Modal, theme } from "ant-design-vue";
import { computed, reactive, ref } from "vue";

import type { ApiKey, CreateApiKeyPayload, CreatedApiKey } from "@/api/api-keys";

import { createApiKey, getApiKeys, revokeApiKey } from "@/api/api-keys";
import { ApiError } from "@/api/client";
import { useAuthStore } from "@/stores/auth";

const props = defineProps<{ integrationId: string }>();

const authStore = useAuthStore();
const queryClient = useQueryClient();
const { token } = theme.useToken();

const integrationId = computed(() => props.integrationId);

const formRef = ref<FormInstance>();
const form = reactive({ name: "" });
const modalOpen = ref(false);
const createdKey = ref<CreatedApiKey | null>(null);
const rules: Record<string, Rule[]> = {
  name: [
    { message: "Введите название ключа", required: true, trigger: "blur" },
    { max: 100, message: "Не больше 100 символов", trigger: "blur" },
  ],
};

const columns: TableColumnsType<ApiKey> = [
  { dataIndex: "name", key: "name", title: "Имя" },
  { key: "mask", title: "Ключ" },
  { key: "status", title: "Статус" },
  { key: "createdAt", title: "Создан" },
  { key: "lastUsedAt", title: "Последнее использование" },
  { key: "actions", title: "" },
];

const { data, isError, isPending, refetch } = useQuery({
  queryKey: ["api-keys", integrationId],
  queryFn: () => getApiKeys(integrationId.value, authStore.accessToken),
});
const keys = computed(() => data.value ?? []);
const sdkHowtoVisible = ref(false);
const hasActiveKey = computed(() => keys.value.some((key) => !key.isRevoked));

const coreUrl = import.meta.env.VITE_CORE_URL || "http://localhost:8080";
const installCommand = "dotnet add package ContractWatcher.SDK";

const settingsSample = `{
  "ContractWatcher": {
    "CoreUrl": "${coreUrl}",
    "IntegrationKey": "<ваш ключ интеграции>"
  }
}`;

const registrationSample = `using ContractWatcher.SDK.AspNetCore.Extensions;
using ContractWatcher.SDK.Configuration.Extensions;
using ContractWatcher.SDK.Configuration.Options;

builder.Services
    .AddOptions<ContractWatcherOptions>()
    .Bind(builder.Configuration.GetSection("ContractWatcher"));

builder.Services
    .AddContractWatcher()
    .AddDefaults();

builder.Services
    .AddControllers()
    .AddContractWatcher();`;

const keyBoxStyle = computed(() => ({
  background: token.value.colorFillQuaternary,
  borderColor: token.value.colorBorderSecondary,
  borderRadius: `${token.value.borderRadius}px`,
  fontSize: `${token.value.fontSizeLG}px`,
  padding: `${token.value.paddingSM}px ${token.value.padding}px`,
}));

const { isPending: isCreating, mutate: createApiKeyMutation } = useMutation({
  mutationFn: (payload: CreateApiKeyPayload) => createApiKey(integrationId.value, payload, authStore.accessToken),
  onSuccess: async (created) => {
    createdKey.value = created;
    await queryClient.invalidateQueries({ queryKey: ["api-keys", integrationId.value] });
  },
  onError: (error) => {
    message.error(errorMessage(error));
  },
});

const { mutate: revokeApiKeyMutation } = useMutation({
  mutationFn: (keyId: string) => revokeApiKey(integrationId.value, keyId, authStore.accessToken),
  onSuccess: async () => {
    message.success("Ключ отозван");
    await queryClient.invalidateQueries({ queryKey: ["api-keys", integrationId.value] });
  },
  onError: (error) => {
    message.error(errorMessage(error));
  },
});

function closeModal(): void {
  modalOpen.value = false;
  createdKey.value = null;
  form.name = "";
}

function confirmRevoke(key: ApiKey): void {
  Modal.confirm({
    cancelText: "Отмена",
    content: `Ключ «${key.name}» перестанет действовать — SDK с этим ключом получит отказ.`,
    okText: "Отозвать",
    okType: "danger",
    onOk: () => revokeApiKeyMutation(key.id),
    title: "Отозвать ключ?",
  });
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.status === 400 ? "Проверьте название ключа" : error.message;
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

function openCreateModal(): void {
  form.name = "";
  createdKey.value = null;
  modalOpen.value = true;
}

function openSdkHowto(): void {
  sdkHowtoVisible.value = true;
}

function closeSdkHowto(): void {
  sdkHowtoVisible.value = false;
}

async function submitCreate(): Promise<void> {
  if (isCreating.value || !formRef.value) {
    return;
  }

  try {
    await formRef.value.validate();
  } catch {
    return;
  }

  createApiKeyMutation({ name: form.name });
}
</script>

<template>
  <div v-if="!sdkHowtoVisible" class="integration-keys-panel__actions">
    <a-space>
      <a-button @click="openSdkHowto">Как подключить SDK?</a-button>
      <a-button type="primary" @click="openCreateModal">Выпустить ключ</a-button>
    </a-space>
  </div>

  <a-card v-if="!sdkHowtoVisible">
    <a-alert v-if="isError" message="Не удалось загрузить ключи" show-icon type="error">
      <template #action>
        <a-button size="small" type="text" @click="refetch()">
          <template #icon>
            <ReloadOutlined />
          </template>
          Повторить
        </a-button>
      </template>
    </a-alert>

    <a-table
      v-else
      :columns="columns"
      :data-source="keys"
      :loading="isPending"
      :pagination="false"
      :scroll="{ x: 760 }"
      row-key="id"
    >
      <template #emptyText>
        <a-empty description="Ключей пока нет" />
      </template>
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'mask'">
          <a-typography-text code>{{ record.mask }}</a-typography-text>
        </template>
        <template v-else-if="column.key === 'status'">
          <a-tooltip
            v-if="record.isRevoked"
            :title="`Отозван: ${formatDateTime(record.revokedAt)}`"
            :trigger="['hover', 'click']"
          >
            <a-tag color="default">Отозван</a-tag>
          </a-tooltip>
          <a-tag v-else color="success">Активен</a-tag>
        </template>
        <template v-else-if="column.key === 'createdAt'">
          {{ formatDate(record.createdAt) }}
        </template>
        <template v-else-if="column.key === 'lastUsedAt'">
          {{ record.lastUsedAt ? formatDateTime(record.lastUsedAt) : "—" }}
        </template>
        <template v-else-if="column.key === 'actions'">
          <a-button v-if="!record.isRevoked" danger size="small" type="text" @click="confirmRevoke(record as ApiKey)">
            Отозвать
          </a-button>
        </template>
      </template>
    </a-table>

    <a-modal :open="modalOpen" :title="createdKey ? 'Ключ выпущен' : 'Новый ключ'" @cancel="closeModal">
      <template v-if="createdKey">
        <a-alert message="Ключ показывается один раз — сохраните его сейчас" show-icon type="warning" />
        <div class="integration-keys-panel__key-box" :style="keyBoxStyle">
          <a-typography-text class="integration-keys-panel__key" code copyable>
            {{ createdKey.key }}
          </a-typography-text>
        </div>
      </template>
      <a-form v-else ref="formRef" :model="form" :rules="rules" layout="vertical" @finish="submitCreate">
        <a-form-item label="Название" name="name">
          <a-input v-model:value="form.name" placeholder="Например, prod" />
        </a-form-item>
      </a-form>
      <template #footer>
        <template v-if="createdKey">
          <a-button type="primary" @click="closeModal">Готово</a-button>
        </template>
        <template v-else>
          <a-button @click="closeModal">Отмена</a-button>
          <a-button :loading="isCreating" type="primary" @click="submitCreate">Выпустить</a-button>
        </template>
      </template>
    </a-modal>
  </a-card>

  <template v-else>
    <a-button class="integration-keys-panel__back" type="text" @click="closeSdkHowto">
      <template #icon>
        <ArrowLeftOutlined />
      </template>
      К списку ключей
    </a-button>

    <a-card title="Подключение SDK">
      <a-typography-paragraph type="secondary">
        Подключите библиотеку ContractWatch в приложении, которое принимает вебхуки.
      </a-typography-paragraph>

      <a-typography-title class="integration-keys-panel__sdk-title" :copyable="{ text: installCommand }" :level="5">
        1. Установка
      </a-typography-title>
      <a-typography-paragraph type="secondary">Пакет ContractWatcher.SDK для .NET 10.</a-typography-paragraph>
      <div class="integration-keys-panel__sdk-box integration-keys-panel__sdk-key-box" :style="keyBoxStyle">
        <a-typography-text code>{{ installCommand }}</a-typography-text>
      </div>

      <a-typography-title class="integration-keys-panel__sdk-title" :copyable="{ text: settingsSample }" :level="5">
        2. Настройка
      </a-typography-title>
      <a-typography-paragraph type="secondary">
        Добавьте адрес Core и ключ интеграции в <a-typography-text code>appsettings.json</a-typography-text>.
      </a-typography-paragraph>
      <a-typography-paragraph class="integration-keys-panel__sdk-hint" type="secondary">
        Вместо «ваш ключ интеграции» подставьте ключ из таблицы — полный ключ показывается один раз при выпуске.
      </a-typography-paragraph>
      <div class="integration-keys-panel__sdk-box integration-keys-panel__sdk-code-box" :style="keyBoxStyle">
        <a-typography-paragraph class="integration-keys-panel__sdk-code">
          {{ settingsSample }}
        </a-typography-paragraph>
      </div>

      <a-typography-title class="integration-keys-panel__sdk-title" :copyable="{ text: registrationSample }" :level="5">
        3. Регистрация
      </a-typography-title>
      <a-typography-paragraph type="secondary">
        Зарегистрируйте SDK в <a-typography-text code>Program.cs</a-typography-text>.
      </a-typography-paragraph>
      <div class="integration-keys-panel__sdk-box integration-keys-panel__sdk-code-box" :style="keyBoxStyle">
        <a-typography-paragraph class="integration-keys-panel__sdk-code">
          {{ registrationSample }}
        </a-typography-paragraph>
      </div>

      <a-alert
        class="integration-keys-panel__sdk-alert"
        message="Для полного ознакомления обратитесь к документации"
        show-icon
        type="info"
      >
        <template #action>
          <a-button
            href="https://github.com/contract-watcher/contract-watcher-sdk#quick-start-aspnet-core"
            rel="noopener noreferrer"
            target="_blank"
          >
            Открыть документацию
          </a-button>
        </template>
      </a-alert>

      <a-alert
        v-if="!hasActiveKey"
        class="integration-keys-panel__sdk-alert"
        description="Выпустите ключ — без него SDK не сможет получать контракт и отправлять отчёты."
        message="Активного ключа нет"
        show-icon
        type="warning"
      />
    </a-card>
  </template>
</template>

<style scoped>
.integration-keys-panel__actions {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 8px;
}

.integration-keys-panel__key-box {
  margin-top: 16px;
  border-style: solid;
  border-width: 1px;
  text-align: center;
}

.integration-keys-panel__key {
  word-break: break-all;
}

.integration-keys-panel__back {
  margin-bottom: 8px;
  padding-inline: 0;
}

.integration-keys-panel__sdk-title {
  margin-top: 0;
}

.integration-keys-panel__sdk-box {
  margin-bottom: 16px;
  border-style: solid;
  border-width: 1px;
}

.integration-keys-panel__sdk-key-box {
  text-align: center;
}

.integration-keys-panel__sdk-code-box {
  overflow-x: auto;
}

.integration-keys-panel__sdk-code {
  margin-bottom: 0;
  font-family: SFMono-Regular, Consolas, "Liberation Mono", Menlo, Courier, monospace;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre;
}

.integration-keys-panel__sdk-hint {
  margin-bottom: 16px;
}

.integration-keys-panel__sdk-alert {
  margin-bottom: 16px;
}
</style>
