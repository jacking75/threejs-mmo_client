import * as THREE from "three";
import { mesh, extrudedShape } from "../geometry";

export type Point = readonly [number, number, number];

export function gearRoot(id: string, socket: "hand.R" | "hand.L" | "head" | "back"): THREE.Group {
  const root = new THREE.Group();
  root.name = id;
  root.userData.attachment = { socket, position: [0, 0, 0], forwardAxis: "+Z", upAxis: "+Y" };
  root.userData.original = true;
  return root;
}

export function part(root: THREE.Group, name: string, geometry: THREE.BufferGeometry, color: number,
  position: Point = [0, 0, 0], scale: Point = [1, 1, 1], metallic = false): THREE.Mesh {
  const result = mesh(name, geometry, new THREE.MeshStandardMaterial({
    color, metalness: metallic ? 0.65 : 0.05, roughness: metallic ? 0.33 : 0.7,
  }), position, scale);
  root.add(result);
  return result;
}

export function plate(root: THREE.Group, name: string, points: readonly (readonly [number, number])[],
  color: number, depth = 0.06, z = 0): THREE.Mesh {
  const result = extrudedShape(name, points, depth,
    new THREE.MeshStandardMaterial({ color, metalness: 0.55, roughness: 0.4 }), 0.012);
  result.position.z = z;
  root.add(result);
  return result;
}

export function rod(root: THREE.Group, name: string, start: Point, end: Point, radius: number, color: number): THREE.Mesh {
  const from = new THREE.Vector3(...start);
  const to = new THREE.Vector3(...end);
  const delta = to.clone().sub(from);
  const result = part(root, name, new THREE.CylinderGeometry(radius * 0.8, radius, delta.length(), 8), color);
  result.position.copy(from.add(to).multiplyScalar(0.5));
  result.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
  return result;
}

export function ring(root: THREE.Group, name: string, radius: number, tube: number, color: number,
  position: Point, horizontal = false): THREE.Mesh {
  const result = part(root, name, new THREE.TorusGeometry(radius, tube, 6, 24), color, position, [1, 1, 1], true);
  if (horizontal) result.rotation.x = Math.PI / 2;
  return result;
}
