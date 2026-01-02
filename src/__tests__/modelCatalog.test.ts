import {
  collectModelUrls,
  collectModelUrlsForTheme,
  modelCatalog,
  pickModelUrl,
} from "@/lib/modelCatalog";
import { describe, expect, it, vi } from "vitest";

describe("modelCatalog", () => {
  it("pickModelUrl 在空数组时返回空字符串", () => {
    expect(pickModelUrl([])).toBe("");
  });

  it("pickModelUrl 会从数组中选择模型", () => {
    const list = ["a.glb", "b.glb", "c.glb"];
    const spy = vi.spyOn(Math, "random").mockReturnValue(0.99);
    expect(pickModelUrl(list)).toBe("c.glb");
    spy.mockRestore();
  });

  it("collectModelUrls 返回去重后的模型列表", () => {
    const urls = collectModelUrls();
    expect(new Set(urls).size).toBe(urls.length);
    expect(urls).toContain(modelCatalog.player.xianxia);
    expect(urls).toContain(modelCatalog.weapon.minecraft);
  });

  it("collectModelUrlsForTheme 只包含对应主题的入口模型", () => {
    const xianxiaUrls = collectModelUrlsForTheme("xianxia");
    expect(xianxiaUrls).toContain(modelCatalog.player.xianxia);
    expect(xianxiaUrls).not.toContain(modelCatalog.player.minecraft);

    const minecraftUrls = collectModelUrlsForTheme("minecraft");
    expect(minecraftUrls).toContain(modelCatalog.track.minecraft);
    expect(minecraftUrls).not.toContain(modelCatalog.track.xianxia);
  });
});
