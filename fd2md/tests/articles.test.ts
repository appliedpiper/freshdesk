import { processArticle } from "#/exportFreshdesk";

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