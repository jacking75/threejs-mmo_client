import * as THREE from "three";

export const BOW_EFFECT_IDS: Readonly<Record<string, string>> = {
  "weapon.scout-bow": "바람 가르기",
  "weapon.moon-recurve": "월광 초승달",
  "weapon.antler-bow": "숲의 가지 화살",
  "weapon.sunwing-bow": "태양 불새",
  "weapon.frost-bow": "서릿발 관통",
  "weapon.clockwork-bow": "태엽 삼중 볼트",
  "weapon.serpent-bow": "쌍뱀 독무",
  "weapon.storm-bow": "뇌전 화살",
  "weapon.rose-bow": "장미 가시 폭풍",
  "weapon.raven-bow": "밤까마귀 비상",
};

type Theme = "wind" | "moon" | "forest" | "sun" | "frost" | "gear" | "venom" | "storm" | "rose" | "raven";
type Shape = "orb" | "shard" | "leaf" | "feather" | "gear" | "crescent" | "spark";
const THEMES: Readonly<Record<string, readonly [Theme, number, number, Shape]>> = {
  "weapon.scout-bow": ["wind", 0xc6f8eb, 0xffffff, "spark"],
  "weapon.moon-recurve": ["moon", 0xa5aaff, 0xe7eaff, "crescent"],
  "weapon.antler-bow": ["forest", 0x4eea83, 0xd6ff8d, "leaf"],
  "weapon.sunwing-bow": ["sun", 0xff9c25, 0xfff1a2, "feather"],
  "weapon.frost-bow": ["frost", 0x55ceff, 0xe3ffff, "shard"],
  "weapon.clockwork-bow": ["gear", 0xffb94b, 0xfff1b4, "gear"],
  "weapon.serpent-bow": ["venom", 0x9aec32, 0xe0ff57, "orb"],
  "weapon.storm-bow": ["storm", 0x66aaff, 0xf5faff, "spark"],
  "weapon.rose-bow": ["rose", 0xff427f, 0xffb6d6, "leaf"],
  "weapon.raven-bow": ["raven", 0xa477ff, 0xe1c5ff, "feather"],
};

/** Original pooled bow VFX. Local +Z is flight, +Y is up; all lengths use avatar units. */
export class BowEffects {
  public readonly group = new THREE.Group();
  private readonly charge = new THREE.Group();
  private readonly flight = new THREE.Group();
  private readonly burst = new THREE.Group();
  private readonly halo = new THREE.Group();
  private readonly impactAccent = new THREE.Group();
  private readonly projectiles: THREE.Group[] = [];
  private readonly trails: THREE.Mesh[] = [];
  private readonly motes: THREE.Mesh[] = [];
  private readonly chargeMotes: THREE.Mesh[] = [];
  private readonly rings: THREE.Mesh[] = [];
  private readonly geometries = new Map<Shape, THREE.BufferGeometry>();
  private readonly materials: THREE.MeshBasicMaterial[] = [];
  private readonly chargeMaterial: THREE.MeshBasicMaterial;
  private readonly flightMaterial: THREE.MeshBasicMaterial;
  private readonly coreMaterial: THREE.MeshBasicMaterial;
  private readonly burstMaterial: THREE.MeshBasicMaterial;
  private readonly theme: Theme;
  private disposed = false;

