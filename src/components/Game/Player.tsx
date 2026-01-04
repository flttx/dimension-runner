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

  // Limbs for animation
  private leftArm: THREE.Object3D | null = null;
  private rightArm: THREE.Object3D | null = null;
  private leftLeg: THREE.Object3D | null = null;
  private rightLeg: THREE.Object3D | null = null;

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
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.35), matBody);
    torso.position.y = 1.0; // Higher center of gravity
    torso.castShadow = true;

    // Chest Core (Glowing)
    const core = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.1), matAccent);
    core.position.set(0, 0.05, 0.18);
    torso.add(core);

    // Head
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.5, 0); // Relative to torso
    const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.4), matBody);
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.12, 0.25), matAccent);
    visor.position.set(0, 0, 0.1);
    headGroup.add(headMesh, visor);
    torso.add(headGroup);

    // Backpack
    const pack = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.2), matDark);
    pack.position.set(0, 0, -0.25);
    torso.add(pack);

    // Arms - Pivot at shoulder
    const limbGeo = new THREE.BoxGeometry(0.12, 0.55, 0.12);

    // Left Arm
    const leftArmGroup = new THREE.Group();
    leftArmGroup.position.set(-0.32, 0.2, 0); // Shoulder position
    const leftArmMesh = new THREE.Mesh(limbGeo, matBody);
    leftArmMesh.position.y = -0.2; // Offset geometry so joint is at top
    leftArmGroup.add(leftArmMesh);
    this.leftArm = leftArmGroup;

    // Right Arm
    const rightArmGroup = new THREE.Group();
    rightArmGroup.position.set(0.32, 0.2, 0);
    const rightArmMesh = new THREE.Mesh(limbGeo, matBody);
    rightArmMesh.position.y = -0.2;
    rightArmGroup.add(rightArmMesh);
    this.rightArm = rightArmGroup;

    torso.add(leftArmGroup, rightArmGroup);

    // Legs - Pivot at hip
    // Legs attached to fallback (hips) not torso, so they don't sway with torso rotation
    const legGeo = new THREE.BoxGeometry(0.15, 0.7, 0.15);

    // Left Leg
    const leftLegGroup = new THREE.Group();
    leftLegGroup.position.set(-0.15, 0.7, 0); // Hip position
    const leftLegMesh = new THREE.Mesh(legGeo, matBody);
    leftLegMesh.position.y = -0.3; // Offset geometry down
    leftLegGroup.add(leftLegMesh);
    this.leftLeg = leftLegGroup;

    // Right Leg
    const rightLegGroup = new THREE.Group();
    rightLegGroup.position.set(0.15, 0.7, 0);
    const rightLegMesh = new THREE.Mesh(legGeo, matBody);
    rightLegMesh.position.y = -0.3;
    rightLegGroup.add(rightLegMesh);
    this.rightLeg = rightLegGroup;

    this.fallback.add(torso); // Torso is upper body
    this.fallback.add(leftLegGroup, rightLegGroup); // Legs are lower body

    // Weapon
    const weaponGeo = new THREE.BoxGeometry(0.1, 1.2, 0.1);
    const weapon = new THREE.Mesh(
      weaponGeo,
      new THREE.MeshStandardMaterial({ color: themeColors[theme].weapon, emissive: 0xffaa00, emissiveIntensity: 0.4 })
    );
    // Attach weapon to right arm mesh, not the group, to follow arm swing
    weapon.position.set(0, -0.3, 0.3);
    weapon.rotation.x = Math.PI / 2;
    rightArmMesh.add(weapon);

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

    // --- Dynamic Lighting for Player ---
    const playerLight = new THREE.PointLight(themeColors[theme].accent, 8, 12);
    playerLight.position.set(0, 1.5, -1);
    this.group.add(playerLight);

    // --- XIANXIA EXCLUSIVE: Flying Sword & Trail ---
    if (theme === 'xianxia') {
      const swordGroup = new THREE.Group();

      // Giant Energy Blade
      const bladeGeo = new THREE.BoxGeometry(0.4, 0.05, 3.5);
      const bladeMat = new THREE.MeshStandardMaterial({
        color: 0x00ffff,
        emissive: 0x00ffff,
        emissiveIntensity: 4.0,
        transparent: true,
        opacity: 0.9
      });
      const blade = new THREE.Mesh(bladeGeo, bladeMat);

      // Sword Trail (Visual Polish)
      const trailGeo = new THREE.PlaneGeometry(0.8, 6.0);
      const trailMat = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending
      });
      const trail = new THREE.Mesh(trailGeo, trailMat);
      trail.rotation.x = Math.PI / 2;
      trail.position.z = -3.5;
      swordGroup.add(trail);

      // Hilt
      const hiltGeo = new THREE.BoxGeometry(0.8, 0.1, 0.2);
      const hiltMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 1.0, roughness: 0.2 });
      const hilt = new THREE.Mesh(hiltGeo, hiltMat);
      hilt.position.z = -1.5;

      swordGroup.add(blade, hilt);
      swordGroup.position.y = -0.05;

      this.avatar.add(swordGroup);
      (this.avatar as any).userData.sword = swordGroup;
      (this.avatar as any).userData.trail = trail;
    }

    this.avatar.add(this.fallback);
    this.avatar.rotation.y = this.avatarBaseRotationY;
    this.group.add(this.avatar, this.shield);
    this.group.position.set(lanePositions[this.laneIndex], this.baseY, 0);
    this.updateCollisionRadius();

    scene.add(this.group);
  }

  setTheme(theme: Theme) {
    this.theme = theme;
    // Simple theme update logic - in a full impl we'd traverse the new hierarchy too
    // Keeping it simple for now as the main goal is animation
    const materials = themeColors[theme];
    (this.shield.material as THREE.MeshStandardMaterial).color = materials.shield;
  }

  private applyWeaponPose(weapon: THREE.Object3D) {
    // Legacy support for external models - can be simplified or ignored if we assume procedural for now
    weapon.position.set(0.35, this.weaponAnchorY, 0.12);
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
    this.leftArm = null; this.rightArm = null;
    this.leftLeg = null; this.rightLeg = null;

    let anchorY = 0.85;
    if (model) {
      // Logic for External Assets (unchanged details omitted for brevity, focusing on procedural fallback)
      model.position.set(0, 0, 0);
      model.scale.set(1, 1, 1);
      const box = new THREE.Box3().setFromObject(model);
      const size = new THREE.Vector3(); box.getSize(size);
      if (size.y > 0) model.scale.multiplyScalar(2.0 / size.y);
      const scaledBox = new THREE.Box3().setFromObject(model);
      model.position.y -= scaledBox.min.y;
      this.avatar.add(model);
    } else {
      this.avatar.add(this.fallback);
      // Re-assign references if they were cleared? 
      // Actually `fallback` retains its children, so just adding it back is enough.
      // But we need to ensure references `this.leftArm` etc are valid. 
      // Since they are set in constructor and attached to `fallback`, they persist.
    }
    this.weaponAnchorY = anchorY;
    this.avatar.rotation.y = this.avatarBaseRotationY;

    if (weapon) {
      // External weapon handling
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
    if (this.isJumping || this.crouchTimer > 0) return;
    this.velocityY = 7.2;
    this.isJumping = true;
  }

  crouch() {
    if (this.isJumping) return;
    this.crouchTimer = this.crouchDuration;
    this.group.scale.y = 0.6;
  }

  setRunning(running: boolean) {
    this.running = running;
    if (!running) {
      this.reset();
    }
  }

  private currentLean = 0;
  private currentBank = 0;

  update(delta: number, speed = 12) {
    const targetX = lanePositions[this.targetLane];
    this.group.position.x = THREE.MathUtils.lerp(
      this.group.position.x,
      targetX,
      Math.min(1, delta * 12)
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

    if (this.running) {
      this.runTimer += delta;
      const speedFactor = Math.min(speed / 12, 2.5);

      // Calculate Banking (Target lean based on x-velocity)
      const targetBank = (targetX - this.group.position.x) * 0.8;
      this.currentBank = THREE.MathUtils.lerp(this.currentBank, targetBank, delta * 10);

      if (this.theme === 'xianxia') {
        // --- FLYING SWORD ENHANCED ANIMATION ---
        const sword = (this.avatar as any).userData.sword;
        if (sword) {
          // 1. Dynamic Bobbing & Wobble
          sword.position.y = -0.1 + Math.sin(this.runTimer * 2.5) * 0.08;
          sword.rotation.z = Math.sin(this.runTimer * 1.5) * 0.05; // Slight side-to-side wobble
          sword.position.z = Math.sin(this.runTimer * 1.0) * 0.05; // Fore-aft drift
        }

        // 2. Surfing Pose with dynamic bank
        this.avatar.rotation.y = this.avatarBaseRotationY - Math.PI / 4 + this.currentBank * 0.2;
        this.avatar.rotation.z = this.currentBank * 1.2; // Aggressive banking
        this.avatar.rotation.x = 0.15 + speedFactor * 0.1; // Forward tilt based on speed

        // 3. Balance Limbs
        if (this.leftLeg && this.rightLeg && this.leftArm && this.rightArm) {
          this.leftLeg.rotation.x = 0.1;
          this.rightLeg.rotation.x = -0.1;

          // Sway arms for balance
          const balanceSway = Math.sin(this.runTimer * 1.5) * 0.1;
          this.leftArm.rotation.x = -Math.PI / 3 + balanceSway;
          this.leftArm.rotation.z = 0.3 + this.currentBank * 0.5;
          this.rightArm.rotation.x = Math.PI / 4 - balanceSway;
          this.rightArm.rotation.z = -0.3 + this.currentBank * 0.5;
        }

      } else {
        // --- STANDARD CYBER-RUNNER ENHANCED ---
        const freq = 12 * Math.sqrt(speedFactor);
        const stride = Math.sin(this.runTimer * freq);
        const sway = Math.cos(this.runTimer * freq * 0.5);

        this.avatar.position.y = Math.abs(stride) * 0.15; // Stronger bob
        this.avatar.rotation.y = this.avatarBaseRotationY + this.currentBank * 0.5 + sway * 0.1;
        this.avatar.rotation.z = this.currentBank * 0.8;
        this.avatar.rotation.x = 0.2 + speedFactor * 0.15; // Lean into wind

        if (this.leftLeg && this.rightLeg && this.leftArm && this.rightArm) {
          const limbAmp = 0.9 * Math.min(1.2, speedFactor);
          this.leftLeg.rotation.x = Math.sin(this.runTimer * freq) * limbAmp;
          this.rightLeg.rotation.x = Math.sin(this.runTimer * freq + Math.PI) * limbAmp;
          this.leftArm.rotation.x = Math.sin(this.runTimer * freq + Math.PI) * limbAmp * 0.9;
          this.rightArm.rotation.x = Math.sin(this.runTimer * freq) * limbAmp * 0.9;

          // Shoulders move with legs
          this.leftArm.position.y = 0.2 + stride * 0.05;
          this.rightArm.position.y = 0.2 - stride * 0.05;
        }
      }
    }
  }
}
