import { extractParamNames } from "../src/index.js";
import { RoutePath, type AppRoute } from "./app-routes.js";

// Validation helper functions
export function validatePath(route: AppRoute, index: number): string[] {
  const errors: string[] = [];
  if (!route.path && route.path !== "") {
    errors.push(`Route at index ${index} has an empty path`);
  }
  if (route.path.includes("//")) {
    errors.push(
      `Route at index ${index} has invalid path: ${route.path} (contains '//')`
    );
  }
  return errors;
}

export function validateDynamicParameters(
  route: AppRoute,
  index: number
): string[] {
  const errors: string[] = [];
  const paramNames = extractParamNames(route.path);
  const uniqueParams = new Set(paramNames);
  if (uniqueParams.size < paramNames.length) {
    errors.push(`Route at index ${index} has duplicate parameter names`);
  }
  for (const param of paramNames) {
    if (!/^[a-zA-Z_]\w*$/.test(param)) {
      errors.push(
        `Route at index ${index} has invalid parameter name: ${param}`
      );
    }
  }
  return errors;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function validateQueryParameters(
  route: AppRoute,
  index: number
): string[] {
  const errors: string[] = [];

  // Example validation: Ensure query parameters align with route type
  if (route.path === RoutePath.Register) {
    // Could validate expected query keys (words, attemptCount, when)
  }
  return errors;
}

export function validateParentPath(
  route: AppRoute,
  index: number,
  allRoutes: AppRoute[]
): string[] {
  const errors: string[] = [];
  if (route.parentPath) {
    const parent = allRoutes.find((r) => r.path === route.parentPath);
    if (!parent) {
      errors.push(
        `Route at index ${index} has invalid parentPath: ${route.parentPath}`
      );
    }
  }
  return errors;
}

// Validate a single route
export function validateRoute(
  route: AppRoute,
  index: number,
  allRoutes: AppRoute[]
): string[] {
  return [
    ...validatePath(route, index),
    ...validateDynamicParameters(route, index),
    ...validateQueryParameters(route, index),
    ...validateParentPath(route, index, allRoutes),
  ];
}

// Validate all routes
export function validateRoutes(routes: AppRoute[]): void {
  const errors: string[] = [];
  const pathSet = new Set<string>();

  routes.forEach((route, index) => {
    errors.push(...validateRoute(route, index, routes));
    if (pathSet.has(route.path)) {
      errors.push(`Duplicate route path found: ${route.path}`);
    }
    pathSet.add(route.path);
  });

  if (errors.length > 0) {
    throw new Error(`Route validation failed:\n${errors.join("\n")}`);
  }
}
