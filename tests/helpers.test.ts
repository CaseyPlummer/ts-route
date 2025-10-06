import { describe, expect, it, vi } from 'vitest';
import {
  buildBreadcrumbTrail,
  buildFragment,
  buildHref,
  buildHrefWithQueryParams,
  buildNestedRoutes,
  buildPath,
  buildQueryString,
  createQueryParamsFromTyped,
  encodeKeyValue,
  encodeReservedChars,
  encodeValue,
  findRoute,
  getEmptyObject,
  getEmptyString,
  getHref,
  getRawEncodedValue,
  getRoute,
  hasCustomToString,
  hasFragment,
  normalizePercentEscapes,
  parseUrl,
  processQueryValues,
  toSafeString,
  validatePathParams,
} from '../src/helpers.js';

// RFC3986 reserved characters
const rfc3986Reserved = ":/?#[]@!$&'()*+,;=";
import type { QueryParamsReader } from '../src/query.types.js';
import type { Route } from '../src/routes.types.js';

// ============================================================================
// 1. STRING/VALUE ENCODING FUNCTIONS
// ============================================================================

describe('toSafeString', () => {
  describe('primitive types', () => {
    it('should convert string to string', () => {
      expect(toSafeString('hello')).toBe('hello');
      expect(toSafeString('')).toBe('');
      expect(toSafeString('  spaces  ')).toBe('  spaces  ');
    });

    it('should convert number to string', () => {
      expect(toSafeString(42)).toBe('42');
      expect(toSafeString(0)).toBe('0');
      expect(toSafeString(-123.456)).toBe('-123.456');
      expect(toSafeString(NaN)).toBe('NaN');
      expect(toSafeString(Infinity)).toBe('Infinity');
      expect(toSafeString(-Infinity)).toBe('-Infinity');
    });

    it('should convert boolean to string', () => {
      expect(toSafeString(true)).toBe('true');
      expect(toSafeString(false)).toBe('false');
    });

    it('should convert bigint to string', () => {
      expect(toSafeString(BigInt(12345))).toBe('12345');
      expect(toSafeString(BigInt(0))).toBe('0');
      expect(toSafeString(BigInt(-999))).toBe('-999');
    });

    it('should convert symbol to description only', () => {
      expect(toSafeString(Symbol('test'))).toBe('test');
      expect(toSafeString(Symbol('description'))).toBe('description');
    });

    it('should return empty string for symbol without description', () => {
      expect(toSafeString(Symbol())).toBe('');
    });
  });

  describe('null and undefined', () => {
    it('should return empty string for null', () => {
      expect(toSafeString(null)).toBe('');
    });

    it('should return empty string for undefined', () => {
      expect(toSafeString(undefined)).toBe('');
    });
  });

  describe('objects', () => {
    it('should use custom toString when available', () => {
      const obj = {
        value: 42,
        toString() {
          return `Value: ${this.value}`;
        },
      };
      expect(toSafeString(obj)).toBe('Value: 42');
    });

    it('should fall back to JSON.stringify for plain objects', () => {
      expect(toSafeString({ a: 1, b: 'test' })).toBe('{"a":1,"b":"test"}');
      // Arrays have custom toString, not plain JSON.stringify
      expect(toSafeString([1, 2, 3])).toBe('1,2,3');
    });

    it('should return empty string when custom toString throws', () => {
      const obj = {
        toString() {
          throw new Error('toString failed');
        },
      };
      expect(toSafeString(obj)).toBe('');
    });

    it('should return empty string when JSON.stringify fails', () => {
      const circular: { self?: unknown } = {};
      circular.self = circular;
      expect(toSafeString(circular)).toBe('');
    });

    it('should return empty string when toString returns null', () => {
      const obj = {
        toString() {
          return null as unknown as string;
        },
      };
      expect(toSafeString(obj)).toBe('');
    });

    it('should handle Date objects with custom toString', () => {
      const date = new Date('2025-10-03T00:00:00Z');
      const result = toSafeString(date);
      expect(result).toContain('2025');
    });

    it('should handle RegExp objects', () => {
      expect(toSafeString(/test/gi)).toBe('/test/gi');
    });

    it('should handle Error objects', () => {
      const error = new Error('test error');
      expect(toSafeString(error)).toContain('Error');
    });
  });

  describe('edge cases', () => {
    it('should return empty string for functions', () => {
      const result1 = toSafeString(() => {});
      const result2 = toSafeString(function named() {});
      expect(result1).toBe('');
      expect(result2).toBe('');
    });

    it('should handle objects with toString that is not a function', () => {
      const obj = { toString: 'not a function' };
      expect(toSafeString(obj)).toBe('{"toString":"not a function"}');
    });

    it('should handle empty objects and arrays', () => {
      expect(toSafeString({})).toBe('{}');
      // Arrays have custom toString
      expect(toSafeString([])).toBe('');
    });
  });
});

describe('encodeValue', () => {
  it('should encode string values', () => {
    expect(encodeValue('hello world')).toBe('hello%20world');
    expect(encodeValue('a&b=c')).toBe('a%26b%3Dc');
  });

  it('should encode numbers', () => {
    expect(encodeValue(123)).toBe('123');
    expect(encodeValue(45.67)).toBe('45.67');
  });

  it('should encode booleans', () => {
    expect(encodeValue(true)).toBe('true');
    expect(encodeValue(false)).toBe('false');
  });

  it('should return empty string for null', () => {
    expect(encodeValue(null)).toBe('');
  });

  it('should return empty string for undefined', () => {
    expect(encodeValue(undefined)).toBe('');
  });

  it('should encode special characters', () => {
    expect(encodeValue('hello@world.com')).toBe('hello%40world.com');
    expect(encodeValue('path/to/resource')).toBe('path%2Fto%2Fresource');
  });

  it('should encode symbols', () => {
    expect(encodeValue(Symbol('test'))).toBe('test');
  });

  it('should return empty string for symbol without description', () => {
    expect(encodeValue(Symbol())).toBe('');
  });

  it('should encode objects with custom toString', () => {
    const obj = {
      toString() {
        return 'custom value';
      },
    };
    expect(encodeValue(obj)).toBe('custom%20value');
  });

  it('should return empty string when toString fails', () => {
    const obj = {
      toString() {
        throw new Error('fail');
      },
    };
    expect(encodeValue(obj)).toBe('');
  });

  it('should handle arrays by encoding each element and joining with commas', () => {
    expect(encodeValue(['hello', 'world'])).toBe('hello,world');
    expect(encodeValue([1, 2, 3])).toBe('1,2,3');
    expect(encodeValue(['hello@world', 'test/path'])).toBe('hello%40world,test%2Fpath');
    expect(encodeValue([])).toBe('');
    expect(encodeValue([null, undefined, 'value'])).toBe(',,value');
  });
});