  public constructor(itemId: string) {
    const [theme, color, core, shape] = THEMES[itemId] ?? THEMES["weapon.scout-bow"];
    this.theme = theme;
    this.group.name = `bow-effect.${theme}`;
    this.group.userData.effectId = BOW_EFFECT_IDS[itemId] ?? BOW_EFFECT_IDS["weapon.scout-bow"];
    this.group.userData.projectileCount = theme === "gear" ? 3 : theme === "forest" ? 3 : theme === "venom" ? 2 : 1;
    this.chargeMaterial = this.material(color, true);
    this.flightMaterial = this.material(color, false);
    this.coreMaterial = this.material(core, true);
    this.burstMaterial = this.material(color, false);
    this.charge.name = "bow.charge";
    this.flight.name = "bow.flight";
    this.burst.name = "bow.burst";
    this.group.add(this.charge, this.flight, this.burst);
    this.burst.add(this.impactAccent);
    if (theme === "rose") {
      this.impactAccent.name = "bow.impact.rose-blossom";
      for (let i = 0; i < 10; i += 1) {
        const petal = this.mesh("leaf", this.burstMaterial);
        const angle = i * Math.PI * 0.2;
        petal.position.set(Math.sin(angle) * 0.55, Math.cos(angle) * 0.55, i % 2 * 0.1);
        petal.rotation.z = -angle;
        petal.scale.set(0.75, 1.2, 1);
        this.impactAccent.add(petal);
      }
    }
    this.charge.add(this.halo);
    for (let i = 0; i < 2; i += 1) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.55 + i * 0.22, 0.018, 5, 36), this.chargeMaterial);
      ring.rotation.y = i * Math.PI / 2;
      this.halo.add(ring);
    }
    for (let i = 0; i < 12; i += 1) {
      const mote = this.mesh(shape, this.chargeMaterial);
      mote.name = `bow.charge.${shape}.${i}`;
      this.chargeMotes.push(mote);
      this.charge.add(mote);
    }
    const count = Number(this.group.userData.projectileCount);
    for (let i = 0; i < count; i += 1) {
      const projectile = this.createProjectile(theme);
      projectile.name = `bow.projectile.${theme}.${i}`;
      this.projectiles.push(projectile);
      this.flight.add(projectile);
    }
    for (let i = 0; i < 32; i += 1) {
      const trail = this.mesh(shape, this.flightMaterial);
      trail.name = `bow.trail.${shape}.${i}`;
      this.trails.push(trail);
      this.flight.add(trail);
    }
    for (let i = 0; i < 28; i += 1) {
      const mote = this.mesh(shape, this.burstMaterial);
      mote.name = `bow.impact.${shape}.${i}`;
      this.motes.push(mote);
      this.burst.add(mote);
    }
    for (let i = 0; i < 3; i += 1) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.7 + 0.25 * i, theme === "wind" ? 0.012 : 0.035, 5, 40), this.burstMaterial);
      ring.name = `bow.impact.ring.${i}`;
      this.rings.push(ring);
      this.burst.add(ring);
    }
    this.update(-1, new THREE.Vector3());
  }

  public update(progress: number, muzzle: THREE.Vector3): void {
    const p = progress;
    this.group.visible = !this.disposed && p >= 0.08 && p < 1.3;
    if (!this.group.visible) return;
    const charge = clamp((p - 0.08) / 0.54);
    const flight = clamp((p - 0.62) / 0.28);
    const impact = clamp((p - 0.9) / 0.4);
    this.charge.visible = p < 0.7;
    this.flight.visible = p >= 0.62 && p < 0.97;
    this.burst.visible = p >= 0.9;
    this.charge.position.copy(muzzle);
    this.flight.position.copy(muzzle);
    this.burst.position.copy(muzzle);
    this.burst.position.z += 13;
    this.chargeMaterial.opacity = 0.28 + charge * 0.55;
    this.flightMaterial.opacity = 1 - clamp((p - 0.9) / 0.07);
    this.coreMaterial.opacity = this.flightMaterial.opacity;
    this.burstMaterial.opacity = (1 - impact) * 0.9;
    this.impactAccent.scale.setScalar(0.3 + impact * 2.1);
    this.impactAccent.rotation.z = impact * 0.8;
    this.halo.rotation.z = p * (this.theme === "gear" ? -15 : 5);
    this.halo.scale.setScalar(0.3 + charge * 0.8);
    for (let i = 0; i < this.chargeMotes.length; i += 1) {
      const mote = this.chargeMotes[i];
      const angle = i / this.chargeMotes.length * Math.PI * 2 + p * 6;
      const radius = (1 - charge * 0.5) * (0.45 + (i % 3) * 0.12);
      mote.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, -0.3 - charge * 0.3);
      mote.rotation.set(p * 8, angle, angle);
      mote.scale.setScalar((0.18 + charge * 0.12) * (this.theme === "wind" ? 0.7 : 1));
    }
    for (let i = 0; i < this.projectiles.length; i += 1) {
      const projectile = this.projectiles[i];
      const lane = i - (this.projectiles.length - 1) / 2;
      const spread = Math.sin(flight * Math.PI) * lane;
      projectile.position.set(this.theme === "venom" ? Math.sin(flight * 20 + i * Math.PI) * 0.48 : spread * 0.6, this.theme === "venom" ? Math.cos(flight * 20 + i * Math.PI) * 0.38 : Math.sin(flight * Math.PI) * lane * 0.12, flight * 13);
      projectile.rotation.z = this.theme === "gear" ? flight * 15 : this.theme === "moon" ? flight * 8 : 0;
      projectile.scale.setScalar(0.9 + Math.sin(flight * Math.PI) * 0.25);
    }
    for (let i = 0; i < this.trails.length; i += 1) {
      const trail = this.trails[i];
      const age = i / this.trails.length;
      const t = Math.max(0, flight - age * 0.36);
      const radius = (this.theme === "venom" || this.theme === "raven" ? 0.55 : this.theme === "sun" ? 0.75 : 0.25) * age;
      const angle = i * 2.4 + p * 16;
      const zigzag = this.theme === "storm" ? (i % 2 ? 0.4 : -0.4) : 0;
      trail.visible = t > 0 && p < 0.97;
      trail.position.set(Math.sin(angle) * radius + zigzag, Math.cos(angle) * radius, t * 13);
      trail.rotation.set(age * 8 + p * 9, angle, angle);
      const scale = (1 - age) * (this.theme === "storm" ? 0.55 : 0.38) + 0.08;
      trail.scale.set(scale, this.theme === "storm" ? scale * 2 : scale, this.theme === "wind" ? scale * 4 : scale);
    }
    for (let i = 0; i < this.motes.length; i += 1) {
      const mote = this.motes[i];
      const angle = i * 2.39996;
      const radius = Math.sqrt((i + 1) / this.motes.length) * impact * (this.theme === "sun" ? 3.5 : 2.6);
      mote.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius * 0.8 - impact * impact * (this.theme === "wind" ? 1.8 : 0.6), Math.sin(i * 4) * impact * 1.2);
      mote.rotation.set(i + impact * 8, angle, angle + impact * 4);
      const size = (this.theme === "frost" ? 0.5 : this.theme === "gear" ? 0.4 : 0.32) * (1 - impact * 0.65);
      mote.scale.set(size, this.theme === "frost" ? size * 2.3 : size, size);
    }
    for (let i = 0; i < this.rings.length; i += 1) {
      const ring = this.rings[i];
      ring.scale.setScalar(0.35 + impact * (2.5 + i * 0.4));
      ring.rotation.set(this.theme === "venom" || this.theme === "raven" ? i * 0.7 : i * 0.14, i * 0.4, impact * (i + 1));
    }
  }

  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.group.visible = false;
    this.group.removeFromParent();
    const geometries = new Set<THREE.BufferGeometry>();
    this.group.traverse(node => { if (node instanceof THREE.Mesh) geometries.add(node.geometry); });
    geometries.forEach(geometry => geometry.dispose());
    this.materials.forEach(material => material.dispose());
  }

  private material(color: number, glow: boolean): THREE.MeshBasicMaterial {
    const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, blending: glow ? THREE.AdditiveBlending : THREE.NormalBlending });
    this.materials.push(material);
    return material;
  }

  private mesh(shape: Shape, material: THREE.MeshBasicMaterial): THREE.Mesh {
    let geometry = this.geometries.get(shape);
    if (!geometry) {
      switch (shape) {
        case "orb": geometry = new THREE.IcosahedronGeometry(0.45, 1); break;
        case "shard": geometry = new THREE.OctahedronGeometry(0.6, 0); break;
        case "leaf": {
          const leaf = new THREE.Shape();
          leaf.moveTo(0, -0.7); leaf.quadraticCurveTo(0.7, 0, 0, 0.7); leaf.quadraticCurveTo(-0.7, 0, 0, -0.7);
          geometry = new THREE.ShapeGeometry(leaf, 8); break;
        }
        case "feather": {
          const feather = new THREE.Shape();
          feather.moveTo(-0.12, -0.8); feather.lineTo(0.4, 0.1); feather.lineTo(0.1, 0.9); feather.lineTo(-0.35, 0.05); feather.closePath();
          geometry = new THREE.ShapeGeometry(feather); break;
        }
        case "crescent": geometry = new THREE.TorusGeometry(0.52, 0.1, 5, 18, Math.PI * 1.35); break;
        case "gear": geometry = new THREE.TorusGeometry(0.42, 0.16, 3, 10); break;
        case "spark": geometry = new THREE.ConeGeometry(0.12, 0.95, 3); break;
      }
      this.geometries.set(shape, geometry);
    }
    const mesh = new THREE.Mesh(geometry, material);
    mesh.renderOrder = 2;
    return mesh;
  }

  private createProjectile(theme: Theme): THREE.Group {
    const root = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.5, 6), this.coreMaterial);
    shaft.rotation.x = Math.PI / 2;
    root.add(shaft);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(theme === "frost" ? 0.24 : 0.13, 0.55, theme === "gear" ? 4 : 5), this.coreMaterial);
    tip.rotation.x = Math.PI / 2;
    tip.position.z = 0.95;
    root.add(tip);
    if (theme === "moon") {
      const crescent = this.mesh("crescent", this.flightMaterial);
      crescent.scale.setScalar(1.3); crescent.rotation.z = -0.8; root.add(crescent);
    } else if (theme === "forest" || theme === "rose") {
      for (let i = 0; i < 5; i += 1) {
        const leaf = this.mesh("leaf", this.flightMaterial);
        leaf.rotation.z = i * Math.PI * 0.4; leaf.position.z = (i - 2) * 0.3; leaf.scale.setScalar(0.55); root.add(leaf);
      }
    } else if (theme === "sun" || theme === "raven") {
      for (const side of [-1, 1]) for (let i = 0; i < 5; i += 1) {
        const feather = this.mesh("feather", this.flightMaterial);
        feather.position.set(side * (0.25 + i * 0.18), 0, -i * 0.15);
        feather.rotation.set(Math.PI / 2, 0, side * (0.9 + i * 0.1)); feather.scale.set(0.6, 0.9, 0.6); root.add(feather);
      }
      if (theme === "raven") {
        for (let i = 0; i < 3; i += 1) {
          const vortex = this.mesh("crescent", this.flightMaterial);
          vortex.position.z = -0.3 - i * 0.5;
          vortex.rotation.z = i * 2.1;
          vortex.scale.setScalar(0.8 + i * 0.2);
          root.add(vortex);
        }
      }
    } else if (theme === "frost") {
      for (let i = 0; i < 6; i += 1) {
        const shard = this.mesh("shard", this.flightMaterial);
        const angle = i / 6 * Math.PI * 2;
        shard.position.set(Math.cos(angle) * 0.32, Math.sin(angle) * 0.32, -0.2); shard.scale.set(0.25, 0.25, 0.8); root.add(shard);
      }
    } else if (theme === "gear") {
      const gear = this.mesh("gear", this.flightMaterial); gear.position.z = -0.3; root.add(gear);
    } else if (theme === "venom") {
      const head = this.mesh("orb", this.flightMaterial); head.position.z = 0.75; head.scale.set(0.55, 0.55, 0.9); root.add(head);
    } else if (theme === "storm") {
      for (let i = 0; i < 5; i += 1) {
        const spark = this.mesh("spark", this.flightMaterial);
        spark.position.set(i % 2 ? 0.25 : -0.25, 0, (i - 2) * 0.35); spark.rotation.x = Math.PI / 2; spark.rotation.z = i % 2 ? 0.7 : -0.7; root.add(spark);
      }
    } else {
      for (let i = 0; i < 3; i += 1) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.25 + i * 0.1, 0.015, 4, 24), this.flightMaterial);
        ring.position.z = -0.3 - i * 0.25; root.add(ring);
      }
    }
    return root;
  }
}

function clamp(value: number): number { return THREE.MathUtils.clamp(value, 0, 1); }
