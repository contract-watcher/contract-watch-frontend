<script setup lang="ts">
import type { MenuProps } from "ant-design-vue";

import { FileSearchOutlined, LogoutOutlined, UserOutlined } from "@ant-design/icons-vue";
import { useQueryClient } from "@tanstack/vue-query";
import { theme } from "ant-design-vue";
import { useRouter } from "vue-router";

import { useAuthStore } from "@/stores/auth";

const authStore = useAuthStore();
const queryClient = useQueryClient();
const router = useRouter();
const { token } = theme.useToken();

function onLogout(): void {
  authStore.logout();
  queryClient.clear();
  void router.push({ name: "login" });
}

const onMenuClick: MenuProps["onClick"] = ({ key }) => {
  if (key === "profile") {
    void router.push({ name: "profile" });
    return;
  }

  if (key === "logout") {
    onLogout();
  }
};
</script>

<template>
  <a-layout-header class="app-header">
    <RouterLink class="app-header__brand" :to="{ name: 'projects' }">
      <span class="app-header__brand-mark" :style="{ color: token.colorPrimary }">
        <FileSearchOutlined />
      </span>
      <span class="app-header__brand-name" :style="{ color: token.colorText }">
        Contract<span :style="{ color: token.colorPrimary }">Watch</span>
      </span>
    </RouterLink>
    <a-dropdown placement="bottomRight" :trigger="['click']">
      <span class="app-header__user">
        <span class="app-header__user-email">{{ authStore.userEmail }}</span>
        <a-avatar :style="{ backgroundColor: token.colorPrimary }">
          <UserOutlined />
        </a-avatar>
      </span>
      <template #overlay>
        <a-menu @click="onMenuClick">
          <a-menu-item key="profile">
            <template #icon>
              <UserOutlined />
            </template>
            Профиль
          </a-menu-item>
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
  align-items: center;
  display: flex;
  justify-content: space-between;
  padding-inline: 24px;
}

.app-header__brand {
  align-items: center;
  display: inline-flex;
  gap: 10px;
  text-decoration: none;
}

.app-header__brand-mark {
  align-items: center;
  display: inline-flex;
  flex: none;
  font-size: 24px;
}

.app-header__brand-name {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.app-header__user {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  max-width: 65%;
  min-width: 0;
  cursor: pointer;
}

.app-header__user-email {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 991px) {
  .app-header {
    padding-inline: 12px;
  }

  .app-header__user-email {
    display: none;
  }
}
</style>
