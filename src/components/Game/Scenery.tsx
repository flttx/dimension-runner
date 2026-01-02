import * as THREE from "three";

import { modelCatalog, pickModelUrl } from "@/lib/modelCatalog";
import type { ModelLibrary } from "@/lib/modelLoader";
import type { Theme } from "@/types";

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

  spawn(z: number) {
    const item = this.getOrCreate();
    const side = Math.random() < 0.5 ? 0 : 1;
    const jitter = (Math.random() - 0.5) * 1.5;
    item.active = true;
    item.group.visible = true;
    item.group.position.set(sidePositions[side] + jitter, 0, z);
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

  private getOrCreate() {
    const available = this.pool.find((item) => !item.active);
    if (available) {
      available.group.clear();
      available.model = this.createModel();
      available.group.add(available.model);
      return available;
    }
    const group = new THREE.Group();
    const model = this.createModel();
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

  private createModel() {
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

    // 使用 LOD 在远距离切换为低多边形代理。
    const lowDetail = new THREE.Mesh(
      new THREE.BoxGeometry(
        Math.max(0.5, scaledSize.x),
        Math.max(0.5, scaledSize.y),
        Math.max(0.5, scaledSize.z)
      ),
      new THREE.MeshStandardMaterial({
        color: sceneryTint[this.theme],
        metalness: 0.1,
        roughness: 0.9,
      })
    );
    lowDetail.position.y = scaledSize.y * 0.5;
    lowDetail.castShadow = false;
    lowDetail.receiveShadow = true;

    const lod = new THREE.LOD();
    lod.addLevel(model, 0);
    lod.addLevel(lowDetail, 36);
    lod.updateMatrix();
    lod.rotation.y = Math.random() * Math.PI * 2;
    return lod;
  }
}
