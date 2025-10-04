import type { Route } from '../src/index.js';
import { appEncodeValue, authToHandle, getHref, type AuthState } from './app-helpers.js';
import { AppQueryParams } from './app-query.js';
import { validateRoutes } from './app-validation.js';

export enum RoutePath {
  Home = '',

  Register = 'register',
  Welcome = 'welcome',
  SignIn = 'sign-in',
  SignOut = 'sign-out',

  AuthAction = 'auth-action',
  VerifyEmail = 'verify-email',
  VerifyEmailApply = 'verify-email/apply',
  ForgotPassword = 'forgot-password',
  ResetPassword = 'reset-password',

  Dashboard = '@[handle]',
  Account = '@[handle]/account',
  Profile = '@[handle]/profile',
}

// Specific query parameter types for each route
export enum AuthAction {
  verifyEmail = 'verifyEmail',
  resetPassword = 'resetPassword',
  recoverEmail = 'recoverEmail',
}

export interface AuthActionQuery {
  mode: AuthAction | undefined;
  code: string | undefined;
  continueUrl?: string;
  apiKey?: string;
  lang?: string;
}

export interface SidebarMeta {
  hasLists: boolean;
}

export interface ForgotPasswordQuery {
  email: string | undefined;
}

export interface ResetPasswordQuery {
  code: string | undefined;
}

export interface VerifyEmailQuery {
  registered: boolean | undefined;
  code?: string;
}

export interface VerifyEmailApplyQuery {
  code: string | undefined;
}

// Context types for specific routes
export interface IdNameContext {
  id: string;
  name: string;
}

// Specific route types
export type HomeRoute = Route<RoutePath.Home>;
export type RegisterRoute = Route<RoutePath.Register>;
export type WelcomeRoute = Route<RoutePath.Welcome>;
export type SignInRoute = Route<RoutePath.SignIn>;
export type SignOutRoute = Route<RoutePath.SignOut>;
export type AuthActionRoute = Route<RoutePath.AuthAction, AppQueryParams, AuthActionQuery>;
export type VerifyEmailRoute = Route<RoutePath.VerifyEmail, AppQueryParams, VerifyEmailQuery>;
export type VerifyEmailApplyRoute = Route<
  RoutePath.VerifyEmailApply,
  AppQueryParams,
  VerifyEmailApplyQuery,
  object,
  object
>;
export type ForgotPasswordRoute = Route<RoutePath.ForgotPassword, AppQueryParams, ForgotPasswordQuery, object, object>;
export type ResetPasswordRoute = Route<RoutePath.ResetPassword, AppQueryParams, ResetPasswordQuery>;
export type DashboardRoute = Route<RoutePath.Dashboard>;
export type AccountRoute = Route<RoutePath.Account>;
export type ProfileRoute = Route<RoutePath.Profile>;

// Union type for all defined routes
export type AppRoute =
  | HomeRoute
  | RegisterRoute
  | WelcomeRoute
  | SignInRoute
  | SignOutRoute
  | AuthActionRoute
  | VerifyEmailRoute
  | VerifyEmailApplyRoute
  | ForgotPasswordRoute
  | ResetPasswordRoute
  | DashboardRoute
  | AccountRoute
  | ProfileRoute;

// Centralized routes definition
const baseRoutes: AppRoute[] = [
  {
    path: RoutePath.Home,
    title: () => 'Home',
  },
  {
    path: RoutePath.Register,
    title: () => 'Register',
  },
  {
    path: RoutePath.Welcome,
    title: () => 'Welcome',
  },
  {
    path: RoutePath.SignIn,
    title: () => 'Sign In',
  },
  {
    path: RoutePath.SignOut,
    title: () => 'Sign Out',
  },
  {
    path: RoutePath.AuthAction,
    title: () => 'Authentication Action',
    getQuery: (params) => ({
      mode: params.value('mode') as AuthAction | undefined,
      code: params.value('oobCode'),
      continueUrl: params.value('continueUrl'),
      apiKey: params.value('apiKey'),
      lang: params.value('lang'),
    }),
  },
  {
    path: RoutePath.VerifyEmail,
    title: () => 'Verify Email',
    getQuery: (params) => ({
      registered: params.boolean('registered'),
      code: params.value('code'),
    }),
  },
  {
    path: RoutePath.VerifyEmailApply,
    title: () => 'Apply Email Verification',
    getQuery: (params) => ({
      code: params.value('code'),
    }),
  },
  {
    path: RoutePath.ForgotPassword,
    title: () => 'Forgot Password',
    getQuery: (params) => ({
      email: params.value('email'),
    }),
  },
  {
    path: RoutePath.ResetPassword,
    title: () => 'Reset Password',
    getQuery: (params) => ({
      code: params.value('code'),
    }),
  },
  {
    path: RoutePath.Dashboard,
    title: () => 'Dashboard',
  },
  {
    path: RoutePath.Account,
    parentPath: RoutePath.Dashboard,
    title: () => 'Account',
  },
  {
    path: RoutePath.Profile,
    parentPath: RoutePath.Dashboard,
    title: () => 'Profile',
  },
];

export function applyAppDefaults<
  TRoute extends {
    encodeQueryValue?: (v: unknown) => string;
    queryParamsFactory?: (raw: Record<string, string[]>) => unknown;
  } & { path: string },
>(
  routes: TRoute[],
  encoder: (v: unknown) => string,
  queryParamsFactory: (raw: Record<string, string[]>) => unknown,
): TRoute[] {
  return routes.map((r) => ({
    ...r,
    // Only set if the route doesn't already have one
    encodeQueryValue: r.encodeQueryValue ?? encoder,
    queryParamsFactory: r.queryParamsFactory ?? queryParamsFactory,
  }));
}

export const appRoutes: AppRoute[] = applyAppDefaults(baseRoutes, appEncodeValue, (raw) => new AppQueryParams(raw));

// Validate routes at initialization
validateRoutes(appRoutes);

// Provides better syntax for using routes in components
export const routes = {
  home: { href: () => getHref(RoutePath.Home) },

  register: { href: () => getHref(RoutePath.Register) },
  welcome: { href: () => getHref(RoutePath.Welcome) },
  signIn: { href: () => getHref(RoutePath.SignIn) },
  signOut: { href: () => getHref(RoutePath.SignOut) },

  authAction: { href: () => getHref(RoutePath.AuthAction) },
  verifyEmail: {
    href: (registered?: boolean) => getHref(RoutePath.VerifyEmail, { query: { registered } }),
  },
  verifyEmailApply: { href: () => getHref(RoutePath.VerifyEmailApply) },
  forgotPassword: {
    href: (email?: string) => getHref(RoutePath.ForgotPassword, { query: { email } }),
  },
  resetPassword: { href: () => getHref(RoutePath.ResetPassword) },

  dashboard: {
    href: (authOrHandle: AuthState | string) =>
      getHref(RoutePath.Dashboard, {
        params: { handle: authToHandle(authOrHandle) },
      }),
  },
  account: {
    href: (authOrHandle: AuthState | string) =>
      getHref(RoutePath.Account, {
        params: { handle: authToHandle(authOrHandle) },
      }),
  },
  profile: {
    href: (authOrHandle: AuthState | string) =>
      getHref(RoutePath.Profile, {
        params: { handle: authToHandle(authOrHandle) },
      }),
  },
};
