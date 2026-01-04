import * as THREE from "three";

import { modelCatalog, pickModelUrl } from "@/lib/modelCatalog";
import type { ModelLibrary } from "@/lib/modelLoader";
import type { ObstacleType, Theme } from "@/types";

const lanePositions = [-2, 0, 2];
const boulderCapacity = 24;

const asArray = (ref: string | string[]) => (Array.isArray(ref) ? ref : [ref]);

type HeightProfile = "low" | "high" | "full";

interface ObstacleInstance {
  group: THREE.Group;
  model: THREE.Object3D;
  type: ObstacleType;
  lane: number;
  active: boolean;
  timer: number;
  hazardActive: boolean;
  height: HeightProfile;
  exploded: boolean;
  instanced?: boolean;
  variant?: number;
  warningRing?: THREE.Mesh;
  bolt?: THREE.Mesh;
  shockwave?: THREE.Mesh;
  landed?: boolean;
}

interface InstancedRender {
  group: THREE.Group;
  meshes: THREE.InstancedMesh[];
}

const obstacleHeight: Record<ObstacleType, HeightProfile> = {
  lightning: "full",
  sword_rain: "high",
  boulder: "low",
  beast: "low",
  whirlwind: "full",
  falling_seal: "full",
  spirit_laser: "full",
  ice_spikes: "low",
  soul_bell: "low",
  bagua: "low",
  ghost_fire: "low",
  golden_lotus: "low",
  iron_chains: "full",
  stone_stele: "low",
  sword_array: "low",
  furnace: "low",
  talisman: "low",
  yin_yang: "low",
  creeper: "low",
  tnt: "low",
  lava: "low",
  mc_anvil: "full",
  mc_cactus: "low",
  mc_magma: "low",
  mc_arrow: "low",
};

const warningMaterial = new THREE.MeshBasicMaterial({
  color: "#ff3b3b",
  transparent: true,
  opacity: 0.8,
  side: THREE.DoubleSide,
});

const shockwaveMaterial = new THREE.MeshBasicMaterial({
  color: "#ffd43b",
  transparent: true,
  opacity: 0.7,
  side: THREE.DoubleSide,
});

const applyEmissive = (object: THREE.Object3D, emissive: string) => {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      const materials = Array.isArray(child.material)
        ? child.material
        : [child.material];
      materials.forEach((material) => {
        const target = material as THREE.MeshStandardMaterial & {
          emissive?: THREE.Color;
          emissiveIntensity?: number;
        };
        if (target.emissive) {
          target.emissive.set(emissive);
          if ("emissiveIntensity" in target) {
            target.emissiveIntensity = 0.6;
          }
          material.needsUpdate = true;
        }
      });
    }
  });
};

const centerOnGround = (object: THREE.Object3D, yOffset = 0) => {
  const box = new THREE.Box3().setFromObject(object);
  const center = new THREE.Vector3();
  box.getCenter(center);
  object.position.x -= center.x;
  object.position.z -= center.z;
  object.position.y -= box.min.y;
  object.position.y += yOffset;
};

const scaleToMax = (object: THREE.Object3D, targetSize: number) => {
  const box = new THREE.Box3().setFromObject(object);
  const size = new THREE.Vector3();
  box.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z);
  if (maxDim <= 0) {
    return;
  }
  const scale = targetSize / maxDim;
  object.scale.multiplyScalar(scale);
};

const orientDownward = (object: THREE.Object3D) => {
  const box = new THREE.Box3().setFromObject(object);
  const size = new THREE.Vector3();
  box.getSize(size);
  const axis = new THREE.Vector3(1, 0, 0);
  if (size.y >= size.x && size.y >= size.z) {
    axis.set(0, 1, 0);
  } else if (size.z >= size.x && size.z >= size.y) {
    axis.set(0, 0, 1);
  }
  const target = new THREE.Vector3(0, -1, 0);
  const quat = new THREE.Quaternion().setFromUnitVectors(axis, target);
  object.quaternion.copy(quat);
};

const createWarningRing = () => {
  const ringGeo = new THREE.RingGeometry(0.35, 0.55, 28);
  const ring = new THREE.Mesh(ringGeo, warningMaterial.clone());
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.05;
  return ring;
};

