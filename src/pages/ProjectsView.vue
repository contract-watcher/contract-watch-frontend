<script setup lang="ts">
import type { FormInstance, Rule } from "ant-design-vue/es/form";

import { ArrowRightOutlined, ReloadOutlined } from "@ant-design/icons-vue";
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { message, theme } from "ant-design-vue";
import { computed, reactive, ref } from "vue";
import { useRouter } from "vue-router";

import { ApiError } from "@/api/client";
import { createProject, getProjects } from "@/api/projects";
import AppHeader from "@/components/AppHeader.vue";
import { useAuthStore } from "@/stores/auth";

const authStore = useAuthStore();
const router = useRouter();
const queryClient = useQueryClient();
const { token } = theme.useToken();

const formRef = ref<FormInstance>();
const form = reactive({ name: "" });
const modalOpen = ref(false);
const rules: Record<string, Rule[]> = {
  name: [
    { message: "Введите название", required: true, trigger: "blur" },
    { max: 200, message: "Не больше 200 символов", trigger: "blur" },
  ],
};

const { data, isError, isPending, refetch } = useQuery({
  queryKey: ["projects"],
  queryFn: () => getProjects(authStore.accessToken),
});
const projects = computed(() => data.value ?? []);

const { isPending: isCreating, mutate: createProjectMutation } = useMutation({
  mutationFn: (name: string) => createProject({ name }, authStore.accessToken),
  onSuccess: async () => {
    message.success("Проект создан");
    modalOpen.value = false;
    form.name = "";
    await queryClient.invalidateQueries({ queryKey: ["projects"] });
  },
  onError: (error) => {
    message.error(errorMessage(error));
  },
});

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.status === 400 ? "Проверьте название проекта" : error.message;
  }
  return "Что-то пошло не так, попробуйте ещё раз";
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}

function openProject(projectId: string): void {
  void router.push({ name: "project-integrations", params: { projectId } });
}

function openCreateModal(): void {
  form.name = "";
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

  createProjectMutation(form.name);
}
</script>

<template>
  <a-layout class="projects-page">
    <AppHeader />
    <a-layout-content class="projects-page__content">
      <div class="projects-page__header">
        <a-typography-title class="projects-page__title" :level="3">Проекты</a-typography-title>
        <a-button type="primary" @click="openCreateModal">Создать проект</a-button>
      </div>

      <a-skeleton v-if="isPending" active :paragraph="{ rows: 3 }" />

      <a-alert v-else-if="isError" message="Не удалось загрузить проекты" show-icon type="error">
        <template #action>
          <a-button size="small" type="text" @click="refetch()">
            <template #icon>
              <ReloadOutlined />
            </template>
            Повторить
          </a-button>
        </template>
      </a-alert>

      <a-empty v-else-if="projects.length === 0" description="Проектов нет" />

      <div v-else class="projects-page__grid">
        <a-card
          v-for="project in projects"
          :key="project.id"
          :aria-label="`Открыть проект ${project.name}`"
          class="projects-page__card"
          hoverable
          role="button"
          tabindex="0"
          @click="openProject(project.id)"
          @keydown.enter="openProject(project.id)"
          @keydown.space.prevent="openProject(project.id)"
        >
          <a-typography-title class="projects-page__card-title" :level="5">
            {{ project.name }}
          </a-typography-title>
          <a-typography-text type="secondary">Создан: {{ formatDate(project.createdAt) }}</a-typography-text>

          <div class="projects-page__card-footer">
            <ArrowRightOutlined class="projects-page__card-arrow" :style="{ color: token.colorPrimary }" />
          </div>
        </a-card>
      </div>
    </a-layout-content>

    <a-modal
      v-model:open="modalOpen"
      :confirm-loading="isCreating"
      cancel-text="Отмена"
      ok-text="Создать"
      title="Новый проект"
      @ok="submitCreate"
    >
      <a-form ref="formRef" :model="form" :rules="rules" layout="vertical" @finish="submitCreate">
        <a-form-item label="Название" name="name">
          <a-input v-model:value="form.name" placeholder="Например, «Магазин»" />
        </a-form-item>
      </a-form>
    </a-modal>
  </a-layout>
</template>

<style scoped>
.projects-page {
  min-height: 100vh;
}

.projects-page__content {
  width: 100%;
  max-width: 960px;
  margin: 24px auto;
  padding: 0 24px;
}

.projects-page__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.projects-page__title {
  margin: 0;
}

.projects-page__grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.projects-page__card {
  border-radius: 12px;
  cursor: pointer;
}

.projects-page__card-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.projects-page__card-arrow {
  font-size: 16px;
}

.projects-page__card-title {
  margin: 0 0 4px;
}

@media (max-width: 767px) {
  .projects-page__grid {
    grid-template-columns: 1fr;
  }
}
</style>