describe('getRawEncodedValue', () => {
  it('should use toSafeString when no custom encoder', () => {
    expect(getRawEncodedValue('hello')).toBe('hello');
    expect(getRawEncodedValue(123)).toBe('123');
    expect(getRawEncodedValue(null)).toBe('');
  });

  it('should use custom encoder when provided', () => {
    const encoder = (v: unknown) => `custom-${v}`;
    expect(getRawEncodedValue('test', encoder)).toBe('custom-test');
    expect(getRawEncodedValue(42, encoder)).toBe('custom-42');
  });

  it('should return empty string when custom encoder throws', () => {
    const encoder = () => {
      throw new Error('encoder failed');
    };
    expect(getRawEncodedValue('test', encoder)).toBe('');
  });

  it('should convert encoder result to string', () => {
    const encoder = () => 123 as unknown as string;
    expect(getRawEncodedValue('test', encoder)).toBe('123');
  });

  it('should handle encoder returning null', () => {
    const encoder = () => null as unknown as string;
    expect(getRawEncodedValue('test', encoder)).toBe('null');
  });

  it('should handle encoder returning undefined', () => {
    const encoder = () => undefined as unknown as string;
    expect(getRawEncodedValue('test', encoder)).toBe('undefined');
  });
});

describe('normalizePercentEscapes', () => {
  it('should preserve valid percent-encoded sequences', () => {
    expect(normalizePercentEscapes('hello%20world')).toBe('hello%20world');
    expect(normalizePercentEscapes('test%3Dvalue')).toBe('test%3Dvalue');
    expect(normalizePercentEscapes('%2F%2F')).toBe('%2F%2F');
  });

  it('should encode invalid percent escapes', () => {
    expect(normalizePercentEscapes('100%')).toBe('100%25');
    expect(normalizePercentEscapes('50% off')).toBe('50%25 off');
  });

  it('should handle percent followed by single character', () => {
    expect(normalizePercentEscapes('%X')).toBe('%25X');
    expect(normalizePercentEscapes('%1')).toBe('%251');
  });

  it('should handle percent at end of string', () => {
    expect(normalizePercentEscapes('discount%')).toBe('discount%25');
  });

  it('should handle mixed valid and invalid escapes', () => {
    expect(normalizePercentEscapes('valid%20and%invalid')).toBe('valid%20and%25invalid');
  });

  it('should handle empty string', () => {
    expect(normalizePercentEscapes('')).toBe('');
  });

  it('should handle string without percent signs', () => {
    expect(normalizePercentEscapes('hello world')).toBe('hello world');
  });

  it('should handle lowercase hex digits', () => {
    expect(normalizePercentEscapes('%2f%3a')).toBe('%2f%3a');
  });

  it('should handle uppercase hex digits', () => {
    expect(normalizePercentEscapes('%2F%3A')).toBe('%2F%3A');
  });
});