const createShockwave = () => {
  const geo = new THREE.RingGeometry(0.2, 0.35, 28);
  const ring = new THREE.Mesh(geo, shockwaveMaterial.clone());
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.05;
  return ring;
};

const createBolt = () => {
  const geo = new THREE.CylinderGeometry(0.08, 0.12, 2.6, 8);
  const material = new THREE.MeshBasicMaterial({
    color: "#ffe066",
    transparent: true,
    opacity: 0.9,
  });
  const bolt = new THREE.Mesh(geo, material);
  bolt.position.y = 1.3;
  return bolt;
};

export class ObstacleManager {
  private readonly scene: THREE.Scene;
  private readonly pool: ObstacleInstance[] = [];
  private readonly models: ModelLibrary;
  private readonly onExplosion?: () => void;
  private theme: Theme;
  private boulderRenders: InstancedRender[] | null = null;
  private readonly boulderTemp = new THREE.Object3D();
  private readonly boulderBuckets: ObstacleInstance[][] = [];

  constructor(
    scene: THREE.Scene,
    theme: Theme,
    models: ModelLibrary,
    onExplosion?: () => void
  ) {
    this.scene = scene;
    this.theme = theme;
    this.models = models;
    this.onExplosion = onExplosion;
  }

  setTheme(theme: Theme) {
    this.theme = theme;
    this.reset();
    this.disposeBoulderRenders();
  }

  reset() {
    this.pool.forEach((obstacle) => {
      obstacle.active = false;
      obstacle.group.visible = false;
    });
    if (this.boulderRenders) {
      this.boulderRenders.forEach((render) => {
        render.meshes.forEach((mesh) => {
          mesh.count = 0;
          mesh.instanceMatrix.needsUpdate = true;
        });
      });
    }
  }

  spawn(type: ObstacleType, lane: number, z: number) {
    const obstacle = this.getOrCreate(type);
    obstacle.type = type;
    obstacle.lane = lane;
    obstacle.timer = 0;
    obstacle.exploded = false;
    obstacle.hazardActive = type !== "lightning";
    obstacle.height = obstacleHeight[type];
    obstacle.group.visible = true;
    obstacle.active = true;
    obstacle.group.position.set(lanePositions[lane], 0, z);

    if (type === "lightning" && obstacle.warningRing && obstacle.bolt) {
      obstacle.warningRing.visible = true;
      obstacle.warningRing.scale.set(1, 1, 1);
      obstacle.bolt.visible = false;
    }

    if ((type === "creeper" || type === "tnt") && obstacle.shockwave) {
      obstacle.shockwave.visible = false;
      obstacle.shockwave.scale.set(0.2, 0.2, 0.2);
    }
  }

  update(delta: number, speed: number) {
    const travel = speed * delta;
    if (this.boulderRenders) {
      this.boulderBuckets.forEach((bucket) => {
        bucket.length = 0;
      });
    }
    this.pool.forEach((obstacle) => {
      if (!obstacle.active) return;

      obstacle.group.position.z -= travel;
      obstacle.timer += delta;

      switch (obstacle.type) {
        case "lightning":
          this.updateLightning(obstacle);
          break;
        case "sword_rain":
          this.updateSwordRain(obstacle);
          break;
        case "boulder":
          if (obstacle.instanced) {
            obstacle.group.rotation.x += delta * 2.4;
            if (this.boulderRenders && obstacle.variant !== undefined) {
              this.boulderBuckets[obstacle.variant]?.push(obstacle);
            }
          } else {
            obstacle.model.rotation.x += delta * 2.4;
          }
          break;
        case "creeper":
        case "tnt":
          this.updateBomb(obstacle);
          break;
        case "lava":
          this.updateLava(obstacle);
          break;
        case "beast":
          obstacle.group.position.z += delta * 12;
          obstacle.model.position.y = Math.sin(obstacle.timer * 15) * 0.3;
          break;
        case "whirlwind":
          obstacle.group.position.x = lanePositions[obstacle.lane] + Math.sin(obstacle.timer * 2) * 2.5;
          obstacle.model.rotation.y -= delta * 15;
          obstacle.model.scale.setScalar(1 + Math.sin(obstacle.timer * 10) * 0.2);
          break;
        case "falling_seal":
        case "mc_anvil":
          this.updateFallingSeal(obstacle);
          break;
        case "spirit_laser":
          this.updateSpiritLaser(obstacle);
          break;
        case "ice_spikes":
          this.updateIceSpikes(obstacle);
          break;
        case "bagua":
        case "sword_array":
        case "yin_yang":
          obstacle.model.rotation.y += delta * 2;
          break;
        case "ghost_fire":
          obstacle.model.position.y = 1 + Math.sin(obstacle.timer * 3) * 0.3;
          break;
        case "soul_bell":
          obstacle.model.rotation.z = Math.sin(obstacle.timer * 4) * 0.4;
          break;
        case "furnace":
          obstacle.model.scale.setScalar(1 + Math.sin(obstacle.timer * 2) * 0.1);
          break;
        case "mc_arrow":
          obstacle.group.position.z += delta * 25;
          break;
        default:
          break;
      }

      if (obstacle.group.position.z < -20 || obstacle.group.position.z > 140) {
        obstacle.active = false;
        obstacle.group.visible = false;
      }
    });

    if (this.boulderRenders) {
      this.updateBoulderInstances();
    }
  }

