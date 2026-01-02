import * as THREE from "three";

import type { Theme } from "@/types";

const themeGround = {
  xianxia: {
    main: new THREE.Color("#2d3a4b"),
    accent: new THREE.Color("#6be8d0"),
  },
  minecraft: {
    main: new THREE.Color("#2f4a2e"),
    accent: new THREE.Color("#5ea45c"),
  },
};

export class TrackManager {
  private readonly scene: THREE.Scene;
  private readonly segments: THREE.Group[] = [];
  private readonly segmentLength = 24;
  private readonly segmentWidth = 8;
  private readonly segmentCount = 10;
  private readonly baseGeometry = new THREE.BoxGeometry(
    this.segmentWidth,
    0.25,
    this.segmentLength
  );
  private baseMeshes: THREE.Mesh[] = [];
  private trackTemplate: THREE.Object3D | null = null;
  private theme: Theme;

  constructor(scene: THREE.Scene, theme: Theme) {
    this.scene = scene;
    this.theme = theme;
    this.createSegments();
  }

  setTheme(theme: Theme) {
    this.theme = theme;
    if (this.trackTemplate) {
      return;
    }
    const colors = themeGround[theme];
    this.baseMeshes.forEach((mesh) => {
      const material = mesh.material as THREE.MeshStandardMaterial;
      material.color = colors.main;
    });
  }

  setModel(model: THREE.Object3D | null) {
    this.trackTemplate = model ? this.prepareTrackModel(model) : null;
    this.baseMeshes = [];
    this.segments.forEach((segment, index) => {
      segment.clear();
      if (this.trackTemplate) {
        segment.add(this.trackTemplate.clone(true));
      } else {
        const mesh = this.createBaseMesh();
        this.baseMeshes[index] = mesh;
        segment.add(mesh);
      }
    });
  }

  reset() {
    this.segments.forEach((segment, index) => {
      segment.position.set(0, 0, index * this.segmentLength);
    });
  }

  update(delta: number, speed: number) {
    const travel = speed * delta;
    let maxZ = -Infinity;
    this.segments.forEach((segment) => {
      segment.position.z -= travel;
      maxZ = Math.max(maxZ, segment.position.z);
    });
    this.segments.forEach((segment) => {
      if (segment.position.z < -this.segmentLength) {
        segment.position.z = maxZ + this.segmentLength;
        maxZ = segment.position.z;
      }
    });
  }

  private createSegments() {
    const colors = themeGround[this.theme];
    for (let i = 0; i < this.segmentCount; i += 1) {
      const group = new THREE.Group();
      const material = new THREE.MeshStandardMaterial({ color: colors.main });
      const mesh = new THREE.Mesh(this.baseGeometry, material);
      mesh.receiveShadow = true;
      group.add(mesh);
      group.position.set(0, 0, i * this.segmentLength);
      this.segments.push(group);
      this.baseMeshes.push(mesh);
      this.scene.add(group);
    }
  }

  private createBaseMesh() {
    const colors = themeGround[this.theme];
    const material = new THREE.MeshStandardMaterial({ color: colors.main });
    const mesh = new THREE.Mesh(this.baseGeometry, material);
    mesh.receiveShadow = true;
    return mesh;
  }

  private prepareTrackModel(model: THREE.Object3D) {
    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    box.getSize(size);
    if (size.x > 0 && size.z > 0) {
      const scaleX = this.segmentWidth / size.x;
      const scaleZ = this.segmentLength / size.z;
      const scale = Math.min(scaleX, scaleZ);
      model.scale.multiplyScalar(scale);
    }
    const scaledBox = new THREE.Box3().setFromObject(model);
    const center = new THREE.Vector3();
    scaledBox.getCenter(center);
    model.position.x -= center.x;
    model.position.z -= center.z;
    model.position.y -= scaledBox.min.y;
    return model;
  }
}