describe('encodeReservedChars', () => {
  describe('RFC3986 compliance', () => {
    it('should encode all RFC3986 gen-delims characters', () => {
      expect(encodeReservedChars(':', rfc3986Reserved, '')).toBe('%3A');
      expect(encodeReservedChars('/', rfc3986Reserved, '')).toBe('%2F');
      expect(encodeReservedChars('?', rfc3986Reserved, '')).toBe('%3F');
      expect(encodeReservedChars('#', rfc3986Reserved, '')).toBe('%23');
      expect(encodeReservedChars('[', rfc3986Reserved, '')).toBe('%5B');
      expect(encodeReservedChars(']', rfc3986Reserved, '')).toBe('%5D');
      expect(encodeReservedChars('@', rfc3986Reserved, '')).toBe('%40');
    });

    it('should encode all RFC3986 sub-delims characters', () => {
      expect(encodeReservedChars('!', rfc3986Reserved, '')).toBe('%21');
      expect(encodeReservedChars('$', rfc3986Reserved, '')).toBe('%24');
      expect(encodeReservedChars('&', rfc3986Reserved, '')).toBe('%26');
      expect(encodeReservedChars("'", rfc3986Reserved, '')).toBe('%27');
      expect(encodeReservedChars('(', rfc3986Reserved, '')).toBe('%28');
      expect(encodeReservedChars(')', rfc3986Reserved, '')).toBe('%29');
      expect(encodeReservedChars('*', rfc3986Reserved, '')).toBe('%2A');
      expect(encodeReservedChars('+', rfc3986Reserved, '')).toBe('%2B');
      expect(encodeReservedChars(',', rfc3986Reserved, '')).toBe('%2C');
      expect(encodeReservedChars(';', rfc3986Reserved, '')).toBe('%3B');
      expect(encodeReservedChars('=', rfc3986Reserved, '')).toBe('%3D');
    });

    it('should encode complete RFC3986 reserved character set', () => {
      const rfc3986ReservedChars = ":/?#[]@!$&'()*+,;=";
      const result = encodeReservedChars(rfc3986ReservedChars, rfc3986Reserved, '');
      expect(result).toBe('%3A%2F%3F%23%5B%5D%40%21%24%26%27%28%29%2A%2B%2C%3B%3D');
    });
  });

  describe('default behavior (with space)', () => {
    it('should encode spaces by default', () => {
      expect(encodeReservedChars('hello world')).toBe('hello%20world');
    });

    it('should encode ampersand', () => {
      expect(encodeReservedChars('a&b')).toBe('a%26b');
    });

    it('should encode equals sign', () => {
      expect(encodeReservedChars('key=value')).toBe('key%3Dvalue');
    });

    it('should encode question mark', () => {
      expect(encodeReservedChars('what?')).toBe('what%3F');
    });

    it('should encode hash/fragment', () => {
      expect(encodeReservedChars('tag#section')).toBe('tag%23section');
    });

    it('should encode slashes', () => {
      expect(encodeReservedChars('path/to/file')).toBe('path%2Fto%2Ffile');
    });

    it('should encode semicolons, colons, and at signs', () => {
      expect(encodeReservedChars('user@host:port;param')).toBe('user%40host%3Aport%3Bparam');
    });

    it('should encode dollar signs and commas', () => {
      expect(encodeReservedChars('$100,000')).toBe('%24100%2C000');
    });

    it('should encode multiple reserved characters', () => {
      expect(encodeReservedChars('a&b=c?d#e')).toBe('a%26b%3Dc%3Fd%23e');
    });

    it('should encode brackets and parentheses', () => {
      expect(encodeReservedChars('array[0] and func()')).toBe('array%5B0%5D%20and%20func%28%29');
    });

    it('should encode single quotes and asterisks', () => {
      expect(encodeReservedChars("It's a * wildcard")).toBe('It%27s%20a%20%2A%20wildcard');
    });

    it('should encode exclamation marks and plus signs', () => {
      expect(encodeReservedChars('Hello! 1+1')).toBe('Hello%21%201%2B1');
    });
  });

  describe('custom additional characters', () => {
    it('should encode custom additional characters', () => {
      expect(encodeReservedChars('test%value', rfc3986Reserved, '%')).toBe('test%25value');
      expect(encodeReservedChars('pipe|separated', rfc3986Reserved, '|')).toBe('pipe%7Cseparated');
    });

    it('should encode multiple custom characters', () => {
      expect(encodeReservedChars('a|b%c~d', rfc3986Reserved, '|%~')).toBe('a%7Cb%25c%7Ed');
    });

    it('should handle empty additional characters', () => {
      // Space is not RFC3986 reserved, so with empty additional chars it should not be encoded
      expect(encodeReservedChars('hello world', rfc3986Reserved, '')).toBe('hello world');
      expect(encodeReservedChars('test@example.com', rfc3986Reserved, '')).toBe('test%40example.com');
    });

    it('should combine RFC3986 and additional characters', () => {
      expect(encodeReservedChars('test|value&key=data', rfc3986Reserved, '|')).toBe('test%7Cvalue%26key%3Ddata');
    });
  });

  describe('edge cases', () => {
    it('should handle empty string', () => {
      expect(encodeReservedChars('')).toBe('');
    });

    it('should handle string without reserved characters', () => {
      expect(encodeReservedChars('abc123', rfc3986Reserved, '')).toBe('abc123');
    });

    it('should handle string with only unreserved characters (default)', () => {
      expect(encodeReservedChars('abcDEF123-._~')).toBe('abcDEF123-._~');
    });

    it('should handle special regex characters in additional chars', () => {
      expect(encodeReservedChars('test^pattern$', rfc3986Reserved, '^$')).toBe('test%5Epattern%24');
      expect(encodeReservedChars('test.dot', rfc3986Reserved, '.')).toBe('test%2Edot');
    });

    it('should handle backslash in additional characters', () => {
      expect(encodeReservedChars('path\\to\\file', rfc3986Reserved, '\\')).toBe('path%5Cto%5Cfile');
    });

    it('should handle hyphen in additional characters', () => {
      expect(encodeReservedChars('dash-separated', rfc3986Reserved, '-')).toBe('dash%2Dseparated');
    });
  });

  describe('mixed content', () => {
    it('should preserve unreserved characters while encoding reserved ones', () => {
      const input = 'user123@example.com:8080/path?q=value#section';
      const result = encodeReservedChars(input, rfc3986Reserved, '');
      expect(result).toBe('user123%40example.com%3A8080%2Fpath%3Fq%3Dvalue%23section');
    });

    it('should handle Unicode characters properly', () => {
      expect(encodeReservedChars('caf�@test.com', rfc3986Reserved, '')).toBe('caf�%40test.com');
      expect(encodeReservedChars('??@example.com', rfc3986Reserved, '')).toBe('%3F%3F%40example.com');
    });
  });

  describe('custom reserved character sets', () => {
    it('should work with custom reserved characters instead of RFC3986', () => {
      const customReserved = 'abc';
      expect(encodeReservedChars('test_a_b_c_test', customReserved)).toBe('test_%61_%62_%63_test');
    });

    it('should work with both custom reserved and additional characters', () => {
      const customReserved = 'xyz';
      expect(encodeReservedChars('x-y-z', customReserved, '-')).toBe('%78%2D%79%2D%7A');
    });

    it('should work with empty reserved characters (only additional)', () => {
      expect(encodeReservedChars('hello@world', '', '@')).toBe('hello%40world');
    });
  });

  describe('encodeReservedChars validation', () => {
    it('should throw error when both reservedChars and additionalChars are empty', () => {
      expect(() => encodeReservedChars('test', '', '')).toThrow(
        'encodeReservedChars: At least one character must be specified for encoding. ' +
          'Provide either reservedChars, additionalChars, or both as non-empty strings.',
      );
    });

    it('should work when only reservedChars is provided (additionalChars empty)', () => {
      expect(() => encodeReservedChars('hello@world', '@', '')).not.toThrow();
      expect(encodeReservedChars('hello@world', '@', '')).toBe('hello%40world');
    });

    it('should work when only additionalChars is provided (reservedChars empty)', () => {
      expect(() => encodeReservedChars('hello world', '', ' ')).not.toThrow();
      expect(encodeReservedChars('hello world', '', ' ')).toBe('hello%20world');
    });

    it('should work with default parameters (both non-empty)', () => {
      expect(() => encodeReservedChars('hello@world test')).not.toThrow();
      expect(encodeReservedChars('hello@world test')).toBe('hello%40world%20test');
    });
  });
});

