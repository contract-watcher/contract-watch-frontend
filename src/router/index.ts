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
      name: "confirm-email",
      path: "/confirm-email",
      component: () => import("@/pages/ConfirmEmailView.vue"),
    },
    {
      name: "profile",
      path: "/profile",
      component: () => import("@/pages/ProfileView.vue"),
      meta: { requiresAuth: true },
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
      name: "project-integration",
      path: "/projects/:projectId/integrations/:integrationId",
      component: () => import("@/pages/IntegrationView.vue"),
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
