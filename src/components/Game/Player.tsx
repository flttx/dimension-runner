import * as THREE from "three";

import type { Theme } from "@/types";

const lanePositions = [-2, 0, 2];

const themeColors = {
  xianxia: {
    body: new THREE.Color("#f7e6b2"),
    accent: new THREE.Color("#63e6d0"),
    weapon: new THREE.Color("#e2b857"),
    shield: new THREE.Color("#6bf2ff"),
  },
  minecraft: {
    body: new THREE.Color("#9ad3a8"),
    accent: new THREE.Color("#2b5e3c"),
    weapon: new THREE.Color("#6c86a6"),
    shield: new THREE.Color("#89c2ff"),
  },
};

export class PlayerController {
  readonly group: THREE.Group;
  readonly shield: THREE.Mesh;
  // 用于道具拾取的近似碰撞半径，避免频繁 Box3 计算。
  collisionRadius = 0.9;
  laneIndex = 1;
  private targetLane = 1;
  private velocityY = 0;
  private isJumping = false;
  private crouchTimer = 0;
  private readonly crouchDuration = 0.6;
  private readonly baseY = 0.9;
  private readonly avatar: THREE.Group;
  private readonly fallback: THREE.Group;
  private readonly avatarBaseRotationY = Math.PI;
  private weapon: THREE.Object3D | null = null;
  private readonly weaponBasePosition = new THREE.Vector3();
  private readonly weaponBaseRotation = new THREE.Euler();
  private weaponAnchorY = 0.85;
  private runTimer = 0;
  private running = false;
  private theme: Theme;

