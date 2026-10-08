import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      name: "login",
      path: "/login",
      component: () => import("@/pages/LoginView.vue"),
      meta: { publicOnly: true },
    },
    {
      name: "register",
      path: "/register",
      component: () => import("@/pages/RegisterView.vue"),
      meta: { publicOnly: true },
    },
    {
      name: "home",
      path: "/",
      component: () => import("@/pages/HomeView.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/:pathMatch(.*)*",
      redirect: { name: "home" },
    },
  ],
});

export default router;
