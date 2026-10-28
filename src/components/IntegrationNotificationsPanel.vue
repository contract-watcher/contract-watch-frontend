<script setup lang="ts">
import { ReloadOutlined } from "@ant-design/icons-vue";
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { message } from "ant-design-vue";
import { computed } from "vue";
import { useRouter } from "vue-router";

import { getAccount } from "@/api/auth";
import { ApiError } from "@/api/client";
import {
  getIntegrationNotifications,
  type IntegrationNotificationSettings,
  updateIntegrationNotifications,
  type UpdateNotificationSettingsPayload,
} from "@/api/notifications";
import { useAuthStore } from "@/stores/auth";

const props = defineProps<{ integrationId: string }>();

const authStore = useAuthStore();
const queryClient = useQueryClient();
const router = useRouter();

const accountQueryKey = computed(() => ["account", authStore.userEmail] as const);
const notificationsQueryKey = computed(() => ["integration-notifications", props.integrationId] as const);

const {
  data: account,
  error: accountError,
  isError: isAccountError,
  isPending: isAccountPending,
  refetch: refetchAccount,
} = useQuery({
  queryKey: accountQueryKey,
  queryFn: () => getAccount(authStore.accessToken),
  refetchOnWindowFocus: "always",
});

const {
  data: settings,
  error: settingsError,
  isError: isSettingsError,
  isPending: isSettingsPending,
  refetch: refetchSettings,
} = useQuery({
  queryKey: notificationsQueryKey,
  queryFn: () => getIntegrationNotifications(props.integrationId, authStore.accessToken),
  refetchOnWindowFocus: "always",
});

const emailConfirmed = computed(() => account.value?.emailConfirmed === true);
const emailEnabled = computed(() => settings.value?.emailEnabled === true);
const isPending = computed(() => isAccountPending.value || isSettingsPending.value);
const isError = computed(() => isAccountError.value || isSettingsError.value);

const loadErrorMessage = computed(() => {
  const error = accountError.value ?? settingsError.value;
  if (error instanceof ApiError) {
    return error.status === 404 ? "Интеграция не найдена" : error.message;
  }
  return "Не удалось загрузить настройки писем";
});

const { isPending: isUpdating, mutate: updateSettings } = useMutation({
  mutationFn: (payload: UpdateNotificationSettingsPayload) =>
    updateIntegrationNotifications(props.integrationId, payload, authStore.accessToken),
  onSuccess: (updated: IntegrationNotificationSettings) => {
    queryClient.setQueryData(notificationsQueryKey.value, updated);
    message.success(updated.emailEnabled ? "Письма включены" : "Письма выключены");
  },
  onError: async (error) => {
    if (error instanceof ApiError && error.status === 409) {
      await queryClient.invalidateQueries({ queryKey: accountQueryKey.value });
      await queryClient.invalidateQueries({ queryKey: notificationsQueryKey.value });
      message.warning("Подтвердите почту, чтобы получать письма");
      return;
    }
    message.error(errorMessage(error));
  },
});

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.status === 404 ? "Интеграция не найдена" : error.message;
  }
  return "Что-то пошло не так, попробуйте ещё раз";
}

function goToProfile(): void {
  void router.push({ name: "profile" });
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

function onEmailEnabledChange(checked: boolean | number | string): void {
  if (isUpdating.value) {
    return;
  }

  updateSettings({ emailEnabled: Boolean(checked) });
}

async function retryLoad(): Promise<void> {
  await Promise.all([refetchAccount(), refetchSettings()]);
}
</script>

<template>
  <section class="integration-notifications-panel">
    <a-alert
      v-if="isError"
      :description="loadErrorMessage"
      message="Не удалось загрузить настройки"
      show-icon
      type="error"
    >
      <template #action>
        <a-button size="small" type="text" @click="retryLoad">
          <template #icon>
            <ReloadOutlined />
          </template>
          Повторить
        </a-button>
      </template>
    </a-alert>

    <a-skeleton v-else-if="isPending" active :paragraph="{ rows: 3 }" />

    <template v-else-if="account && settings">
      <div class="integration-notifications-panel__setting">
        <a-typography-text strong>Присылать письма о неуспешных проверках</a-typography-text>
        <a-switch
          :checked="emailEnabled"
          :disabled="!emailConfirmed || isUpdating"
          :loading="isUpdating"
          @change="onEmailEnabledChange"
        />
      </div>

      <a-typography-text v-if="!emailConfirmed" class="integration-notifications-panel__confirm" type="secondary">
        Подтвердите почту
        <a-typography-link @click="goToProfile">в профиле</a-typography-link>, чтобы получать уведомления.
      </a-typography-text>

      <a-typography-text v-if="emailEnabled && settings.emailEnabledAt" type="secondary">
        Включено с {{ formatDateTime(settings.emailEnabledAt) }}
      </a-typography-text>
    </template>

    <a-empty v-else description="Настройки писем недоступны" />
  </section>
</template>

<style scoped>
.integration-notifications-panel {
  margin-top: 24px;
}

.integration-notifications-panel__confirm {
  display: block;
  margin-top: 8px;
  font-size: 12px;
}

.integration-notifications-panel__setting {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.integration-notifications-panel__setting :deep(.ant-switch) {
  flex: 0 0 auto;
  margin-top: 2px;
}
</style>
