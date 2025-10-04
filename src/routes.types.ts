import type { QueryParamsFactory, QueryParamsReader } from "./query.types.js";

// Utility type to extract dynamic parameters from a path (e.g., '@[handle]' -> { handle: string })
export type ExtractParams<T extends string> =
  T extends `${string}[${infer Param}]${infer Rest}`
    ? { [K in Param | keyof ExtractParams<Rest>]: string }
    : object;

// Distributive helper to extract all generic parts of a Route specialization in one pass.
export type RouteParts<TRoute> =
  TRoute extends Route<
    infer Path extends string,
    infer QueryParams extends QueryParamsReader,
    infer Query extends object,
    infer Meta extends object,
    infer Context extends object
  >
    ? {
        path: Path;
        queryParams: QueryParams;
        query: Query;
        meta: Meta;
        context: Context;
      }
    : never;

// Central wildcard alias (single acceptable any usage) to support self-referential callbacks with 'this'.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WildcardRoute = Route<string, any, any, any, any>;

// Field-level extractors delegate to RouteParts for consistency.
export type ExtractQueryParams<TRoute> =
  RouteParts<TRoute> extends infer R
    ? R extends { queryParams: infer QueryParams }
      ? QueryParams
      : never
    : never;
export type ExtractQuery<TRoute> =
  RouteParts<TRoute> extends infer R
    ? R extends { query: infer Query }
      ? Query
      : never
    : never;
export type ExtractMeta<TRoute> =
  RouteParts<TRoute> extends infer R
    ? R extends { meta: infer Meta }
      ? Meta
      : never
    : never;
export type ExtractContext<TRoute> =
  RouteParts<TRoute> extends infer R
    ? R extends { context: infer Context }
      ? Context
      : never
    : never;

export interface RouteArgs<TRoute extends WildcardRoute> {
  readonly params?: ExtractParams<RouteParts<TRoute>["path"]>;
  readonly queryParams?: RouteParts<TRoute>["queryParams"];
  readonly query?: RouteParts<TRoute>["query"];
  readonly meta?: RouteParts<TRoute>["meta"];
  readonly context?: RouteParts<TRoute>["context"];
}

// Route definition with type-safe parameters
export interface Route<
  Path extends string,
  QueryParams extends QueryParamsReader = QueryParamsReader,
  Query extends object = object,
  Meta extends object = object,
  Context extends object = object,
> {
  readonly path: Path;
  readonly parentPath?: string;
  readonly queryParamsFactory?: QueryParamsFactory<QueryParams>;
  readonly getQuery?: (params: QueryParams) => Query;
  readonly getMeta?: () => Meta;
  readonly encodeQueryValue?: (value: unknown) => string;
  /**
   * Optional whole-query serializer (takes precedence over encodeQueryValue if provided).
   * Must return a URI-encoded query string WITHOUT the leading '?'. Implementations are
   * responsible for encoding keys and values (no automatic lower-casing or encoding applied).
   * Returning an empty string (or only whitespace) results in no query string being appended.
   * Receives the fully materialized typed query along with raw queryParams reader (if a factory exists)
   * so advanced serializers can re-interpret original multi-value inputs if desired.
   */
  readonly serializeQuery?: (
    query: Query,
    args: {
      readonly params: ExtractParams<Path>;
      readonly meta: Meta;
      readonly context: Context;
      /**
       * The QueryParams reader corresponding to this route. Always provided (synthetic if no factory used).
       * Note: For routes without a queryParamsFactory, this is a synthetic reader built from the typed query object.
       */
      readonly queryParams: QueryParams;
    }
  ) => string;
  readonly title: (args: RouteArgs<this>) => string;
  readonly breadcrumb?: (args: RouteArgs<this>) => string;
  readonly href?: (args: RouteArgs<this>) => string;
}

export interface MatchedRoute<TRoute extends WildcardRoute> {
  readonly route: TRoute;
  readonly params: ExtractParams<RouteParts<TRoute>["path"]>;
  readonly query: RouteParts<TRoute>["query"];
  readonly meta: RouteParts<TRoute>["meta"];
  readonly fullPath: string;
  readonly fragment: string;
  readonly title: (context: RouteParts<TRoute>["context"]) => string;
  readonly breadcrumb: (context: RouteParts<TRoute>["context"]) => string;
  readonly href: (context: RouteParts<TRoute>["context"]) => string;
}

// Interface for nested route rendering
export interface NestedRoute<TRoute extends WildcardRoute> {
  readonly route: TRoute;
  // children kept mutable so buildNestedRoutes can push into arrays post-construction
  children: NestedRoute<TRoute>[];
}
