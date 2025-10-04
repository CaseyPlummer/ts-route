import { describe, expect, it } from 'vitest';
import { escapeRegex, extractParamNames, getQueryValues, getRelativePart, pathToRegex } from '../src/util.js';

describe('getRelativePart', () => {
  it('should return undefined for undefined values', () => {
    expect(getRelativePart(undefined as unknown as string)).toBeUndefined();
  });

  it('should extract pathname without leading slash from string URL', () => {
    expect(getRelativePart('https://example.com/path')).toBe('path');
    expect(getRelativePart('https://example.com/some/nested/path')).toBe('some/nested/path');
  });

  it('should extract pathname from URL object', () => {
    expect(getRelativePart(new URL('https://example.com/path'))).toBe('path');
    expect(getRelativePart(new URL('https://example.com/some/nested/path'))).toBe('some/nested/path');
  });

  it('should include search parameters', () => {
    expect(getRelativePart('https://example.com/path?key=value')).toBe('path?key=value');
    expect(getRelativePart('https://example.com/path?key=value&other=123')).toBe('path?key=value&other=123');
  });

  it('should include hash fragments', () => {
    expect(getRelativePart('https://example.com/path#section')).toBe('path#section');
    expect(getRelativePart('https://example.com/path#section-id')).toBe('path#section-id');
  });

  it('should include both search parameters and hash fragments', () => {
    expect(getRelativePart('https://example.com/path?key=value#section')).toBe('path?key=value#section');
  });

  it('should return undefined for invalid URLs', () => {
    expect(getRelativePart('http://')).toBeUndefined();
    expect(getRelativePart('https://')).toBeUndefined();
  });

  it('should handle relative URLs correctly', () => {
    expect(getRelativePart('path/to/something')).toBe('path/to/something');
    expect(getRelativePart('path')).toBe('path');
  });

  it('should handle inputs with leading slashes by removing them', () => {
    expect(getRelativePart('/path/to/something')).toBe('path/to/something');
    expect(getRelativePart('/single')).toBe('single');
  });

  it('should handle URLs with encoded characters', () => {
    expect(getRelativePart('https://example.com/path%20with%20spaces')).toBe('path%20with%20spaces');
    expect(getRelativePart('https://example.com/user?name=John%20Doe')).toBe('user?name=John%20Doe');
  });

  it('should handle URLs with special characters', () => {
    expect(getRelativePart('https://example.com/path-with-hyphens')).toBe('path-with-hyphens');
    expect(getRelativePart('https://example.com/path_with_underscores')).toBe('path_with_underscores');
    expect(getRelativePart('https://example.com/path.with.dots')).toBe('path.with.dots');
  });

  it('should trim whitespace from string inputs', () => {
    expect(getRelativePart('  https://example.com/path  ')).toBe('path');
    expect(getRelativePart('  /trimmed-path  ')).toBe('trimmed-path');
  });

  it('should handle empty paths correctly', () => {
    expect(getRelativePart('https://example.com')).toBe('');
    expect(getRelativePart('https://example.com/')).toBe('');
  });

  it('should handle real example URL', () => {
    const apiKeyPlaceholder = 'AIzaSyDUMMY-REDACTED-KEY-FOR-TESTS123456';
    const url = `http://localhost:5173/auth-action?mode=verifyEmail&oobCode=lBi5bCqYPyfguE6bUEM-_KE0c52bxYn97Wsr8x6_61IAAAGWgvDSmg&apiKey=${apiKeyPlaceholder}&lang=en`;
    const expected = `auth-action?mode=verifyEmail&oobCode=lBi5bCqYPyfguE6bUEM-_KE0c52bxYn97Wsr8x6_61IAAAGWgvDSmg&apiKey=${apiKeyPlaceholder}&lang=en`;

    expect(getRelativePart(url)).toBe(expected);
    expect(getRelativePart(new URL(url))).toBe(expected);
  });
});

describe('escapeRegex', () => {
  it('should escape special characters', () => {
    const input = 'path/to.$pecial*(chars)?';
    const escaped = escapeRegex(input);
    // Verify each special character is escaped with a preceding backslash
    expect(escaped.includes('\\.')).toBe(true);
    expect(escaped.includes('\\$')).toBe(true);
    expect(escaped.includes('\\*')).toBe(true);
    expect(escaped.includes('\\(')).toBe(true);
    expect(escaped.includes('\\)')).toBe(true);
    expect(escaped.includes('\\?')).toBe(true);
    const re = new RegExp(escaped);
    expect(re.test(input)).toBe(true);
  });
});

describe('pathToRegex', () => {
  it('should build regex and extract param names for simple path', () => {
    const { regex, paramNames } = pathToRegex('users/[id]');
    expect(paramNames).toEqual(['id']);
    const match = regex.exec('users/123');
    expect(match?.[1]).toBe('123');
  });

  it('should handle multiple params in segment', () => {
    const { regex, paramNames } = pathToRegex('report-[year]-[month]');
    expect(paramNames).toEqual(['year', 'month']);
    const match = regex.exec('report-2024-09');
    expect(match?.[1]).toBe('2024');
    expect(match?.[2]).toBe('09');
  });

  it('should throw on null/undefined', () => {
    // @ts-ignore deliberate invalid
    expect(() => pathToRegex(undefined)).toThrow('pathToRegex: path is null or undefined');
    // @ts-ignore deliberate invalid
    expect(() => pathToRegex(null)).toThrow('pathToRegex: path is null or undefined');
  });

  it('should throw on non-string', () => {
    // @ts-ignore deliberate invalid
    expect(() => pathToRegex(123)).toThrow('pathToRegex: path must be a string');
  });

  it('should throw on duplicate slashes', () => {
    expect(() => pathToRegex('foo//bar')).toThrow('duplicate slash segment');
  });

  it('should throw on leading slash', () => {
    expect(() => pathToRegex('/leading')).toThrow("should not start with '/'");
  });

  it('should throw on trailing slash', () => {
    expect(() => pathToRegex('trailing/')).toThrow("should not end with '/'");
  });

  it('should throw on whitespace', () => {
    expect(() => pathToRegex('white space')).toThrow('contains whitespace');
  });
});

describe('extractParamNames', () => {
  it('should extract names from path with params', () => {
    expect(extractParamNames('users/[id]/orders/[orderId]')).toEqual(['id', 'orderId']);
  });

  it('should return empty array when no params', () => {
    expect(extractParamNames('static/path')).toEqual([]);
  });
});

describe('getQueryValues', () => {
  it('should return distinct trimmed values', () => {
    const params = { key: ['  a', 'a ', 'b', ''] };
    expect(getQueryValues(params, 'key').sort((a: string, b: string) => a.localeCompare(b))).toEqual(['a', 'b']);
  });

  it('should wrap single string into array', () => {
    const params = { key: 'value' } as Record<string, string | string[]>;
    expect(getQueryValues(params, 'key')).toEqual(['value']);
  });
});
