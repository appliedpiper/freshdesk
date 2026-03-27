import fs from "fs-extra";
import path from "path";

import { exportArticleMap, importArticleMap } from "#/exportFreshdesk";

const TEST_DIR = path.join(__dirname, "fixtures");

describe("Article Map Export/Import", () => {
  it("round-trips article map correctly", async () => {
    const map = new Map<number, any>([
      [1, { path: "cat/a.md", title: "A", updated_at: "2025-01-01" }],
      [2, { path: "cat/b.md", title: "B", updated_at: "2025-01-02" }],
    ]);

    await exportArticleMap(map, TEST_DIR);

    const imported = await importArticleMap(TEST_DIR);

    expect(imported.size).toBe(2);
    expect(imported.get(1)).toEqual(map.get(1));
    expect(imported.get(2)).toEqual(map.get(2));
  });

  it("returns empty map if file does not exist", async () => {
    const emptyDir = path.join(__dirname, "does-not-exist");

    const map = await importArticleMap(emptyDir).catch(() => new Map());

    expect(map.size).toBe(0);
  });

  it("throws on invalid JSON", async () => {

    await fs.writeFile(
      path.join(TEST_DIR, "articleMap.json"),
      "{ invalid json"
    );

    await expect(importArticleMap(TEST_DIR)).rejects.toThrow();
  });
});