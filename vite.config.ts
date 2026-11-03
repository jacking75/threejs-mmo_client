import { defineConfig } from "vitest/config";
import { resourceEditorPlugin } from "./tools/resource-editor/vitePlugin.js";
import { networkPlugin } from "./tools/network/plugin.js";

export default defineConfig(({ mode }) => ({
  base: process.env.BASE_PATH || "/",
  plugins: [
    ...(mode === "editor" || mode === "editor-test" ? [resourceEditorPlugin({ fakeAgent: mode === "editor-test" })] : []),
    ...(mode === "network" || mode === "editor-test" ? [networkPlugin()] : []),
  ],
  server: { host: "127.0.0.1", port: 4173, strictPort: true, watch: { ignored: ["**/docs_working/**"] } },
  preview: { host: "127.0.0.1", port: 4173 },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replaceAll("\\", "/");
          if (normalizedId.includes("node_modules/three/examples/jsm/")) {
            return "vendor-three-addons";
          }
          if (normalizedId.includes("node_modules/three/")) return "vendor-three";
        },
      },
    },
  },
  test: { exclude: ["tests/e2e/**", "tests/performance/**", "node_modules/**", "dist/**", "docs_working/**"] },
}));
