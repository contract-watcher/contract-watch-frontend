<script setup lang="ts">
import type { Rule } from "ant-design-vue/es/form";

import { message } from "ant-design-vue";
import { reactive, ref } from "vue";
import { useRouter } from "vue-router";

import { ApiError } from "@/api/client";
import { useAuthStore } from "@/stores/auth";

const authStore = useAuthStore();
const router = useRouter();

function goToLogin(): void {
  void router.push({ name: "login" });
}

const form = reactive({ email: "", name: "", password: "" });
const submitting = ref(false);
const rules: Record<string, Rule[]> = {
  email: [
    { message: "Введите email", required: true, trigger: "blur" },
    { message: "Некорректный email", trigger: "blur", type: "email" },
    { max: 256, message: "Не больше 256 символов", trigger: "blur" },
  ],
  name: [
    { message: "Введите имя", required: true, trigger: "blur" },
    { max: 200, message: "Не больше 200 символов", trigger: "blur" },
  ],
  password: [
    { message: "Введите пароль", required: true, trigger: "blur" },
    { max: 128, message: "Не больше 128 символов", trigger: "blur" },
    { message: "Минимум 8 символов", min: 8, trigger: "blur" },
  ],
};

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 409) {
      return "Этот email уже зарегистрирован";
    }
    if (error.status === 429) {
      return "Слишком много попыток, подождите минуту";
    }
    return error.status === 400 ? "Проверьте правильность заполнения полей" : error.message;
  }
  return "Что-то пошло не так, попробуйте ещё раз";
}

async function onSubmit(): Promise<void> {
  submitting.value = true;
  try {
    await authStore.register(form.name, form.email, form.password);
    message.success("Аккаунт создан, вы вошли в систему");
    await router.push("/");
  } catch (error) {
    message.error(errorMessage(error));
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <a-layout class="auth-page">
    <a-card class="auth-card" title="Регистрация в ContractWatch">
      <a-form :model="form" :rules="rules" layout="vertical" @finish="onSubmit">
        <a-form-item label="Имя" name="name">
          <a-input v-model:value="form.name" placeholder="Как к вам обращаться" size="large" />
        </a-form-item>
        <a-form-item label="Email" name="email">
          <a-input v-model:value="form.email" placeholder="you@example.com" size="large" />
        </a-form-item>
        <a-form-item label="Пароль" name="password">
          <a-input-password v-model:value="form.password" placeholder="Минимум 8 символов" size="large" />
        </a-form-item>
        <a-form-item>
          <a-button block html-type="submit" :loading="submitting" size="large" type="primary">
            Зарегистрироваться
          </a-button>
        </a-form-item>
      </a-form>
      <p class="auth-page__hint">
        Уже есть аккаунт?
        <a-typography-link @click="goToLogin">Войти</a-typography-link>
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
