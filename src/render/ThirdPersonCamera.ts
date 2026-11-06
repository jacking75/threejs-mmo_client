import * as THREE from "three";
import { POINTER_DRAG_THRESHOLD_SQ } from "../game/inputGuards";

const MIN_PITCH = 0.16;
const MAX_PITCH = 0.92;
export const DEFAULT_CAMERA_DISTANCE = 9.5;
export const MIN_CAMERA_DISTANCE = 4.5;
export const MAX_CAMERA_DISTANCE = 18;

export interface CameraObstacle { readonly x: number; readonly y: number; readonly z: number; readonly radius: number }

export class ThirdPersonCamera {
  private readonly desiredPosition = new THREE.Vector3();
  private readonly orbitPosition = new THREE.Vector3();
  private readonly lookAtPosition = new THREE.Vector3();
  private yaw = Math.PI * 1.08;
  private pitch = 0.32;
  private readonly sightRay = new THREE.Ray();
  private readonly obstacleSphere = new THREE.Sphere();
  private readonly intersection = new THREE.Vector3();
  private distance = DEFAULT_CAMERA_DISTANCE;
  private initialized = false;
  private visibleDistance: number | null = null;
  private enabled = true;
  private inputElement: HTMLElement | null = null;
  private pointerId: number | null = null;
  private previousPointerX = 0;
  private previousPointerY = 0;
  private pointerStartX = 0;
  private pointerStartY = 0;
  private dragging = false;

  public constructor(
    public readonly camera: THREE.PerspectiveCamera,
    private readonly target: THREE.Object3D,
    private readonly targetHeight = 1.35,
    private readonly groundHeight?: (x: number, z: number) => number,
    private readonly obstacles: readonly CameraObstacle[] = [],
  ) {}

  public connect(element: HTMLElement): void {
    this.disconnect();
    this.inputElement = element;
    element.addEventListener("pointerdown", this.handlePointerDown);
    element.addEventListener("pointermove", this.handlePointerMove);
    element.addEventListener("pointerup", this.handlePointerUp);
    element.addEventListener("pointercancel", this.handlePointerUp);
    element.addEventListener("lostpointercapture", this.handlePointerUp);
    element.addEventListener("wheel", this.handleWheel, { passive: false });
    element.addEventListener("contextmenu", this.handleContextMenu);
    window.addEventListener("blur", this.cancelDrag);
    document.addEventListener("visibilitychange", this.handleVisibilityChange);
  }

