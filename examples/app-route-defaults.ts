import { applyRouteDefaults } from '../src/route-defaults.js';
import { WildcardRoute } from '../src/routes.types.js';
import { appEncodeValue } from './app-encoders.js';
import { AppQueryParams } from './app-query.js';

/**
 * Applies app-specific defaults to a collection of routes.
 */
export interface ApplyAppRouteDefaultsOptions {
  /** Custom query params factory; defaults to AppQueryParams */
  queryParamsFactory?: (raw: Record<string, string[]>) => unknown;
  /** Custom value encoder; defaults to appEncodeValue */
  encodeQueryValue?: (value: unknown) => string;
  /** Optional full query serializer */
  serializeQuery?: (
    query: object,
    args: { readonly params: object; readonly meta: object; readonly context: object; readonly queryParams: unknown },
  ) => string;
}

export function applyAppRouteDefaults<TRoute extends WildcardRoute>(
  routes: TRoute[],
  options: ApplyAppRouteDefaultsOptions = {},
): TRoute[] {
  const {
    queryParamsFactory = (raw: Record<string, string[]>) => new AppQueryParams(raw),
    encodeQueryValue = appEncodeValue,
    serializeQuery,
  } = options;

  return applyRouteDefaults(routes, { queryParamsFactory, encodeQueryValue, serializeQuery });
}
