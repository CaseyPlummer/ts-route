import { buildHref, type Route } from '../src/index.js';
import { describe, expect, it } from 'vitest';
import { appName, getHref, getRoute, getRouteForPaths, isRoutePath, pageTitle } from '../examples/app-helpers.js';
import { AppQueryParams } from '../examples/app-query.js';
import {
  AuthAction,
  ForgotPasswordRoute,
  RoutePath,
  type DashboardRoute,
  type PostRoute,
} from '../examples/app-routes.js';
import { applyAppRouteDefaults } from '../examples/app-route-defaults.js';
import { WildcardRoute } from '../src/routes.types.js';
import { QueryParamsBase } from '../src/query.js';

describe('app-specific route helpers', () => {
  it('core buildHref preserves casing (fragment & percent-encodings unchanged)', () => {
    // Use a standalone core-only route not part of appRoutes; we call buildHref directly
    const coreRoute: Route<'core/[term]', AppQueryParams, { filter: string }> = {
      path: 'core/[term]',
      title: () => 'Core',
      getQuery: (p) => ({ filter: p.value('filter') ?? '' }),
    };
    const href = buildHref(coreRoute, {
      params: { term: 'React & Typescript' },
      query: { filter: 'Category:Web' },
      context: { fragment: 'Results' },
    });
    expect(href).toBe('/core/React%20%26%20Typescript?filter=Category%3AWeb#Results');
  });

  it('app getHref applies lowercase policy for known route and preserves custom serializeQuery casing via core buildHref', () => {
    // Use a known existing route path (Register) to test lowercase policy (no params/query for simplicity)
    const registerHref = getHref(RoutePath.Register);
    expect(registerHref).toBe('/register'); // already lowercase

    // For preservation test use a core-only temp route with serializeQuery directly via buildHref
    const tempRoute: Route<'preserve', AppQueryParams, { Filter: string }> = {
      path: 'preserve',
      title: () => 'Preserve',
      getQuery: (p) => ({ Filter: p.value('Filter') ?? '' }),
      serializeQuery: (q, qp) => {
        // minimal usage of queryParams to satisfy linter (no-op side effect)
        qp.queryParams.value('__unused__');
        return `Filter=${encodeURIComponent(q.Filter)}`;
      },
    };
    const preserved = buildHref(tempRoute, { query: { Filter: 'Category:Web' }, context: { fragment: 'Results' } });
    expect(preserved).toBe('/preserve?Filter=Category%3AWeb#Results');
  });

  it('query param safety with AppQueryParams', () => {
    type SearchRoute = Route<'search', AppQueryParams, { q: string; page: number }>;
    const searchRoute: SearchRoute = {
      path: 'search',
      getQuery: (params) => ({ q: params.value('q') ?? '', page: params.number('page') ?? 1 }),
      title: () => 'Search Results',
      breadcrumb: () => 'Search Results',
    };
    const href = buildHref(searchRoute, { query: { q: 'typescript', page: 2 } });
    expect(href).toBe('/search?q=typescript&page=2');
  });
});

describe('pageTitle', () => {
  it('should generate correct titles for static routes', () => {
    expect(pageTitle('/')).toBe('Home • MyApp');
    expect(pageTitle('/register')).toBe('Register • MyApp');
    expect(pageTitle('/sign-in')).toBe('Sign In • MyApp');
  });

  it('should generate correct titles for dynamic routes', () => {
    expect(pageTitle('/@user')).toBe('Dashboard • MyApp');
    expect(pageTitle('/@user/account')).toBe('Account • MyApp');
    expect(pageTitle('/@user/profile')).toBe('Profile • MyApp');
  });

  it('should generate correct titles for routes with query parameters and fragments', () => {
    expect(pageTitle('/register?param=value#fragment')).toBe('Register • MyApp');
    expect(pageTitle('/@user?search=term#section')).toBe('Dashboard • MyApp');
    expect(pageTitle('/auth-action?mode=verifyEmail&oobCode=abc123')).toBe('Authentication Action • MyApp');
    expect(pageTitle('/forgot-password?email=user@example.com')).toBe('Forgot Password • MyApp');
  });

  it('should handle URL objects for title generation', () => {
    expect(pageTitle(new URL('http://example.com/'))).toBe('Home • MyApp');
    expect(pageTitle(new URL('http://example.com/register'))).toBe('Register • MyApp');
    expect(pageTitle(new URL('/@user/profile', 'https://example.com'))).toBe('Profile • MyApp');
  });

  it('should handle invalid or edge case inputs for title generation', () => {
    expect(pageTitle('')).toBe('Home • MyApp');
    expect(pageTitle('/unknown-route')).toBe('MyApp');
    // @ts-expect-error Testing
    expect(pageTitle(null)).toBe('MyApp');
    // @ts-expect-error Testing
    expect(pageTitle(undefined)).toBe('MyApp');
    // @ts-expect-error Testing
    expect(pageTitle(123)).toBe('MyApp');
    // @ts-expect-error Testing
    expect(pageTitle(true)).toBe('MyApp');
  });
});

