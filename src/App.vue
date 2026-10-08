<script setup lang="ts">
import { ConfigProvider, theme } from "ant-design-vue";
import ruRU from "ant-design-vue/es/locale/ru_RU";
import { RouterView } from "vue-router";

const { token } = theme.useToken();

const themeConfig = {
  token: {
    colorPrimary: "#00b96b",
    colorInfo: "#00b96b",
  },
  components: {
    Layout: {
      colorBgHeader: token.value.colorBgContainer,
    },
  },
};
</script>

<template>
  <ConfigProvider :locale="ruRU" :theme="themeConfig">
    <RouterView />
  </ConfigProvider>
</template>
