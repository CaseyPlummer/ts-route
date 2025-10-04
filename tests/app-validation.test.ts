import { describe, expect, it } from 'vitest';
import { RoutePath, appRoutes, type AppRoute } from '../examples/app-routes.js';
import {
  validateDynamicParameters,
  validateParentPath,
  validatePath,
  validateRoutes,
} from '../examples/app-validation.js';

describe('validatePath', () => {
  it('should validate correct paths', () => {
    const route: AppRoute = {
      path: RoutePath.Home,
      title: () => 'Home',
      breadcrumb: () => 'Home',
      getQuery: () => ({}),
    };

    expect(validatePath(route, 0)).toEqual([]);
  });

  it('should detect paths with double slashes', () => {
    const route = {
      path: 'path//with/double/slash',
      title: () => 'Test',
      breadcrumb: () => 'Test',
    } as unknown as AppRoute;

    const errors = validatePath(route, 0);
    expect(errors.length).toBe(1);
    expect(errors[0]).toContain('invalid path');
  });
});

describe('validateDynamicParameters', () => {
  it('should validate correct parameters', () => {
    const route: AppRoute = {
      path: '@[handle]/items/[id]',
      title: () => 'Test',
      breadcrumb: () => 'Test',
    } as unknown as AppRoute;

    expect(validateDynamicParameters(route, 0)).toEqual([]);
  });

  it('should detect duplicate parameters', () => {
    const route = {
      path: '@[handle]/items/[handle]',
      title: () => 'Test',
      breadcrumb: () => 'Test',
    } as unknown as AppRoute;

    const errors = validateDynamicParameters(route, 0);
    expect(errors.length).toBe(1);
    expect(errors[0]).toContain('duplicate parameter names');
  });

  it('should detect invalid parameter names', () => {
    const route = {
      path: '@[0invalid]/items/[id]',
      title: () => 'Test',
      breadcrumb: () => 'Test',
    } as unknown as AppRoute;

    const errors = validateDynamicParameters(route, 0);
    expect(errors.length).toBe(1);
    expect(errors[0]).toContain('invalid parameter name');
  });
});

describe('validateParentPath', () => {
  it('should validate existing parent paths', () => {
    const childRoute: AppRoute = {
      path: RoutePath.Account,
      parentPath: RoutePath.Dashboard,
      title: () => 'Test',
      breadcrumb: () => 'Test',
      getQuery: () => ({}),
    };

    expect(validateParentPath(childRoute, 0, appRoutes)).toEqual([]);
  });

  it('should detect non-existent parent paths', () => {
    const childRoute = {
      path: 'test/path',
      parentPath: 'non-existent-parent',
      title: () => 'Test',
      breadcrumb: () => 'Test',
    } as unknown as AppRoute;

    const errors = validateParentPath(childRoute, 0, appRoutes);
    expect(errors.length).toBe(1);
    expect(errors[0]).toContain('invalid parentPath');
  });
});

describe('validateRoutes', () => {
  it('should validate correct routes', () => {
    // This should not throw an error
    expect(() => validateRoutes(appRoutes)).not.toThrow();
  });

  it('should detect duplicate route paths', () => {
    const duplicateRoutes: AppRoute[] = [
      {
        path: RoutePath.Home,
        title: () => 'Home',
        breadcrumb: () => 'Home',
        getQuery: () => ({}),
      },
      {
        path: RoutePath.Home, // Duplicate path
        title: () => 'Home Duplicate',
        breadcrumb: () => 'Home Duplicate',
        getQuery: () => ({}),
      },
    ];

    expect(() => validateRoutes(duplicateRoutes)).toThrow('Duplicate route path found');
  });

  it('should collect multiple validation errors', () => {
    const invalidRoutes = [
      {
        path: 'path//with/double/slash',
        title: () => 'Test1',
        breadcrumb: () => 'Test1',
      },
      {
        path: '@[0invalid]',
        title: () => 'Test2',
        breadcrumb: () => 'Test2',
      },
    ] as unknown as AppRoute[];

    expect(() => validateRoutes(invalidRoutes)).toThrow();
    try {
      validateRoutes(invalidRoutes);
    } catch (error: unknown) {
      const errorMessage = (error as Error).message;
      expect(errorMessage).toContain('invalid path');
      expect(errorMessage).toContain('invalid parameter name');
    }
  });
});