describe('getRoute', () => {
  it('should retrieve correct route objects for static routes', () => {
    const homeRoute = getRoute('/');
    expect(homeRoute.route.path).toBe(RoutePath.Home);

    const registerRoute = getRoute('/register');
    expect(registerRoute.route.path).toBe(RoutePath.Register);
  });

  it('should retrieve correct route objects with parameters for dynamic routes', () => {
    const dashboardRoute = getRoute('/@user');
    expect(dashboardRoute.route.path).toBe(RoutePath.Dashboard);
    expect(dashboardRoute.params).toEqual({ handle: 'user' });

    const postRoute = getRoute('/post/123');
    expect(postRoute.route.path).toBe(RoutePath.Post);
    expect(postRoute.params).toEqual({ id: '123' });
  });

  it('should handle URL encoding in dynamic route parameters', () => {
    const result = getRoute('/@john%20doe');
    expect(result.params).toEqual({
      handle: 'john doe',
    });
  });

  it('should handle URL objects for route retrieval', () => {
    const homeRoute = getRoute(new URL('http://example.com/'));
    expect(homeRoute.route.path).toBe(RoutePath.Home);

    const registerRoute = getRoute(new URL('http://example.com/register'));
    expect(registerRoute.route.path).toBe(RoutePath.Register);

    const url = new URL('/register', 'https://example.com');
    const route = getRoute(url);
    expect(route.route.path).toBe(RoutePath.Register);
  });

  it('should throw errors for invalid or non-existent routes', () => {
    expect(() => getRoute('/non-existent-path')).toThrow('Route not found for path: non-existent-path');
    expect(() => getRoute('http://')).toThrow('A valid page URL is required to get the route');
    expect(() => getRoute('https://')).toThrow('A valid page URL is required to get the route');
    // @ts-expect-error Testing
    expect(() => getRoute(null)).toThrow('A valid page URL is required');
    // @ts-expect-error Testing
    expect(() => getRoute(undefined)).toThrow('A valid page URL is required');
    // @ts-expect-error Testing
    expect(() => getRoute(123)).toThrow('A valid page URL is required');
    // @ts-expect-error Testing
    expect(() => getRoute({})).toThrow('A valid page URL is required');
  });

  it('should roundtrip correctly between getHref and getRoute', () => {
    const postUrl = getHref(RoutePath.Post, {
      params: { id: '123' },
      query: { someQuery: 'value' },
    });
    const result = getRoute<PostRoute>(postUrl);
    expect(result.route.path).toBe(RoutePath.Post);
    expect(result.params).toEqual({ id: '123' });
  });

  it('should parse auth action query parameters correctly', () => {
    const url =
      'http://localhost:5173/auth-action?mode=verifyEmail&oobCode=lBi5bCqYPyfguE6bUEM-_KE0c52bxYn97Wsr8x6_61IAAAGWgvDSmg&apiKey=000000000000000000000000000000000000000&lang=en';
    const authActionRoute = getRoute(url);
    expect(authActionRoute.route.path).toBe(RoutePath.AuthAction);
    expect(authActionRoute.query).toEqual({
      mode: AuthAction.verifyEmail,
      code: 'lBi5bCqYPyfguE6bUEM-_KE0c52bxYn97Wsr8x6_61IAAAGWgvDSmg',
      continueUrl: undefined,
      apiKey: '000000000000000000000000000000000000000',
      lang: 'en',
    });
  });

  it('should parse auth action query parameters for various modes', () => {
    const verifyEmailRoute = getRoute('/auth-action?mode=verifyEmail&oobCode=abc123&continueUrl=http://example.com');
    expect(verifyEmailRoute.route.path).toBe(RoutePath.AuthAction);
    expect(verifyEmailRoute.query).toEqual({
      mode: AuthAction.verifyEmail,
      code: 'abc123',
      continueUrl: 'http://example.com',
    });

    const resetPasswordRoute = getRoute(new URL('http://example.com/auth-action?mode=resetPassword&oobCode=xyz789'));
    expect(resetPasswordRoute.route.path).toBe(RoutePath.AuthAction);
    expect(resetPasswordRoute.query).toEqual({
      mode: AuthAction.resetPassword,
      code: 'xyz789',
      continueUrl: undefined,
    });
  });

  it('should parse verify email query parameters', () => {
    const verifyEmailRoute = getRoute('/verify-email?registered=true&code=abc123');
    expect(verifyEmailRoute.route.path).toBe(RoutePath.VerifyEmail);
    expect(verifyEmailRoute.query).toEqual({ registered: true, code: 'abc123' });

    const verifyEmailFalseRoute = getRoute('/verify-email?registered=false');
    expect(verifyEmailFalseRoute.query).toEqual({ registered: false, code: undefined });
  });

  it('should parse verify email apply query parameters', () => {
    const applyRoute = getRoute('/verify-email/apply?code=abc123');
    expect(applyRoute.route.path).toBe(RoutePath.VerifyEmailApply);
    expect(applyRoute.query).toEqual({ code: 'abc123' });
  });

  it('should parse forgot password query parameters', () => {
    const forgotPasswordRoute = getRoute('/forgot-password?email=user@example.com');
    expect(forgotPasswordRoute.route.path).toBe(RoutePath.ForgotPassword);
    expect(forgotPasswordRoute.query).toEqual({ email: 'user@example.com' });

    const url = new URL('/forgot-password?email=user%40example.com', 'https://example.com');
    const route = getRoute<ForgotPasswordRoute>(url);
    expect(route.route.path).toBe(RoutePath.ForgotPassword);
    expect(route.query).toEqual({ email: 'user@example.com' });
  });

  it('should parse reset password query parameters', () => {
    const resetPasswordRoute = getRoute('/reset-password?code=abc123');
    expect(resetPasswordRoute.route.path).toBe(RoutePath.ResetPassword);
    expect(resetPasswordRoute.query).toEqual({ code: 'abc123' });
  });
});

