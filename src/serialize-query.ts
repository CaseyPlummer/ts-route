import { encodeKeyValues } from './helpers.js';
import type { QueryParamsReader } from './query.types.js';
import type { SerializeQueryArgs, WildcardRoute } from './routes.types.js';

/**
 * Basic application-agnostic query serializer that converts a typed query object
 * to a URI-encoded query string WITHOUT the leading '?'.
 *
 * This implementation provides sensible defaults for most use cases:
 * - Filters out null/undefined values
 * - Handles arrays by creating multiple key=value pairs
 * - Uses RFC3986-compliant URI encoding for keys and values
 * - Preserves the original casing of keys and values
 * - Encodes all RFC3986 reserved characters properly
 *
 * @param query - The typed query object to serialize
 * @param args - Additional context (params, meta, context, queryParams)
 * @param route - Optional route for custom encoding behavior
 * @returns URI-encoded query string without leading '?' (empty string if no valid params)
 */
export function serializeQuery<Query extends object>(
  query: Query,
  _args: SerializeQueryArgs<string, QueryParamsReader, object, object>,
  route?: WildcardRoute,
): string {
  if (query == null) return '';

  const entries = Object.entries(query as Record<string, unknown>)
    .filter(([, value]) => value != null)
    .flatMap(([key, value]) => encodeKeyValues(key, value, route));

  return entries.join('&');
}

/**
 * Creates a default serializeQuery function that can be used directly as a route's serializeQuery property.
 * This is useful when you want to apply the basic serialization without additional customization.
 *
 * @param route - Optional route for custom encoding behavior
 * @returns A serializeQuery function bound to the provided route
 *
 * @example
 * ```typescript
 * const route: MyRoute = {
 *   path: 'search',
 *   serializeQuery: createDefaultSerializer(),
 *   // ... other route properties
 * };
 * ```
 */
export function createDefaultSerializer(route?: WildcardRoute) {
  return <Query extends object>(
    query: Query,
    args: SerializeQueryArgs<string, QueryParamsReader, object, object>,
  ): string => serializeQuery(query, args, route);
}
