import { describe, expect, it } from "vitest";
import type { ExtractParams, Route } from "../src/routes.types.js";

describe("ExtractParams utility", () => {
  it("should extract single param", () => {
    type P = ExtractParams<"@[handle]">;
    const p = { handle: "h" } as P;
    expect(p.handle).toBe("h");
  });

  it("should extract multiple params", () => {
    type P = ExtractParams<"@[handle]/items/[id]">;
    const p = { handle: "h", id: "i" } as P;
    expect(p.id).toBe("i");
  });

  it("should extract complex composite params", () => {
    type P =
      ExtractParams<"[lang]-[region]/categories/[categoryId]/items/[itemId]">;
    const p = { lang: "en", region: "us", categoryId: "c", itemId: "i" } as P;
    expect([p.lang, p.region, p.categoryId, p.itemId]).toEqual([
      "en",
      "us",
      "c",
      "i",
    ]);
  });

  it("should return empty object type when no params", () => {
    type P = ExtractParams<"about/company">;
    const p = {} as P;
    expect(Object.keys(p)).toHaveLength(0);
  });
});

describe("Route generic baseline", () => {
  it("should allow simple route definition", () => {
    type R = Route<"home">;
    const r: R = { path: "home", title: () => "Home" };
    expect(r.title({})).toBe("Home");
  });
});
