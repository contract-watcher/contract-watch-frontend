<script setup lang="ts">
import type { TableColumnsType } from "ant-design-vue";
import type { FormInstance, Rule } from "ant-design-vue/es/form";

import { ReloadOutlined } from "@ant-design/icons-vue";
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
  <a-card title="API-ключи">
    <template #extra>
      <a-button type="primary" @click="openCreateModal">Выпустить ключ</a-button>
    </template>

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
</template>

<style scoped>
.integration-keys-panel__key-box {
  margin-top: 16px;
  border-style: solid;
  border-width: 1px;
  text-align: center;
}

.integration-keys-panel__key {
  word-break: break-all;
}
</style>