  constructor(scene: THREE.Scene, theme: Theme) {
    this.group = new THREE.Group();
    this.avatar = new THREE.Group();
    this.fallback = new THREE.Group();
    this.theme = theme;

    // -- Procedural Cyber-Runner Model --
    const matBody = new THREE.MeshStandardMaterial({
      color: themeColors[theme].body,
      roughness: 0.3,
      metalness: 0.7
    });
    const matAccent = new THREE.MeshStandardMaterial({
      color: themeColors[theme].accent,
      emissive: themeColors[theme].accent,
      emissiveIntensity: 0.8
    });
    const matDark = new THREE.MeshStandardMaterial({ color: 0x333333 });

    // Torso
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.35), matBody);
    torso.position.y = 0.85;
    torso.castShadow = true;

    // Chest Core (Glowing)
    const core = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.1), matAccent);
    core.position.set(0, 0.1, 0.18);
    torso.add(core);

    // Head
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.5, 0);
    const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.4), matBody);

    // Visor
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.1, 0.25), matAccent);
    visor.position.set(0, 0, 0.1);
    headGroup.add(headMesh, visor);
    torso.add(headGroup);

    // Backpack / Jetpack
    const pack = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.2), matDark);
    pack.position.set(0, 0, -0.25);
    torso.add(pack);

    // Simple "Limbs" (Static Running Pose)
    const limbGeo = new THREE.BoxGeometry(0.15, 0.6, 0.15);
    const leftArm = new THREE.Mesh(limbGeo, matBody);
    leftArm.position.set(-0.35, 0, 0);
    leftArm.rotation.x = -Math.PI / 4;

    const rightArm = new THREE.Mesh(limbGeo, matBody);
    rightArm.position.set(0.35, 0, 0);
    rightArm.rotation.x = Math.PI / 4;

    torso.add(leftArm, rightArm);

    // Weapon
    const weaponGeo = new THREE.BoxGeometry(0.1, 1.2, 0.1);
    const weapon = new THREE.Mesh(
      weaponGeo,
      new THREE.MeshStandardMaterial({ color: themeColors[theme].weapon, emissive: 0xffaa00, emissiveIntensity: 0.4 })
    );
    weapon.position.set(0.35, -0.2, 0.3); // Hand held
    weapon.rotation.x = Math.PI / 2;
    rightArm.add(weapon); // Attach to arm

    const shieldGeo = new THREE.SphereGeometry(1.2, 32, 32);
    this.shield = new THREE.Mesh(
      shieldGeo,
      new THREE.MeshStandardMaterial({
        color: themeColors[theme].shield,
        transparent: true,
        opacity: 0.3,
        roughness: 0,
        metalness: 1
      })
    );
    this.shield.visible = false;

    this.fallback.add(torso);
    this.avatar.add(this.fallback);
    this.avatar.rotation.y = this.avatarBaseRotationY;
    this.group.add(this.avatar, this.shield);
    this.group.position.set(lanePositions[this.laneIndex], this.baseY, 0);
    this.updateCollisionRadius();

    scene.add(this.group);
  }

  setTheme(theme: Theme) {
    this.theme = theme;
    const materials = themeColors[theme];
    (this.shield.material as THREE.MeshStandardMaterial).color = materials.shield;
    if (this.fallback.children.length > 0) {
      const [body, head, weapon] = this.fallback.children as THREE.Mesh[];
      (body.material as THREE.MeshStandardMaterial).color = materials.body;
      (head.material as THREE.MeshStandardMaterial).color = materials.accent;
      (weapon.material as THREE.MeshStandardMaterial).color = materials.weapon;
      weapon.rotation.z = theme === "xianxia" ? Math.PI / 10 : -Math.PI / 6;
    }
    if (this.weapon) {
      this.applyWeaponPose(this.weapon);
    }
  }

  private applyWeaponPose(weapon: THREE.Object3D) {
    weapon.position.set(0.35, this.weaponAnchorY, 0.12);
    weapon.scale.set(1, 1, 1);
    const box = new THREE.Box3().setFromObject(weapon);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim > 0) {
      const targetSize = this.theme === "xianxia" ? 1.4 : 1.1;
      const scale = targetSize / maxDim;
      weapon.scale.setScalar(scale);
    }
    const axis = new THREE.Vector3(1, 0, 0);
    if (size.y >= size.x && size.y >= size.z) {
      axis.set(0, 1, 0);
    } else if (size.z >= size.x && size.z >= size.y) {
      axis.set(0, 0, 1);
    }
    const target = new THREE.Vector3(0, -1, 0);
    const quat = new THREE.Quaternion().setFromUnitVectors(axis, target);
    weapon.quaternion.copy(quat);
    weapon.rotateY(this.theme === "xianxia" ? Math.PI / 2 : -Math.PI / 2);
    weapon.rotateX(-Math.PI / 10);
    weapon.rotateZ(this.theme === "xianxia" ? Math.PI / 10 : -Math.PI / 10);
    this.weaponBasePosition.copy(weapon.position);
    this.weaponBaseRotation.copy(weapon.rotation);
  }

  private updateCollisionRadius() {
    const box = new THREE.Box3().setFromObject(this.avatar);
    const sphere = new THREE.Sphere();
    box.getBoundingSphere(sphere);
    if (sphere.radius > 0) {
      this.collisionRadius = sphere.radius;
    }
  }

  setModel(model: THREE.Object3D | null, weapon: THREE.Object3D | null) {
    this.avatar.clear();
    this.weapon = null;
    let anchorY = 0.85;
    if (model) {
      model.position.set(0, 0, 0);
      model.scale.set(1, 1, 1);
      const targetHeight = this.theme === "xianxia" ? 2.1 : 1.8;
      const box = new THREE.Box3().setFromObject(model);
      const size = new THREE.Vector3();
      box.getSize(size);
      if (size.y > 0) {
        const scale = targetHeight / size.y;
        model.scale.multiplyScalar(scale);
      }
      const scaledBox = new THREE.Box3().setFromObject(model);
      const center = new THREE.Vector3();
      scaledBox.getCenter(center);
      model.position.x -= center.x;
      model.position.z -= center.z;
      model.position.y -= scaledBox.min.y;
      this.avatar.add(model);
      const scaledSize = new THREE.Vector3();
      scaledBox.getSize(scaledSize);
      anchorY = Math.max(0.6, scaledSize.y * 0.5);
    } else {
      this.avatar.add(this.fallback);
    }
    this.weaponAnchorY = anchorY;
    this.avatar.rotation.y = this.avatarBaseRotationY;
    if (weapon) {
      weapon.rotation.set(0, 0, 0);
      this.applyWeaponPose(weapon);
      this.avatar.add(weapon);
      this.weapon = weapon;
    }
    this.updateCollisionRadius();
  }

  reset() {
    this.laneIndex = 1;
    this.targetLane = 1;
    this.velocityY = 0;
    this.isJumping = false;
    this.crouchTimer = 0;
    this.group.position.set(lanePositions[this.laneIndex], this.baseY, 0);
    this.group.scale.set(1, 1, 1);
    this.avatar.position.set(0, 0, 0);
    this.avatar.rotation.set(0, this.avatarBaseRotationY, 0);
    this.runTimer = 0;
  }

  setShield(active: boolean) {
    this.shield.visible = active;
  }

  isCrouching() {
    return this.crouchTimer > 0;
  }

  isAirborne() {
    return this.isJumping || this.group.position.y > this.baseY + 0.3;
  }

  moveLane(delta: number) {
    const next = THREE.MathUtils.clamp(this.targetLane + delta, 0, 2);
    this.targetLane = next;
    this.laneIndex = next;
  }

  jump() {
    if (this.isJumping || this.crouchTimer > 0) {
      return;
    }
    this.velocityY = 7.2;
    this.isJumping = true;
  }

  crouch() {
    if (this.isJumping) {
      return;
    }
    this.crouchTimer = this.crouchDuration;
    this.group.scale.y = 0.6;
  }

  setRunning(running: boolean) {
    this.running = running;
    if (!running) {
      this.avatar.position.set(0, 0, 0);
      this.avatar.rotation.set(0, this.avatarBaseRotationY, 0);
      if (this.weapon) {
        this.weapon.position.copy(this.weaponBasePosition);
        this.weapon.rotation.copy(this.weaponBaseRotation);
      }
      this.runTimer = 0;
    }
  }

  update(delta: number, speed = 12) {
    const targetX = lanePositions[this.targetLane];
    this.group.position.x = THREE.MathUtils.lerp(
      this.group.position.x,
      targetX,
      Math.min(1, delta * 10)
    );

    if (this.isJumping) {
      this.velocityY -= 18 * delta;
      this.group.position.y += this.velocityY * delta;
      if (this.group.position.y <= this.baseY) {
        this.group.position.y = this.baseY;
        this.velocityY = 0;
        this.isJumping = false;
      }
    }

    if (this.crouchTimer > 0) {
      this.crouchTimer -= delta;
      if (this.crouchTimer <= 0) {
        this.group.scale.y = 1;
      }
    }

    if (this.running && !this.isJumping && this.crouchTimer <= 0) {
      this.runTimer += delta;
      const stride = Math.sin(this.runTimer * 12);
      const sway = Math.sin(this.runTimer * 6);
      const speedFactor = Math.min(speed / 18, 1.4);
      const laneLean = THREE.MathUtils.clamp(
        (targetX - this.group.position.x) * 0.6,
        -0.5,
        0.5
      );
      this.avatar.position.y = stride * (0.12 + 0.05 * speedFactor);
      this.avatar.rotation.x = -0.25 - 0.08 * speedFactor + sway * 0.05; // More forward lean at speed
      this.avatar.rotation.y = this.avatarBaseRotationY + laneLean * 0.5;
      this.avatar.rotation.z = stride * 0.12 + laneLean * 1.2; // Dramatic roll
      if (this.weapon) {
        this.weapon.position.y = this.weaponBasePosition.y + stride * 0.1;
        this.weapon.position.x = this.weaponBasePosition.x + sway * 0.05;
        this.weapon.rotation.x =
          this.weaponBaseRotation.x + stride * 0.85 - speedFactor * 0.05;
        this.weapon.rotation.y =
          this.weaponBaseRotation.y + sway * 0.22 + laneLean * 0.25;
        this.weapon.rotation.z =
          this.weaponBaseRotation.z + stride * 0.35 + laneLean * 0.4;
      }
    }

  }
}
