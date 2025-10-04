import { QueryParamsBase } from './query.js';
import type { QueryParamsFactory, QueryParamsReader } from './query.types.js';
import type {
  ExtractContext,
  ExtractMeta,
  ExtractParams,
  ExtractQuery,
  ExtractQueryParams,
  MatchedRoute,
  NestedRoute,
  RouteArgs,
  WildcardRoute,
} from './routes.types.js';
import { extractParamNames, getRelativePart, pathToRegex } from './util.js';

// Unified safe stringification used by query param building & value encoding.
// Returns '' for null/undefined and objects which cannot be converted to strings.
export function toSafeString(val: unknown): string {
  if (val == null) return '';
  const t = typeof val;
  switch (t) {
    case 'string':
    case 'number':
    case 'boolean':
    case 'bigint':
      return (val as string | number | boolean | bigint).toString();
    case 'symbol': {
      const desc = (val as symbol).description;
      return desc ?? '';
    }
    case 'object': {
      const obj = val as { toString?: () => string };
      const proto = Object.prototype.toString;
      if (typeof obj.toString === 'function' && obj.toString !== proto) {
        try {
          return obj.toString() ?? '';
        } catch {
          return '';
        }
      }
      try {
        return JSON.stringify(obj);
      } catch {
        return '';
      }
    }
    default:
      return '';
  }
}

export function buildNestedRoutes<TRoute extends WildcardRoute>(routes: TRoute[]): NestedRoute<TRoute>[] {
  const nested: NestedRoute<TRoute>[] = [];
  const routeMap = new Map<string, NestedRoute<TRoute>>();

  for (const route of routes) {
    const nestedRoute: NestedRoute<TRoute> = { route, children: [] };
    routeMap.set(route.path, nestedRoute);
    if (!route.parentPath) {
      nested.push(nestedRoute);
    }
  }

  for (const route of routes) {
    if (route.parentPath) {
      const parent = routeMap.get(route.parentPath);
      const child = routeMap.get(route.path);
      if (parent && child) parent.children.push(child);
    }
  }
  return nested;
}

export const getEmptyString = () => '';
export const getEmptyObject = () => ({});

export function buildBreadcrumbTrail<TRoute extends WildcardRoute>(
  url: string,
  routes: TRoute[],
  context?: ExtractContext<TRoute>,
): string[] {
  const matched = findRoute(url, routes);
  if (!matched) return [];
  const trail: string[] = [];
  let currentRoute: TRoute | undefined = matched.route;
  const params = matched.params;
  const query = matched.query;
  const visited = new Set<string>();
  const maxDepth = 10; // Prevent excessive depth
  let depth = 0;
  while (currentRoute && depth < maxDepth) {
    if (visited.has(currentRoute.path)) {
      // Cycle detected, stop to prevent infinite loop
      break;
    }
    visited.add(currentRoute.path);
    const args = { params, query, context: currentRoute === matched.route ? context : {} };
    const getLabel = currentRoute.breadcrumb ?? currentRoute.title ?? getEmptyString;
    const label = getLabel(args as RouteArgs<TRoute>);
    trail.unshift(label);
    currentRoute = currentRoute.parentPath ? routes.find((r) => r.path === currentRoute!.parentPath) : undefined;
    depth++;
  }
  return trail;
}

export function processQueryValues(valuesByKey: string[]): string[] {
  const trimmed = valuesByKey.map((v) => v.trim()).filter((v) => v !== '');
  // Inbound parsing: preserve first-occurrence ordering while removing duplicates.
  return Array.from(new Set(trimmed));
}

// Build a synthetic QueryParamsReader from an already materialized typed query object.
// Limitations / Notes:
// - Only reflects the outbound typed query provided to buildHref; it does NOT round-trip decode.
// - Multi-values that were collapsed by upstream logic cannot be re-expanded (best-effort only).
// - No locale, numeric or date parsing – consumers should handle specialized formatting.
// - Safe stringification: objects use custom toString or JSON.stringify fallback; failures => ''.
// Enables serializeQuery implementations to use familiar reader APIs (value / values / number / etc.).
export function createQueryParamsFromTyped(queryObj: Record<string, unknown>): QueryParamsReader {
  const raw: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(queryObj)) {
    if (value == null) continue;
    if (Array.isArray(value)) {
      const arr = (value as unknown[])
        .filter((v) => v != null)
        .map((v) => (hasCustomToString(v) ? toSafeString(v) : ''))
        .filter((s) => s !== '');
      if (arr.length) raw[key] = arr;
    } else {
      const s = toSafeString(value);
      if (s !== '') raw[key] = [s];
    }
  }
  return new QueryParamsBase(raw);
}

