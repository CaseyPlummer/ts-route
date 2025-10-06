import type { QueryParamsFactory, QueryParamsReader } from './query.types.js';

// Utility type to extract dynamic parameters from a path (e.g., '@[handle]' -> { handle: string })
export type ExtractParams<T extends string> = T extends `${string}[${infer Param}]${infer Rest}`
  ? { [K in Param | keyof ExtractParams<Rest>]: string }
  : object;

/**
 * Type-safe route definition.
 * @template Path - URL path pattern with optional params (e.g., '@[handle]/posts/[id]')
 * @template QueryParams - Query parameter reader with typed getters
 * @template Query - Typed query object derived from QueryParams
 * @template Meta - Additional route metadata (e.g. route info for dynamic components)
 * @template Context - Runtime context for dynamic titles/breadcrumbs (e.g., entity names)
 */
export interface Route<
  Path extends string,
  QueryParams extends QueryParamsReader = QueryParamsReader,
  Query extends object = object,
  Meta extends object = object,
  Context extends object = object,
> {
  /** URL path pattern with optional params (e.g., '@[handle]', 'posts/[id]') */
  readonly path: Path;
  /** Parent route path for hierarchical routing */
  readonly parentPath?: string;
  /** Factory to create QueryParams reader from URLSearchParams */
  readonly queryParamsFactory?: QueryParamsFactory<QueryParams>;
  /** Derives typed query object from QueryParams reader */
  readonly getQuery?: (params: QueryParams) => Query;
  /** Provides route metadata */
  readonly getMeta?: () => Meta;
  /** Encodes individual query values (fallback for serializeQuery) */
  readonly encodeQueryValue?: (value: unknown) => string;
  /** Custom query serializer (takes precedence over encodeQueryValue).
   * Must return URI-encoded string WITHOUT leading '?'. Empty string = no query.  */
  readonly serializeQuery?: (query: Query, args: SerializeQueryArgs<Path, QueryParams, Meta, Context>) => string;
  /** Generates page title from route arguments */
  readonly title: (args: RouteArgs<this>) => string;
  /** Generates breadcrumb label from route arguments */
  readonly breadcrumb?: (args: RouteArgs<this>) => string;
  /** Generates full href from route arguments */
  readonly href?: (args: RouteArgs<this>) => string;
}

// Central wildcard alias (single acceptable any usage) to support self-referential callbacks with 'this'.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WildcardRoute = Route<string, any, any, any, any>;

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

// Field-level extractors delegate to RouteParts for consistency.
export type ExtractQueryParams<TRoute> =
  RouteParts<TRoute> extends infer R ? (R extends { queryParams: infer QueryParams } ? QueryParams : never) : never;
export type ExtractQuery<TRoute> =
  RouteParts<TRoute> extends infer R ? (R extends { query: infer Query } ? Query : never) : never;
export type ExtractMeta<TRoute> =
  RouteParts<TRoute> extends infer R ? (R extends { meta: infer Meta } ? Meta : never) : never;
export type ExtractContext<TRoute> =
  RouteParts<TRoute> extends infer R ? (R extends { context: infer Context } ? Context : never) : never;

export type SerializeQueryArgs<
  Path extends string,
  QueryParams extends QueryParamsReader,
  Meta extends object = object,
  Context extends object = object,
> = {
  /** The QueryParams reader corresponding to this route. Always provided (synthetic if no factory used).
   * Note: For routes without a queryParamsFactory, this is a synthetic reader built from the typed query object. */
  readonly queryParams: QueryParams;
  readonly params: ExtractParams<Path>;
  readonly meta: Meta;
  readonly context: Context;
};

// Convenience helper to derive SerializeQueryArgs for a given Route type in one step.
export type ExtractSerializeQueryArgs<TRoute extends WildcardRoute> = SerializeQueryArgs<
  RouteParts<TRoute>['path'],
  ExtractQueryParams<TRoute>,
  ExtractMeta<TRoute>,
  ExtractContext<TRoute>
>;

export interface RouteArgs<TRoute extends WildcardRoute> {
  readonly params?: ExtractParams<RouteParts<TRoute>['path']>;
  readonly queryParams?: RouteParts<TRoute>['queryParams'];
  readonly query?: RouteParts<TRoute>['query'];
  readonly meta?: RouteParts<TRoute>['meta'];
  readonly context?: RouteParts<TRoute>['context'];
}

export interface MatchedRoute<TRoute extends WildcardRoute> {
  readonly route: TRoute;
  readonly params: ExtractParams<RouteParts<TRoute>['path']>;
  readonly query: RouteParts<TRoute>['query'];
  readonly meta: RouteParts<TRoute>['meta'];
  readonly fullPath: string;
  readonly fragment: string;
  readonly title: (context: RouteParts<TRoute>['context']) => string;
  readonly breadcrumb: (context: RouteParts<TRoute>['context']) => string;
  readonly href: (context: RouteParts<TRoute>['context']) => string;
}

// Interface for nested route rendering
export interface NestedRoute<TRoute extends WildcardRoute> {
  readonly route: TRoute;
  // children kept mutable so buildNestedRoutes can push into arrays post-construction
  children: NestedRoute<TRoute>[];
}
