import { findRoute } from "../src/helpers.js";
import { describe, expect, it } from "vitest";
import { AppQueryParams } from "../examples/app-query.js";

// Tests for the derived class (numeric, boolean helpers)
describe("AppQueryParams", () => {
  it("number() should parse numbers and ignore invalid", () => {
    const params = new AppQueryParams({
      count: "42",
      invalid: "abc",
      empty: "",
    });
    expect(params.number("count")).toBe(42);
    expect(params.number("invalid")).toBeUndefined();
    expect(params.number("empty")).toBeUndefined();
    expect(params.number("missing")).toBeUndefined();
  });

  it("boolean() should parse boolean values", () => {
    const params = new AppQueryParams({
      active: "true",
      inactive: "false",
      invalid: "maybe",
    });
    expect(params.boolean("active")).toBe(true);
    expect(params.boolean("inactive")).toBe(false);
    expect(params.boolean("invalid")).toBeUndefined();
    expect(params.boolean("missing")).toBeUndefined();
  });
});

// Integration tests relying on routing & getQuery usage of derived helpers
describe("AppQueryParams integration with routing", () => {
  it("should decode special characters in complex URLs", () => {
    const routes = [
      {
        path: "search/[term]",
        getQuery: (params: AppQueryParams) => ({
          sort: params.value("sort"),
        }),
        title: () => "Search",
      },
    ];
    const url =
      "/search/complex%20query%20with%20%26%20special%20characters?sort=relevance";
    const result = findRoute(url, routes);
    expect(result?.params).toEqual({
      term: "complex query with & special characters",
    });
    expect(result?.query).toEqual({ sort: "relevance" });
  });

  it("should deduplicate repeated query parameters", () => {
    const routes = [
      {
        path: "filter",
        getQuery: (params: AppQueryParams) => ({
          tags: params.values("tag"),
        }),
        title: () => "Filters",
      },
    ];
    const url = "/filter?tag=red&tag=blue&tag=green&tag=red";
    // The inline route object matches Route<'filter', AppQueryParams, { tags: string[] }, object, object>
    const result = findRoute<(typeof routes)[number]>(url, routes);
    expect(result?.query).toEqual({ tags: ["red", "blue", "green"] });
  });
});
