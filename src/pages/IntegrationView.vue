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
import IntegrationKeysPanel from "@/components/IntegrationKeysPanel.vue";
import { useAuthStore } from "@/stores/auth";

const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();
const queryClient = useQueryClient();

const integrationId = computed(() => String(route.params.integrationId ?? ""));
const projectId = computed(() => String(route.params.projectId ?? ""));

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

      <a-tabs v-else-if="integration">
        <a-tab-pane key="settings" tab="Настройки">
          <a-card>
            <a-form :model="form" :rules="rules" layout="vertical" @finish="submitSave">
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
              <a-form-item label="Описание" name="description">
                <a-textarea v-model:value="form.description" :rows="4" placeholder="Необязательно" />
              </a-form-item>
              <a-form-item>
                <a-button :loading="isUpdating" html-type="submit" type="primary">Сохранить</a-button>
              </a-form-item>
            </a-form>

            <a-divider />

            <a-typography-title class="integration-page__section" :level="4">Удаление</a-typography-title>
            <a-typography-paragraph type="secondary">
              Интеграция «{{ integration.name }}» будет удалена вместе со всеми ключами и контрактами. Действие
              необратимо.
            </a-typography-paragraph>
            <a-button :loading="isDeleting" danger @click="confirmDelete">Удалить интеграцию</a-button>
          </a-card>
        </a-tab-pane>
        <a-tab-pane key="key" tab="Ключ">
          <IntegrationKeysPanel :integration-id="integrationId" />
        </a-tab-pane>
        <a-tab-pane key="rules" tab="Правила">
          <IntegrationContractsPanel :integration-id="integrationId" />
        </a-tab-pane>
        <a-tab-pane key="sdk" disabled tab="SDK" />
        <a-tab-pane key="history" disabled tab="История" />
        <a-tab-pane key="groups" disabled tab="Группы" />
        <a-tab-pane key="summary" disabled tab="Сводка" />
      </a-tabs>
    </a-layout-content>
  </a-layout>
</template>

<style scoped>
.integration-page {
  min-height: 100vh;
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