  public getActive() {
    return this.pool.filter((obstacle) => obstacle.active);
  }

  public clearAhead(range: number) {
    this.pool.forEach((obstacle) => {
      if (!obstacle.active) return;
      if (obstacle.group.position.z > 0 && obstacle.group.position.z < range) {
        obstacle.active = false;
        obstacle.group.visible = false;
      }
    });
  }

  private updateLightning(obstacle: ObstacleInstance) {
    const warnDuration = 0.7;
    const strikeDuration = 0.25;
    if (!obstacle.warningRing || !obstacle.bolt) return;

    if (obstacle.timer < warnDuration) {
      const pulse = 1 + Math.sin(obstacle.timer * 10) * 0.15;
      obstacle.warningRing.visible = true;
      obstacle.warningRing.scale.set(pulse, pulse, pulse);
      obstacle.bolt.visible = false;
      obstacle.hazardActive = false;
    } else if (obstacle.timer < warnDuration + strikeDuration) {
      obstacle.warningRing.visible = false;
      obstacle.bolt.visible = true;
      obstacle.hazardActive = true;
    } else {
      obstacle.active = false;
      obstacle.group.visible = false;
      obstacle.hazardActive = false;
    }
  }

  private updateSwordRain(obstacle: ObstacleInstance) {
    const cycle = 1.1;
    const phase = (obstacle.timer % cycle) / cycle;
    const fallY = 2.8 - phase * 2.6;
    obstacle.hazardActive = phase > 0.65;
    if (obstacle.model.children) {
      obstacle.model.children.forEach((child, index) => {
        child.position.y = fallY + index * 0.2;
        child.rotation.x += 0.05;
      });
    }
  }

