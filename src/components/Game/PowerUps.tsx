import * as THREE from "three";

import { modelCatalog, pickModelUrl } from "@/lib/modelCatalog";
import type { ModelLibrary } from "@/lib/modelLoader";
import type { PowerUpType, Theme } from "@/types";

const lanePositions = [-2, 0, 2];
const coinCapacity = 96;

interface PowerUpInstance {
  group: THREE.Group;
  model: THREE.Object3D;
  type: PowerUpType;
  active: boolean;
  lane: number;
  timer: number;
  hitRadius: number;
  hitOffsetY: number;
}

interface CoinRender {
  group: THREE.Group;
  meshes: THREE.InstancedMesh[];
  hitRadius: number;
  hitOffsetY: number;
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

export class PowerUpManager {
  private readonly scene: THREE.Scene;
  private readonly pool: PowerUpInstance[] = [];
  private readonly coinPool: PowerUpInstance[] = [];
  private readonly activeList: PowerUpInstance[] = [];
  private readonly activeCoins: PowerUpInstance[] = [];
  private readonly coinTemp = new THREE.Object3D();
  private coinRender: CoinRender | null = null;
  private readonly models: ModelLibrary;
  private theme: Theme;

  constructor(scene: THREE.Scene, theme: Theme, models: ModelLibrary) {
    this.scene = scene;
    this.models = models;
    this.theme = theme;
  }

  setTheme(theme: Theme) {
    this.theme = theme;
    this.reset();
    this.disposeCoinRender();
  }

  reset() {
    this.pool.forEach((powerUp) => {
      powerUp.active = false;
      powerUp.group.visible = false;
    });
    this.coinPool.forEach((coin) => {
      coin.active = false;
      coin.group.visible = false;
    });
    this.activeList.length = 0;
    this.activeCoins.length = 0;
    if (this.coinRender) {
      this.coinRender.meshes.forEach((mesh) => {
        mesh.count = 0;
        mesh.instanceMatrix.needsUpdate = true;
      });
    }
  }

  spawn(type: PowerUpType, lane: number, z: number) {
    if (type === "coin") {
      this.spawnCoin(lane, z);
      return;
    }
    const powerUp = this.getOrCreate(type);
    powerUp.type = type;
    powerUp.active = true;
    powerUp.group.visible = true;
    powerUp.lane = lane;
    powerUp.timer = 0;
    powerUp.group.position.set(lanePositions[lane], 0, z);
  }

  private spawnCoin(lane: number, z: number) {
    const coin = this.getOrCreateCoin();
    if (!coin) {
      return;
    }
    coin.type = "coin";
    coin.active = true;
    coin.group.visible = false;
    coin.lane = lane;
    coin.timer = 0;
    coin.group.position.set(lanePositions[lane], 0, z);
    coin.group.rotation.set(0, 0, 0);
    if (this.coinRender) {
      coin.hitRadius = this.coinRender.hitRadius;
      coin.hitOffsetY = this.coinRender.hitOffsetY;
    }
  }

  update(
    delta: number,
    speed: number,
    magnetActive: boolean,
    playerPosition: THREE.Vector3
  ) {
    const travel = speed * delta;
    this.activeList.length = 0;
    this.activeCoins.length = 0;

    this.pool.forEach((powerUp) => {
      if (!powerUp.active) {
        return;
      }
      powerUp.timer += delta;
      powerUp.group.position.z -= travel;
      powerUp.group.rotation.y += delta * 1.4;
      powerUp.group.position.y = 0.4 + Math.sin(powerUp.timer * 3) * 0.1;
      if (powerUp.group.position.z < -20) {
        powerUp.active = false;
        powerUp.group.visible = false;
        return;
      }
      this.activeList.push(powerUp);
    });

    this.coinPool.forEach((coin) => {
      if (!coin.active) {
        return;
      }
      coin.timer += delta;
      coin.group.position.z -= travel;
      if (magnetActive) {
        coin.group.position.x = THREE.MathUtils.lerp(
          coin.group.position.x,
          playerPosition.x,
          Math.min(1, delta * 6)
        );
        coin.group.position.z -= travel * 0.8;
      }
      coin.group.rotation.y += delta * 1.4;
      coin.group.position.y = 0.4 + Math.sin(coin.timer * 3) * 0.1;
      if (coin.group.position.z < -20) {
        coin.active = false;
        coin.group.visible = false;
        return;
      }
      this.activeList.push(coin);
      this.activeCoins.push(coin);
    });

    this.updateCoinInstances(this.activeCoins);
  }

  getActive() {
    return this.activeList;
  }

