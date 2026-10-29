<script setup lang="ts">
import type { FormInstance, Rule } from "ant-design-vue/es/form";

import { InfoCircleOutlined, ReloadOutlined } from "@ant-design/icons-vue";
import { useIsFetching, useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { message } from "ant-design-vue";
import { computed, reactive, ref } from "vue";
import { useRoute } from "vue-router";

import type { IntegrationPayload } from "@/api/integrations";

import { ApiError } from "@/api/client";
import { createIntegration, getIntegrations } from "@/api/integrations";
import { getProject } from "@/api/projects";
import AppHeader from "@/components/AppHeader.vue";
import ProjectSummaryPanel from "@/components/ProjectSummaryPanel.vue";
import { useAuthStore } from "@/stores/auth";

const authStore = useAuthStore();
const route = useRoute();
const queryClient = useQueryClient();

const projectId = computed(() => String(route.params.projectId ?? ""));
const summaryFetching = useIsFetching({ queryKey: ["project-integration-summaries", projectId.value] });
const isSummaryFetching = computed(() => summaryFetching.value > 0);

const formRef = ref<FormInstance>();
const form = reactive({ description: "", name: "", slug: "" });
const modalOpen = ref(false);
const summaryResetKey = ref(0);
const slugHint =
  "Короткий идентификатор интеграции, например yookassa. Должен быть уникален в проекте. Допустимы только строчные латинские буквы, цифры и дефис — до 100 символов.";
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

const {
  data: project,
  isError: isProjectError,
  isPending: isProjectPending,
  refetch: refetchProject,
} = useQuery({
  queryKey: ["project", projectId],
  queryFn: () => getProject(projectId.value, authStore.accessToken),
});

const { data, isError, isPending, refetch } = useQuery({
  queryKey: ["integrations", projectId],
  queryFn: () => getIntegrations(projectId.value, authStore.accessToken),
});
const integrations = computed(() => data.value ?? []);

const { isPending: isCreating, mutate: createIntegrationMutation } = useMutation({
  mutationFn: (payload: IntegrationPayload) => createIntegration(projectId.value, payload, authStore.accessToken),
  onSuccess: async () => {
    message.success("Интеграция создана");
    modalOpen.value = false;
    summaryResetKey.value += 1;
    await queryClient.invalidateQueries({ queryKey: ["integrations", projectId.value] });
    await queryClient.invalidateQueries({ queryKey: ["project-integration-summaries", projectId.value] });
  },
  onError: (error) => {
    message.error(errorMessage(error));
  },
});

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 409) {
      return "Такой код уже занят в этом проекте";
    }
    return error.status === 400 ? "Проверьте заполненные поля" : error.message;
  }
  return "Что-то пошло не так, попробуйте ещё раз";
}

function refreshSummary(): void {
  void queryClient.invalidateQueries({ queryKey: ["project-integration-summaries", projectId.value] });
}

function openCreateModal(): void {
  form.description = "";
  form.name = "";
  form.slug = "";
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

  createIntegrationMutation({
    description: form.description.trim() || undefined,
    name: form.name,
    slug: form.slug,
  });
}
</script>

<template>
  <a-layout class="integrations-page">
    <AppHeader />
    <a-layout-content class="integrations-page__content">
      <a-breadcrumb class="integrations-page__breadcrumb">
        <a-breadcrumb-item>
          <RouterLink :to="{ name: 'projects' }">Проекты</RouterLink>
        </a-breadcrumb-item>
        <a-breadcrumb-item v-if="project">{{ project.name }}</a-breadcrumb-item>
      </a-breadcrumb>

      <a-skeleton v-if="isProjectPending || isPending" active :paragraph="{ rows: 3 }" :title="{ width: '30%' }" />

      <a-alert v-else-if="isProjectError" message="Не удалось загрузить проект" show-icon type="error">
        <template #action>
          <a-button size="small" type="text" @click="refetchProject()">
            <template #icon>
              <ReloadOutlined />
            </template>
            Повторить
          </a-button>
        </template>
      </a-alert>

      <template v-else>
        <div class="integrations-page__header">
          <a-typography-title class="integrations-page__title" :level="3">Интеграции</a-typography-title>
          <div class="integrations-page__actions">
            <a-button :loading="isSummaryFetching" @click="refreshSummary">
              <template #icon>
                <ReloadOutlined />
              </template>
              Обновить
            </a-button>
            <a-button type="primary" @click="openCreateModal">Создать интеграцию</a-button>
          </div>
        </div>

        <ProjectSummaryPanel :integrations="integrations" :project-id="projectId" :reset-key="summaryResetKey" />

        <a-alert v-if="isError" message="Не удалось загрузить интеграции" show-icon type="error">
          <template #action>
            <a-button size="small" type="text" @click="refetch()">
              <template #icon>
                <ReloadOutlined />
              </template>
              Повторить
            </a-button>
          </template>
        </a-alert>
      </template>
    </a-layout-content>

    <a-modal
      v-model:open="modalOpen"
      :confirm-loading="isCreating"
      cancel-text="Отмена"
      ok-text="Создать"
      title="Новая интеграция"
      @ok="submitCreate"
    >
      <a-form ref="formRef" :model="form" :rules="rules" layout="vertical" @finish="submitCreate">
        <a-form-item label="Название" name="name">
          <a-input v-model:value="form.name" placeholder="Например, «ЮKassa»" />
        </a-form-item>
        <a-form-item name="slug">
          <template #label>
            Код интеграции
            <a-tooltip :title="slugHint">
              <a-typography-text class="integrations-page__label-icon" type="secondary">
                <InfoCircleOutlined />
              </a-typography-text>
            </a-tooltip>
          </template>
          <a-input v-model:value="form.slug" placeholder="yookassa" />
        </a-form-item>
        <a-form-item label="Описание" name="description">
          <a-textarea v-model:value="form.description" :rows="3" placeholder="Необязательно" />
        </a-form-item>
      </a-form>
    </a-modal>
  </a-layout>
</template>

<style scoped>
.integrations-page {
  min-height: 100vh;
}

.integrations-page__content {
  width: 100%;
  max-width: 960px;
  margin: 24px auto;
  padding: 0 24px;
}

.integrations-page__breadcrumb {
  margin-bottom: 8px;
}

.integrations-page__header {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: space-between;
  margin-bottom: 16px;
}

.integrations-page__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.integrations-page__title {
  margin: 0;
}

.integrations-page__label-icon {
  margin-inline-start: 4px;
}
</style>