  public disconnect(): void {
    const element = this.inputElement;
    if (!element) return;
    this.cancelDrag();
    element.removeEventListener("pointerdown", this.handlePointerDown);
    element.removeEventListener("pointermove", this.handlePointerMove);
    element.removeEventListener("pointerup", this.handlePointerUp);
    element.removeEventListener("pointercancel", this.handlePointerUp);
    element.removeEventListener("lostpointercapture", this.handlePointerUp);
    element.removeEventListener("wheel", this.handleWheel);
    element.removeEventListener("contextmenu", this.handleContextMenu);
    window.removeEventListener("blur", this.cancelDrag);
    document.removeEventListener("visibilitychange", this.handleVisibilityChange);
    this.inputElement = null;
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) this.cancelDrag();
  }

  public rotate(deltaX: number, deltaY: number): void {
    this.yaw -= deltaX * 0.005;
    this.pitch = THREE.MathUtils.clamp(this.pitch + deltaY * 0.004, MIN_PITCH, MAX_PITCH);
  }

  public zoom(delta: number): void {
    this.distance = THREE.MathUtils.clamp(
      this.distance + delta,
      MIN_CAMERA_DISTANCE,
      MAX_CAMERA_DISTANCE,
    );
  }

  public resize(width: number, height: number): void {
    this.camera.aspect = width / Math.max(height, 1);
    this.camera.updateProjectionMatrix();
  }

  public update(deltaSeconds: number): void {
    this.target.getWorldPosition(this.lookAtPosition);
    this.lookAtPosition.y += this.targetHeight;

    const horizontalDistance = Math.cos(this.pitch) * this.distance;
    this.desiredPosition.set(
      this.lookAtPosition.x + Math.sin(this.yaw) * horizontalDistance,
      this.lookAtPosition.y + Math.sin(this.pitch) * this.distance,
      this.lookAtPosition.z + Math.cos(this.yaw) * horizontalDistance,
    );

    this.clearTerrain(this.desiredPosition);
    if (!this.initialized) {
      this.orbitPosition.copy(this.desiredPosition);
      this.initialized = true;
    } else {
      const followStrength = 1 - Math.exp(-10 * Math.max(deltaSeconds, 0));
      this.orbitPosition.lerp(this.desiredPosition, followStrength);
    }
    // Keep the intended orbit independent of the position shortened by a nearby tree.
    this.camera.position.copy(this.orbitPosition);
    this.clearTerrain(this.camera.position);
    this.clearObstacles(this.camera.position);
    const safeDistance = this.camera.position.distanceTo(this.lookAtPosition);
    this.visibleDistance = this.visibleDistance === null || safeDistance < this.visibleDistance
      ? safeDistance
      : THREE.MathUtils.lerp(this.visibleDistance, safeDistance, 1 - Math.exp(-8 * Math.max(deltaSeconds, 0)));
    this.camera.position.sub(this.lookAtPosition).setLength(this.visibleDistance).add(this.lookAtPosition);
    this.camera.lookAt(this.lookAtPosition);
  }

  private clearObstacles(position: THREE.Vector3): void {
    this.sightRay.origin.copy(this.lookAtPosition);
    this.sightRay.direction.copy(position).sub(this.lookAtPosition).normalize();
    let distance = position.distanceTo(this.lookAtPosition);
    for (const obstacle of this.obstacles) {
      this.obstacleSphere.center.set(obstacle.x, obstacle.y, obstacle.z);
      this.obstacleSphere.radius = obstacle.radius + 0.2;
      // Inside a crown, preserve a usable head-and-shoulders view.
      if (this.obstacleSphere.containsPoint(this.lookAtPosition)) continue;
      if (!this.sightRay.intersectSphere(this.obstacleSphere, this.intersection)) continue;
      distance = Math.min(distance, Math.max(0.85, this.intersection.distanceTo(this.lookAtPosition) - 0.25));
    }
    position.copy(this.lookAtPosition).addScaledVector(this.sightRay.direction, distance);
  }

  /** Raise the orbit enough to keep its sight line above the hill behind the player. */
  private clearTerrain(position: THREE.Vector3): void {
    if (!this.groundHeight) return;
    for (let step = 1; step <= 16; step += 1) {
      const t = step / 16;
      const x = THREE.MathUtils.lerp(this.lookAtPosition.x, position.x, t);
      const z = THREE.MathUtils.lerp(this.lookAtPosition.z, position.z, t);
      const minimum = this.groundHeight(x, z) + 0.65;
      position.y = Math.max(position.y, this.lookAtPosition.y + (minimum - this.lookAtPosition.y) / t);
    }
  }

  public dispose(): void {
    this.disconnect();
  }

  private readonly handlePointerDown = (event: PointerEvent): void => {
    if (!this.enabled || (event.button !== 0 && event.button !== 2) || !this.inputElement || this.pointerId !== null) return;
    this.pointerId = event.pointerId;
    this.previousPointerX = event.clientX;
    this.previousPointerY = event.clientY;
    this.pointerStartX = event.clientX;
    this.pointerStartY = event.clientY;
    this.dragging = false;
    this.inputElement.setPointerCapture(event.pointerId);
  };

  private readonly handlePointerMove = (event: PointerEvent): void => {
    if (event.pointerId !== this.pointerId) return;
    if (!this.dragging) {
      const dx = event.clientX - this.pointerStartX, dy = event.clientY - this.pointerStartY;
      if (dx * dx + dy * dy <= POINTER_DRAG_THRESHOLD_SQ) return;
      this.dragging = true;
      this.inputElement?.classList.add("is-dragging");
    }
    this.rotate(event.clientX - this.previousPointerX, event.clientY - this.previousPointerY);
    this.previousPointerX = event.clientX;
    this.previousPointerY = event.clientY;
  };

  private readonly handlePointerUp = (event: PointerEvent): void => {
    if (event.pointerId === this.pointerId) this.cancelDrag();
  };

  private readonly cancelDrag = (): void => {
    const pointerId = this.pointerId;
    this.pointerId = null;
    this.dragging = false;
    if (pointerId !== null && this.inputElement?.hasPointerCapture(pointerId)) this.inputElement.releasePointerCapture(pointerId);
    this.inputElement?.classList.remove("is-dragging");
  };
  private readonly handleVisibilityChange = (): void => { if (document.hidden) this.cancelDrag(); };
  private readonly handleContextMenu = (event: MouseEvent): void => { event.preventDefault(); };

  private readonly handleWheel = (event: WheelEvent): void => {
    if (!this.enabled || event.ctrlKey || event.metaKey || event.altKey) return;
    event.preventDefault();
    this.zoom(event.deltaY * 0.008);
  };
}