describe('getHref', () => {
  it('should generate correct hrefs for static routes', () => {
    expect(getHref(RoutePath.Home)).toBe('/');
    expect(getHref(RoutePath.Register)).toBe('/register');
    expect(getHref(RoutePath.SignIn)).toBe('/sign-in');
  });

  it('should generate correct hrefs for dynamic routes with parameters', () => {
    expect(getHref(RoutePath.Dashboard, { params: { handle: 'user123' } })).toBe('/@user123');
    expect(getHref(RoutePath.Account, { params: { handle: 'john' } })).toBe('/@john/account');
    expect(getHref(RoutePath.Profile, { params: { handle: 'jane' } })).toBe('/@jane/profile');
    expect(getHref(RoutePath.Post, { params: { id: '123' } })).toBe('/post/123');
  });

  it('should encode special characters in parameters and query parameters', () => {
    expect(getHref(RoutePath.Dashboard, { params: { handle: 'user name' } })).toBe('/@user%20name');
    expect(getHref(RoutePath.Post, { params: { id: 'my post' } })).toBe('/post/my%20post');
    expect(getHref(RoutePath.ForgotPassword, { query: { email: 'test@example.com' } })).toBe(
      '/forgot-password?email=test%40example.com',
    );
    expect(getHref(RoutePath.AuthAction, { query: { continueUrl: 'http://example.com/path?q=test' } })).toBe(
      '/auth-action?continueurl=http%3a%2f%2fexample.com%2fpath%3fq%3dtest',
    );
  });

  it('should include query parameters and fragments in hrefs', () => {
    expect(getHref(RoutePath.AuthAction, { query: { mode: AuthAction.verifyEmail, code: 'abc123' } })).toBe(
      '/auth-action?mode=verifyemail&code=abc123',
    );
    expect(getHref(RoutePath.VerifyEmail, { query: { registered: true, code: 'xyz789' } })).toBe(
      '/verify-email?registered=true&code=xyz789',
    );
    expect(getHref(RoutePath.Home, { fragment: 'section1' })).toBe('/#section1');
    expect(getHref(RoutePath.Post, { params: { id: '123' }, fragment: 'details' })).toBe('/post/123#details');
    expect(getHref(RoutePath.VerifyEmail, { query: { registered: true }, fragment: 'step2' })).toBe(
      '/verify-email?registered=true#step2',
    );
  });

  it('should handle edge cases for query parameters and empty inputs', () => {
    expect(getHref(RoutePath.AuthAction)).toBe('/auth-action');
    expect(getHref(RoutePath.VerifyEmail, { query: { registered: undefined, code: undefined } })).toBe('/verify-email');
    expect(getHref(RoutePath.VerifyEmail, { query: { registered: true } })).toBe('/verify-email?registered=true');
    expect(getHref(RoutePath.VerifyEmail, { query: { registered: false } })).toBe('/verify-email?registered=false');
    expect(getHref(RoutePath.Dashboard, { params: { handle: '' } })).toBe('/@');
  });

  it('should throw errors for invalid or missing inputs', () => {
    // Cast to satisfy typing; intentional runtime failure path
    expect(() => getHref('non-existent-path' as unknown as RoutePath)).toThrow(
      'Route not found for path: non-existent-path',
    );
    expect(() => getHref(RoutePath.Dashboard)).toThrow();
    // Missing required param 'id'
    expect(() => getHref(RoutePath.Post)).toThrow();
  });

  it('should correctly identify parent routes in parsed URLs', () => {
    const accountUrl = getHref(RoutePath.Account, { params: { handle: 'user' } });
    const accountRoute = getRoute(accountUrl);
    expect(accountRoute.route.parentPath).toBe(RoutePath.Dashboard);

    const profileUrl = getHref(RoutePath.Profile, { params: { handle: 'user' } });
    expect(profileUrl).toBe('/@user/profile');
  });
});

