"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { SSAOPass } from "three/examples/jsm/postprocessing/SSAOPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

import { audioManager } from "@/lib/audio";
import {
  collectModelUrlsForTheme,
  modelCatalog,
  pickModelUrl,
} from "@/lib/modelCatalog";
import { ModelLibrary } from "@/lib/modelLoader";
import { getQualityConfig, resolveQuality } from "@/lib/quality";
import { useGameStore } from "@/store/gameStore";
import type { GameStatus, ObstacleType, PowerUpState, Theme, Biome } from "@/types";

import { ObstacleManager } from "./Obstacles";
import { PlayerController } from "./Player";
import { PowerUpManager } from "./PowerUps";
import { SceneryManager } from "./Scenery";
import { TrackManager } from "./Track";
import { ParticleSystem } from "./Particles";
import { TribulationManager } from "./Tribulation";

const powerUpTypes = ["shield", "speed", "clear", "magnet", "tribulation"] as const;

// --- BIOME SYSTEM ---

let currentBiome: Biome = 'city'; // Global state (simpler than prop drill for now)


const chunkLength = 100;
const chunksAhead = 3;
const hitWindow = 0.9;
const environmentUrl =
  "/assets/hdr/kloofendal_48d_partly_cloudy_1k.hdr";

const themeFog = {
  xianxia: { color: "#182234", near: 18, far: 180 },
  minecraft: { color: "#142518", near: 18, far: 180 },
};

const themeExposure = {
  xianxia: 1.05,
  minecraft: 1.0,
};

const obstacleTypes: Record<Theme, ObstacleType[]> = {
  xianxia: [
    "lightning", "sword_rain", "boulder", "beast", "whirlwind",
    "falling_seal", "spirit_laser", "ice_spikes",
    "soul_bell", "bagua", "ghost_fire", "golden_lotus", "iron_chains",
    "stone_stele", "sword_array", "furnace", "talisman", "yin_yang"
  ],
  minecraft: [
    "creeper", "tnt", "lava",
    "mc_anvil", "mc_cactus", "mc_magma", "mc_arrow"
  ],
};



const createPowerUpState = (): PowerUpState => ({
  shield: 0,
  speedUntil: 0,
  magnetUntil: 0,
  hasClear: false,
  coins: 0,
});

