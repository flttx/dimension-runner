"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
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
import type { GameStatus, ObstacleType, PowerUpState, Theme } from "@/types";

import { ObstacleManager } from "./Obstacles";
import { PlayerController } from "./Player";
import { PowerUpManager } from "./PowerUps";
import { SceneryManager } from "./Scenery";
import { TrackManager } from "./Track";

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
  xianxia: ["lightning", "sword_rain", "boulder"],
  minecraft: ["creeper", "tnt", "lava"],
};

const powerUpTypes = ["shield", "speed", "clear", "magnet"] as const;

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
    renderer.toneMappingExposure = themeExposure.xianxia;
    if ("useLegacyLights" in renderer) {
      (renderer as THREE.WebGLRenderer & { useLegacyLights: boolean })
        .useLegacyLights = false;
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(themeFog.xianxia.color);
    scene.fog = new THREE.Fog(
      themeFog.xianxia.color,
      themeFog.xianxia.near,
      themeFog.xianxia.far
    );

    const camera = new THREE.PerspectiveCamera(
      60,
      canvas.clientWidth / canvas.clientHeight,
      0.1,
      200
    );
    camera.position.set(0, 6.5, -10);
    camera.lookAt(0, 1.5, 12);

    const ambient = new THREE.AmbientLight("#ffffff", 0.25);
    const hemisphere = new THREE.HemisphereLight("#dce7ff", "#111620", 0.6);
    const dirLight = new THREE.DirectionalLight("#ffffff", 2.2);
    dirLight.position.set(6, 12, -4);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(2048, 2048);
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 60;
    dirLight.shadow.camera.left = -12;
    dirLight.shadow.camera.right = 12;
    dirLight.shadow.camera.top = 12;
    dirLight.shadow.camera.bottom = -12;
    dirLight.shadow.bias = -0.0005;
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
      const hdr = await new RGBELoader().loadAsync(environmentUrl);
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
        scenery.spawn(z);
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

        player.update(delta);
        track.update(delta, speed);
        obstacles.update(delta, speed);
        scenery.update(delta, speed, camera);
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
            setPowerUps({ ...powerUpState });
            audioManager.playSfx("powerup");
          } else {
            status = "over";
            setStatusFromEngine("over");
            audioManager.playSfx("hit");
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
                break;
              case "speed":
                powerUpState.speedUntil = performance.now() + 5000;
                break;
              case "magnet":
                powerUpState.magnetUntil = performance.now() + 7000;
                break;
              case "clear":
                powerUpState.hasClear = true;
                break;
              case "coin":
              default:
                powerUpState.coins += 1;
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
