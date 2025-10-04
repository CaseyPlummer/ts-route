# ts-route

Type-safe route definitions and navigation utilities for TypeScript applications.

## Features

- 🎯 **Type-safe route definitions** with TypeScript generics
- 🔗 **Dynamic parameter extraction** from URL patterns
- 📝 **Query parameter parsing** with validation
- 🌳 **Nested route support** with breadcrumb trails
- 🔄 **Dual module support** (ESM + CommonJS)
- ⚡ **Zero runtime dependencies**
- 📦 **Tree-shakeable** exports

## Installation

```bash
npm install @caseyplummer/ts-route
# or
pnpm add @caseyplummer/ts-route
# or
yarn add @caseyplummer/ts-route
```

## Quick Start

### 1. Define Your Routes

```ts
import { Route as RouteBase } from '@caseyplummer/ts-route';
import { getHref } from './app-helpers';
import { AppQueryParams } from './app-query';

// Define route paths as enums for type safety
export enum RoutePath {
  Home = '',
  Register = 'register',
  SignIn = 'sign-in',
  Dashboard = '@[handle]',
  Profile = '@[handle]/profile',
  Posts = 'posts',
  Post = 'post/[id]',
}

// Query types for specific route(s)
export interface SignInQuery {
  redirect?: string;
  error?: string;
}

// Metadata types for specific route(s)
export interface SidebarMeta {
  hasSidebar: boolean;
}

// Context types for specific route(s)
export interface IdNameContext {
  id: string;
  name: string;
}

// Narrow the Route type with an app default

export type Route<
  Path extends RoutePath,
  Query extends object = object,
  Meta extends object = object,
  Context extends object = object,
> = RouteBase<Path, AppQueryParams, Query, Meta, Context>;

// Define route types with full type safety
export type HomeRoute = Route<RoutePath.Home>;
export type RegisterRoute = Route<RoutePath.Register>;
export type SignInRoute = Route<RoutePath.SignIn, SignInQuery>;
export type DashboardRoute = Route<RoutePath.Dashboard>;
export type ProfileRoute = Route<RoutePath.Profile>;
export type PostsRoute = Route<RoutePath.Posts>;
export type PostRoute = Route<RoutePath.Post, object, object, IdNameContext>;

// Union type for all defined routes
export type AppRoute = HomeRoute | RegisterRoute | SignInRoute | DashboardRoute | ProfileRoute | PostsRoute | PostRoute;

// Centralized route definitions
export const baseRoutes: AppRoute[] = [
  {
    path: RoutePath.Home,
    title: () => 'Home',
  },
  {
    path: RoutePath.Dashboard,
    title: ({ params }) => `${params?.handle}'s Dashboard`,
  },
  {
    path: RoutePath.Profile,
    parentPath: RoutePath.Dashboard,
    title: ({ params }) => `${params?.handle}'s Profile`,
  },
  {
    path: RoutePath.SignIn,
    title: () => 'Sign In',
    getQuery: (params) => ({
      redirect: params.value('redirect'),
      error: params.value('error'),
    }),
  },
  {
    path: RoutePath.Register,
    title: () => 'Register',
  },
  {
    path: RoutePath.Posts,
    title: () => 'Posts',
  },
  {
    path: RoutePath.Post,
    title: ({ params, context }) => context?.name ?? `Post ID ${params?.id}`,
    breadcrumb: ({ params, context }) => context?.name ?? `Post ID ${params?.id}`,
    href: ({ params, context }) => {
      const base = `/posts/${params?.id}`;
      return context?.name ? `${base}#${context.name}` : base;
    },
  },
] as const;

// Provides better syntax for using routes in components
export const routes = {
  home: { href: () => getHref(RoutePath.Home) },
  dashboard: {
    href: (handle: string) => getHref(RoutePath.Dashboard, { params: { handle } }),
  },
  profile: {
    href: (handle: string) => getHref(RoutePath.Dashboard, { params: { handle } }),
  },
  signIn: {
    href: (redirect?: string, error?: string) => getHref(RoutePath.SignIn, { query: { redirect, error } }),
  },
  register: { href: () => getHref(RoutePath.Register, {}) },
  posts: { href: () => getHref(RoutePath.Posts) },
  post: {
    href: (id: string, name?: string) => getHref(RoutePath.Post, { context: { id, name } }),
  },
};
```

### 2. Use Routes in Components

#### React Example

```tsx
import { Link, useLocation } from 'react-router-dom';
import { findRoute } from '@caseyplummer/ts-route';
import { appRoutes, routes } from './routes';

