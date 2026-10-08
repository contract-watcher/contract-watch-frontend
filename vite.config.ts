import { fileURLToPath, URL } from "node:url";

import { defineConfig, loadEnv } from "vite";
import Components from "unplugin-vue-components/vite";
import { AntDesignVueResolver } from "unplugin-vue-components/resolvers";
import vue from "@vitejs/plugin-vue";
import vueDevTools from "vite-plugin-vue-devtools";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const proxyTarget = env.VITE_PROXY_TARGET || "http://localhost:5000";

  return {
    plugins: [
      vue(),
      vueDevTools(),
      Components({
        dts: "src/components.d.ts",
        resolvers: [AntDesignVueResolver({ importStyle: false })],
      }),
    ],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    server: {
      proxy: {
        "/api": {
          changeOrigin: true,
          target: proxyTarget,
        },
      },
    },
  };
});
