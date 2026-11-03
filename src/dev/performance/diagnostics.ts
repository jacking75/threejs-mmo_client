import type { Scene, WebGLRenderer } from "three";
import { Mesh } from "three";

export interface RenderSample { geometries: number; textures: number; materials: number; calls: number; triangles: number; frameMs: number }
declare global { interface Window { __rpgDiagnostics?: { current: RenderSample; disposed: RenderSample[] } } }
export function recordRender(renderer: WebGLRenderer, scene: Scene, frameMs: number, disposed = false): void {
  const materials = new Set();
  scene.traverse(node => { if (node instanceof Mesh) (Array.isArray(node.material) ? node.material : [node.material]).forEach(m => materials.add(m)); });
  const sample = { ...renderer.info.memory, materials: materials.size, calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, frameMs };
  window.__rpgDiagnostics ??= { current: sample, disposed: [] };
  window.__rpgDiagnostics.current = sample;
  if (disposed) {
    window.__rpgDiagnostics.disposed.push(sample);
    if (window.__rpgDiagnostics.disposed.length > 120) window.__rpgDiagnostics.disposed.shift();
  }
}
