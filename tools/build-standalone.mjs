/* global console, Buffer, process */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { build } from "vite";

const args = process.argv.slice(2);
if (args.length > 1 || (args.length === 1 && args[0] !== "--gallery")) {
  throw new Error("Usage: node tools/build-standalone.mjs [--gallery]");
}
const gallery = args[0] === "--gallery";
const outputPath = gallery ? "docs/gallery.html" : "dist-standalone/index.html";
const model = readFileSync("public/assets/characters/female-warrior.glb").toString("base64");
const result = await build({
  configFile: false,
  define: { "import.meta.env.VITE_STANDALONE_GLB": JSON.stringify(`data:model/gltf-binary;base64,${model}`) },
  build: {
    write: false,
    copyPublicDir: false,
    minify: true,
    cssCodeSplit: false,
    lib: {
      entry: resolve(gallery ? "src/gallery-standalone.ts" : "src/standalone.ts"),
      name: gallery ? "AssetGallery" : "RpgClient",
      formats: ["iife"],
    },
  },
});
const outputs = (Array.isArray(result) ? result : [result]).flatMap(bundle => bundle.output);
const chunks = outputs.filter(output => output.type === "chunk");
if (chunks.length !== 1 || chunks[0].imports.length || chunks[0].dynamicImports.length) {
  throw new Error("Standalone build must contain exactly one self-contained script");
}
const css = outputs.filter(output => output.type === "asset" && output.fileName.endsWith(".css"))
  .map(output => String(output.source)).join("\n");
const script = chunks[0].code.replace(/<\/script/gi, "<\\/script");
const html = readFileSync("index.html", "utf8")
  .replace(/<title>.*?<\/title>/, gallery ? "<title>대륙 리소스 도감 · Asset Gallery</title>" : "$&")
  .replace("</head>", () => `<style>${css}</style></head>`)
  .replace('<script type="module" src="/src/main.ts"></script>', () => `<script>${script}</script>`);
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, html);
console.log(`Standalone ${gallery ? "gallery" : "client"}: ${resolve(outputPath)} (${(Buffer.byteLength(html) / 1024 / 1024).toFixed(2)} MiB)`);