  private getOrCreate(type: PowerUpType) {
    const available = this.pool.find((powerUp) => !powerUp.active);
    if (available) {
      available.group.clear();
      const next = this.createModel(type);
      available.model = next.model;
      available.hitRadius = next.hitRadius;
      available.hitOffsetY = next.hitOffsetY;
      available.group.add(available.model);
      return available;
    }
    const group = new THREE.Group();
    const next = this.createModel(type);
    const model = next.model;
    group.add(model);
    const powerUp: PowerUpInstance = {
      group,
      model,
      type,
      active: false,
      lane: 1,
      timer: 0,
      hitRadius: next.hitRadius,
      hitOffsetY: next.hitOffsetY,
    };
    this.pool.push(powerUp);
    this.scene.add(group);
    return powerUp;
  }

  private getOrCreateCoin() {
    const available = this.coinPool.find((coin) => !coin.active);
    if (available) {
      return available;
    }
    if (this.coinPool.length >= coinCapacity) {
      return null;
    }
    const group = new THREE.Group();
    const coin: PowerUpInstance = {
      group,
      model: group,
      type: "coin",
      active: false,
      lane: 1,
      timer: 0,
      hitRadius: 0.4,
      hitOffsetY: 0.25,
    };
    this.coinPool.push(coin);
    return coin;
  }

  private createModel(type: PowerUpType | "tribulation") {
    if (type === "tribulation") {
      const geometry = new THREE.SphereGeometry(0.4, 32, 32);
      const material = new THREE.MeshStandardMaterial({
        color: 0x440088,
        emissive: 0xff0000,
        emissiveIntensity: 2,
        roughness: 0,
        metalness: 0.8
      });
      const model = new THREE.Mesh(geometry, material);
      // Halo
      const haloGeo = new THREE.RingGeometry(0.5, 0.6, 32);
      const haloMat = new THREE.MeshBasicMaterial({ color: 0xff0000, side: THREE.DoubleSide, transparent: true, opacity: 0.8 });
      const halo = new THREE.Mesh(haloGeo, haloMat);
      model.add(halo);

      // Float animation pivot
      const pivot = new THREE.Group();
      pivot.add(model);
      model.position.y = 0.5;

      return {
        model: pivot,
        hitRadius: 0.6,
        hitOffsetY: 0.5
      };
    }

    const url = pickModelUrl(modelCatalog.powerUps[type as PowerUpType][this.theme]);
    const model = this.models.clone(url);
    const targetSize = type === "coin" ? 0.45 : 0.7;
    scaleToMax(model, targetSize);
    centerOnGround(model);
    // 预先计算拾取半径，避免每帧用 Box3 计算碰撞。
    const box = new THREE.Box3().setFromObject(model);
    const sphere = new THREE.Sphere();
    box.getBoundingSphere(sphere);
    return {
      model,
      hitRadius: sphere.radius || 0.4,
      hitOffsetY: sphere.center.y,
    };
  }

  private updateCoinInstances(coins: PowerUpInstance[]) {
    // 使用 InstancedMesh 渲染金币，减少 draw call。
    const render = this.ensureCoinRender();
    if (!render) {
      return;
    }
    const temp = this.coinTemp;
    coins.forEach((coin, index) => {
      temp.position.copy(coin.group.position);
      temp.rotation.set(0, coin.group.rotation.y, 0);
      temp.scale.set(1, 1, 1);
      temp.updateMatrix();
      render.meshes.forEach((mesh) => {
        mesh.setMatrixAt(index, temp.matrix);
      });
    });
    render.meshes.forEach((mesh) => {
      mesh.count = coins.length;
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
      mesh.computeBoundingBox();
    });
  }

  private ensureCoinRender() {
    if (this.coinRender) {
      return this.coinRender;
    }
    const render = this.createCoinRender();
    if (!render) {
      return null;
    }
    this.coinRender = render;
    this.coinPool.forEach((coin) => {
      coin.hitRadius = render.hitRadius;
      coin.hitOffsetY = render.hitOffsetY;
    });
    return render;
  }

  private createCoinRender(): CoinRender | null {
    const url = pickModelUrl(modelCatalog.powerUps.coin[this.theme]);
    const model = this.models.clone(url);
    if (model.children.length === 0) {
      return null;
    }
    scaleToMax(model, 0.45);
    centerOnGround(model);
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
        coinCapacity
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

    const box = new THREE.Box3().setFromObject(model);
    const sphere = new THREE.Sphere();
    box.getBoundingSphere(sphere);

    const group = new THREE.Group();
    meshes.forEach((mesh) => group.add(mesh));
    this.scene.add(group);

    return {
      group,
      meshes,
      hitRadius: sphere.radius || 0.4,
      hitOffsetY: sphere.center.y,
    };
  }

  private disposeCoinRender() {
    if (!this.coinRender) {
      return;
    }
    this.coinRender.meshes.forEach((mesh) => {
      mesh.geometry.dispose();
      const material = mesh.material;
      if (Array.isArray(material)) {
        material.forEach((mat) => mat.dispose());
      } else {
        material.dispose();
      }
    });
    this.scene.remove(this.coinRender.group);
    this.coinRender = null;
  }
}
