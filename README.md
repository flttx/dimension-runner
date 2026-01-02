# 维度跑酷 Dimension Runner

基于 Next.js + Three.js 的 3D 无限跑酷原型，支持修仙/我的世界双主题与 iframe 嵌入模式。

## 快速开始

```bash
pnpm install
pnpm dev
```

访问 `http://localhost:5400`（如 5400 被占用会自动递增端口）。

## 运行模式

- 独立模式：展示完整 UI（导航/页脚/主题切换）
- 嵌入模式：自动隐藏外围 UI，仅保留游戏视图与 HUD

## 环境变量

- `FRAME_ANCESTORS`：CSP `frame-ancestors` 白名单（默认 `'self'`）
- `NEXT_PUBLIC_EMBED_ORIGINS`：允许 `postMessage` 的父页面域名白名单（逗号分隔）

## 资源目录

- 模型：`public/assets/models/*`
- 音频：`public/audio/*`
- HDRI：`public/assets/hdr/*`

## 素材与许可（CC0 / CC-BY）

模型来源（Sketchfab，CC-BY 4.0，已重命名与适配）：

| 主题 | 用途 | 模型 | 作者 | 许可 | 链接 |
| --- | --- | --- | --- | --- | --- |
| 修仙 | 角色 | Samurai Girl | ShmeliArt | CC Attribution | https://sketchfab.com/3d-models/samurai-girl-38de681486cb411581f00e160e0ef1a4 |
| 修仙 | 武器 | Chinese Sword Jian | leeeck | CC Attribution | https://sketchfab.com/3d-models/chinese-sword-jian-2682618468cd4addae5ce961d7f1e00b |
| 修仙 | 障碍-雷劫 | Obelisk of Xulazar | Neil Laguardia | CC Attribution | https://sketchfab.com/3d-models/obelisk-of-xulazar-09aac2ed4e58415885a1fadcb83ddb94 |
| 修仙 | 障碍-滚石 | Granite brown stone | 3dhdscan | CC Attribution | https://sketchfab.com/3d-models/granite-brown-stone-bca05a88c6d243bfab9494468045156b |
| 修仙 | 障碍-滚石 | Beach Stone Rocks Scan | Pers Scans | CC Attribution | https://sketchfab.com/3d-models/beach-stone-rocks-scan-38a50e8b21e545c8b1affbebdc92d160 |
| 修仙 | 障碍-剑雨 | Chinese Sword Jian | leeeck | CC Attribution | https://sketchfab.com/3d-models/chinese-sword-jian-2682618468cd4addae5ce961d7f1e00b |
| 修仙 | 道具-护盾 | Bamboo shield | leha_pu | CC Attribution | https://sketchfab.com/3d-models/bamboo-shield-3005da6ad7be47cba014fc1e0e6e90ef |
| 修仙 | 道具-加速 | Fantasy Scroll | A.Kinchella | CC Attribution | https://sketchfab.com/3d-models/fantasy-scroll-5b37c2eeb6074ee48ee722f23c4c14e3 |
| 修仙 | 道具-清屏 | Magic Orb | reddification | CC Attribution | https://sketchfab.com/3d-models/magic-orb-cdd88b96333c491ebc17043088aae633 |
| 修仙 | 道具-磁吸 | Magnet | bionic_leaf | CC Attribution | https://sketchfab.com/3d-models/magnet-14f17cd9b48f4fe89aea6e69f80980d2 |
| 修仙 | 道具-金币 | Low-Poly Gold Coin | BillieBones | CC Attribution | https://sketchfab.com/3d-models/low-poly-gold-coin-7a40d686492545d1a6f6bd0c487f1cb9 |
| 修仙 | 道路 | cobblestone ground - highpoly | SPLEEN VISION | CC Attribution | https://sketchfab.com/3d-models/cobblestone-ground-highpoly-903c68a26d0e470bb4443acf441049ba |
| 修仙 | 场景 | Dasheng Tower (湮癖坢) | Metazeon | CC Attribution | https://sketchfab.com/3d-models/dasheng-tower-a48f83ca59ef4714abb0959c4e0eb578 |
| 修仙 | 场景 | Jinshan Temple Cishou Pagoda | Metazeon | CC Attribution | https://sketchfab.com/3d-models/jinshan-temple-cishou-pagoda-75e7f2aeb92a42d1a69c07e167a01ca7 |
| 修仙 | 场景 | Bamboo Forest - Yuki Onna | IForgetHowToRead | CC Attribution | https://sketchfab.com/3d-models/bamboo-forest-yuki-onna-6d93a1fb0b9d44a2a7eeea3c032c1b0f |
| 修仙 | 场景 | Chinese Buddhist Pagoda | Aaron Huo | CC Attribution | https://sketchfab.com/3d-models/chinese-buddhist-pagoda-c95a8214aa6147629d1442c02261d351 |
| 修仙 | 场景 | Shanghai Gardens | jakob_van_damme | CC Attribution | https://sketchfab.com/3d-models/shanghai-gardens-323fa75b2d8444d494867212d8b2b7bb |
| Minecraft | 角色 | Minecraft Steve Character | majinanimations | CC Attribution | https://sketchfab.com/3d-models/minecraft-steve-character-bc3a691e63054c3ea316962ffbb35105 |
| Minecraft | 武器 | Minecraft Netherite Sword | h8pitts | CC Attribution | https://sketchfab.com/3d-models/minecraft-netherite-sword-c8791f7bb0f046f1b26f4de01073e9fa |
| Minecraft | 障碍-苦力怕 | Realistic Creeper | Minecraft_Master | CC Attribution | https://sketchfab.com/3d-models/realistic-creeper-5799e0295d6140c1802b9f330b44a3c6 |
| Minecraft | 障碍-TNT | Minecraft Realistic TNT | Dumb Yet Creative | CC Attribution | https://sketchfab.com/3d-models/minecraft-realistic-tnt-284b0e790957405f85c05ed582d6829b |
| Minecraft | 障碍-熔岩 | Magma Cube | tamminen | CC Attribution | https://sketchfab.com/3d-models/magma-cube-2abb79aefbbb4219be85e4dd30d4ccdf |
| Minecraft | 道具-护盾 | Minecraft Shield | bugbilly | CC Attribution | https://sketchfab.com/3d-models/minecraft-shield-81b8af03223a4e72a39dbb0194d2d971 |
| Minecraft | 道具-加速 | Minecraft Jump Potion | MythicaI | CC Attribution | https://sketchfab.com/3d-models/minecraft-jump-potion-e06f13f01a074800afd998ab1deee29f |
| Minecraft | 道具-清屏 | Totem of Undying | Crodattilo | CC Attribution | https://sketchfab.com/3d-models/totem-of-undying-a62c78dfb5644ae4b9c9c5b1887eac9a |
| Minecraft | 道具-磁吸 | Minecraft Emerald | MythicaI | CC Attribution | https://sketchfab.com/3d-models/minecraft-emerald-fd0dd7bbda864751ae3055468ee9ed8f |
| Minecraft | 道具-金币 | Voxel coin | universes | CC Attribution | https://sketchfab.com/3d-models/voxel-coin-b09037367ed949b4b4aad5068b080b67 |
| Minecraft | 道路 | Road Pack | KoraProjects | CC Attribution | https://sketchfab.com/3d-models/road-pack-52146deae0b0442da4f80ddf74f83e1e |
| Minecraft | 场景 | Minecraft village | avatar2233 | CC Attribution | https://sketchfab.com/3d-models/minecraft-village-7a654cb58f72499a9e809927e5cddef8 |
| Minecraft | 场景 | Minecraft - Forest | Apogee | CC Attribution | https://sketchfab.com/3d-models/minecraft-forest-6a54404a57884c3f9e33842455a083d4 |
| Minecraft | 场景 | Minecraft Landscape | Piano_miles | CC Attribution | https://sketchfab.com/3d-models/minecraft-landscape-8ce1dbee97254810ab890aa358790513 |
| Minecraft | 场景 | Minecraft Nether 3D - Lava Lands of Doom | itzDWIJ | CC Attribution | https://sketchfab.com/3d-models/minecraft-nether-3d-lava-lands-of-doom-d442c7296361473f84a03f2ab7493c72 |