describe('hasCustomToString', () => {
  it('should return true for primitives', () => {
    expect(hasCustomToString('string')).toBe(true);
    expect(hasCustomToString(123)).toBe(true);
    expect(hasCustomToString(true)).toBe(true);
    expect(hasCustomToString(BigInt(42))).toBe(true);
    expect(hasCustomToString(Symbol('test'))).toBe(true);
  });

  it('should return false for null', () => {
    expect(hasCustomToString(null)).toBe(true);
  });

  it('should return true for objects with custom toString', () => {
    const obj = {
      toString() {
        return 'custom';
      },
    };
    expect(hasCustomToString(obj)).toBe(true);
  });

  it('should return false for plain objects', () => {
    expect(hasCustomToString({})).toBe(false);
    expect(hasCustomToString({ a: 1, b: 2 })).toBe(false);
  });

  it('should return true for arrays (arrays have custom toString)', () => {
    expect(hasCustomToString([])).toBe(true);
    expect(hasCustomToString([1, 2, 3])).toBe(true);
  });

  it('should return true for Date objects', () => {
    expect(hasCustomToString(new Date())).toBe(true);
  });

  it('should return true for RegExp objects', () => {
    expect(hasCustomToString(/test/)).toBe(true);
  });

  it('should return true for Error objects', () => {
    expect(hasCustomToString(new Error('test'))).toBe(true);
  });

  it('should return false when toString is not a function', () => {
    const obj = { toString: 'not a function' };
    expect(hasCustomToString(obj)).toBe(false);
  });

  it('should return false when toString is the default Object.prototype.toString', () => {
    const obj = Object.create(null);
    obj.toString = Object.prototype.toString;
    expect(hasCustomToString(obj)).toBe(false);
  });
});

// ============================================================================
// 2. QUERY PARAMETER FUNCTIONS
// ============================================================================

describe('createQueryParamsFromTyped', () => {
  it('should create reader from simple object', () => {
    const reader = createQueryParamsFromTyped({ a: 'value', b: 'test' });
    expect(reader.value('a')).toBe('value');
    expect(reader.value('b')).toBe('test');
    expect(reader.value('missing')).toBeUndefined();
  });

  it('should skip null and undefined values', () => {
    const reader = createQueryParamsFromTyped({ a: 'value', b: null, c: undefined });
    expect(reader.value('a')).toBe('value');
    expect(reader.value('b')).toBeUndefined();
    expect(reader.value('c')).toBeUndefined();
  });

  it('should handle arrays with custom toString', () => {
    const reader = createQueryParamsFromTyped({
      tags: ['react', 'svelte', { toString: () => 'custom' }],
    });
    expect(reader.values('tags')).toEqual(['react', 'svelte', 'custom']);
  });

  it('should filter out array elements without custom toString', () => {
    const reader = createQueryParamsFromTyped({
      items: ['ok', { plain: 'object' }, null, undefined],
    });
    expect(reader.values('items')).toEqual(['ok']);
  });

  it('should filter out empty strings from arrays', () => {
    const reader = createQueryParamsFromTyped({
      values: ['a', '', 'b', { toString: () => '' }],
    });
    expect(reader.values('values')).toEqual(['a', 'b']);
  });

  it('should handle numeric values', () => {
    const reader = createQueryParamsFromTyped({ count: 42, price: 19.99 });
    expect(reader.value('count')).toBe('42');
    expect(reader.value('price')).toBe('19.99');
  });

  it('should handle boolean values', () => {
    const reader = createQueryParamsFromTyped({ enabled: true, disabled: false });
    expect(reader.value('enabled')).toBe('true');
    expect(reader.value('disabled')).toBe('false');
  });

  it('should handle empty arrays', () => {
    const reader = createQueryParamsFromTyped({ empty: [] });
    expect(reader.values('empty')).toEqual([]);
  });

  it('should handle mixed type arrays', () => {
    const reader = createQueryParamsFromTyped({
      mixed: [1, 'text', true, Symbol('sym')],
    });
    expect(reader.values('mixed')).toEqual(['1', 'text', 'true', 'sym']);
  });

  it('should return empty object for empty input', () => {
    const reader = createQueryParamsFromTyped({});
    expect(reader.value('anything')).toBeUndefined();
  });
});

describe('processQueryValues', () => {
  it('should trim and filter empty strings', () => {
    expect(processQueryValues(['  a  ', 'b', '', '  '])).toEqual(['a', 'b']);
  });

  it('should remove duplicates preserving first occurrence order', () => {
    expect(processQueryValues(['a', 'b', 'a', 'c', 'b'])).toEqual(['a', 'b', 'c']);
  });

  it('should handle all whitespace values', () => {
    expect(processQueryValues(['   ', '\t', '\n', '  \r  '])).toEqual([]);
  });

  it('should return empty array for empty input', () => {
    expect(processQueryValues([])).toEqual([]);
  });

  it('should preserve order of unique values', () => {
    expect(processQueryValues(['zebra', 'apple', 'banana'])).toEqual(['zebra', 'apple', 'banana']);
  });

  it('should handle values with internal spaces', () => {
    expect(processQueryValues(['  hello world  ', 'hello world'])).toEqual(['hello world']);
  });

  it('should handle single value', () => {
    expect(processQueryValues(['value'])).toEqual(['value']);
  });
});

describe('encodeKeyValue', () => {
  it('should encode key and value with equals separator', () => {
    expect(encodeKeyValue('key', 'value')).toBe('key=value');
  });

  it('should encode special characters in key and value', () => {
    expect(encodeKeyValue('my key', 'my value')).toBe('my%20key=my%20value');
  });

  it('should return empty string for null value', () => {
    expect(encodeKeyValue('key', null)).toBe('');
  });

  it('should return empty string for undefined value', () => {
    expect(encodeKeyValue('key', undefined)).toBe('');
  });

  it('should sanitize custom encoder output with reserved chars', () => {
    const route = {
      path: 'test',
      title: () => 'Test',
      encodeQueryValue: (v: unknown) => `raw=${v}`,
    } as Route<'test'>;
    expect(encodeKeyValue('key', 'value', route)).toBe('key=raw%3Dvalue');
  });

  it('should normalize invalid percent escapes from custom encoder', () => {
    const route = {
      path: 'test',
      title: () => 'Test',
      encodeQueryValue: () => '50%',
    } as Route<'test'>;
    expect(encodeKeyValue('key', 'test', route)).toBe('key=50%25');
  });

  it('should handle custom encoder returning empty string', () => {
    const route = {
      path: 'test',
      title: () => 'Test',
      encodeQueryValue: () => '',
    } as Route<'test'>;
    expect(encodeKeyValue('key', 'value', route)).toBe('');
  });

  it('should encode numbers correctly', () => {
    expect(encodeKeyValue('count', 123)).toBe('count=123');
  });

  it('should encode booleans correctly', () => {
    expect(encodeKeyValue('enabled', true)).toBe('enabled=true');
  });

  it('should handle ampersand in custom encoder output', () => {
    const route = {
      path: 'test',
      title: () => 'Test',
      encodeQueryValue: () => 'a&b',
    } as Route<'test'>;
    expect(encodeKeyValue('key', 'test', route)).toBe('key=a%26b');
  });
});