function Navigation() {
  const location = useLocation();
  const currentUser = 'john-doe'; // from your auth state

  // Find the current route with full type safety
  const currentRoute = findRoute(location.pathname, appRoutes);

  return (
    <nav>
      {/* Clean, readable syntax */}
      <Link to={routes.home.href()}>Home</Link>
      <Link to={routes.dashboard.href(currentUser)}>Dashboard</Link>
      <Link to={routes.profile.href(currentUser)}>Profile</Link>
      <Link to={routes.signIn.href('/dashboard')}>Sign In</Link>

      {/* Display current page title */}
      {currentRoute && <h1>{currentRoute.title({})}</h1>}
    </nav>
  );
}
```

#### Vue Example

```vue
<template>
  <nav>
    <router-link :to="routes.home.href()">Home</router-link>
    <router-link :to="routes.dashboard.href(currentUser)">Dashboard</router-link>
    <router-link :to="routes.profile.href(currentUser)">Profile</router-link>
    <router-link :to="routes.signIn.href('/dashboard')">Sign In</router-link>

    <h1 v-if="currentTitle">{{ currentTitle }}</h1>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { findRoute } from '@caseyplummer/ts-route';
import { appRoutes, routes } from './routes';

const route = useRoute();
const currentUser = 'john-doe'; // from your auth state

const currentTitle = computed(() => {
  const matched = findRoute(route.path, appRoutes);
  return matched?.title({});
});
</script>
```

#### Svelte Example

```svelte
<script lang="ts">
  import { findRoute } from "@caseyplummer/ts-route";
  import { appRoutes, routes } from "./routes";

  let currentUser = "john-doe"; // from your auth state

  // Find current route
  $: currentRoute = findRoute($page.url.pathname, appRoutes);
</script>

<nav>
  <p><a href={routes.home.href()}>Home</a></p>
  <p><a href={routes.dashboard.href(currentUser)}>Go to Dashboard</a></p>
  <p><a href={routes.profile.href(currentUser)}>Go to Profile</a></p>
  <p><a href={routes.signIn.href("/dashboard")}>Sign In</a></p>

  {#if currentRoute}
    <h1>{currentRoute.title({})}</h1>
  {/if}
</nav>
```

#### Vanilla JavaScript/TypeScript

```ts
import { findRoute } from '@caseyplummer/ts-route';
import { appRoutes, routes } from './routes';

// Find current route
const currentPath = window.location.pathname;
const currentRoute = findRoute(currentPath, appRoutes);

if (currentRoute) {
  console.log('Current page:', currentRoute.title({}));
  console.log('Route params:', currentRoute.params);
  console.log('Query params:', currentRoute.query);
}

function navigateToDashboard(handle: string) {
  window.location.href = routes.dashboard.href(handle);
}

// Build URLs for links
document.querySelector('#sign-in-link')?.setAttribute('href', routes.signIn.href('/dashboard'));
```

### 3. Advanced Features

#### Custom Query Parameter Parsing

```ts
import { QueryParamsBase } from '@caseyplummer/ts-route';

class AppQueryParams extends QueryParamsBase {
  // Custom parsing for your app's query parameters
  userId(): number | undefined {
    const value = this.value('userId');
    return value ? parseInt(value, 10) : undefined;
  }

  tags(): string[] {
    return this.values('tag'); // Handles multiple values
  }

  isVerified(): boolean | undefined {
    return this.boolean('verified');
  }
}

// Use in route definitions
const routes = [
  {
    path: '/users/@[handle]',
    title: ({ params }) => `User: ${params.handle}`,
    getQuery: (params) => new AppQueryParams(params.params),
  },
];
```

#### Nested Routes with Breadcrumbs

```ts
import { buildBreadcrumbTrail } from '@caseyplummer/ts-route';

// Build breadcrumb navigation
const breadcrumbs = buildBreadcrumbTrail('/john-doe/profile/settings', appRoutes);

// breadcrumbs = ['Home', "john-doe's Dashboard", "john-doe's Profile", 'Settings']
```

## API Reference

### Core Types

- `Route<Path, Query, Meta, Context>` - Route definition interface
- `MatchedRoute<TRoute>` - Result of route matching
- `RouteArgs<TRoute>` - Arguments for route functions

### Main Functions

- `findRoute(url, routes)` - Find matching route for a URL
- `buildHref(route, args)` - Build href for a route with parameters
- `parseUrl(url, path)` - Parse URL against a specific route path
- `buildBreadcrumbTrail(url, routes)` - Build breadcrumb navigation

### Query Parameter Utilities

- `QueryParamsBase` - Base class for custom query parameter parsing

## Examples

Check out the `examples/` directory for complete working examples:

- `app-routes.ts` - Full route definitions with type safety
- `app-helpers.ts` - Custom helper functions
- `app-validation.ts` - Route validation utilities

## Development

```bash
# Install dependencies
npm install

# Run type checking
npm run check

# Build the package
npm run build

# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

## License

MIT
