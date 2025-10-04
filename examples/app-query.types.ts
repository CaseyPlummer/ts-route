import type { QueryParamsReader } from '../src/query.types.js';

export type EnumLike = Record<string, string | number>;

export interface AppQueryParamsReader extends QueryParamsReader {
  number(key: string): number | undefined;
  boolean(key: string): boolean | undefined;
  date(key: string): Date | undefined;
  enumKey<T extends EnumLike>(
    enumObj: T,
    key: string,
    options?: { convert?: boolean; ignoreCase?: boolean },
  ): keyof T | undefined;
  enumValue<T extends EnumLike>(
    enumObj: T,
    key: string,
    options?: { convert?: boolean; ignoreCase?: boolean },
  ): T[keyof T] | undefined;
}
