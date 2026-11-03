import * as THREE from "three";

export function createRenderer(canvas: HTMLCanvasElement): THREE.WebGLRenderer {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  if (import.meta.env.DEV) {
    const params = new URLSearchParams(window.location.search);
    const dpr = Number(params.get("dpr"));
    if ([1, 1.5, 2].includes(dpr)) renderer.setPixelRatio(dpr);
    if (params.get("shadows") === "off") renderer.shadowMap.enabled = false;
  }
  return renderer;
}
