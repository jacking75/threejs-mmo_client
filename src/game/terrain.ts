/** Fixed, authored meadow; no random world generation or saved terrain state. */
export const FIELD_SIZE = 240;
export const TERRAIN_SEGMENTS = 240;
export const TERRAIN_STEP = FIELD_SIZE / TERRAIN_SEGMENTS;

export function northPathX(z: number): number {
  return Math.sin(z * 0.035) * 10 + Math.sin(z * 0.085) * 2;
}

export function eastPathZ(x: number): number {
  return Math.sin(x * 0.043) * 7;
}

export function pathDistance(x: number, z: number): number {
  return Math.min(Math.abs(x - northPathX(z)), Math.abs(z - eastPathZ(x)));
}

function hill(x: number, z: number, cx: number, cz: number, width: number, height: number): number {
  return height * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (width * width));
}

/** Vertex elevations: broad ridges, a shallow valley, and a gentle starting clearing. */
export function terrainVertexHeight(x: number, z: number): number {
  const elevation = hill(x, z, -32, 36, 27, 10)
    + hill(x, z, 43, -30, 30, 12)
    + hill(x, z, -65, -55, 35, 15)
    + hill(x, z, 75, 65, 35, 11)
    + hill(x, z, -80, 92, 28, 9)
    - hill(x, z, 12, 52, 23, 3.5)
    + 1.1 * Math.sin(x * 0.065) * Math.sin(z * 0.053);
  const clearing = 1 - Math.exp(-(x * x + z * z) / 110);
  return elevation * clearing;
}

/** Interpolate the SAME triangles used by the render mesh, including between vertices. */
export function getTerrainHeight(x: number, z: number): number {
  const half = FIELD_SIZE / 2;
  const gx = Math.max(0, Math.min(TERRAIN_SEGMENTS - 0.000001, (x + half) / TERRAIN_STEP));
  const gz = Math.max(0, Math.min(TERRAIN_SEGMENTS - 0.000001, (z + half) / TERRAIN_STEP));
  const ix = Math.floor(gx), iz = Math.floor(gz);
  const u = gx - ix, v = gz - iz;
  const x0 = ix * TERRAIN_STEP - half, z0 = iz * TERRAIN_STEP - half;
  const a = terrainVertexHeight(x0, z0);
  const b = terrainVertexHeight(x0 + TERRAIN_STEP, z0);
  const c = terrainVertexHeight(x0, z0 + TERRAIN_STEP);
  if (u + v <= 1) return a + (b - a) * u + (c - a) * v;
  const d = terrainVertexHeight(x0 + TERRAIN_STEP, z0 + TERRAIN_STEP);
  return d + (c - d) * (1 - u) + (b - d) * (1 - v);
}
