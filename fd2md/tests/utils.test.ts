import fs from "fs-extra";
import path from "path";
import { slugify, validateAndNormalizeUrl, updateInternalLinks } from "#/exportFreshdesk";

const TEST_DIR = path.join(__dirname, "fixtures");

describe("slugify", () => {

  it("should convert a string to a slug", () => {
    const input = "Hello World!";
    const expectedOutput = "hello_world";
    expect(slugify(input)).toBe(expectedOutput);
  });

  it("should handle multiple spaces and special characters", () => {
    const input = "  This is a test!  ";
    const expectedOutput = "this_is_a_test";
    expect(slugify(input)).toBe(expectedOutput);
  });

  it("should convert to lowercase", () => {
    const input = "UPPERCASE STRING";
    const expectedOutput = "uppercase_string";
    expect(slugify(input)).toBe(expectedOutput);
  });

  it("should handle empty strings", () => {
    const input = "";
    const expectedOutput = "";
    expect(slugify(input)).toBe(expectedOutput);
  });
});

describe("validateAndNormalizeUrl", () => {
  const domain = "example.freshdesk.com";

  it("returns null for undefined", () => {
    expect(validateAndNormalizeUrl(undefined, domain)).toBeNull();
  });

  it("handles relative URLs", () => {
    expect(
      validateAndNormalizeUrl("/path/image.png", domain)
    ).toBe("https://example.freshdesk.com/path/image.png");
  });

  it("rejects invalid URLs", () => {
    expect(validateAndNormalizeUrl("not-a-url", domain)).toBeNull();
  });

  it("accepts valid https URLs", () => {
    expect(
      validateAndNormalizeUrl("https://test.com/img.png", domain)
    ).toBe("https://test.com/img.png");
  });

});

describe("updateInternalLinks", () => {
  it("rewrites Freshdesk article links to local markdown paths", async () => {
    const filePath = path.join(TEST_DIR, "test.md");

    const content = `
# Test

See this article:
https://example.com/solutions/articles/123
`;

    await fs.writeFile(filePath, content);

    const articleMap = new Map([
      [
        123,
        {
          path: "folder/article.md",
          title: "Test Article",
          updated_at: "2025-01-01",
        },
      ],
    ]);
    await updateInternalLinks(articleMap, TEST_DIR);

    const updated = await fs.readFile(filePath, "utf-8");

    expect(updated).toContain("folder/article.md");
    expect(updated).not.toContain("solutions/articles/123");
  });

  it("creates correct relative paths for nested files", async () => {
    const nestedDir = path.join(TEST_DIR, "cat");
    await fs.ensureDir(nestedDir);

    const filePath = path.join(nestedDir, "test.md");

    const content = `https://example.com/solutions/articles/123`;

    await fs.writeFile(filePath, content);

    const articleMap = new Map([
      [123, { path: "folder/article.md", title: "", updated_at: "" }],
    ]);

    await updateInternalLinks(articleMap, TEST_DIR);

    const updated = await fs.readFile(filePath, "utf-8");

    expect(updated).toContain("../folder/article.md");
  });

  it("leaves link unchanged if mapping is missing", async () => {
    const filePath = path.join(TEST_DIR, "test.md");

    const content = `https://example.com/solutions/articles/999`;

    await fs.writeFile(filePath, content);

    await updateInternalLinks(new Map(), TEST_DIR);

    const updated = await fs.readFile(filePath, "utf-8");

    expect(updated).toContain("solutions/articles/999");
  });
});