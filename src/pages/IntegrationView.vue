<script setup lang="ts">
import type { Rule } from "ant-design-vue/es/form";

import { ArrowLeftOutlined, InfoCircleOutlined } from "@ant-design/icons-vue";
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { message, Modal } from "ant-design-vue";
import { computed, reactive, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import type { IntegrationPayload } from "@/api/integrations";

import { ApiError } from "@/api/client";
import { deleteIntegration, getIntegration, updateIntegration } from "@/api/integrations";
import { getProject } from "@/api/projects";
import AppHeader from "@/components/AppHeader.vue";
import IntegrationContractsPanel from "@/components/IntegrationContractsPanel.vue";
import IntegrationGroupsPanel from "@/components/IntegrationGroupsPanel.vue";
import IntegrationKeysPanel from "@/components/IntegrationKeysPanel.vue";
import IntegrationNotificationsPanel from "@/components/IntegrationNotificationsPanel.vue";
import IntegrationReportsPanel from "@/components/IntegrationReportsPanel.vue";
import IntegrationSummaryPanel from "@/components/IntegrationSummaryPanel.vue";
import { useAuthStore } from "@/stores/auth";

const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();
const queryClient = useQueryClient();

const integrationId = computed(() => String(route.params.integrationId ?? ""));
const projectId = computed(() => String(route.params.projectId ?? ""));

const validTabs = new Set(["contracts", "groups", "history", "key", "settings", "summary"]);
const activeTab = computed(() => {
  const tab = String(route.query.tab ?? (route.query.contract ? "contracts" : "summary"));
  return validTabs.has(tab) ? tab : "summary";
});
const contractId = computed(() =>
  typeof route.query.contract === "string" && route.query.contract ? route.query.contract : undefined,
);
const contractVersion = computed(() => {
  if (typeof route.query.version !== "string") {
    return;
  }

  const version = Number(route.query.version);
  return Number.isSafeInteger(version) && version > 0 ? version : undefined;
});

function updateContractQuery(nextContractId?: string, nextVersion?: number): void {
  const baseQuery = Object.fromEntries(
    Object.entries(route.query).filter(([key]) => !["contract", "tab", "version"].includes(key)),
  );
  const query = {
    ...baseQuery,
    tab: "contracts",
    ...(nextContractId && { contract: nextContractId }),
    ...(nextVersion && { version: String(nextVersion) }),
  };

  void router.push({ query });
}

function onContractChange(nextContractId?: string): void {
  updateContractQuery(nextContractId);
}

function onVersionChange(nextVersion?: number): void {
  updateContractQuery(contractId.value, nextVersion);
}

function onTabChange(tab: number | string): void {
  const key = String(tab);
  const baseQuery = Object.fromEntries(Object.entries(route.query).filter(([queryKey]) => queryKey !== "tab"));
  const hasContractState = Boolean(route.query.contract || route.query.version);
  const query = {
    ...baseQuery,
    ...((key !== "summary" || hasContractState) && { tab: key }),
  };

  void router.push({ query });
}

const form = reactive({ description: "", name: "", slug: "" });
const rules: Record<string, Rule[]> = {
  description: [{ max: 1000, message: "Не больше 1000 символов", trigger: "blur" }],
  name: [
    { message: "Введите название", required: true, trigger: "blur" },
    { max: 200, message: "Не больше 200 символов", trigger: "blur" },
  ],
  slug: [
    { message: "Введите код интеграции", required: true, trigger: "blur" },
    { message: "Только строчные латинские буквы, цифры и дефис", pattern: /^[a-z0-9-]+$/, trigger: "blur" },
    { max: 100, message: "Не больше 100 символов", trigger: "blur" },
  ],
};

const slugHint =
  "Короткий идентификатор интеграции, например yookassa. Должен быть уникален в проекте. Допустимы только строчные латинские буквы, цифры и дефис — до 100 символов.";

const { data: project, isPending: isProjectPending } = useQuery({
  queryKey: ["project", projectId],
  queryFn: () => getProject(projectId.value, authStore.accessToken),
});

const {
  data,
  error: queryError,
  isError,
  isPending,
} = useQuery({
  queryKey: ["integration", projectId, integrationId],
  queryFn: () => getIntegration(projectId.value, integrationId.value, authStore.accessToken),
});
const integration = computed(() => data.value);

watch(
  data,
  (value) => {
    if (!value) {
      return;
    }

    form.description = value.description ?? "";
    form.name = value.name;
    form.slug = value.slug;
  },
  { immediate: true },
);

const loadErrorMessage = computed(() => {
  return queryError.value instanceof ApiError && queryError.value.status === 404
    ? "Интеграция не найдена"
    : "Не удалось загрузить интеграцию";
});

const { isPending: isUpdating, mutate: updateIntegrationMutation } = useMutation({
  mutationFn: (payload: IntegrationPayload) =>
    updateIntegration(projectId.value, integrationId.value, payload, authStore.accessToken),
  onSuccess: async () => {
    message.success("Изменения сохранены");
    await queryClient.invalidateQueries({ queryKey: ["integration", projectId.value, integrationId.value] });
    await queryClient.invalidateQueries({ queryKey: ["integrations", projectId.value] });
  },
  onError: (error) => {
    message.error(errorMessage(error));
  },
});

const { isPending: isDeleting, mutateAsync: deleteIntegrationMutation } = useMutation({
  mutationFn: () => deleteIntegration(projectId.value, integrationId.value, authStore.accessToken),
  onSuccess: async () => {
    message.success("Интеграция удалена");
    queryClient.removeQueries({ queryKey: ["integration", projectId.value, integrationId.value] });
    await queryClient.invalidateQueries({ queryKey: ["integrations", projectId.value] });
    void router.push({ name: "project-integrations", params: { projectId: projectId.value } });
  },
  onError: (error) => {
    message.error(errorMessage(error));
  },
});

function backToList(): void {
  void router.push({ name: "project-integrations", params: { projectId: projectId.value } });
}

function confirmDelete(): void {
  Modal.confirm({
    cancelText: "Отмена",
    content: `Интеграция «${integration.value?.name ?? ""}» будет удалена вместе со всеми ключами и контрактами. Действие необратимо.`,
    okText: "Удалить",
    okType: "danger",
    onOk: () => deleteIntegrationMutation(),
    title: "Удалить интеграцию?",
  });
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 409) {
      return "Такой код уже занят в этом проекте";
    }
    return error.status === 400 ? "Проверьте заполненные поля" : error.message;
  }
  return "Что-то пошло не так, попробуйте ещё раз";
}