// Helper to build a fully-qualified URL from our href builder
function toUrl(href: string): URL {
  return new URL(href.startsWith('http') ? href : `https://example.com${href}`);
}

describe('Union path narrowing utilities', () => {
  // Runtime type guard for sidebar meta objects carrying hasLists
  interface HasLists {
    hasLists: boolean;
  }
  function hasListsMeta(meta: unknown): meta is HasLists {
    return (
      !!meta &&
      typeof meta === 'object' &&
      'hasLists' in meta &&
      typeof (meta as Record<string, unknown>)['hasLists'] === 'boolean'
    );
  }

  it('isRoutePath should narrow path strings', () => {
    const tuple = [RoutePath.Account, RoutePath.Profile] as const;
    const p: string = RoutePath.Account;
    if (isRoutePath(p, tuple)) {
      // Within this branch p is narrowed to the union of tuple elements
      const narrowed: (typeof tuple)[number] = p;
      expect(narrowed).toBe(RoutePath.Account);
    } else {
      throw new Error('Expected narrowing to succeed');
    }
  });

  it('getRouteForPaths should return a matched route with union type', () => {
    const accountHref = getHref(RoutePath.Account, { params: { handle: 'abc' } });
    const profileHref = getHref(RoutePath.Profile, { params: { handle: 'abc' } });
    const tuple = [RoutePath.Account, RoutePath.Profile] as const;

    const accountMatch = getRouteForPaths(toUrl(accountHref), tuple);
    expect(tuple).toContain(accountMatch.route.path);
    // Account and Profile routes don't have hasLists meta, so just check they exist
    expect(accountMatch.meta).toBeDefined();

    const profileMatch = getRouteForPaths(toUrl(profileHref), tuple);
    expect(tuple).toContain(profileMatch.route.path);
    // Account and Profile routes don't have hasLists meta, so just check they exist
    expect(profileMatch.meta).toBeDefined();
  });

  it('getRouteForPaths should throw when the path is not in the allowed set', () => {
    const authHref = getHref(RoutePath.AuthAction);
    const tuple = [RoutePath.Account, RoutePath.Profile] as const;
    expect(() => getRouteForPaths(toUrl(authHref), tuple)).toThrowError(/Expected route path/);
  });
});

describe('applyAppRouteDefaults', () => {
  const testRoutes: WildcardRoute[] = [
    { path: 'test1', title: () => 'Test 1' },
    { path: 'test2', title: () => 'Test 2' },
  ];

  it('applies defaults when encoder provided', () => {
    const encoder = (v: unknown) => String(v);
    const result = applyAppRouteDefaults(testRoutes, { encodeQueryValue: encoder });
    expect(result).toHaveLength(2);
    expect(result[0].encodeQueryValue).toBe(encoder);
  });

  it('applies defaults when serializeQuery provided', () => {
    const serializeQuery = () => 'test=serialized';
    const result = applyAppRouteDefaults(testRoutes, { serializeQuery });
    expect(result[0].serializeQuery).toBe(serializeQuery);
  });

  it('applies defaults when both encoder and serializeQuery provided', () => {
    const encoder = (v: unknown) => String(v);
    const serializeQuery = () => 'test=serialized';
    const result = applyAppRouteDefaults(testRoutes, { encodeQueryValue: encoder, serializeQuery });
    expect(result[0].encodeQueryValue).toBe(encoder);
    expect(result[0].serializeQuery).toBe(serializeQuery);
  });

  it('uses default queryParamsFactory when not provided', () => {
    const encoder = (v: unknown) => String(v);
    const result = applyAppRouteDefaults(testRoutes, { encodeQueryValue: encoder });
    const factory = result[0].queryParamsFactory!;
    const instance = factory({ test: ['value'] });
    expect(instance).toBeInstanceOf(QueryParamsBase);
  });
});
