import { Route as RouteBase, WildcardRoute } from '@caseyplummer/ts-route';
import { appEncodeValue, getHref } from './app-helpers';
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

export function applyAppDefaults<TRoute extends WildcardRoute>(
  routes: TRoute[],
  encoder: (v: unknown) => string,
  queryParamsFactory: (raw: Record<string, string[]>) => unknown,
): TRoute[] {
  return routes.map((r) => ({
    ...r,
    // Only set if the route doesn't already have one
    encodeQueryValue: r.encodeQueryValue ?? encoder,
    queryParamsFactory: r.queryParamsFactory ?? queryParamsFactory,
    // serializeQuery not used yet in app, so no default
    serializeQuery: r.serializeQuery ?? undefined,
  }));
}
export const appRoutes: AppRoute[] = applyAppDefaults(baseRoutes, appEncodeValue, (raw) => new AppQueryParams(raw));

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
