import "ant-design-vue/dist/reset.css";
import "dayjs/locale/ru";
import { VueQueryPlugin } from "@tanstack/vue-query";
import { createPinia } from "pinia";
import { createApp } from "vue";

import { ApiError, setUnauthorizedHandler } from "@/api/client";
import App from "@/App.vue";
import router from "@/router";
import { useAuthStore } from "@/stores/auth";

const app = createApp(App);
const pinia = createPinia();

app
  .use(pinia)
  .use(router)
  .use(VueQueryPlugin, {
    queryClientConfig: {
      defaultOptions: {
        queries: {
          retry: (failureCount, error) =>
            !(error instanceof ApiError && error.status >= 400 && error.status < 500) && failureCount < 3,
        },
      },
    },
  });

const authStore = useAuthStore(pinia);

router.beforeEach(async (to) => {
  await authStore.restoreSession();

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return { name: "login", query: { redirect: to.fullPath } };
  }

  if (authStore.isAuthenticated && to.meta.publicOnly) {
    return { name: "projects" };
  }
});

setUnauthorizedHandler(async () => {
  await authStore.refresh();

  if (authStore.isAuthenticated) {
    return authStore.accessToken;
  }

  if (router.currentRoute.value.meta.requiresAuth) {
    void router.push({ name: "login" });
  }

  return null;
});

app.mount("#app");