describe('encodeKeyValues', () => {
  it('should encode primitives and arrays', () => {
    const query = { search: 'typescript', tags: ['react', 'svelte'] };
    const qs = buildQueryString(query);
    expect(qs).toContain('search=typescript');
    expect(qs).toContain('tags=react&tags=svelte');
  });

  // Date value encoding delegated to app layer; core treats object via toString/JSON.
  // Keeping a minimal assertion simply that a value pair is produced.
  it('should encode Date values (non-empty)', () => {
    const when = new Date('2025-04-30T20:01:53.683Z');
    const kv = encodeKeyValue('date', when);
    expect(kv.startsWith('date=')).toBe(true);
  });

  it('should skip plain object entries without custom toString in arrays when building synthetic query params', () => {
    const route: Route<'test'> = { path: 'test', title: () => 't' };
    const href = buildHref(route, {
      query: { arr: ['ok', { x: 1 }, { toString: () => 'yes' }] as unknown as string[] },
    });
    // Should only include 'ok' and 'yes'
    expect(href).toBe('/test?arr=ok&arr=yes');
  });

  it('should encode symbol values using description only', () => {
    const sym = Symbol('onlyDesc');
    const route: Route<'sym'> = { path: 'sym', title: () => 's' };
    const href = buildHref(route, { query: { a: sym as unknown as string } });
    expect(href).toBe('/sym?a=onlyDesc');
  });
});

describe('buildQueryString', () => {
  it('should provide deterministic ordering of multi-values (sorted)', () => {
    const query = { tag: ['beta', 'alpha', 'alpha', 'charlie'] };
    const qs = buildQueryString(query);
    // Values should be distinct and sorted alphabetically
    expect(qs).toBe('tag=alpha&tag=beta&tag=charlie');
  });
});

// Test utilities for serializeQuery tests
interface Q {
  a?: string;
  b?: string;
  arr?: string[];
  upper?: string;
}
type DummyQP = QueryParamsReader;

function makeRoute(partial: Partial<Route<'test', DummyQP, Q>>): Route<'test', DummyQP, Q> {
  return {
    path: 'test',
    title: () => 'Test',
    ...partial,
  } as Route<'test', DummyQP, Q>;
}

describe('serializeQuery', () => {
  it('should fall back to encodeQueryValue/buildQueryString when absent (core now preserves casing)', () => {
    const route = makeRoute({ encodeQueryValue: (v) => `X${encodeURIComponent(String(v))}` });
    const href = buildHref(route, { query: { a: 'hello' } });
    // Core no longer lower-cases; value retains encoder prefix casing
    expect(href).toBe('/test?a=Xhello');
  });

  it('should sanitize unsafe custom encoder output containing & and =', () => {
    const route = makeRoute({
      encodeQueryValue: (v) => `raw=${String(v)}&evil=true`, // intentionally unsafe composite
    });
    const href = buildHref(route, { query: { a: 'value' } });
    // The entire value should have been percent-encoded to avoid breaking query structure
    expect(href).toMatch(/\/test\?a=raw%3Dvalue%26evil%3Dtrue/);
  });

  it('should use serializeQuery when provided and ignores encodeQueryValue', () => {
    const route = makeRoute({
      encodeQueryValue: (v) => `IGNORED_${v}`,
      serializeQuery: (q) => `A=${encodeURIComponent(q.a ?? '')}`,
    });
    const href = buildHref(route, { query: { a: 'Hello' } });
    expect(href).toBe('/test?A=Hello'); // Case preserved, value not prefixed by IGNORED_
  });

  it('should treat empty trimmed serializeQuery result as no query', () => {
    const route = makeRoute({ serializeQuery: () => '   ' });
    const href = buildHref(route, { query: { a: 'x' } });
    expect(href).toBe('/test');
  });

  it('should support complex assembly (ordering, arrays, selective omission)', () => {
    const route = makeRoute({
      serializeQuery: (q) => {
        const parts: string[] = [];
        if (q.arr?.length) {
          parts.push(q.arr.map((v) => `arr=${encodeURIComponent(v)}`).join('&'));
        }
        if (q.a && q.b) {
          parts.push(`combo=${encodeURIComponent(`${q.a}:${q.b}`)}`);
        }
        if (q.upper) {
          parts.push(`UP=${encodeURIComponent(q.upper.toUpperCase())}`);
        }
        return parts.join('&');
      },
    });
    const href = buildHref(route, { query: { a: 'x', b: 'y', arr: ['r', 'g'], upper: 'keepCase' } });
    expect(href).toBe('/test?arr=r&arr=g&combo=x%3Ay&UP=KEEPCASE');
  });

  it('should allow serializeQuery to access multi-values via queryParams.values and conditionally omit', () => {
    const route = makeRoute({
      serializeQuery: (_q, { queryParams }) => {
        const parts: string[] = [];
        const arrVals = queryParams?.values('arr');
        if (arrVals && arrVals.length > 1) {
          parts.push(arrVals.map((v) => `arr=${encodeURIComponent(v)}`).join('&'));
        }
        const upper = queryParams?.value('upper');
        if (upper) parts.push(`u=${encodeURIComponent(upper)}`);
        return parts.join('&');
      },
    });
    const href = buildHref(route, { query: { arr: ['x', 'y', 'z'], upper: 'MiXed' } });
    expect(href).toBe('/test?arr=x&arr=y&arr=z&u=MiXed');
  });

  it('should normalize single-value arrays via queryParams.value', () => {
    const route = makeRoute({
      serializeQuery: (_q, { queryParams }) => {
        const first = queryParams?.value('arr') ?? '';
        return `first=${encodeURIComponent(first)}`;
      },
    });
    const href = buildHref(route, { query: { arr: ['solo'] } });
    expect(href).toBe('/test?first=solo');
  });

  it('should prefer provided real queryParams reader over synthetic', () => {
    // Create a fake QueryParamsReader with custom values() behavior
    const realReader = {
      value: (k: string) => (k === 'a' ? 'realA' : undefined),
      values: (k: string) => (k === 'arr' ? ['one', 'two'] : []),
      number: () => undefined,
      int: () => undefined,
      float: () => undefined,
      bool: () => undefined,
      date: () => undefined,
      has: () => true,
      raw: () => ({}),
    } as unknown as DummyQP;
    const route = makeRoute({
      serializeQuery: (_q, { queryParams }) => {
        const a = queryParams.value('a');
        const arr = queryParams.values('arr').join('|');
        return `a=${a}&arr=${arr}`;
      },
    });
    const href = buildHref(route, { query: { a: 'ignore', arr: ['x'] }, queryParams: realReader });
    // Should use values from realReader (realA, one|two) not synthetic (ignore,x)
    expect(href).toBe('/test?a=realA&arr=one|two');
  });

  it('should use explicit reader with buildHrefWithQueryParams (integration)', () => {
    const explicitReader = {
      value: (k: string) => (k === 'a' ? 'X' : undefined),
      values: () => [],
      number: () => undefined,
      int: () => undefined,
      float: () => undefined,
      bool: () => undefined,
      date: () => undefined,
      has: () => true,
      raw: () => ({}),
    } as unknown as DummyQP;
    const route = makeRoute({
      serializeQuery: (_q, { queryParams }) => `a=${queryParams.value('a')}`,
    });
    const href = buildHrefWithQueryParams(route, explicitReader, { query: { a: 'ignored' } });
    expect(href).toBe('/test?a=X');
  });
});