音频来源（OpenGameArt，CC0）：

| 类型 | 用途 | 素材 | 作者 | 许可 | 链接 |
| --- | --- | --- | --- | --- | --- |
| BGM | 修仙 | Asianoriental1 | Tozan | CC0 | https://opengameart.org/content/asianoriental1 |
| BGM | Minecraft | The Creeper (Fakebit / Chiptune Music Pack) | Ragnar Random | CC0 | https://opengameart.org/content/fakebit-chiptune-music-pack |
| SFX | 跳跃 | 100 CC0 SFX / spring_01.ogg | rubberduck | CC0 | https://opengameart.org/content/100-cc0-sfx |
| SFX | 收集 | 80 CC0 RPG SFX / item_coins_02.ogg | rubberduck | CC0 | https://opengameart.org/content/80-cc0-rpg-sfx |
| SFX | 增益 | 80 CC0 RPG SFX / spell_01.ogg | rubberduck | CC0 | https://opengameart.org/content/80-cc0-rpg-sfx |
| SFX | 命中 | 100 CC0 SFX / hit_03.ogg | rubberduck | CC0 | https://opengameart.org/content/100-cc0-sfx |
| SFX | 清屏 | 100 CC0 SFX / gong_01.ogg | rubberduck | CC0 | https://opengameart.org/content/100-cc0-sfx |
| SFX | 爆炸 | 100 CC0 SFX / explosion.ogg | rubberduck | CC0 | https://opengameart.org/content/100-cc0-sfx |

环境来源（Poly Haven，CC0）：

| 类型 | 用途 | 素材 | 作者 | 许可 | 链接 |
| --- | --- | --- | --- | --- | --- |
| HDRI | 场景光照 | Kloofendal 48d Partly Cloudy 1k HDR | Poly Haven | CC0 | https://polyhaven.com/a/kloofendal_48d_partly_cloudy |
