import { describe, expect, it } from 'vitest';
import { AuthAction, RoutePath, appRoutes, type ForgotPasswordRoute } from '../examples/app-routes.js';
import { extractParamNames } from '../src/index.js';
import { getHref, getRoute } from '../examples/app-helpers.js';

describe('Route Definitions', () => {
  it('should define all expected route paths in RoutePath enum', () => {
    expect(Object.keys(RoutePath).length).toBe(15);
    expect(RoutePath.Home).toBeDefined();
    expect(RoutePath.Register).toBeDefined();
    expect(RoutePath.SignIn).toBeDefined();
    expect(RoutePath.Dashboard).toBeDefined();
  });

  it('should have matching number of routes in enum and routes array', () => {
    expect(Object.keys(RoutePath).length).toBe(appRoutes.length);
  });

  it('should include all RoutePath enum values in appRoutes array', () => {
    const allPaths = Object.values(RoutePath);
    const routePaths = appRoutes.map((route) => route.path);
    for (const path of allPaths) {
      expect(routePaths).toContain(path);
    }
    for (const path of routePaths) {
      expect(allPaths).toContain(path);
    }
  });

  it('should export all required route type definitions', () => {
    expect(appRoutes.some((r) => r.path === RoutePath.Home)).toBe(true);
    expect(appRoutes.some((r) => r.path === RoutePath.Register)).toBe(true);
    expect(appRoutes.some((r) => r.path === RoutePath.Welcome)).toBe(true);
    expect(appRoutes.some((r) => r.path === RoutePath.Dashboard)).toBe(true);
    expect(appRoutes.some((r) => r.path === RoutePath.AuthAction)).toBe(true);
    expect(appRoutes.some((r) => r.path === RoutePath.VerifyEmail)).toBe(true);
    expect(appRoutes.some((r) => r.path === RoutePath.ForgotPassword)).toBe(true);
    expect(appRoutes.some((r) => r.path === RoutePath.ResetPassword)).toBe(true);
  });
});

describe('Route Path Parsing', () => {
  it('should define correct path values for static routes', () => {
    expect(RoutePath.Home).toBe('');
    expect(RoutePath.Register).toBe('register');
    expect(RoutePath.Welcome).toBe('welcome');
    expect(RoutePath.SignIn).toBe('sign-in');
    expect(RoutePath.SignOut).toBe('sign-out');
  });

  it('should define correct path values for user-specific dynamic routes', () => {
    expect(RoutePath.Dashboard).toBe('@[handle]');
    expect(RoutePath.Account).toBe('@[handle]/account');
    expect(RoutePath.Profile).toBe('@[handle]/profile');
  });

  it('should extract correct parameter names from route paths', () => {
    expect(extractParamNames(RoutePath.Home)).toEqual([]);
    expect(extractParamNames(RoutePath.Register)).toEqual([]);
    expect(extractParamNames(RoutePath.Dashboard)).toEqual(['handle']);
  });

  it('should handle URL encoding in dynamic route parameters', () => {
    const result = getRoute('/@john%20doe/account');
    expect(result.params).toEqual({
      handle: 'john doe',
    });
  });
});

describe('Authentication Routes', () => {
  it('should define correct path values for auth-related routes', () => {
    expect(RoutePath.AuthAction).toBe('auth-action');
    expect(RoutePath.VerifyEmail).toBe('verify-email');
    expect(RoutePath.VerifyEmailApply).toBe('verify-email/apply');
    expect(RoutePath.ForgotPassword).toBe('forgot-password');
    expect(RoutePath.ResetPassword).toBe('reset-password');
  });

  it('should define correct AuthAction enum values', () => {
    expect(AuthAction.verifyEmail).toBe('verifyEmail');
    expect(AuthAction.resetPassword).toBe('resetPassword');
    expect(AuthAction.recoverEmail).toBe('recoverEmail');
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
    // REDUNDANT: Similar to next test but with a specific example
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
    expect(verifyEmailRoute.query).toEqual({
      registered: true,
      code: 'abc123',
    });

    const verifyEmailFalseRoute = getRoute('/verify-email?registered=false');
    expect(verifyEmailFalseRoute.query).toEqual({
      registered: false,
      code: undefined,
    });
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
    // REDUNDANT: Overlaps with previous test
  });

  it('should parse reset password query parameters', () => {
    const resetPasswordRoute = getRoute('/reset-password?code=abc123');
    expect(resetPasswordRoute.route.path).toBe(RoutePath.ResetPassword);
    expect(resetPasswordRoute.query).toEqual({ code: 'abc123' });
  });
});

describe('Route Hierarchy and Relationships', () => {
  it('should maintain correct parent-child relationships in route configuration', () => {
    const dashboardRoute = appRoutes.find((r) => r.path === RoutePath.Dashboard);
    const accountRoute = appRoutes.find((r) => r.path === RoutePath.Account);

    expect(dashboardRoute?.parentPath).toBeUndefined();
    expect(accountRoute?.parentPath).toBe(RoutePath.Dashboard);
  });

  it('should correctly identify parent routes in parsed URLs', () => {
    const accountUrl = getHref(RoutePath.Account, {
      params: { handle: 'user' },
    });
    const accountRoute = getRoute(accountUrl);
    expect(accountRoute.route.parentPath).toBe(RoutePath.Dashboard);
    const profileUrl = getHref(RoutePath.Profile, {
      params: { handle: 'user' },
    });
    expect(profileUrl).toBe('/@user/profile');
  });
});

// Helper to build a fully-qualified URL from our href builder
function toUrl(href: string): URL {
  return new URL(href.startsWith('http') ? href : `https://example.com${href}`);
}
