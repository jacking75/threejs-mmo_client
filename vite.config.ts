import { defineConfig } from "vitest/config";
import { resourceEditorPlugin } from "./tools/resource-editor/vitePlugin.js";
import { networkPlugin } from "./tools/network/plugin.js";

export default defineConfig(({ mode }) => ({
  base: process.env.BASE_PATH || "/",
  plugins: [
    {
      name: "file-launch-help",
      apply: "build",
      transformIndexHtml() {
        return [{
          tag: "script",
          injectTo: "body-prepend",
          children: `if (location.protocol === "file:") {
            const help = document.createElement("section");
            help.style.cssText = "max-width:640px;margin:64px auto;padding:32px;background:#101e30;color:#eef4ff;font:18px/1.7 system-ui;border-radius:16px";
            help.innerHTML = '<h1>서버 없이 게임 실행하기</h1><p>이 파일은 웹 서버 배포용입니다. 더블클릭으로 플레이하려면 독립 실행 HTML을 열어 주세요.</p><p><a style="color:#8de3ef" href="../dist-standalone/index.html">독립 실행 게임 열기</a></p><p>파일이 없다면 프로젝트 폴더에서 <code>npm run build:standalone</code>을 실행하세요.</p><p>이 빌드를 웹 서버로 확인하려면 <code>npm run preview</code>를 실행한 뒤 터미널에 표시된 주소를 여세요.</p>';
            document.body.append(help);
          }`,
        }];
      },
    },
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
