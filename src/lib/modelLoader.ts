import * as THREE from "three";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";

export class ModelLibrary {
  private readonly loader: GLTFLoader;
  private readonly dracoLoader: DRACOLoader;
  private readonly cache = new Map<string, THREE.Object3D>();
  private readonly pending = new Map<string, Promise<THREE.Object3D>>();

  constructor() {
    this.loader = new GLTFLoader();
    this.dracoLoader = new DRACOLoader();
    this.dracoLoader.setDecoderPath("/draco/");
    this.loader.setDRACOLoader(this.dracoLoader);
  }

  async preload(urls: string[]) {
    const tasks = urls.map((url) => this.load(url));
    await Promise.all(tasks);
  }

  async load(url: string) {
    if (this.cache.has(url)) {
      return this.cache.get(url);
    }
    const existing = this.pending.get(url);
    if (existing) {
      return existing;
    }
    // 避免同一模型在并发预载时被重复下载与解析。
    const task = this.loader.loadAsync(url).then((gltf) => {
      const root = gltf.scene || new THREE.Group();
      root.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      this.cache.set(url, root);
      return root;
    });
    this.pending.set(url, task);
    try {
      return await task;
    } finally {
      this.pending.delete(url);
    }
  }

  clone(url: string) {
    const base = this.cache.get(url);
    if (!base) {
      return new THREE.Group();
    }
    return clone(base) as THREE.Object3D;
  }
}