export function parseUrl<TRoute extends WildcardRoute>(
  urlString: string | URL,
  path: TRoute['path'],
): MatchedRoute<TRoute> | undefined {
  const route: TRoute = { path } as TRoute;
  const routes: TRoute[] = [route];
  return findRoute<TRoute>(urlString, routes);
}

export function findRoute<TRoute extends WildcardRoute>(
  urlString: string | URL,
  routes: readonly TRoute[],
): MatchedRoute<TRoute> | undefined {
  const relativePart = getRelativePart(urlString);
  if (relativePart === undefined) return undefined;
  const urlObj = new URL(relativePart, 'http://localhost');
  const path = decodeURIComponent(urlObj.pathname.replace(/^\/+/, ''));
  const fragment = decodeURIComponent(urlObj.hash.slice(1));
  for (const route of routes) {
    const { regex, paramNames } = pathToRegex(route.path);
    const match = regex.exec(path);
    if (match) {
      const decodedPathParams: Record<string, string> = {};
      for (let i = 0; i < paramNames.length; i++) decodedPathParams[paramNames[i]!] = decodeURIComponent(match[i + 1]!);
      const pathParams = decodedPathParams as ExtractParams<TRoute['path']>;
      const queryParams: Record<string, string[]> = {};
      for (const [key] of urlObj.searchParams) {
        // searchParams.getAll already returns decoded strings; avoid double decoding which can corrupt '%' sequences.
        const valuesByKey = urlObj.searchParams.getAll(key);
        queryParams[key] = processQueryValues(valuesByKey);
      }
      const getQuery = route.getQuery ?? (() => getEmptyObject() as ExtractQuery<TRoute>);
      const getMeta = route.getMeta ?? (() => getEmptyObject() as ExtractMeta<TRoute>);
      const getTitle = route.title ?? getEmptyString;
      const getBreadcrumb = route.breadcrumb ?? route.title ?? getEmptyString;
      const qpFactory: QueryParamsFactory<ExtractQueryParams<TRoute>> | undefined = (
        route as {
          queryParamsFactory?: QueryParamsFactory<ExtractQueryParams<TRoute>>;
        }
      ).queryParamsFactory;
      const qpInstance: ExtractQueryParams<TRoute> = qpFactory
        ? qpFactory(queryParams)
        : (new QueryParamsBase(queryParams) as unknown as ExtractQueryParams<TRoute>);
      const query = getQuery(qpInstance);
      const meta = getMeta();
      const titleFn = (context: ExtractContext<TRoute>) => getTitle({ params: pathParams, query, meta, context });
      const breadcrumbFn = (context: ExtractContext<TRoute>) =>
        getBreadcrumb({ params: pathParams, query, meta, context });
      const hrefFn = (context: ExtractContext<TRoute>) =>
        route.href
          ? route.href({ params: pathParams, query, meta, context })
          : buildHref(route, { params: pathParams, query, meta, context });
      return {
        route,
        params: pathParams,
        query,
        meta,
        fullPath: relativePart,
        fragment,
        title: titleFn,
        breadcrumb: breadcrumbFn,
        href: hrefFn,
      };
    }
  }
  return undefined;
}

export function validatePathParams<TRoute extends WildcardRoute>(
  route: TRoute,
  params: ExtractParams<TRoute['path']> = {} as ExtractParams<TRoute['path']>,
) {
  const requiredParams = extractParamNames(route.path);
  const missingParams = requiredParams.filter(
    (param: string) => !(param in params) || (params as Record<string, unknown>)[param] == null,
  );
  if (missingParams.length > 0) {
    const providedKeys = Object.keys(params as Record<string, unknown>);
    throw new Error(
      `Missing required path parameters: ${missingParams.join(', ')} for route: ${route.path} | provided={${providedKeys.join(', ')}} expected={${requiredParams.join(', ')}}`,
    );
  }
  // Warn (do not throw) if extra params were supplied that are not part of the path definition.
  const providedKeys = Object.keys(params as Record<string, unknown>);
  const extra = providedKeys.filter((k) => !requiredParams.includes(k));
  if (extra.length > 0) {
    console.warn(
      `validatePathParams: unused path param keys will be ignored for route '${route.path}': [${extra.join(', ')}]`,
    );
  }
}

export function buildPath<TRoute extends WildcardRoute>(route: TRoute, params?: ExtractParams<TRoute['path']>) {
  let path = route.path;
  if (params == null) return path;
  for (const [key, value] of Object.entries(params as Record<string, string>)) {
    // Replace ALL occurrences of a dynamic segment; using split/join avoids regex escaping concerns.
    const token = `[${key}]`;
    if (path.includes(token)) {
      const encoded = encodeURIComponent(String(value));
      // split/join approach is faster & avoids RegExp pitfalls with special chars in key
      path = path.split(token).join(encoded);
    }
  }
  // Core no longer forces lowercase; casing policy is delegated to app layer.
  return path;
}