export default function Scene() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const setEngine = useGameStore((state) => state.setEngine);
  const setScore = useGameStore((state) => state.setScore);
  const setDistance = useGameStore((state) => state.setDistance);
  const setSpeed = useGameStore((state) => state.setSpeed);
  const setPowerUps = useGameStore((state) => state.setPowerUps);
  const setStatusFromEngine = useGameStore(
    (state) => state.setStatusFromEngine
  );
  const setAssetsReady = useGameStore((state) => state.setAssetsReady);
  const setQualityLevel = useGameStore((state) => state.setQualityLevel);
  const qualityPreference = useGameStore(
    (state) => state.qualityPreference
  );

  useEffect(() => {
    if (!canvasRef.current) {
      return;
    }

    let disposed = false;
    let assetsReady = false;
    let themeLoadToken = 0;
    const loadedThemes = new Set<Theme>();

    setAssetsReady(false);

    const canvas = canvasRef.current;
    // 根据设备能力自动降级画质，优先保证帧率与响应速度。
    const nav = navigator as Navigator & { deviceMemory?: number };
    const quality =
      qualityPreference === "auto"
        ? resolveQuality({
          deviceMemory: nav.deviceMemory,
          hardwareConcurrency: navigator.hardwareConcurrency,
          width: window.innerWidth,
          height: window.innerHeight,
        })
        : qualityPreference;
    const qualityConfig = getQualityConfig(quality);
    setQualityLevel(quality);
    THREE.ColorManagement.enabled = true;
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    renderer.setPixelRatio(
      Math.min(window.devicePixelRatio, qualityConfig.maxPixelRatio)
    );
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2; // Brighter overall
    if ("useLegacyLights" in renderer) {
      (renderer as THREE.WebGLRenderer & { useLegacyLights: boolean })
        .useLegacyLights = false;
    }

    const scene = new THREE.Scene();
    // Default background before env map loads
    scene.background = new THREE.Color("#05070a");
    // Lighter, further fog for depth
    scene.fog = new THREE.FogExp2("#05070a", 0.012);

    const camera = new THREE.PerspectiveCamera(
      60,
      canvas.clientWidth / canvas.clientHeight,
      0.1,
      200
    );
    camera.position.set(0, 6.5, -10);
    camera.lookAt(0, 1.5, 12);
    camera.up.set(0, 1, 0);
    const cameraPosTarget = new THREE.Vector3();
    const cameraLookAt = new THREE.Vector3();

    renderer.toneMappingExposure = 1.5;

    // Cinematic Lighting Setup
    const ambient = new THREE.AmbientLight("#40485a", 0.9);
    const hemisphere = new THREE.HemisphereLight("#a0c0ff", "#05070a", 1.2);

    // Main Key Light (Dynamic)
    const dirLight = new THREE.DirectionalLight("#fff", 4.0);
    dirLight.position.set(10, 20, 10); // From front-top-side for better volume
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(2048, 2048);
    dirLight.shadow.bias = -0.0001;
    dirLight.shadow.radius = 4;

    // Rim Light (Back Light)
    const rimLight = new THREE.DirectionalLight("#00f0ff", 2.0);
    rimLight.position.set(-10, 10, -20);
    scene.add(rimLight);

    scene.add(ambient, hemisphere, dirLight);

    const composer = new EffectComposer(renderer);
    composer.setPixelRatio(renderer.getPixelRatio());
    composer.setSize(canvas.clientWidth, canvas.clientHeight);

    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    let ssaoPass: SSAOPass | null = null;
    if (qualityConfig.ssaoEnabled) {
      ssaoPass = new SSAOPass(
        scene,
        camera,
        canvas.clientWidth,
        canvas.clientHeight
      );
      ssaoPass.kernelRadius = qualityConfig.ssaoKernelRadius;
      ssaoPass.minDistance = qualityConfig.ssaoMinDistance;
      ssaoPass.maxDistance = qualityConfig.ssaoMaxDistance;
      composer.addPass(ssaoPass);
    }

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(canvas.clientWidth, canvas.clientHeight),
      qualityConfig.bloomStrength,
      qualityConfig.bloomRadius,
      qualityConfig.bloomThreshold
    );
    composer.addPass(bloomPass);
    composer.addPass(new OutputPass());

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    let environmentMap: THREE.Texture | null = null;

    const models = new ModelLibrary();
    const player = new PlayerController(scene, "xianxia");
    const obstacles = new ObstacleManager(scene, "xianxia", models, () =>
      audioManager.playSfx("explosion")
    );
    const powerUps = new PowerUpManager(scene, "xianxia", models);
    const scenery = new SceneryManager(scene, "xianxia", models);
    const track = new TrackManager(scene, "xianxia");
    const particles = new ParticleSystem(scene);
    const tribulation = new TribulationManager(scene);

    // VFX State
    let shakeIntensity = 0;

    // Simple Speed Lines System
    const createSpeedLines = () => {
      const count = 40;
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(count * 6); // 2 points per line, 3 coords per point
      const lines = new THREE.LineSegments(
        geometry,
        new THREE.LineBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        })
      );

      for (let i = 0; i < count; i++) {
        // Random start positions in a tunnel shape
        const angle = Math.random() * Math.PI * 2;
        const radius = 5 + Math.random() * 10;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius + 5; // Offset y to center roughly on screen
        const z = -10 - Math.random() * 50;
        const len = 2 + Math.random() * 4;

        // Start point
        positions[i * 6] = x;
        positions[i * 6 + 1] = y;
        positions[i * 6 + 2] = z;

        // End point
        positions[i * 6 + 3] = x;
        positions[i * 6 + 4] = y;
        positions[i * 6 + 5] = z - len;
      }

      const state = { opacity: 0 };

      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      scene.add(lines);

      return {
        mesh: lines,
        get opacity() { return state.opacity; },
        set opacity(v) { state.opacity = v; },
        update: (dt: number, speed: number) => {
          lines.material.opacity = THREE.MathUtils.lerp(lines.material.opacity, state.opacity, dt * 2);
          const pos = geometry.attributes.position.array as Float32Array;
          const moveSpeed = speed * 1.5; // Lines move faster than world

          for (let i = 0; i < count; i++) {
            // Move both points of the line +Z
            pos[i * 6 + 2] += moveSpeed * dt;
            pos[i * 6 + 5] += moveSpeed * dt;

            // If passed camera (approx z=0), reset to back
            if (pos[i * 6 + 2] > 5) {
              const angle = Math.random() * Math.PI * 2;
              const radius = 4 + Math.random() * 8;
              const x = Math.cos(angle) * radius;
              const y = Math.sin(angle) * radius + 5;
              const z = -60 - Math.random() * 20;
              const len = 2 + Math.random() * 5;

              pos[i * 6] = x;
              pos[i * 6 + 1] = y;
              pos[i * 6 + 2] = z;

              pos[i * 6 + 3] = x;
              pos[i * 6 + 4] = y;
              pos[i * 6 + 5] = z - len;
            }
          }
          geometry.attributes.position.needsUpdate = true;
        },
        dispose: () => {
          scene.remove(lines);
          geometry.dispose();
          lines.material.dispose();
        }
      };
    };

    // We use a ref to hold the system so update() can access it without closure staleness issues if we were using state, 
    // but here everything is inside useEffect. A simple object reference works.
    const speedLines = createSpeedLines();
    const speedLinesRef = { current: speedLines }; // Wrap to mimic ref for consistency inside update


    const clock = new THREE.Clock();
    let status: GameStatus = "idle";
    let theme: Theme = "xianxia";
    let distance = 0;
    let baseSpeed = 12;
    let speed = baseSpeed;
    let nextChunkIndex = 0;
    let powerUpState = createPowerUpState();
    let lastScoreEmit = 0;
    let animationId = 0;

    const updatePlayerModel = () => {
      if (!assetsReady) {
        player.setModel(null, null);
        return;
      }
      const playerModel = models.clone(pickModelUrl(modelCatalog.player[theme]));
      const weaponModel = models.clone(pickModelUrl(modelCatalog.weapon[theme]));
      player.setModel(playerModel, weaponModel);
    };

    const updateTrackModel = () => {
      if (!assetsReady) {
        track.setModel(null);
        return;
      }
      const trackModel = models.clone(pickModelUrl(modelCatalog.track[theme]));
      track.setModel(trackModel);
    };

    const loadEnvironment = async () => {
      if (environmentMap) {
        return environmentMap;
      }
      const hdr = await new HDRLoader().loadAsync(environmentUrl);
      const envMap = pmremGenerator.fromEquirectangular(hdr).texture;
      hdr.dispose();
      environmentMap = envMap;
      return envMap;
    };

    const applyEnvironment = async () => {
      try {
        const envMap = await loadEnvironment();
        if (disposed) {
          return;
        }
        scene.environment = envMap;
        scene.background = envMap;
      } catch {
      }
    };

    const applyThemeVisuals = (nextTheme: Theme) => {
      theme = nextTheme;
      player.setTheme(theme);
      obstacles.setTheme(theme);
      powerUps.setTheme(theme);
      scenery.setTheme(theme);
      track.setTheme(theme);
      scene.fog = new THREE.Fog(
        themeFog[theme].color,
        themeFog[theme].near,
        themeFog[theme].far
      );
      renderer.toneMappingExposure = themeExposure[theme];
      if (!environmentMap) {
        scene.background = new THREE.Color(themeFog[theme].color);
      }
    };

    // 切换主题时可能发生并发加载，使用 token 避免旧请求覆盖新主题。
    const loadThemeAssets = async (nextTheme: Theme) => {
      const token = (themeLoadToken += 1);
      assetsReady = false;
      setAssetsReady(false);
      await models.preload(collectModelUrlsForTheme(nextTheme));
      if (disposed || token !== themeLoadToken) {
        return false;
      }
      loadedThemes.add(nextTheme);
      assetsReady = true;
      setAssetsReady(true);
      return true;
    };

    const updateSceneTheme = async (nextTheme: Theme) => {
      applyThemeVisuals(nextTheme);
      if (!loadedThemes.has(nextTheme)) {
        const ready = await loadThemeAssets(nextTheme);
        if (!ready) {
          return;
        }
      }
      updatePlayerModel();
      updateTrackModel();
      resetWorld();
    };

    const resetWorld = () => {
      if (!assetsReady) {
        return;
      }
      distance = 0;
      baseSpeed = 12;
      speed = baseSpeed;
      nextChunkIndex = 0;
      powerUpState = createPowerUpState();
      track.reset();
      player.reset();
      player.setShield(false);
      obstacles.reset();
      powerUps.reset();
      scenery.reset();
      spawnInitialChunks();
      setDistance(0);
      setScore(0);
      setSpeed(baseSpeed);
      setPowerUps(powerUpState);
    };

    const spawnChunk = (chunkIndex: number) => {
      const baseZ = chunkIndex * chunkLength - distance;
      const difficulty = Math.min(0.7, chunkIndex * 0.04);
      const obstacleCount = Math.min(7, 2 + Math.floor(chunkIndex / 2));
      for (let i = 0; i < obstacleCount; i += 1) {
        const lane = Math.floor(Math.random() * 3);
        const type =
          obstacleTypes[theme][
          Math.floor(Math.random() * obstacleTypes[theme].length)
          ];
        const z = baseZ + 12 + Math.random() * (chunkLength - 24);
        obstacles.spawn(type, lane, z);
      }

      if (Math.random() < 0.55 + difficulty) {
        const powerUp =
          powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
        const lane = Math.floor(Math.random() * 3);
        const z = baseZ + 18 + Math.random() * (chunkLength - 36);
        powerUps.spawn(powerUp, lane, z);
      }

      const coinLane = Math.floor(Math.random() * 3);
      const coinStart = baseZ + 10 + Math.random() * 40;
      for (let i = 0; i < 4; i += 1) {
        powerUps.spawn("coin", coinLane, coinStart + i * 3.5);
      }

      const sceneryCount = Math.random() < 0.6 ? 1 : 2;
      for (let i = 0; i < sceneryCount; i += 1) {
        const z = baseZ + 12 + Math.random() * (chunkLength - 24);
        scenery.spawn(z, currentBiome);
      }
    };

    const spawnInitialChunks = () => {
      for (let i = 0; i < chunksAhead; i += 1) {
        spawnChunk(i);
        nextChunkIndex = i + 1;
      }
    };

    const handleResize = () => {
      const { clientWidth, clientHeight } = canvas;
      if (!clientWidth || !clientHeight) {
        return;
      }
      renderer.setSize(clientWidth, clientHeight, false);
      composer.setSize(clientWidth, clientHeight);
      composer.setPixelRatio(
        Math.min(window.devicePixelRatio, qualityConfig.maxPixelRatio)
      );
      if (ssaoPass) {
        ssaoPass.setSize(clientWidth, clientHeight);
      }
      bloomPass.setSize(clientWidth, clientHeight);
      camera.aspect = clientWidth / clientHeight;
      camera.updateProjectionMatrix();
    };

    const handleKey = (event: KeyboardEvent) => {
      if (status !== "running") {
        return;
      }
      switch (event.key) {
        case "ArrowLeft":
        case "a":
          player.moveLane(1);
          break;
        case "ArrowRight":
        case "d":
          player.moveLane(-1);
          break;
        case "ArrowUp":
        case "w":
          player.jump();
          audioManager.playSfx("jump");
          break;
        case "ArrowDown":
        case "s":
          player.crouch();
          break;
        default:
          break;
      }
    };

    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartAt = 0;

    const handlePointerDown = (event: PointerEvent) => {
      touchStartX = event.clientX;
      touchStartY = event.clientY;
      touchStartAt = performance.now();
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (status !== "running") {
        return;
      }
      const dx = event.clientX - touchStartX;
      const dy = event.clientY - touchStartY;
      const dt = performance.now() - touchStartAt;
      if (dt > 500) {
        return;
      }
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);
      if (absX < 20 && absY < 20) {
        return;
      }
      if (absX > absY) {
        player.moveLane(dx > 0 ? -1 : 1);
      } else if (dy < 0) {
        player.jump();
        audioManager.playSfx("jump");
      } else {
        player.crouch();
      }
    };

    const triggerClear = () => {
      powerUpState.hasClear = false;
      setPowerUps({ ...powerUpState });
      obstacles.clearAhead(20);
      audioManager.playSfx("clear");
    };

    const engine = {
      start: () => {
        if (status === "running" || !assetsReady) {
          return;
        }
        audioManager.unlock();
        audioManager.playBgm(theme);
        status = "running";
        player.setRunning(true);
        setStatusFromEngine("running");
        resetWorld();
      },
      pause: () => {
        if (status !== "running") {
          return;
        }
        status = "paused";
        player.setRunning(false);
        setStatusFromEngine("paused");
        audioManager.stopBgm();
      },
      resume: () => {
        if (status !== "paused") {
          return;
        }
        audioManager.unlock();
        audioManager.playBgm(theme);
        status = "running";
        player.setRunning(true);
        setStatusFromEngine("running");
      },
      reset: () => {
        status = "idle";
        player.setRunning(false);
        setStatusFromEngine("idle");
        resetWorld();
        audioManager.stopBgm();
      },
      stop: () => {
        if (status === "over") {
          return;
        }
        status = "over";
        player.setRunning(false);
        setStatusFromEngine("over");
        audioManager.stopBgm();
      },
      setTheme: (nextTheme: Theme) => {
        status = "idle";
        player.setRunning(false);
        setStatusFromEngine("idle");
        audioManager.stopBgm();
        void updateSceneTheme(nextTheme);
      },
      triggerClear,
    };

    setEngine(engine);
    applyThemeVisuals("xianxia");

    const loadAssets = async () => {
      const [, themeReady] = await Promise.all([
        audioManager.preload(),
        loadThemeAssets(theme),
      ]);
      if (disposed || !themeReady) {
        return;
      }
      await applyEnvironment();
      updatePlayerModel();
      updateTrackModel();
      resetWorld();
    };

    loadAssets();

    const update = () => {
      const delta = clock.getDelta();

      if (status === "running") {
        distance += speed * delta;
        const now = performance.now();

        const speedBoost = powerUpState.speedUntil > now ? 6 : 0;
        const difficultySpeed = baseSpeed + distance * 0.02;
        speed = difficultySpeed + speedBoost;

        player.update(delta, speed);
        track.update(delta, speed);
        obstacles.update(delta, speed);
        scenery.update(delta, speed, camera);
        particles.update(delta);
        tribulation.update(delta, speed, player.group.position, () => {
          if (powerUpState.shield > 0) {
            powerUpState.shield--;
            player.setShield(powerUpState.shield > 0);
            setPowerUps({ ...powerUpState });
            audioManager.playSfx("powerup");
            shakeIntensity = 5.0;
          } else {
            status = "over";
            setStatusFromEngine("over");
            audioManager.playSfx("hit");
            shakeIntensity = 10.0;
            audioManager.stopBgm();
          }
        });
        powerUps.update(
          delta,
          speed,
          powerUpState.magnetUntil > now,
          player.group.position
        );

        const currentChunk = Math.floor(distance / chunkLength);
        const targetChunk = currentChunk + chunksAhead;
        while (nextChunkIndex <= targetChunk) {
          spawnChunk(nextChunkIndex);
          nextChunkIndex += 1;
        }

        for (const obstacle of obstacles.getActive()) {
          if (!obstacle.hazardActive) {
            continue;
          }
          if (obstacle.lane !== player.laneIndex) {
            continue;
          }
          if (Math.abs(obstacle.group.position.z) > hitWindow) {
            continue;
          }
          if (obstacle.height === "low" && player.isAirborne()) {
            continue;
          }
          if (obstacle.height === "high" && player.isCrouching()) {
            continue;
          }
          if (powerUpState.shield > 0) {
            powerUpState.shield -= 1;
            player.setShield(powerUpState.shield > 0);
            obstacle.active = false;
            obstacle.group.visible = false;
            particles.emit(obstacle.group.position, "#00ff9d", 30);
            setPowerUps({ ...powerUpState });
            audioManager.playSfx("powerup");
            shakeIntensity = 2.0; // Moderate shake on shield use
          } else {
            status = "over";
            setStatusFromEngine("over");
            audioManager.playSfx("hit");
            shakeIntensity = 5.0; // Violent shake on death
            audioManager.stopBgm();
          }
          break;
        }

        // 使用球形碰撞减少每帧 Box3 计算开销。
        const playerPosition = player.group.position;
        const playerRadius = player.collisionRadius;
        for (const powerUp of powerUps.getActive()) {
          const dx = powerUp.group.position.x - playerPosition.x;
          const dy =
            powerUp.group.position.y + powerUp.hitOffsetY - playerPosition.y;
          const dz = powerUp.group.position.z - playerPosition.z;
          const hitRadius = powerUp.hitRadius + playerRadius + 0.1;
          if (dx * dx + dy * dy + dz * dz <= hitRadius * hitRadius) {
            powerUp.active = false;
            powerUp.group.visible = false;
            switch (powerUp.type) {
              case "shield":
                powerUpState.shield = Math.min(2, powerUpState.shield + 1);
                player.setShield(true);
                particles.emit(powerUp.group.position, "#00ff9d", 30);
                break;
              case "speed":
                powerUpState.speedUntil = performance.now() + 5000;
                particles.emit(powerUp.group.position, "#7000ff", 30);
                break;
              case "magnet":
                powerUpState.magnetUntil = performance.now() + 7000;
                particles.emit(powerUp.group.position, "#ff0055", 30);
                break;
              case "clear":
                powerUpState.hasClear = true;
                particles.emit(powerUp.group.position, "#00f0ff", 50);
                break;
              case "tribulation":
                // @ts-ignore
                tribulation.trigger(15);
                particles.emit(powerUp.group.position, "#ff0000", 50);
                audioManager.playSfx("explosion");
                shakeIntensity = 5.0;
                break;
              case "coin":
              default:
                powerUpState.coins += 1;
                particles.emit(powerUp.group.position, "#f3d478", 8);
                break;
            }
            setPowerUps({ ...powerUpState });
            audioManager.playSfx(
              powerUp.type === "coin" ? "collect" : "powerup"
            );
          }
        }

        if (powerUpState.speedUntil > 0 && powerUpState.speedUntil <= now) {
          powerUpState.speedUntil = 0;
          setPowerUps({ ...powerUpState });
        }
        if (powerUpState.magnetUntil > 0 && powerUpState.magnetUntil <= now) {
          powerUpState.magnetUntil = 0;
          setPowerUps({ ...powerUpState });
        }

        if (now - lastScoreEmit > 120) {
          const score =
            Math.floor(distance * 4) + powerUpState.coins * 25;
          setDistance(Math.floor(distance));
          setScore(score);
          setSpeed(Math.round(speed));
          lastScoreEmit = now;
        }
      }

      const playerX = player.group.position.x;
      const playerY = player.group.position.y;
      cameraPosTarget.set(
        playerX * 0.85,
        3.5 + Math.min(speed, 24) * 0.02 + playerY * 0.5,
        -7 - Math.min(speed, 26) * 0.12
      );
      camera.position.lerp(
        cameraPosTarget,
        1 - Math.exp(-delta * 5.0)
      );
      cameraLookAt.set(
        playerX * 0.6,
        1.2 + playerY * 0.4,
        14
      );
      camera.lookAt(cameraLookAt);
      camera.up.set(0, 1, 0);
      const fovTarget = 60 + Math.min(speed, 35) * 0.6 + (powerUpState.speedUntil > performance.now() ? 10 : 0);
      camera.fov = THREE.MathUtils.lerp(
        camera.fov,
        fovTarget,
        1 - Math.exp(-delta * 3.5)
      );
      camera.updateProjectionMatrix();

      // Camera Shake
      if (shakeIntensity > 0) {
        const shake = shakeIntensity * 0.1;
        camera.position.x += (Math.random() - 0.5) * shake;
        camera.position.y += (Math.random() - 0.5) * shake;
        camera.position.z += (Math.random() - 0.5) * shake;
        shakeIntensity = Math.max(0, shakeIntensity - delta * 5);
      }

      // Update Speed Lines
      if (speedLinesRef.current) {
        const speedRatio = (speed - baseSpeed) / 20;
        speedLinesRef.current.opacity = Math.max(0, Math.min(0.8, (speedRatio - 0.2) * 2));
        if (speedLinesRef.current.opacity > 0) {
          speedLinesRef.current.update(delta, speed);
        }
      }

      composer.render();
      animationId = requestAnimationFrame(update);
    };

    handleResize();
    update();

    window.addEventListener("resize", handleResize);
    window.addEventListener("keydown", handleKey);
    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointerup", handlePointerUp);

    return () => {
      disposed = true;
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("keydown", handleKey);
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointerup", handlePointerUp);
      if (environmentMap) {
        environmentMap.dispose();
      }
      pmremGenerator.dispose();
      composer.dispose();
      renderer.dispose();
      setEngine(null);
      speedLines.dispose();
      particles.dispose();
      tribulation.dispose();
    };
  }, [
    qualityPreference,
    setAssetsReady,
    setDistance,
    setEngine,
    setPowerUps,
    setQualityLevel,
    setScore,
    setSpeed,
    setStatusFromEngine,
  ]);

  return <canvas ref={canvasRef} className="game-canvas" />;
}
