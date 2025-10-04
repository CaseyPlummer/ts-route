// Placeholder type for auth state - replace with your actual auth type
export interface AuthState {
  profile?: {
    handle?: string;
  };
}

import {
  getHref as getHrefBase,
  getRoute as getRouteBase,
  findRoute,
  getRelativePart,
  type MatchedRoute,
  type RouteArgs,
  type WildcardRoute,
} from '../src/index.js';
import { appRoutes, type AppRoute, type RoutePath } from './app-routes.js';

export const appName = 'MyApp';
export const preferLowerCaseUrls = true;

export function pageTitle(pageUrl: string | URL): string {
  const relativePart = getRelativePart(pageUrl);
  const route = relativePart !== undefined ? findRoute(relativePart, appRoutes) : undefined;
  const title = route?.title({});
  const prefix = title ? `${title} • ` : '';
  return `${prefix}${appName}`;
}

export type RouteByPath<Path extends RoutePath> = Extract<AppRoute, { path: Path }>;
export type AnyOfPaths<P extends readonly RoutePath[]> = RouteByPath<P[number]>;

// Type guard: check if a runtime path string is one of a compile-time tuple
export function isRoutePath<const P extends readonly RoutePath[]>(path: string, paths: P): path is P[number] {
  return (paths as readonly string[]).includes(path);
}

// Overloads: allow specifying a specific AppRoute subtype for stronger typing
export function getRoute<TRoute extends AppRoute>(pageUrl: string | URL): MatchedRoute<TRoute>;
export function getRoute(pageUrl: string | URL): MatchedRoute<AppRoute>;
export function getRoute(pageUrl: string | URL): MatchedRoute<AppRoute> {
  // Implementation uses wildcard AppRoute array. For generic calls, TS will resolve the overload
  // signature first, then we narrow the returned MatchedRoute via a cast after delegating to core.
  return getRouteBase(pageUrl, appRoutes as readonly AppRoute[]);
}

// Narrow a matched route to a union of specific paths; throws if mismatch
export function getRouteForPaths<const P extends readonly RoutePath[]>(
  pageUrl: string | URL,
  paths: P,
): MatchedRoute<AppRoute> & { route: AnyOfPaths<P> } {
  const matched = getRoute(pageUrl);
  if (!isRoutePath(matched.route.path, paths)) {
    throw new Error(`Expected route path to be one of [${paths.join(', ')}] but found ${matched.route.path}`);
  }
  return matched as MatchedRoute<AppRoute> & { route: AnyOfPaths<P> };
}

export function getHref<Path extends RoutePath>(
  pathOrRoute: Path | RouteByPath<Path>,
  args: RouteArgs<AppRoute> & { fragment?: string } = {},
): string {
  // Locate route
  const route =
    typeof pathOrRoute === 'string'
      ? (appRoutes.find((r) => r.path === pathOrRoute) as RouteByPath<Path> | undefined)
      : pathOrRoute;
  if (!route) {
    const key = typeof pathOrRoute === 'string' ? pathOrRoute : pathOrRoute.path;
    throw new Error(`Route not found for path: ${key}`);
  }
  const href = getHrefBase(
    // Use resolved route object directly to satisfy overload without union expression.
    route as unknown as WildcardRoute,
    appRoutes,
    args,
  );
  if (preferLowerCaseUrls && !route.serializeQuery) return href.toLowerCase();
  return href;
}

export function authToHandle(auth: AuthState | string): string {
  const handle = typeof auth === 'string' ? auth : (auth.profile?.handle ?? '');

  // The developer trying to use this route needs to fix their logic.
  if (!handle)
    throw new Error(
      'No handle found in auth state. Please do not use this route before auth is ready and the user is onboarded.',
    );

  return handle;
}

export function handleMatches(url: string | URL, authOrHandle: AuthState | string | undefined): boolean {
  const route = getRoute(url);
  const routeHandle = (route.params as Record<string, unknown>)['handle'] as string | undefined;
  const authHandle = authOrHandle ? authToHandle(authOrHandle) : undefined;
  if (!routeHandle || !authHandle) return false;
  return routeHandle.toLowerCase() === authHandle.toLowerCase();
}

// If serializeQuery is not used, this can be used as a per-value encoder for query params
export function appEncodeValue(value: unknown): string {
  if (value == null) return '';
  // Handle Date objects - convert to ISO string
  if (value instanceof Date) {
    return encodeURIComponent(value.toISOString());
  }
  if (Array.isArray(value)) return value.map((v) => appEncodeValue(v)).join(',');
  if (typeof value === 'object') {
    // Use custom toString if overridden; otherwise JSON stringify to avoid [object Object]
    const protoToString = Object.prototype.toString;
    const v = value as { toString?: () => string };
    const hasCustom = typeof v.toString === 'function' && v.toString !== protoToString;
    const serialized = hasCustom ? (v.toString?.() ?? '') : JSON.stringify(v);
    return encodeURIComponent(serialized);
  }
  // Primitive fallback (string | number | boolean | symbol | bigint)
  return encodeURIComponent(String(value as string | number | boolean));
}
