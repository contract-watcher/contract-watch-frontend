<script setup lang="ts">
import { ReloadOutlined } from "@ant-design/icons-vue";
import { useQuery } from "@tanstack/vue-query";
import { computed } from "vue";
import { useRoute } from "vue-router";

import { getProject } from "@/api/projects";
import AppHeader from "@/components/AppHeader.vue";
import { useAuthStore } from "@/stores/auth";

const authStore = useAuthStore();
const route = useRoute();

const projectId = computed(() => String(route.params.projectId ?? ""));

const {
  data: project,
  isError,
  isPending,
  refetch,
} = useQuery({
  queryKey: ["project", projectId],
  queryFn: () => getProject(projectId.value, authStore.accessToken),
});
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

      <a-skeleton v-if="isPending" active :paragraph="{ rows: 1 }" :title="{ width: '30%' }" />

      <a-alert v-else-if="isError" message="Не удалось загрузить проект" show-icon type="error">
        <template #action>
          <a-button size="small" type="text" @click="refetch()">
            <template #icon>
              <ReloadOutlined />
            </template>
            Повторить
          </a-button>
        </template>
      </a-alert>

      <a-typography-title v-else class="integrations-page__title" :level="3">
        Интеграции проекта «{{ project?.name }}»
      </a-typography-title>
    </a-layout-content>
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

.integrations-page__title {
  margin: 0;
}
</style>