// ============================================================================
// 3. PATH BUILDING FUNCTIONS
// ============================================================================

describe('buildPath', () => {
  it('should replace dynamic segments', () => {
    const route: Route<'@[handle]'> = { path: '@[handle]', title: () => 'x' };
    expect(buildPath(route, { handle: 'john' })).toBe('@john');
  });

  it('should replace all occurrences of repeated params', () => {
    const route: Route<'report/[year]/summary-[year]'> = { path: 'report/[year]/summary-[year]', title: () => 'r' };
    expect(buildPath(route, { year: '2025' })).toBe('report/2025/summary-2025');
  });

  it('should return path unchanged when params is null', () => {
    const route: Route<'static/path'> = { path: 'static/path', title: () => 'Static' };
    expect(buildPath(route, null as unknown as undefined)).toBe('static/path');
  });

  it('should return path unchanged when params is undefined', () => {
    const route: Route<'static/path'> = { path: 'static/path', title: () => 'Static' };
    expect(buildPath(route)).toBe('static/path');
  });

  it('should handle params with special characters', () => {
    const route: Route<'search/[query]'> = { path: 'search/[query]', title: () => 'Search' };
    expect(buildPath(route, { query: 'hello world' })).toBe('search/hello%20world');
  });

  it('should ignore params not in path', () => {
    const route: Route<'user/[id]'> = { path: 'user/[id]', title: () => 'User' };
    expect(buildPath(route, { id: '123', extra: 'ignored' } as unknown as { id: string })).toBe('user/123');
  });
});