  private updateBomb(obstacle: ObstacleInstance) {
    const explodeAt = 1.3;
    const blastDuration = 0.35;
    const blinkPhase = Math.max(0, obstacle.timer - 0.6);
    obstacle.hazardActive = obstacle.timer < explodeAt + blastDuration;

    obstacle.model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const material = child.material as THREE.MeshStandardMaterial;
        const intensity = blinkPhase > 0 ? 0.5 + Math.sin(blinkPhase * 18) * 0.5 : 0;
        if (material.emissiveIntensity !== undefined) {
          material.emissiveIntensity = intensity;
        }
      }
    });

    if (obstacle.timer >= explodeAt && obstacle.shockwave) {
      if (!obstacle.exploded) {
        obstacle.exploded = true;
        this.onExplosion?.();
      }
      const shockProgress = Math.min(1, (obstacle.timer - explodeAt) / blastDuration);
      obstacle.shockwave.visible = true;
      const scale = 0.4 + shockProgress * 2.2;
      obstacle.shockwave.scale.set(scale, scale, scale);
      const material = obstacle.shockwave.material as THREE.MeshBasicMaterial;
      material.opacity = 0.7 * (1 - shockProgress);
    }

    if (obstacle.timer >= explodeAt + blastDuration) {
      obstacle.active = false;
      obstacle.group.visible = false;
    }
  }

  private updateLava(obstacle: ObstacleInstance) {
    obstacle.hazardActive = true;
    obstacle.model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const material = child.material as THREE.MeshStandardMaterial;
        if (material.emissiveIntensity !== undefined) {
          material.emissiveIntensity = 0.4 + Math.sin(obstacle.timer * 4) * 0.2;
        }
      }
    });
  }

  private getOrCreate(type: ObstacleType) {
    const available = this.pool.find((obstacle) => !obstacle.active);
    const instancedReady =
      type === "boulder" ? this.ensureBoulderRenders() : null;
    if (available) {
      available.group.clear();
      available.group.rotation.set(0, 0, 0);
      available.group.scale.set(1, 1, 1);
      if (instancedReady) {
        this.prepareBoulderInstance(available, instancedReady.length);
      } else {
        available.model = this.createModel(type);
        available.instanced = false;
        available.variant = undefined;
        available.group.add(available.model);
      }
      this.setupEffects(available, type);
      return available;
    }
    const group = new THREE.Group();
    let model: THREE.Object3D = new THREE.Group();
    let instanced = false;
    let variant: number | undefined;
    if (instancedReady) {
      instanced = true;
      variant = Math.floor(Math.random() * instancedReady.length);
    } else {
      model = this.createModel(type);
      group.add(model);
    }
    const obstacle: ObstacleInstance = {
      group,
      model,
      type,
      lane: 1,
      active: false,
      timer: 0,
      hazardActive: false,
      height: obstacleHeight[type],
      exploded: false,
      instanced,
      variant,
    };
    if (instanced) {
      group.rotation.set(0, 0, 0);
    }
    this.setupEffects(obstacle, type);
    this.pool.push(obstacle);
    this.scene.add(group);
    return obstacle;
  }

  private updateFallingSeal(obstacle: ObstacleInstance) {
    const dropTime = 1.0;
    if (obstacle.timer < dropTime) {
      // Warning Phase: Shadow scales up
      const progress = obstacle.timer / dropTime;
      obstacle.model.position.y = 8 * (1 - progress * progress); // Accelerate down
      obstacle.hazardActive = false;
    } else {
      // Landed
      if (!obstacle.exploded) {
        obstacle.exploded = true;
        obstacle.hazardActive = true;
        this.onExplosion?.(); // Shake screen
        // Shockwave
        if (obstacle.shockwave) {
          obstacle.shockwave.visible = true;
          obstacle.shockwave.scale.setScalar(5);
          (obstacle.shockwave.material as THREE.MeshBasicMaterial).opacity = 0;
        }
      }
      obstacle.model.position.y = 0;
      obstacle.hazardActive = true; // Remains active as a wall
    }
  }

  private updateSpiritLaser(obstacle: ObstacleInstance) {
    const chargeTime = 1.2;
    const fireTime = 0.5;

    if (obstacle.timer < chargeTime) {
      // Charging: Thin line blinking
      obstacle.model.scale.set(0.1, 1, 0.1);
      obstacle.model.visible = Math.floor(obstacle.timer * 20) % 2 === 0;
      obstacle.hazardActive = false;
    } else if (obstacle.timer < chargeTime + fireTime) {
      // Firing: Massive beam
      obstacle.model.visible = true;
      obstacle.model.scale.set(2, 1, 2);
      obstacle.hazardActive = true;
      obstacle.model.rotation.y += 0.5; // Spin texture
    } else {
      obstacle.active = false;
      obstacle.group.visible = false;
    }
  }

  private updateIceSpikes(obstacle: ObstacleInstance) {
    const eruptTime = 0.8;
    if (obstacle.timer < eruptTime) {
      obstacle.hazardActive = false;
      // Rumble / Dust?
    } else {
      const progress = Math.min(1, (obstacle.timer - eruptTime) * 5);
      obstacle.model.scale.y = progress * 1.5;
      obstacle.hazardActive = true;
    }
  }

  private createModel(type: ObstacleType): THREE.Object3D {
    const themeModels = modelCatalog.obstacles[type];
    const url = themeModels ? pickModelUrl((themeModels as any)[this.theme]) : null;

    if (url) {
      const model = this.models.clone(url);
      if (type === "sword_rain") {
        const group = new THREE.Group();
        const first = model;
        const second = this.models.clone(url);
        const third = this.models.clone(url);
        [first, second, third].forEach((blade) => {
          orientDownward(blade);
          scaleToMax(blade, 1.4);
          centerOnGround(blade);
        });
        first.position.set(-0.25, 1.3, 0.15);
        second.position.set(0.25, 1.7, -0.1);
        third.position.set(0, 1.5, 0.25);
        group.add(first, second, third);
        return group;
      }
      if (type === "lightning") {
        scaleToMax(model, 3.2);
        centerOnGround(model);
        applyEmissive(model, "#7bdcff");
      }
      if (type === "boulder") {
        this.prepareBoulderModel(model);
      }
      if (type === "creeper" || type === "tnt") {
        scaleToMax(model, type === "creeper" ? 1.4 : 1.1);
        centerOnGround(model);
        applyEmissive(model, type === "creeper" ? "#3dbf6b" : "#ff6b6b");
      }
      if (type === "lava") {
        if (this.theme === "minecraft") {
          scaleToMax(model, 1.6);
        } else {
          scaleToMax(model, 2.4);
          model.scale.y *= 0.35;
        }
        centerOnGround(model);
        applyEmissive(model, "#ff6b3b");
      }
      return model;
    }

    const group = new THREE.Group();
    switch (type) {
      case "beast":
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 1.5), new THREE.MeshStandardMaterial({ color: 0x220000 }));
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.8), new THREE.MeshStandardMaterial({ color: 0x440000 }));
        head.position.set(0, 0.4, 0.8);
        group.add(body, head);
        break;
      case "whirlwind":
        for (let i = 0; i < 4; i++) {
          const geo = new THREE.ConeGeometry(0.6 - i * 0.1, 0.8, 16, 1, true);
          const mat = new THREE.MeshStandardMaterial({ color: 0xc2a47c, transparent: true, opacity: 0.5 });
          const mesh = new THREE.Mesh(geo, mat);
          mesh.position.y = i * 0.6 + 0.4;
          group.add(mesh);
        }
        break;
      case "falling_seal":
      case "mc_anvil":
        const seal = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), new THREE.MeshStandardMaterial({ color: type === "mc_anvil" ? 0x444444 : 0xffd700 }));
        group.add(seal);
        break;
      case "spirit_laser":
        const laserGeo = new THREE.CylinderGeometry(0.5, 0.5, 40, 16);
        laserGeo.rotateX(Math.PI / 2);
        const laser = new THREE.Mesh(laserGeo, new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.8 }));
        laser.position.y = 1.5;
        return laser;
      case "ice_spikes":
        for (let i = 0; i < 6; i++) {
          const spike = new THREE.Mesh(new THREE.ConeGeometry(0.3, 1.5, 8), new THREE.MeshStandardMaterial({ color: 0xaaddff }));
          spike.position.set((Math.random() - 0.5) * 2, 0, (Math.random() - 0.5) * 2);
          group.add(spike);
        }
        break;
      case "soul_bell":
        const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 1, 1.5, 8), new THREE.MeshStandardMaterial({ color: 0xcd7f32 }));
        group.add(bell);
        break;
      case "bagua":
        const plate = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.1, 8), new THREE.MeshBasicMaterial({ color: 0xffff00, opacity: 0.7, transparent: true }));
        group.add(plate);
        break;
      case "ghost_fire":
        const flame = new THREE.Mesh(new THREE.DodecahedronGeometry(0.5), new THREE.MeshBasicMaterial({ color: 0x00ff00 }));
        group.add(flame);
        break;
      case "golden_lotus":
        for (let i = 0; i < 8; i++) {
          const petal = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 8), new THREE.MeshStandardMaterial({ color: 0xffd700 }));
          petal.position.set(Math.cos(i * Math.PI / 4), 0, Math.sin(i * Math.PI / 4));
          group.add(petal);
        }
        break;
      default:
        const placeholder = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0xff00ff }));
        group.add(placeholder);
    }
    scaleToMax(group, 2.5);
    centerOnGround(group);
    return group;
  }

  private prepareBoulderModel(model: THREE.Object3D) {
    scaleToMax(model, 1.6);
    centerOnGround(model);
  }

  private prepareBoulderInstance(
    obstacle: ObstacleInstance,
    variantCount: number
  ) {
    obstacle.instanced = true;
    obstacle.variant =
      variantCount > 0 ? Math.floor(Math.random() * variantCount) : 0;
    obstacle.model = new THREE.Object3D();
    obstacle.group.clear();
  }

  private ensureBoulderRenders() {
    if (this.boulderRenders) {
      return this.boulderRenders;
    }
    const urls = asArray(modelCatalog.obstacles.boulder[this.theme]);
    const renders: InstancedRender[] = [];
    urls.forEach((url) => {
      const render = this.createBoulderRender(url);
      if (render) {
        renders.push(render);
      }
    });
    if (renders.length === 0) {
      return null;
    }
    this.boulderRenders = renders;
    this.boulderBuckets.length = 0;
    renders.forEach(() => this.boulderBuckets.push([]));
    return renders;
  }

  private createBoulderRender(url: string): InstancedRender | null {
    const model = this.models.clone(url);
    if (model.children.length === 0) {
      return null;
    }
    this.prepareBoulderModel(model);
    model.updateWorldMatrix(true, true);
    const meshes: THREE.InstancedMesh[] = [];
    model.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) {
        return;
      }
      const geometry = child.geometry.clone();
      geometry.applyMatrix4(child.matrixWorld);
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
      const material = Array.isArray(child.material)
        ? child.material[0]
        : child.material;
      const instanced = new THREE.InstancedMesh(
        geometry,
        material.clone(),
        boulderCapacity
      );
      instanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      instanced.count = 0;
      instanced.castShadow = true;
      instanced.receiveShadow = true;
      instanced.frustumCulled = true;
      meshes.push(instanced);
    });
    if (meshes.length === 0) {
      return null;
    }
    const group = new THREE.Group();
    meshes.forEach((mesh) => group.add(mesh));
    this.scene.add(group);
    return { group, meshes };
  }

  private updateBoulderInstances() {
    if (!this.boulderRenders) {
      return;
    }
    // 仅更新活跃滚石的实例矩阵，降低渲染开销。
    const temp = this.boulderTemp;
    this.boulderRenders.forEach((render, variantIndex) => {
      const bucket = this.boulderBuckets[variantIndex] ?? [];
      bucket.forEach((obstacle, index) => {
        temp.position.copy(obstacle.group.position);
        temp.rotation.copy(obstacle.group.rotation);
        temp.scale.set(1, 1, 1);
        temp.updateMatrix();
        render.meshes.forEach((mesh) => {
          mesh.setMatrixAt(index, temp.matrix);
        });
      });
      render.meshes.forEach((mesh) => {
        mesh.count = bucket.length;
        mesh.instanceMatrix.needsUpdate = true;
        mesh.computeBoundingSphere();
        mesh.computeBoundingBox();
      });
    });
  }

  private disposeBoulderRenders() {
    if (!this.boulderRenders) {
      return;
    }
    this.boulderRenders.forEach((render) => {
      render.meshes.forEach((mesh) => {
        mesh.geometry.dispose();
        const material = mesh.material;
        if (Array.isArray(material)) {
          material.forEach((mat) => mat.dispose());
        } else {
          material.dispose();
        }
      });
      this.scene.remove(render.group);
    });
    this.boulderRenders = null;
    this.boulderBuckets.length = 0;
  }

  private setupEffects(obstacle: ObstacleInstance, type: ObstacleType) {
    obstacle.warningRing = undefined;
    obstacle.bolt = undefined;
    obstacle.shockwave = undefined;
    if (type === "lightning") {
      obstacle.warningRing = createWarningRing();
      obstacle.bolt = createBolt();
      obstacle.group.add(obstacle.warningRing, obstacle.bolt);
    }
    if (type === "creeper" || type === "tnt" || type === "falling_seal" || type === "mc_anvil") {
      obstacle.shockwave = createShockwave();
      obstacle.group.add(obstacle.shockwave);
    }
  }
}
