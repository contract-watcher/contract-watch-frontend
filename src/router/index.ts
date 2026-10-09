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
      name: "projects",
      path: "/projects",
      component: () => import("@/pages/ProjectsView.vue"),
      meta: { requiresAuth: true },
    },
    {
      name: "project-integrations",
      path: "/projects/:projectId/integrations",
      component: () => import("@/pages/IntegrationsView.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/",
      redirect: { name: "projects" },
    },
    {
      path: "/:pathMatch(.*)*",
      redirect: { name: "projects" },
    },
  ],
});

export default router;
