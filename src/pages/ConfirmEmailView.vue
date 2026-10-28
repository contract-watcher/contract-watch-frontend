<script setup lang="ts">
import { useQueryClient } from "@tanstack/vue-query";
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import { confirmEmail } from "@/api/auth";
import { ApiError } from "@/api/client";
import { useAuthStore } from "@/stores/auth";

type ConfirmEmailStatus = "error" | "invalid" | "loading" | "rateLimited" | "success";

const authStore = useAuthStore();
const queryClient = useQueryClient();
const route = useRoute();
const router = useRouter();

const status = ref<ConfirmEmailStatus>("loading");
const token = computed(() => {
  const value = route.query.token;
  return typeof value === "string" ? value : "";
});
const nextButtonLabel = computed(() => (authStore.isAuthenticated ? "К проектам" : "Войти"));

async function submitToken(value: string): Promise<void> {
  if (!value) {
    status.value = "invalid";
    return;
  }

  status.value = "loading";
  try {
    await confirmEmail(value);
    status.value = "success";

    if (authStore.isAuthenticated) {
      await queryClient.invalidateQueries({ queryKey: ["account"] });
    }
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 400) {
        status.value = "invalid";
        return;
      }
      if (error.status === 429) {
        status.value = "rateLimited";
        return;
      }
    }
    status.value = "error";
  }
}

watch(token, (value) => void submitToken(value), { immediate: true });

function goNext(): void {
  if (authStore.isAuthenticated) {
    void router.push({ name: "projects" });
    return;
  }

  void router.push({ name: "login" });
}

function retry(): void {
  void submitToken(token.value);
}
</script>

<template>
  <a-layout class="confirm-email-page">
    <a-card class="confirm-email-card" title="Подтверждение почты">
      <div v-if="status === 'loading'" class="confirm-email-page__loading">
        <a-spin size="large" />
        <a-typography-text type="secondary">Подтверждаем почту…</a-typography-text>
      </div>

      <a-result
        v-else-if="status === 'success'"
        status="success"
        sub-title="Теперь письма о неуспешных проверках можно включить на странице интеграции."
        title="Почта подтверждена"
      >
        <template #extra>
          <a-button type="primary" @click="goNext">{{ nextButtonLabel }}</a-button>
        </template>
      </a-result>

      <a-result
        v-else-if="status === 'invalid'"
        status="warning"
        sub-title="Запросите новое письмо в профиле."
        title="Ссылка недействительна или устарела"
      >
        <template #extra>
          <a-space>
            <a-button type="primary" @click="goNext">{{ nextButtonLabel }}</a-button>
          </a-space>
        </template>
      </a-result>

      <a-result
        v-else-if="status === 'rateLimited'"
        status="warning"
        sub-title="Попробуйте позже."
        title="Слишком много попыток"
      >
        <template #extra>
          <a-button type="primary" @click="goNext">{{ nextButtonLabel }}</a-button>
        </template>
      </a-result>

      <a-result
        v-else
        status="error"
        sub-title="Не удалось подтвердить почту. Попробуйте ещё раз."
        title="Ошибка подтверждения"
      >
        <template #extra>
          <a-space>
            <a-button @click="retry">Повторить</a-button>
            <a-button type="primary" @click="goNext">{{ nextButtonLabel }}</a-button>
          </a-space>
        </template>
      </a-result>
    </a-card>
  </a-layout>
</template>

<style scoped>
.confirm-email-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 24px;
}

.confirm-email-card {
  width: 100%;
  max-width: 520px;
}

.confirm-email-page__loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 40px 0;
}
</style>
