import { slugify } from "#/exportFreshdesk";

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