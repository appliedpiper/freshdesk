import { processArticle, downloadImage } from "#/exportFreshdesk";
import fs from "fs-extra";
import path from "path";
import { Readable } from "stream";
import axios from "axios";

// Mock axios
vi.mock("axios");

describe("processArticle", () => {
  it("processes images and returns map entry", async () => {
    const mockDownload = vi.fn().mockResolvedValue("images/test.png");
    
    const article = {
      id: 1,
      title: "Test Article",
      description: `<p>Hello<img src="https://test.com/image.png"/></p>`,
      updated_at: "2025-01-01",
    } as any;

    const result = await processArticle(article, "/tmp", { downloadImage: mockDownload });

    expect(result.path).toContain("test_article.md");
    expect(result.title).toBe("Test Article");
  });

  it("handles large batch of articles", async () => {
    const mockDownload = vi.fn().mockResolvedValue("images/test.png");
    
    const articles = Array.from({ length: 100 }).map((_, i) => ({
      id: i,
      title: `Article ${i}`,
      description: `<img src="https://test.com/${i}.png"/>`,
      updated_at: "2025-01-01"
    }));

    const results = await Promise.all(
      articles.map(a => processArticle(a as any, "/tmp", { downloadImage: mockDownload }))
    );

    expect(results.length).toBe(100);
  });
});

describe("downloadImage", () => {
  const TEST_DIR = path.join(__dirname, "fixtures");

  beforeEach(async () => {
    await fs.remove(TEST_DIR);
    await fs.ensureDir(TEST_DIR);
    vi.clearAllMocks();
  });

  it("downloads and saves an image", async () => {
    const mockStream = Readable.from(["fake image content"]);

    (axios as any).mockResolvedValue({
      data: mockStream,
    });

    const url = "https://example.com/image.jpg";

    const result = await downloadImage(url, TEST_DIR);

    expect(result).toBeTruthy();

    const filePath = path.join(TEST_DIR, result!);
    const exists = await fs.pathExists(filePath);

    expect(exists).toBe(true);
  });

  it("returns null on failure", async () => {
    (axios as any).mockRejectedValue(new Error("Network error"));

    const result = await downloadImage("https://bad-url.com/img.jpg", TEST_DIR);

    expect(result).toBeNull();
  });
});