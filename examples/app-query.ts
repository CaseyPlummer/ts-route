import { QueryParamsBase } from '../src/query.js';
import type { AppQueryParamsReader, EnumLike } from './app-query.types.js';

// Lightweight parse helpers
function parseNumber(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const num = Number(value);
  return isNaN(num) ? undefined : num;
}

function parseBoolean(value: string | undefined): boolean | undefined {
  if (!value) return undefined;
  const lower = value.toLowerCase();
  if (lower === 'true') return true;
  if (lower === 'false') return false;
  return undefined;
}

function parseDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return isNaN(date.getTime()) ? undefined : date;
}

function matchEnumKey<T extends EnumLike>(enumObj: T, searchValue: string, ignoreCase: boolean): keyof T | undefined {
  for (const key in enumObj) {
    const enumKey = ignoreCase ? key.toLowerCase() : key;
    if (enumKey === searchValue) {
      return key;
    }
  }
  return undefined;
}

function matchEnumByValue<T extends EnumLike>(
  enumObj: T,
  searchValue: string,
  ignoreCase: boolean,
): keyof T | undefined {
  for (const key in enumObj) {
    const enumValue = String(enumObj[key]);
    const compareValue = ignoreCase ? enumValue.toLowerCase() : enumValue;
    if (compareValue === searchValue) {
      return key;
    }
  }
  return undefined;
}

function toEnumKey<T extends EnumLike>(
  enumObj: T,
  value: string | undefined,
  options?: { convert?: boolean; ignoreCase?: boolean },
): keyof T | undefined {
  if (!value) return undefined;

  const { convert = false, ignoreCase = false } = options || {};
  const searchValue = ignoreCase ? value.toLowerCase() : value;

  // First try direct key match
  const keyMatch = matchEnumKey(enumObj, searchValue, ignoreCase);
  if (keyMatch !== undefined) return keyMatch;

  // If convert is enabled, try matching by value
  if (convert) {
    return matchEnumByValue(enumObj, searchValue, ignoreCase);
  }

  return undefined;
}

function toEnumValue<T extends EnumLike>(
  enumObj: T,
  value: string | undefined,
  options?: { convert?: boolean; ignoreCase?: boolean },
): T[keyof T] | undefined {
  const key = toEnumKey(enumObj, value, options);
  return key !== undefined ? enumObj[key] : undefined;
}

/**
 * Application-level query params providing typed helpers.
 */
export class AppQueryParams extends QueryParamsBase implements AppQueryParamsReader {
  number(key: string): number | undefined {
    return parseNumber(this.value(key));
  }

  date(key: string): Date | undefined {
    return parseDate(this.value(key));
  }

  boolean(key: string): boolean | undefined {
    return parseBoolean(this.value(key));
  }

  enumKey<T extends EnumLike>(
    enumObj: T,
    key: string,
    options?: { convert?: boolean; ignoreCase?: boolean },
  ): keyof T | undefined {
    return toEnumKey(enumObj, this.value(key), options ?? { convert: true, ignoreCase: true });
  }

  enumValue<T extends EnumLike>(
    enumObj: T,
    key: string,
    options?: { convert?: boolean; ignoreCase?: boolean },
  ): T[keyof T] | undefined {
    return toEnumValue(enumObj, this.value(key), options ?? { convert: true, ignoreCase: true });
  }
}
