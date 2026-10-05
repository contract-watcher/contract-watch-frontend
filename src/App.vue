<script setup lang="ts">
import { ConfigProvider } from "ant-design-vue";
import ruRU from "ant-design-vue/es/locale/ru_RU";
import { RouterView } from "vue-router";
</script>

<template>
  <ConfigProvider :locale="ruRU">
    <RouterView />
  </ConfigProvider>
</template>
