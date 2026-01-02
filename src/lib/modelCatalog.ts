import type { ObstacleType, PowerUpType, Theme } from "@/types";

export type ModelRef = string | string[];

const asArray = (ref: ModelRef) => (Array.isArray(ref) ? ref : [ref]);

export const pickModelUrl = (ref: ModelRef) => {
  const list = asArray(ref);
  if (list.length === 0) {
    return "";
  }
  return list[Math.floor(Math.random() * list.length)];
};

export const modelCatalog = {
  player: {
    xianxia: "/assets/models/sketchfab/xianxia/player_monk.glb",
    minecraft: "/assets/models/sketchfab/minecraft/player_steve.glb",
  },
  weapon: {
    xianxia: "/assets/models/sketchfab/xianxia/sword_jian.glb",
    minecraft: "/assets/models/sketchfab/minecraft/sword_netherite.glb",
  },
  obstacles: {
    lightning: {
      xianxia: "/assets/models/sketchfab/xianxia/obelisk_xulazar.glb",
      minecraft: "/assets/models/sketchfab/xianxia/obelisk_xulazar.glb",
    },
    sword_rain: {
      xianxia: "/assets/models/sketchfab/xianxia/sword_jian.glb",
      minecraft: "/assets/models/sketchfab/minecraft/sword_diamond.glb",
    },
    boulder: {
      xianxia: [
        "/assets/models/sketchfab/xianxia/boulder_granite.glb",
        "/assets/models/sketchfab/xianxia/boulder_beach_stone.glb",
      ],
      minecraft: "/assets/models/sketchfab/xianxia/boulder_beach_stone.glb",
    },
    creeper: {
      xianxia: "/assets/models/sketchfab/minecraft/creeper_realistic.glb",
      minecraft: "/assets/models/sketchfab/minecraft/creeper_realistic.glb",
    },
    tnt: {
      xianxia: "/assets/models/sketchfab/minecraft/tnt_realistic.glb",
      minecraft: "/assets/models/sketchfab/minecraft/tnt_realistic.glb",
    },
    lava: {
      xianxia: "/assets/models/sketchfab/minecraft/magma_cube.glb",
      minecraft: "/assets/models/sketchfab/minecraft/magma_cube.glb",
    },
  } satisfies Record<ObstacleType, Record<Theme, ModelRef>>,
  powerUps: {
    shield: {
      xianxia: "/assets/models/sketchfab/xianxia/shield_bamboo.glb",
      minecraft: "/assets/models/sketchfab/minecraft/shield.glb",
    },
    speed: {
      xianxia: "/assets/models/sketchfab/xianxia/scroll_fantasy.glb",
      minecraft: "/assets/models/sketchfab/minecraft/potion_jump.glb",
    },
    clear: {
      xianxia: "/assets/models/sketchfab/xianxia/orb_magic.glb",
      minecraft: "/assets/models/sketchfab/minecraft/totem.glb",
    },
    magnet: {
      xianxia: "/assets/models/sketchfab/xianxia/magnet.glb",
      minecraft: "/assets/models/sketchfab/minecraft/emerald.glb",
    },
    coin: {
      xianxia: "/assets/models/sketchfab/xianxia/coin_gold.glb",
      minecraft: "/assets/models/sketchfab/minecraft/coin_voxel.glb",
    },
  } satisfies Record<PowerUpType, Record<Theme, ModelRef>>,
  track: {
    xianxia: "/assets/models/sketchfab/xianxia/road_cobblestone.glb",
    minecraft: "/assets/models/sketchfab/minecraft/track_road_pack.glb",
  },
  scenery: {
    xianxia: [
      "/assets/models/sketchfab/xianxia/scenery_dasheng_tower.glb",
      "/assets/models/sketchfab/xianxia/scenery_jinshan_pagoda.glb",
      "/assets/models/sketchfab/xianxia/scenery_buddhist_pagoda.glb",
      "/assets/models/sketchfab/xianxia/scenery_shanghai_gardens.glb",
      "/assets/models/sketchfab/xianxia/scenery_bamboo_forest.glb",
    ],
    minecraft: [
      "/assets/models/sketchfab/minecraft/scenery_village.glb",
      "/assets/models/sketchfab/minecraft/scenery_forest.glb",
      "/assets/models/sketchfab/minecraft/scenery_landscape.glb",
      "/assets/models/sketchfab/minecraft/scenery_nether.glb",
    ],
  },
};

export const collectModelUrlsForTheme = (theme: Theme) => {
  const urls = new Set<string>();
  const addRef = (ref: ModelRef) => {
    asArray(ref).forEach((url) => urls.add(url));
  };

  addRef(modelCatalog.player[theme]);
  addRef(modelCatalog.weapon[theme]);
  addRef(modelCatalog.track[theme]);
  addRef(modelCatalog.scenery[theme]);
  Object.values(modelCatalog.powerUps).forEach((map) =>
    addRef(map[theme])
  );
  Object.values(modelCatalog.obstacles).forEach((map) =>
    addRef(map[theme])
  );
  return Array.from(urls);
};

export const collectModelUrls = () => {
  const urls = new Set<string>();
  (["xianxia", "minecraft"] as Theme[]).forEach((theme) => {
    collectModelUrlsForTheme(theme).forEach((url) => urls.add(url));
  });
  return Array.from(urls);
};