export function encodeValue(value: unknown): string {
  const s = toSafeString(value);
  return s === '' ? '' : encodeURIComponent(s);
}

// Extract raw value from custom encoder or fallback to safe string conversion.
export function getRawEncodedValue(value: unknown, customEncoder?: (v: unknown) => string): string {
  if (!customEncoder) return toSafeString(value);
  try {
    return String(customEncoder(value));
  } catch {
    return '';
  }
}

// Normalize invalid percent escapes by encoding stray '%' characters.
export function normalizePercentEscapes(input: string): string {
  return input.replace(/%(?![0-9A-Fa-f]{2})/g, '%25');
}

// Encode reserved characters while preserving valid percent-encoded sequences.
// Reserved per RFC3986 plus application-specific (& = space) and query separators.
export function encodeReservedChars(input: string): string {
  const reserved = /[\s#&=?/;:@$,]/g;
  let result = '';
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = reserved.exec(input)) !== null) {
    result += input.slice(lastIndex, match.index) + encodeURIComponent(match[0]);
    lastIndex = match.index + match[0].length;
  }
  result += input.slice(lastIndex);
  return result;
}

export function encodeKeyValue(key: string, value: unknown, route?: WildcardRoute): string {
  if (value == null) return '';

  // Contract: custom encodeQueryValue returns an UNENCODED representation; we will encode & sanitize.
  const rawValue = getRawEncodedValue(value, route?.encodeQueryValue);
  if (rawValue === '') return '';

  // Sanitize: fix invalid percent escapes and encode reserved characters
  const normalized = normalizePercentEscapes(rawValue);
  const safe = encodeReservedChars(normalized);

  const encodedKey = encodeURIComponent(key);
  return `${encodedKey}=${safe}`;
}

export function hasCustomToString(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return true;
  const obj = value as { toString?: () => string };
  const proto = Object.prototype.toString;
  return typeof obj.toString === 'function' && obj.toString !== proto;
}

// processArrayValue removed (legacy helper) – logic inlined in encodeKeyValues for clarity & stability.

export function encodeKeyValues(key: string, value: unknown, route?: WildcardRoute): string[] {
  if (value == null) return [];

  if (Array.isArray(value)) {
    const seen = new Set<string>();
    const collected: { raw: string; pair: string }[] = [];
    for (const v of value) {
      if (v == null) continue;
      // Leverage processArrayValue to handle filtering & dedup – adapt to return pair only.
      const safe = toSafeString(v);
      if (seen.has(safe)) continue;
      if (!hasCustomToString(v)) continue;
      seen.add(safe);
      const pair = encodeKeyValue(key, v, route);
      collected.push({ raw: safe, pair });
    }
    collected.sort((a, b) => {
      if (a.raw < b.raw) return -1;
      if (a.raw > b.raw) return 1;
      return 0;
    });
    return collected.map((c) => c.pair);
  }

  const pair = encodeKeyValue(key, value, route);
  return pair ? [pair] : [];
}

export function buildQueryString<TRoute extends WildcardRoute>(
  query: ExtractQuery<TRoute>,
  route?: WildcardRoute,
): string {
  if (query == null) return '';
  const entries = Object.entries(query as Record<string, unknown>)
    .filter(([, value]) => value != null)
    .flatMap(([key, value]) => encodeKeyValues(key, value, route));
  // Core leaves query casing unchanged (keys & values already URI encoded). App layer may transform.
  return entries.join('&');
}

export function hasFragment(obj: object | undefined): obj is { fragment: string } {
  return (
    obj != null &&
    typeof obj === 'object' &&
    'fragment' in obj &&
    typeof (obj as Record<string, unknown>)['fragment'] === 'string'
  );
}

export function buildFragment(fragment: string | undefined): string {
  if (!fragment) return '';
  // Strategy: attempt decode→encode round trip. If stable (case-insensitive for hex) we assume already encoded.
  const original = fragment;
  let decoded: string | null = null;
  try {
    decoded = decodeURIComponent(original);
  } catch {
    decoded = null;
  }
  if (decoded != null) {
    const reEncoded = encodeURIComponent(decoded);
    // Normalize hex case for comparison.
    if (reEncoded.toLowerCase() === original.toLowerCase()) {
      return `#${original}`; // treat as already-encoded fragment
    }
  }
  // Fallback: encode raw input (this will also clean unsafe chars & invalid escapes).
  return `#${encodeURIComponent(original)}`;
}