describe('validatePathParams', () => {
  it('should throw on missing params', () => {
    const route: Route<'@[handle]'> = { path: '@[handle]', title: () => 'x' };
    expect(() => validatePathParams(route)).toThrow();
  });

  it('should warn on unused params (does not throw)', () => {
    const route: Route<'user/[id]'> = { path: 'user/[id]', title: () => 'u' };
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(() => validatePathParams(route, { id: '123', extra: 'ignored' } as unknown as { id: string })).not.toThrow();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

// ============================================================================
// 4. FRAGMENT FUNCTIONS
// ============================================================================

describe('buildFragment', () => {
  it('should build fragment with hash prefix', () => {
    // Core now preserves fragment casing
    expect(buildFragment('Section-1')).toBe('#Section-1');
  });

  it('should return empty string for undefined', () => {
    expect(buildFragment(undefined)).toBe('');
  });

  it('should return empty string for empty string', () => {
    expect(buildFragment('')).toBe('');
  });

  it('should encode unencoded fragment', () => {
    expect(buildFragment('my section')).toBe('#my%20section');
  });

  it('should preserve already-encoded fragment', () => {
    expect(buildFragment('my%20section')).toBe('#my%20section');
  });

  it('should handle special characters', () => {
    expect(buildFragment('section#1')).toBe('#section%231');
  });

  it('should handle case-insensitive hex comparison', () => {
    expect(buildFragment('test%2f')).toBe('#test%2f');
    expect(buildFragment('test%2F')).toBe('#test%2F');
  });
});

describe('hasFragment', () => {
  it('should detect fragment presence', () => {
    expect(hasFragment({ fragment: 'x' })).toBe(true);
    expect(hasFragment({} as unknown as { fragment: string })).toBe(false);
  });
});

// ============================================================================
// 5. ROUTE RESOLUTION FUNCTIONS
// ============================================================================

describe('parseUrl', () => {
  it('should extract parameters', () => {
    const result = parseUrl('/user/john', 'user/[handle]');
    expect(result?.params).toEqual({ handle: 'john' });
  });
});

describe('findRoute', () => {
  it('should parse query and params', () => {
    const routes = [
      {
        path: '@[handle]/collections/[id]',
        getQuery: (params: { value: (k: string) => string | undefined; values: (k: string) => string[] }) => ({
          sort: params.value('sort'),
          filter: params.values('filter'),
        }),
        title: () => 'x',
      },
    ];
    const r = findRoute('/@h/collections/abc?sort=date&filter=a&filter=b', routes as Route<string>[]);
    expect(r?.params).toEqual({ handle: 'h', id: 'abc' });
    expect(r?.query).toEqual({ sort: 'date', filter: ['a', 'b'] });
  });

  it('should return undefined for invalid URL', () => {
    const routes = [{ path: 'test', title: () => 'Test' }] as Route<string>[];
    expect(findRoute('not a url', routes)).toBeUndefined();
  });

  it('should decode path parameters', () => {
    const routes = [{ path: 'user/[name]', title: () => 'User' }] as Route<string>[];
    const result = findRoute('/user/John%20Doe', routes);
    expect(result?.params).toEqual({ name: 'John Doe' });
  });

  it('should parse fragment from URL', () => {
    const routes = [{ path: 'page', title: () => 'Page' }] as Route<string>[];
    const result = findRoute('/page#section', routes);
    expect(result?.fragment).toBe('section');
  });

  it('should decode fragment', () => {
    const routes = [{ path: 'page', title: () => 'Page' }] as Route<string>[];
    const result = findRoute('/page#my%20section', routes);
    expect(result?.fragment).toBe('my section');
  });

  it('should use custom queryParamsFactory when provided', () => {
    const getValue = (key: string, raw: Record<string, string[]>) => raw[key]?.[0];
    const getValues = (key: string, raw: Record<string, string[]>) => raw[key] || [];
    const customFactory = (raw: Record<string, string[]>) => ({
      value: (key: string) => getValue(key, raw),
      values: (key: string) => getValues(key, raw),
    });
    const routes = [
      {
        path: 'test',
        queryParamsFactory: customFactory,
        getQuery: (qp: QueryParamsReader) => ({ search: qp.value('q') }),
        title: () => 'Test',
      },
    ] as Route<string>[];
    const result = findRoute('/test?q=value', routes);
    expect(result?.query).toEqual({ search: 'value' });
  });
});

// Test utilities for generic helpers
type AlphaRoute = Route<'alpha'>;
type UserRoute = Route<'user/[id]'>;
const routes: (AlphaRoute | UserRoute)[] = [
  { path: 'alpha', title: () => 'Alpha' },
  { path: 'user/[id]', title: ({ params }) => `User ${(params as { id: string }).id}` },
];

describe('getRoute', () => {
  it('should match a simple route', () => {
    const match = getRoute('/alpha', routes);
    expect(match.route.path).toBe('alpha');
    expect(match.title({})).toBe('Alpha');
  });

  it('should resolve dynamic params', () => {
    const match = getRoute('/user/123', routes);
    expect(match.params).toEqual({ id: '123' });
    expect(match.title({})).toBe('User 123');
  });

  it('should throw on missing route', () => {
    expect(() => getRoute('/missing', routes)).toThrow('Route not found');
  });

  it('should throw error with invalid URL type', () => {
    const routes = [{ path: 'test', title: () => 'Test' }] as Route<string>[];
    // @ts-expect-error: Testing invalid input
    expect(() => getRoute(null, routes)).toThrow('A valid page URL is required');
  });

  it('should throw error showing available routes when not found', () => {
    const routes = [
      { path: 'a', title: () => 'A' },
      { path: 'b', title: () => 'B' },
    ] as Route<string>[];
    expect(() => getRoute('/missing', routes)).toThrow('Route not found for path: missing');
  });

  it('should truncate available routes list when many routes', () => {
    const makeTestRoute = (i: number) => ({
      path: `route${i}`,
      title: () => `Route ${i}`,
    });
    const routes = Array.from({ length: 30 }, (_, i) => makeTestRoute(i)) as Route<string>[];
    expect(() => getRoute('/missing', routes)).toThrow('...');
  });
});

describe('Route Type Safety (selected)', () => {
  it('should extract meta from route', () => {
    type AdminRoute = Route<'admin', QueryParamsReader, object, { permission: string }>;
    const adminRoute: AdminRoute = {
      path: 'admin',
      getMeta: () => ({ permission: 'admin' }),
      title: ({ meta }) => `Admin (${meta?.permission})`,
    };
    const result = findRoute('/admin', [adminRoute]);
    expect(result?.meta).toEqual({ permission: 'admin' });
  });
});

// ============================================================================
// 6. HREF BUILDING FUNCTIONS
// ============================================================================

describe('buildHref', () => {
  it('should build href with params + query + fragment (core only)', () => {
    const route: Route<'search/[term]', QueryParamsReader, { filter: string }> = {
      path: 'search/[term]',
      title: () => 'Search',
      getQuery: () => ({ filter: 'category:web' }),
    };
    const href = buildHref(route, {
      params: { term: 'react & typescript' },
      query: { filter: 'category:web' },
      context: { fragment: 'Results' },
    });
    // Core preserves casing: '%3A' remains uppercase, fragment preserved
    expect(href).toBe('/search/react%20%26%20typescript?filter=category%3Aweb#Results');
  });

  it('should handle route with custom href function', () => {
    const route: Route<'custom'> = {
      path: 'custom',
      title: () => 'Custom',
      href: () => '/custom-override',
    };
    // buildHref calls the custom href function in the returned MatchedRoute, but when called directly
    // on the route, it validates params and builds path normally, then the custom href is used in MatchedRoute
    const result = findRoute('/custom', [route]);
    expect(result?.href({})).toBe('/custom-override');
  });

  it('should prefer args.fragment over context.fragment', () => {
    const route: Route<'test'> = { path: 'test', title: () => 'Test' };
    const href = buildHref(route, {
      fragment: 'args',
      context: { fragment: 'context' } as unknown as object,
    });
    expect(href).toContain('#args');
    expect(href).not.toContain('#context');
  });

  it('should handle empty query object', () => {
    const route: Route<'test', QueryParamsReader, object> = {
      path: 'test',
      title: () => 'Test',
      getQuery: () => ({}),
    };
    expect(buildHref(route, { query: {} })).toBe('/test');
  });

  it('should handle whitespace-only serializeQuery result', () => {
    const route: Route<'test', QueryParamsReader, { a?: string }> = {
      path: 'test',
      title: () => 'Test',
      getQuery: () => ({ a: 'test' }),
      serializeQuery: () => '  \t  ',
    };
    expect(buildHref(route, { query: { a: 'test' } })).toBe('/test');
  });
});

describe('getHref', () => {
  it('should build href from path string', () => {
    const href = getHref('alpha', routes, {} as unknown as { params?: object; query?: object; context?: object });
    expect(href).toBe('/alpha');
  });

  it('should build href with params via route object', () => {
    const dynamicRoute = routes[1] as UserRoute;
    const href = buildHref(dynamicRoute, { params: { id: 'xyz' } });
    expect(href).toBe('/user/xyz');
  });

  it('should throw error when route path not found', () => {
    const routes = [{ path: 'existing', title: () => 'Existing' }] as Route<string>[];
    expect(() => getHref('missing', routes, {})).toThrow('Route not found for path: missing');
  });

  it('should throw error showing available routes', () => {
    const routes = [{ path: 'a', title: () => 'A' }] as Route<string>[];
    expect(() => getHref('b', routes, {})).toThrow('attempted=string');
  });

  it('should work with route object', () => {
    const route = { path: 'test', title: () => 'Test' } as Route<'test'>;
    const routes = [route];
    expect(getHref(route, routes, {})).toBe('/test');
  });

  it('should handle partial args gracefully', () => {
    const route: Route<'user/[id]'> = { path: 'user/[id]', title: () => 'User' };
    const routes = [route];
    expect(getHref(route, routes, { params: { id: '123' } })).toBe('/user/123');
  });
});

// ============================================================================
// 7. ROUTE STRUCTURE FUNCTIONS
// ============================================================================

describe('buildNestedRoutes', () => {
  it('should nest children routes', () => {
    const routes = [
      { path: 'dashboard', title: () => 'd' },
      { path: 'settings', parentPath: 'dashboard', title: () => 's' },
    ];
    const nested = buildNestedRoutes(routes as Route<string>[]);
    expect(nested[0].children[0].route.path).toBe('settings');
  });

  it('should handle empty routes array', () => {
    expect(buildNestedRoutes([])).toEqual([]);
  });

  it('should handle routes with no parents', () => {
    const routes = [
      { path: 'a', title: () => 'A' },
      { path: 'b', title: () => 'B' },
    ] as Route<string>[];
    const nested = buildNestedRoutes(routes);
    expect(nested).toHaveLength(2);
    expect(nested[0].children).toEqual([]);
    expect(nested[1].children).toEqual([]);
  });

  it('should handle orphaned children (parent not found)', () => {
    const routes = [{ path: 'child', parentPath: 'missing', title: () => 'Child' }] as Route<string>[];
    const nested = buildNestedRoutes(routes);
    // Child is not added to nested array since it has a parent path
    expect(nested).toEqual([]);
  });

  it('should handle multiple levels of nesting', () => {
    const routes = [
      { path: 'root', title: () => 'Root' },
      { path: 'child', parentPath: 'root', title: () => 'Child' },
      { path: 'grandchild', parentPath: 'child', title: () => 'Grandchild' },
    ] as Route<string>[];
    const nested = buildNestedRoutes(routes);
    expect(nested[0].children[0].route.path).toBe('child');
    expect(nested[0].children[0].children[0].route.path).toBe('grandchild');
  });
});

describe('buildBreadcrumbTrail', () => {
  it('should build breadcrumb trail', () => {
    const routes = [
      { path: 'dashboard', title: () => 'Dashboard', breadcrumb: () => 'Home' },
      { path: 'settings', parentPath: 'dashboard', title: () => 'Settings', breadcrumb: () => 'Settings' },
    ] as Route<string>[];
    const trail = buildBreadcrumbTrail('/settings', routes);
    expect(trail).toEqual(['Home', 'Settings']);
  });

  it('should return empty array when no route matches', () => {
    const routes = [{ path: 'dashboard', title: () => 'Dashboard' }] as Route<string>[];
    expect(buildBreadcrumbTrail('/missing', routes)).toEqual([]);
  });

  it('should stop at max depth to prevent infinite loops', () => {
    // Create a circular parent reference scenario
    const routes = [] as Route<string>[];
    for (let i = 0; i < 15; i++) {
      routes.push({
        path: `level${i}`,
        parentPath: i > 0 ? `level${i - 1}` : undefined,
        title: () => `Level ${i}`,
      } as Route<string>);
    }
    const trail = buildBreadcrumbTrail('/level14', routes);
    expect(trail.length).toBeLessThanOrEqual(10);
  });

  it('should detect and stop on circular parent references', () => {
    const routes = [
      { path: 'a', parentPath: 'b', title: () => 'A' },
      { path: 'b', parentPath: 'a', title: () => 'B' },
    ] as Route<string>[];
    const trail = buildBreadcrumbTrail('/a', routes);
    // Detects cycle and stops after first route
    expect(trail.length).toBe(2); // 'A' then tries to get parent 'B' which cycles back
  });

  it('should use title when breadcrumb is not defined', () => {
    const routes = [{ path: 'page', title: () => 'Page Title' }] as Route<string>[];
    const trail = buildBreadcrumbTrail('/page', routes);
    expect(trail).toEqual(['Page Title']);
  });

  it('should pass context only to matched route', () => {
    const routes = [
      {
        path: 'parent',
        title: ({ context }: { context?: { value?: string } }) => `Parent: ${context?.value ?? 'none'}`,
      },
      {
        path: 'child',
        parentPath: 'parent',
        title: ({ context }: { context?: { value?: string } }) => `Child: ${context?.value ?? 'none'}`,
      },
    ] as Route<string>[];
    const trail = buildBreadcrumbTrail('/child', routes, { value: 'test' });
    expect(trail[0]).toBe('Parent: none');
    expect(trail[1]).toBe('Child: test');
  });
});

// ============================================================================
// 8. HELPER FUNCTIONS
// ============================================================================

describe('getEmpty helpers', () => {
  it('should return empty string and empty object', () => {
    expect(getEmptyString()).toBe('');
    expect(getEmptyObject()).toEqual({});
  });
});
