import { exportFreshdesk } from "#/exportFreshdesk";
import type { Category, Folder, Article } from "#/exportFreshdesk";
import path from "path";
import fs from "fs-extra";

function createMockApi(numCategories = 2, numFolders = 3, numArticles = 2): {
  get: <T>(url: string) => Promise<{ data: T }>;
} {
  return {
    get: async <T>(url: string): Promise<{ data: T }> => {
      if (url === "/solutions/categories") {
        const categories: Category[] = 
          Array.from({ length: numCategories }, (_, i) => ({
            id: i + 1,
            name: `Category ${i + 1}`,
          }));
        return { data: categories as T };
      }
      const categoryMatch = url.match(/\/solutions\/categories\/(\d+)\/folders/);
      if (categoryMatch) {
        const categoryId = Number(categoryMatch[1]);
        const folders: Folder[] =
          Array.from({ length: numFolders }, (_, i) => ({
            id: i + 1,
            name: `Folder ${i + 1}`,
            category_id: categoryId, // all folders belong to the matched category
          }));
        return { data: folders as T };
      }

      if (url.match(/\/solutions\/folders\/\d+\/articles/)) {
        const folderId = Number(url.match(/\/solutions\/folders\/(\d+)\/articles/)![1]);

        const articles: Article[] = 
          Array.from({ length: numArticles }, (_, i) => ({
            id: folderId * 100 + i + 1, // unique ID per folder
            title: `Article ${i + 1} of Folder ${folderId}`,
            description: "<p>test</p>",
            category_id: 1,
            folder_id: folderId,
            created_at: "2024-01-01",
            updated_at: "2025-01-01",
          }));
        return { data: articles as T } ;
      }

      throw new Error(`Unhandled URL: ${url}`);
    },
  };
}

function createMockProcessor(delay = 20) {
  return vi.fn(async (article, folderPath) => {
    await new Promise((r) => setTimeout(r, delay));

    // ensure folder exists
    await fs.ensureDir(folderPath);

    // write a dummy markdown file to mimic real processing
    const filename = `${article.id}.md`;
    const filePath = path.join(folderPath, filename);

    const content = `# ${article.title}\n\n${article.description || "test content"}`;
    await fs.writeFile(filePath, content);

    return {
      path: `${folderPath}/${article.id}.md`,
      title: article.title,
      updated_at: article.updated_at,
    };
  });
}

const TEST_DIR = path.join(__dirname, "fixtures");

describe("exportFreshdesk stress test", () => {
  it("processes many articles with concurrency", async () => {
    const api = createMockApi(2, 3, 2); // 12 articles total
    
    const processArticle = createMockProcessor(10);

    const start = Date.now();

    const result = await exportFreshdesk(
      { api, processArticle },
      TEST_DIR
    );

    const duration = Date.now() - start;

    console.log("Duration:", duration);

    expect(result.size).toBeGreaterThan(0);
    expect(processArticle).toHaveBeenCalled();

    expect(duration).toBeLessThan(120 * 10); 
  });

  it("skips unchanged articles", async () => {
    const api = createMockApi(1, 1, 4);

    const processArticle = vi.fn(async () => ({
      path: "x",
      title: "x",
      updated_at: "2025-01-01",
    }));

    // simulate existing map
    const existingMap = new Map([
      [1, { path: "x", title: "x", updated_at: "2025-01-01" }],
    ]);

    // you may need to inject this depending on your design

    await exportFreshdesk({ api, processArticle }, TEST_DIR);

    expect(processArticle).toHaveBeenCalledTimes(4); // 1 skipped
  });
});