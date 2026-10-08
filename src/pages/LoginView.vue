<script setup lang="ts">
import type { Rule } from "ant-design-vue/es/form";

import { message } from "ant-design-vue";
import { reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { ApiError } from "@/api/client";
import { useAuthStore } from "@/stores/auth";

const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();

function goToRegister(): void {
  void router.push({ name: "register" });
}

const form = reactive({ email: "", password: "" });
const submitting = ref(false);
const rules: Record<string, Rule[]> = {
  email: [
    { message: "Введите email", required: true, trigger: "blur" },
    { message: "Некорректный email", trigger: "blur", type: "email" },
  ],
  password: [{ message: "Введите пароль", required: true, trigger: "blur" }],
};

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return "Неверный email или пароль";
    }
    return error.status === 429 ? "Слишком много попыток, подождите минуту" : error.message;
  }
  return "Что-то пошло не так, попробуйте ещё раз";
}

async function onSubmit(): Promise<void> {
  submitting.value = true;
  try {
    await authStore.login(form.email, form.password);
    message.success("Вы вошли в систему");
    const redirect = typeof route.query.redirect === "string" ? route.query.redirect : "/";
    await router.push(redirect);
  } catch (error) {
    message.error(errorMessage(error));
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <a-layout class="auth-page">
    <a-card class="auth-card" title="Вход в ContractWatch">
      <a-form :model="form" :rules="rules" layout="vertical" @finish="onSubmit">
        <a-form-item label="Email" name="email">
          <a-input v-model:value="form.email" placeholder="you@example.com" size="large" />
        </a-form-item>
        <a-form-item label="Пароль" name="password">
          <a-input-password v-model:value="form.password" size="large" />
        </a-form-item>
        <a-form-item>
          <a-button block html-type="submit" :loading="submitting" size="large" type="primary">Войти</a-button>
        </a-form-item>
      </a-form>
      <p class="auth-page__hint">
        Нет аккаунта?
        <a-typography-link @click="goToRegister">Зарегистрироваться</a-typography-link>
      </p>
    </a-card>
  </a-layout>
</template>

<style scoped>
.auth-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 24px;
}

.auth-card {
  width: 100%;
  max-width: 380px;
}

.auth-page__hint {
  margin: 16px 0 0;
  text-align: center;
}
</style>
