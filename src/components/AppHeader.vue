<script setup lang="ts">
import type { MenuProps } from "ant-design-vue";

import { LogoutOutlined, UserOutlined } from "@ant-design/icons-vue";
import { theme } from "ant-design-vue";
import { useRouter } from "vue-router";

import { useAuthStore } from "@/stores/auth";

const authStore = useAuthStore();
const router = useRouter();
const { token } = theme.useToken();

function onLogout(): void {
  authStore.logout();
  void router.push({ name: "login" });
}

const onMenuClick: MenuProps["onClick"] = ({ key }) => {
  if (key === "logout") {
    onLogout();
  }
};
</script>

<template>
  <a-layout-header class="app-header">
    <span>ContractWatch</span>
    <a-dropdown placement="bottomRight" :trigger="['click']">
      <span class="app-header__user">
        {{ authStore.userEmail }}
        <a-avatar :style="{ backgroundColor: token.colorPrimary }">
          <UserOutlined />
        </a-avatar>
      </span>
      <template #overlay>
        <a-menu @click="onMenuClick">
          <a-menu-item key="logout">
            <template #icon>
              <LogoutOutlined />
            </template>
            Выйти
          </a-menu-item>
        </a-menu>
      </template>
    </a-dropdown>
  </a-layout-header>
</template>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.app-header__user {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}
</style>