function submitSave(): void {
  if (isUpdating.value) {
    return;
  }

  updateIntegrationMutation({
    description: form.description.trim() || undefined,
    name: form.name,
    slug: form.slug,
  });
}
</script>

<template>
  <a-layout class="integration-page">
    <AppHeader />
    <a-layout-content class="integration-page__content">
      <a-breadcrumb class="integration-page__breadcrumb">
        <a-breadcrumb-item>
          <RouterLink :to="{ name: 'projects' }">Проекты</RouterLink>
        </a-breadcrumb-item>
        <a-breadcrumb-item v-if="project">
          <RouterLink :to="{ name: 'project-integrations', params: { projectId } }">{{ project.name }}</RouterLink>
        </a-breadcrumb-item>
        <a-breadcrumb-item v-if="integration">{{ integration.name }}</a-breadcrumb-item>
      </a-breadcrumb>

      <a-skeleton v-if="isProjectPending || isPending" active :paragraph="{ rows: 4 }" :title="{ width: '30%' }" />

      <a-alert v-else-if="isError" :message="loadErrorMessage" show-icon type="error">
        <template #action>
          <a-button size="small" type="text" @click="backToList">
            <template #icon>
              <ArrowLeftOutlined />
            </template>
            К списку интеграций
          </a-button>
        </template>
      </a-alert>

      <a-tabs v-else-if="integration" :active-key="activeTab" @change="onTabChange">
        <a-tab-pane key="summary" tab="Сводка">
          <IntegrationSummaryPanel :integration-id="integrationId" />
        </a-tab-pane>
        <a-tab-pane key="history" tab="История">
          <IntegrationReportsPanel :integration-id="integrationId" />
        </a-tab-pane>
        <a-tab-pane key="groups" tab="Группы">
          <IntegrationGroupsPanel :integration-id="integrationId" />
        </a-tab-pane>
        <a-tab-pane key="key" tab="Ключи SDK">
          <IntegrationKeysPanel :integration-id="integrationId" />
        </a-tab-pane>
        <a-tab-pane key="contracts" tab="Контракты">
          <IntegrationContractsPanel
            :contract-id="contractId"
            :integration-id="integrationId"
            :version="contractVersion"
            @update:contract-id="onContractChange"
            @update:version="onVersionChange"
          />
        </a-tab-pane>
        <a-tab-pane key="settings" tab="Настройки">
          <a-card>
            <a-form
              class="integration-view__settings-form"
              :model="form"
              :rules="rules"
              layout="vertical"
              @finish="submitSave"
            >
              <a-form-item label="Название" name="name">
                <a-input v-model:value="form.name" placeholder="Например, «ЮKassa»" />
              </a-form-item>
              <a-form-item name="slug">
                <template #label>
                  Код интеграции
                  <a-tooltip :title="slugHint">
                    <a-typography-text class="integration-page__label-icon" type="secondary">
                      <InfoCircleOutlined />
                    </a-typography-text>
                  </a-tooltip>
                </template>
                <a-input v-model:value="form.slug" placeholder="yookassa" />
              </a-form-item>
              <a-form-item class="integration-view__description-item" label="Описание" name="description">
                <a-textarea
                  v-model:value="form.description"
                  :maxlength="1000"
                  :rows="4"
                  placeholder="Необязательно"
                  show-count
                />
              </a-form-item>
              <a-form-item class="integration-view__save-item">
                <a-button :loading="isUpdating" html-type="submit" type="primary">Сохранить</a-button>
              </a-form-item>
            </a-form>
          </a-card>

          <a-card class="integration-view__notifications-card">
            <IntegrationNotificationsPanel :integration-id="integrationId" />
          </a-card>

          <div class="integration-view__delete-action">
            <a-button :loading="isDeleting" danger @click="confirmDelete">Удалить интеграцию</a-button>
          </div>
        </a-tab-pane>
      </a-tabs>
    </a-layout-content>
  </a-layout>
</template>

<style scoped>
.integration-page {
  min-height: 100vh;
}

.integration-view__settings-form :deep(.ant-form-item-label > label) {
  font-weight: 600;
}

.integration-view__description-item {
  margin-bottom: 0;
}

.integration-view__save-item {
  margin-bottom: 0;
}

.integration-view__notifications-card {
  margin-top: 16px;
}

.integration-view__notifications-card :deep(.integration-notifications-panel) {
  margin-top: 0;
}

.integration-view__delete-action {
  margin-top: 16px;
}

.integration-page__content {
  width: 100%;
  max-width: 960px;
  margin: 24px auto;
  padding: 0 24px;
}

.integration-page__breadcrumb {
  margin-bottom: 8px;
}

.integration-page__section {
  margin-top: 0;
}

.integration-page__label-icon {
  margin-inline-start: 4px;
}
</style>
