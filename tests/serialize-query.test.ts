import { describe, expect, it } from 'vitest';
import type { QueryParamsReader } from '../src/query.types';
import type { SerializeQueryArgs, WildcardRoute } from '../src/routes.types';
import { createDefaultSerializer, serializeQuery } from '../src/serialize-query';

// Mock QueryParamsReader for testing
const mockQueryParamsReader: QueryParamsReader = {
  value: (key: string) => `value-${key}`,
  values: (key: string) => [`value1-${key}`, `value2-${key}`],
};

// Mock SerializeQueryArgs
const mockArgs: SerializeQueryArgs<string, QueryParamsReader, object, object> = {
  params: {},
  meta: {},
  context: {},
  queryParams: mockQueryParamsReader,
};

describe('serializeQuery', () => {
  it('should return empty string for null query', () => {
    expect(serializeQuery(null as unknown as object, mockArgs)).toBe('');
  });

  it('should return empty string for undefined query', () => {
    expect(serializeQuery(undefined as unknown as object, mockArgs)).toBe('');
  });

  it('should serialize simple string values', () => {
    const query = { search: 'hello world', category: 'books' };
    const result = serializeQuery(query, mockArgs);
    expect(result).toBe('search=hello%20world&category=books');
  });

  it('should serialize number values', () => {
    const query = { page: 1, limit: 10 };
    const result = serializeQuery(query, mockArgs);
    expect(result).toBe('page=1&limit=10');
  });

  it('should serialize boolean values', () => {
    const query = { active: true, hidden: false };
    const result = serializeQuery(query, mockArgs);
    expect(result).toBe('active=true&hidden=false');
  });

  it('should filter out null and undefined values', () => {
    const query = { search: 'test', nullValue: null, undefinedValue: undefined, category: 'books' };
    const result = serializeQuery(query, mockArgs);
    expect(result).toBe('search=test&category=books');
  });

  it('should handle array values', () => {
    const query = { tags: ['javascript', 'typescript'], category: 'programming' };
    const result = serializeQuery(query, mockArgs);
    expect(result).toBe('tags=javascript&tags=typescript&category=programming');
  });

  it('should handle mixed types', () => {
    const query = {
      search: 'hello',
      page: 1,
      active: true,
      tags: ['tag1', 'tag2'],
      empty: null,
    };
    const result = serializeQuery(query, mockArgs);
    expect(result).toBe('search=hello&page=1&active=true&tags=tag1&tags=tag2');
  });

  it('should handle special characters in values', () => {
    const query = { search: 'hello&world=test', special: 'a+b%c' };
    const result = serializeQuery(query, mockArgs);
    expect(result).toContain('search=hello%26world%3Dtest');
    // + is RFC3986 sub-delims and should be encoded as %2B for proper compliance
    expect(result).toContain('special=a%2Bb%25c');
  });

  it('should properly encode RFC3986 reserved characters', () => {
    const query = {
      path: '/api/users?id=123#section',
      email: 'user@domain.com:8080',
      expression: 'a[0]*(b+c)!',
    };
    const result = serializeQuery(query, mockArgs);

    // Should encode all RFC3986 reserved characters
    expect(result).toContain('path=%2Fapi%2Fusers%3Fid%3D123%23section');
    expect(result).toContain('email=user%40domain.com%3A8080');
    expect(result).toContain('expression=a%5B0%5D%2A%28b%2Bc%29%21');
  });

  it('should return empty string for empty object', () => {
    const query = {};
    const result = serializeQuery(query, mockArgs);
    expect(result).toBe('');
  });

  it('should return empty string for object with only null/undefined values', () => {
    const query = { nullValue: null, undefinedValue: undefined };
    const result = serializeQuery(query, mockArgs);
    expect(result).toBe('');
  });
});

describe('createDefaultSerializer', () => {
  it('should create a function that serializes queries', () => {
    const serializer = createDefaultSerializer();
    const query = { search: 'test', page: 1 };
    const result = serializer(query, mockArgs);
    expect(result).toBe('search=test&page=1');
  });

  it('should create a function that can be used as route serializeQuery', () => {
    const serializer = createDefaultSerializer();
    expect(typeof serializer).toBe('function');

    // Test that it matches the expected signature
    const query = { category: 'books' };
    const result = serializer(query, mockArgs);
    expect(result).toBe('category=books');
  });

  it('should work with route parameter', () => {
    const mockRoute = {
      path: 'test',
      title: () => 'Test',
      encodeQueryValue: (v: unknown) => String(v).toUpperCase(),
    };

    const serializer = createDefaultSerializer(mockRoute as WildcardRoute);
    const query = { search: 'test' };
    const result = serializer(query, mockArgs);
    // Should still work (encodeQueryValue from route would be used in encodeKeyValues)
    expect(typeof result).toBe('string');
  });

  it('should handle custom route encoding with RFC3986 compliance', () => {
    const mockRoute = {
      path: 'test',
      title: () => 'Test',
      encodeQueryValue: (v: unknown) => `custom:${String(v)}`,
    };

    const serializer = createDefaultSerializer(mockRoute as WildcardRoute);
    const query = { filter: 'category&value=test' };
    const result = serializer(query, mockArgs);

    // Custom encoder output should still be sanitized for RFC3986 compliance
    expect(result).toContain('filter=custom%3Acategory%26value%3Dtest');
  });
});
