import * as THREE from "three";
import type { CharacterProfile } from "../domain/character";
import { attachClassEquipmentPreview } from "../dev/attachClassEquipmentPreview";
import { AvatarRenderer } from "./AvatarRenderer";
import { createRenderer } from "./createRenderer";
import { EquipmentRenderer } from "./EquipmentRenderer";

export class CharacterPreview {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(30, 1, 0.1, 40);
  private readonly characterRoot = new THREE.Group();
  private readonly clock = new THREE.Clock();
  private avatarRenderer: AvatarRenderer | null = null;
  private equipmentRenderer: EquipmentRenderer | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private animationFrameId: number | null = null;
  private width = 0;
  private height = 0;
  private rotation = 0;
  private profile: CharacterProfile | null = null;

  public constructor(
    private readonly canvas: HTMLCanvasElement,
    profile: CharacterProfile,
    private readonly options: { readonly showClassEquipment?: boolean; readonly interactive?: boolean } = {},
  ) {
    this.renderer = createRenderer(canvas);
    this.renderer.setClearColor(0x07101b, 1);
    this.renderer.shadowMap.enabled = true;

    this.camera.position.set(0, 2.65, 9.4);
    this.camera.lookAt(0, 2.35, 0);

    const hemisphere = new THREE.HemisphereLight(0xb9dfff, 0x152018, 2.4);
    const key = new THREE.DirectionalLight(0xffe5b3, 4.2);
    key.position.set(4, 8, 6);
    key.castShadow = true;
    const rim = new THREE.DirectionalLight(0x5f8dff, 3.2);
    rim.position.set(-5, 4, -4);
    this.scene.add(hemisphere, key, rim, this.characterRoot);

    const platform = new THREE.Mesh(
      new THREE.CylinderGeometry(2.1, 2.45, 0.34, 48),
      new THREE.MeshStandardMaterial({ color: 0x17283b, metalness: 0.5, roughness: 0.52 }),
    );
    platform.name = "preview-platform";
    platform.position.y = -0.2;
    platform.receiveShadow = true;
    this.scene.add(platform);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.72, 0.025, 8, 64),
      new THREE.MeshBasicMaterial({ color: 0xcaa85c }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.01;
    this.scene.add(ring);

    this.updateProfile(profile);
    this.resizeObserver = new ResizeObserver(this.resize);
    this.resizeObserver.observe(canvas);
    window.addEventListener("resize", this.resize);
    this.resize();
    this.animationFrameId = requestAnimationFrame(this.renderFrame);
  }

  public updateProfile(profile: CharacterProfile): void {
    if (this.profile?.body === profile.body && this.profile.classId === profile.classId && this.equipmentRenderer) {
      this.profile = profile;
      this.equipmentRenderer.sync(profile);
      return;
    }
    this.profile = profile;
    this.equipmentRenderer?.dispose();
    this.avatarRenderer?.dispose();
    this.characterRoot.rotation.set(0, 0.12, 0);
    this.avatarRenderer = new AvatarRenderer(this.characterRoot, profile);
    if (this.options.showClassEquipment) {
      attachClassEquipmentPreview(this.avatarRenderer.avatar);
    } else {
      this.equipmentRenderer = new EquipmentRenderer(this.avatarRenderer.avatar);
      this.equipmentRenderer.sync(profile);
    }
  }

  public rotate(radians: number): void {
    this.rotation += radians;
  }

  public dispose(): void {
    if (this.animationFrameId !== null) cancelAnimationFrame(this.animationFrameId);
    this.animationFrameId = null;
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    window.removeEventListener("resize", this.resize);
    this.equipmentRenderer?.dispose();
    this.equipmentRenderer = null;
    this.avatarRenderer?.dispose();
    this.avatarRenderer = null;
    this.scene.traverse((child) => {
      if (!(child instanceof THREE.Mesh) || child.parent === this.characterRoot) return;
      child.geometry.dispose();
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((material) => material.dispose());
    });
    this.renderer.dispose();
  }

  private readonly renderFrame = (): void => {
    const deltaSeconds = Math.min(this.clock.getDelta(), 0.1);
    this.characterRoot.rotation.y = this.rotation + Math.sin(this.clock.elapsedTime * 0.35) * 0.12;
    this.avatarRenderer?.update(deltaSeconds, this.clock.elapsedTime, "idle");
    this.canvas.dataset.avatarStatus = this.avatarRenderer?.avatar.userData.assetStatus ?? "loading";
    this.canvas.dataset.avatarSource = this.avatarRenderer?.avatar.userData.assetSource ?? "unknown";
    this.renderer.render(this.scene, this.camera);
    this.animationFrameId = requestAnimationFrame(this.renderFrame);
  };

  private readonly resize = (): void => {
    const width = Math.max(this.canvas.clientWidth, 1);
    const height = Math.max(this.canvas.clientHeight, 1);
    if (width === this.width && height === this.height) return;
    this.width = width;
    this.height = height;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    if (this.options.interactive) {
      // Include tall antlers, hats and the back-mounted banner in the dressing frame.
      this.camera.position.z = Math.max(14.5, 9 / this.camera.aspect);
      this.camera.lookAt(0, 2.8, 0);
    }
    this.camera.updateProjectionMatrix();
  };
}