export function buildHref<TRoute extends WildcardRoute>(
  route: TRoute,
  args?: RouteArgs<TRoute> & {
    fragment?: string;
    queryParams?: ExtractQueryParams<TRoute>;
  },
): string {
  const { params, query, context, fragment, queryParams } = args ?? {};
  // Fragment precedence: explicit args.fragment > context.fragment (if context is fragment-bearing) > none.
  validatePathParams<TRoute>(route, params as ExtractParams<TRoute['path']>);
  const path = buildPath<TRoute>(route, params as ExtractParams<TRoute['path']>);
  let queryString = '';
  if (query) {
    if (route.serializeQuery) {
      // Option B: if a real QueryParamsReader is supplied in args, prefer it; otherwise use synthetic.
      const qpReader = queryParams ?? createQueryParamsFromTyped(query as Record<string, unknown>);
      const serialized = route.serializeQuery(query as ExtractQuery<TRoute>, {
        params: (params as ExtractParams<TRoute['path']>) ?? ({} as ExtractParams<TRoute['path']>),
        meta: (route.getMeta?.() as ExtractMeta<TRoute>) ?? ({} as ExtractMeta<TRoute>),
        context: (context as ExtractContext<TRoute>) ?? ({} as ExtractContext<TRoute>),
        queryParams: qpReader as unknown as ExtractQueryParams<TRoute>,
      });
      const trimmed = serialized.trim();
      if (trimmed !== '') queryString = trimmed; // Do not lower-case; respect user serializer
    } else {
      queryString = buildQueryString(query as ExtractQuery<TRoute>, route);
    }
  }
  const contextFragment = hasFragment(context) ? context.fragment : undefined;
  const _fragment = buildFragment(fragment ?? contextFragment);
  const href = `/${path}${queryString ? `?${queryString}` : ''}${_fragment}`;
  // Core no longer applies global lowercasing; returned href preserves original casing.
  return href;
}

/**
 * Advanced helper that mirrors buildHref but requires an explicit QueryParamsReader.
 * Prefer this when you already have (or wish to override with) a concrete reader rather than
 * relying on the synthetic reconstruction of query parameters.
 */
export function buildHrefWithQueryParams<TRoute extends WildcardRoute>(
  route: TRoute,
  queryParams: ExtractQueryParams<TRoute>,
  args?: Omit<RouteArgs<TRoute>, 'queryParams'> & { fragment?: string },
): string {
  return buildHref(route, { ...(args as RouteArgs<TRoute>), queryParams });
}

// Generic, app-agnostic route lookup function (requires explicit routes array)
export function getRoute<TRoute extends WildcardRoute>(
  pageUrl: string | URL,
  routes: readonly TRoute[],
): MatchedRoute<TRoute> {
  const relativePart = getRelativePart(pageUrl);
  if (relativePart === undefined)
    throw new Error(
      `A valid page URL is required to get the route: ${pageUrl} | type=${typeof pageUrl} value=${String(pageUrl)}`,
    );
  const found = findRoute<TRoute>(relativePart, routes);
  if (!found)
    throw new Error(
      `Route not found for path: ${relativePart} | available=[${routes
        .map((r) => r.path)
        .slice(0, 25)
        .join(', ')}${routes.length > 25 ? ', ...' : ''}]`,
    );
  return found;
}

// Generic helper to build an href from either a path string or a route object (needs routes array for path lookup)
// Overloads for improved inference: allow passing either a route object or a path string constrained to the supplied routes array.
export function getHref<TRoute extends WildcardRoute>(
  pathOrRoute: TRoute,
  routes: readonly TRoute[],
  args?: Partial<RouteArgs<TRoute>> & { fragment?: string },
): string;
export function getHref<TRoute extends WildcardRoute>(
  pathOrRoute: TRoute['path'],
  routes: readonly TRoute[],
  args?: Partial<RouteArgs<TRoute>> & { fragment?: string },
): string;
export function getHref<TRoute extends WildcardRoute>(
  pathOrRoute: TRoute | TRoute['path'],
  routes: readonly TRoute[],
  args?: Partial<RouteArgs<TRoute>> & { fragment?: string },
): string {
  const route: TRoute | undefined =
    typeof pathOrRoute === 'string' ? routes.find((r) => r.path === pathOrRoute) : pathOrRoute;
  if (!route) {
    const key = typeof pathOrRoute === 'string' ? pathOrRoute : pathOrRoute.path;
    throw new Error(
      `Route not found for path: ${key} | attempted=${typeof pathOrRoute} candidates=[${routes
        .map((r) => r.path)
        .slice(0, 25)
        .join(', ')}${routes.length > 25 ? ', ...' : ''}]`,
    );
  }
  // args is Partial<RouteArgs<TRoute>>; buildHref tolerates omitted fields via optional chaining internally.
  return buildHref(route, args as RouteArgs<TRoute>);
}
