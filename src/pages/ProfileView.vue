<script setup lang="ts">
import { ReloadOutlined, SendOutlined } from "@ant-design/icons-vue";
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { message } from "ant-design-vue";
import { computed } from "vue";

import { getAccount, requestEmailConfirmation } from "@/api/auth";
import { ApiError } from "@/api/client";
import AppHeader from "@/components/AppHeader.vue";
import { useAuthStore } from "@/stores/auth";

const authStore = useAuthStore();
const queryClient = useQueryClient();

const accountQueryKey = computed(() => ["account", authStore.userEmail] as const);

const {
  data: account,
  error: queryError,
  isError,
  isPending,
  refetch,
} = useQuery({
  queryKey: accountQueryKey,
  queryFn: () => getAccount(authStore.accessToken),
  refetchOnWindowFocus: "always",
});

const email = computed(() => account.value?.email ?? authStore.userEmail);
const emailConfirmed = computed(() => account.value?.emailConfirmed === true);

const loadErrorMessage = computed(() =>
  queryError.value instanceof ApiError ? queryError.value.message : "Не удалось загрузить данные профиля",
);

const { isPending: isSending, mutate: sendConfirmation } = useMutation({
  mutationFn: () => requestEmailConfirmation(authStore.accessToken),
  onSuccess: () => {
    message.success(`Письмо отправлено на ${email.value}. Перейдите по ссылке из письма`);
  },
  onError: async (error) => {
    if (error instanceof ApiError) {
      if (error.status === 409) {
        message.info("Почта уже подтверждена");
        await queryClient.invalidateQueries({ queryKey: accountQueryKey.value });
        return;
      }
      if (error.status === 429) {
        message.warning("Попробуйте позже — вы слишком часто отправляете письма");
        return;
      }
      message.error(error.message);
      return;
    }
    message.error("Не удалось отправить письмо, попробуйте ещё раз");
  },
});
</script>

<template>
  <a-layout class="profile-page">
    <AppHeader />
    <a-layout-content class="profile-page__content">
      <a-breadcrumb class="profile-page__breadcrumb">
        <a-breadcrumb-item>
          <RouterLink :to="{ name: 'projects' }">Проекты</RouterLink>
        </a-breadcrumb-item>
        <a-breadcrumb-item>Профиль</a-breadcrumb-item>
      </a-breadcrumb>

      <a-typography-title class="profile-page__title" :level="3">Профиль</a-typography-title>

      <a-card title="Почта">
        <a-alert
          v-if="isError"
          :description="loadErrorMessage"
          message="Не удалось загрузить профиль"
          show-icon
          type="error"
        >
          <template #action>
            <a-button size="small" type="text" @click="refetch()">
              <template #icon>
                <ReloadOutlined />
              </template>
              Повторить
            </a-button>
          </template>
        </a-alert>

        <a-skeleton v-else-if="isPending" active :paragraph="{ rows: 3 }" />

        <template v-else-if="account">
          <a-descriptions bordered :column="1" size="small">
            <a-descriptions-item label="Email">{{ email || "—" }}</a-descriptions-item>
            <a-descriptions-item label="Статус">
              <a-tag :color="emailConfirmed ? 'success' : 'warning'">
                {{ emailConfirmed ? "Подтверждена" : "Не подтверждена" }}
              </a-tag>
            </a-descriptions-item>
          </a-descriptions>

          <a-alert
            v-if="!emailConfirmed"
            class="profile-page__alert"
            description="Письма о неуспешных проверках приходят только на подтверждённый адрес."
            message="Подтвердите почту, чтобы получать письма"
            show-icon
            type="warning"
          />

          <a-button
            v-if="!emailConfirmed"
            class="profile-page__email-button"
            :loading="isSending"
            @click="sendConfirmation()"
          >
            <template #icon>
              <SendOutlined />
            </template>
            Отправить письмо
          </a-button>

          <a-typography-paragraph v-else class="profile-page__confirmed" type="secondary">
            На этот адрес приходят письма о неуспешных проверках интеграций.
          </a-typography-paragraph>
        </template>

        <a-empty v-else description="Данные профиля недоступны" />
      </a-card>
    </a-layout-content>
  </a-layout>
</template>

<style scoped>
.profile-page {
  min-height: 100vh;
}

.profile-page__content {
  width: 100%;
  max-width: 720px;
  margin: 24px auto;
  padding: 0 24px;
}

.profile-page__breadcrumb {
  margin-bottom: 8px;
}

.profile-page__title {
  margin-top: 0;
}

.profile-page__alert {
  margin-top: 20px;
}

.profile-page__email-button {
  margin-top: 12px;
}

.profile-page__confirmed {
  margin: 16px 0 0;
}

@media (max-width: 575px) {
  .profile-page__content {
    padding: 0 16px;
  }

  .profile-page__email-button {
    width: 100%;
  }
}
</style>
