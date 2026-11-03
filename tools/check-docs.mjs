/* global console, process */
import fs from "node:fs";
import path from "node:path";
const files = ["README.md", "AGENTS.md", ...fs.readdirSync("docs", { recursive: true }).filter(p => p.endsWith(".md")).map(p => `docs/${p}`)];
const broken = [];
for (const file of files) for (const match of fs.readFileSync(file, "utf8").matchAll(/\]\(([^)]+)\)/g)) {
  const target = match[1].split("#")[0];
  if (!target || /^(https?:|mailto:)/.test(target)) continue;
  if (!fs.existsSync(path.resolve(path.dirname(file), target))) broken.push({ file, target });
}
console.log(JSON.stringify({ checked: files.length, broken }, null, 2));
if (broken.length) process.exitCode = 1;
