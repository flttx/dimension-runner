import * as THREE from "three";

import { modelCatalog, pickModelUrl } from "@/lib/modelCatalog";
import type { ModelLibrary } from "@/lib/modelLoader";
import type { Theme, Biome } from "@/types";

const sidePositions = [-8, 8];
const sceneryShowDistance = 140;
const sceneryHideDistance = 170;

const sceneryTint = {
  xianxia: new THREE.Color("#203247"),
  minecraft: new THREE.Color("#223a26"),
};

interface SceneryInstance {
  group: THREE.Group;
  model: THREE.Object3D;
  active: boolean;
  timer: number;
}

const centerOnGround = (object: THREE.Object3D, yOffset = 0) => {
  const box = new THREE.Box3().setFromObject(object);
  const center = new THREE.Vector3();
  box.getCenter(center);
  object.position.x -= center.x;
  object.position.z -= center.z;
  object.position.y -= box.min.y;
  object.position.y += yOffset;
};

const scaleToHeight = (
  object: THREE.Object3D,
  targetHeight: number,
  maxFootprint = 18
) => {
  const box = new THREE.Box3().setFromObject(object);
  const size = new THREE.Vector3();
  box.getSize(size);
  if (size.y <= 0) {
    return;
  }
  const heightScale = targetHeight / size.y;
  const maxDim = Math.max(size.x, size.z);
  const footprintScale = maxDim > 0 ? maxFootprint / maxDim : heightScale;
  const scale = Math.min(heightScale, footprintScale);
  object.scale.multiplyScalar(scale);
};

export class SceneryManager {
  private readonly scene: THREE.Scene;
  private readonly pool: SceneryInstance[] = [];
  private readonly models: ModelLibrary;
  private theme: Theme;

  constructor(scene: THREE.Scene, theme: Theme, models: ModelLibrary) {
    this.scene = scene;
    this.theme = theme;
    this.models = models;
  }

  setTheme(theme: Theme) {
    this.theme = theme;
    this.reset();
  }

  reset() {
    this.pool.forEach((item) => {
      item.active = false;
      item.group.visible = false;
    });
  }

  spawn(z: number, biome: Biome = 'city') {
    const item = this.getOrCreate(biome);
    const side = Math.random() < 0.5 ? 0 : 1;
    const jitter = (Math.random() - 0.5) * 1.5;
    item.active = true;
    item.group.visible = true;

    // Ocean: Farther out
    const xOffset = biome === 'ocean' ? (side === 0 ? -20 : 20) : sidePositions[side];

    item.group.position.set(xOffset + jitter, 0, z);
    item.timer = 0;
  }

  update(delta: number, speed: number, camera: THREE.Camera) {
    const travel = speed * delta * 0.85;
    this.pool.forEach((item) => {
      if (!item.active) {
        return;
      }
      item.timer += delta;
      item.group.position.z -= travel;
      if (item.group.position.z < -30) {
        item.active = false;
        item.group.visible = false;
        return;
      }
      const distance = item.group.position.distanceTo(camera.position);
      if (item.group.visible && distance > sceneryHideDistance) {
        item.group.visible = false;
        return;
      }
      if (!item.group.visible && distance < sceneryShowDistance) {
        item.group.visible = true;
      }
      if (item.group.visible && item.model instanceof THREE.LOD) {
        item.group.updateMatrixWorld();
        item.model.update(camera);
      }
    });
  }

  private getOrCreate(biome: Biome) {
    // Basic pooling: Just grabbing inactive ones. 
    // Ideally pool should be keyed by biome, but for now we clear and recreate model if needed.
    // Optimization: Check if model matches biome? Too complex for this step.
    const available = this.pool.find((item) => !item.active);
    if (available) {
      available.group.clear();
      available.model = this.createModel(biome);
      available.group.add(available.model);
      return available;
    }
    const group = new THREE.Group();
    const model = this.createModel(biome);
    group.add(model);
    const item: SceneryInstance = {
      group,
      model,
      active: false,
      timer: 0,
    };
    this.pool.push(item);
    this.scene.add(group);
    return item;
  }

  private createModel(biome: Biome) {
    if (biome === 'forest') {
      const group = new THREE.Group();
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5, 0.8, 4, 6),
        new THREE.MeshStandardMaterial({ color: 0x3e2723 })
      );
      trunk.position.y = 2;
      const leaves = new THREE.Mesh(
        new THREE.ConeGeometry(3, 7, 7),
        new THREE.MeshStandardMaterial({ color: 0x1b5e20 })
      );
      leaves.position.y = 5.5;
      group.add(trunk, leaves);
      const s = 1.2 + Math.random();
      group.scale.set(s, s, s);
      return group;
    }

    if (biome === 'ocean') {
      const group = new THREE.Group();
      if (Math.random() > 0.3) return group; // Some empty slots
      const island = new THREE.Mesh(
        new THREE.ConeGeometry(5, 4, 5),
        new THREE.MeshStandardMaterial({ color: 0x444444, flatShading: true })
      );
      island.position.y = -1;
      group.add(island);
      const s = 1 + Math.random() * 2;
      group.scale.set(s, s, s);
      return group;
    }

    const url = pickModelUrl(modelCatalog.scenery[this.theme]);
    const model = this.models.clone(url);
    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    box.getSize(size);
    const targetHeight =
      size.y > 14 ? 12 : size.y > 9 ? 10 : size.y > 5 ? 7 : 4.5;
    scaleToHeight(model, targetHeight);
    centerOnGround(model);
    const scaledBox = new THREE.Box3().setFromObject(model);
    const scaledSize = new THREE.Vector3();
    scaledBox.getSize(scaledSize);

    // 远处使用半透明雾团替代方块，避免占位立方体的突兀感。
    const fogColor = sceneryTint[this.theme].clone();
    const hazeRadius = Math.max(0.8, Math.max(scaledSize.x, scaledSize.y, scaledSize.z) * 0.55);
    const lowDetail = new THREE.Mesh(
      new THREE.SphereGeometry(hazeRadius, 20, 16),
      new THREE.MeshBasicMaterial({
        color: fogColor,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
        fog: true,
      })
    );
    lowDetail.position.y = scaledSize.y * 0.5;
    lowDetail.castShadow = false;
    lowDetail.receiveShadow = false;

    const lod = new THREE.LOD();
    lod.addLevel(model, 0);
    lod.addLevel(lowDetail, 36);
    lod.updateMatrix();
    lod.rotation.y = Math.random() * Math.PI * 2;
    return lod;
  }
}
