import { QueryParamsBase } from './query.js';
import type { ExtractQuery, ExtractSerializeQueryArgs, WildcardRoute } from './routes.types.js';

/**
 * Apply framework-level route defaults (query params factory, encoding, serialization) in a reusable, app-agnostic way.
 * Validation mirrors runtime expectations of downstream helpers.
 */
// Overload A: single-argument call (will validate and throw at runtime without options)
export function applyRouteDefaults<TRoute extends WildcardRoute>(routes: readonly TRoute[]): TRoute[];
// Overload B: General array with options (heterogeneous allowed)
export function applyRouteDefaults<TRoute extends WildcardRoute>(
  routes: readonly TRoute[],
  options: {
    /** Default factory to create typed QueryParams reader objects */
    queryParamsFactory?: (raw: Record<string, string[]>) => unknown;
    encodeQueryValue?: (value: unknown) => string;
    serializeQuery?: (query: ExtractQuery<TRoute>, args: ExtractSerializeQueryArgs<TRoute>) => string;
  },
): TRoute[];
// Overload C: Homogeneous non-empty tuple with required factory (slightly stronger inference)
export function applyRouteDefaults<TRoute extends WildcardRoute>(
  routes: readonly [TRoute, ...TRoute[]],
  options: {
    queryParamsFactory: (raw: Record<string, string[]>) => unknown;
    encodeQueryValue?: (value: unknown) => string;
    serializeQuery?: (query: ExtractQuery<TRoute>, args: ExtractSerializeQueryArgs<TRoute>) => string;
  },
): TRoute[];
// Implementation
export function applyRouteDefaults<TRoute extends WildcardRoute>(
  routes: readonly TRoute[],
  options: {
    queryParamsFactory?: (raw: Record<string, string[]>) => unknown;
    encodeQueryValue?: (value: unknown) => string;
    serializeQuery?: (query: ExtractQuery<TRoute>, args: ExtractSerializeQueryArgs<TRoute>) => string;
  } = {},
): TRoute[] {
  const { queryParamsFactory, encodeQueryValue, serializeQuery } = options;

  if (!queryParamsFactory) {
    throw new Error('applyRouteDefaults: A query params factory must be provided.');
  }
  if (!encodeQueryValue && !serializeQuery) {
    throw new Error('applyRouteDefaults: At least one encoding method must be provided.');
  }

  // Return the same structural route type; per-route overrides are preserved.
  return routes.map((r) => {
    const withDefaults = {
      ...r,
      queryParamsFactory:
        r.queryParamsFactory ?? queryParamsFactory ?? ((raw: Record<string, string[]>) => new QueryParamsBase(raw)),
      ...(encodeQueryValue && { encodeQueryValue: r.encodeQueryValue ?? encodeQueryValue }),
      ...(serializeQuery && { serializeQuery: r.serializeQuery ?? serializeQuery }),
    };
    return withDefaults as TRoute;
  });
}
