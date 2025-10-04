import { findRoute } from '../src/helpers.js';
import { describe, expect, it } from 'vitest';
import { AppQueryParams } from '../examples/app-query.js';

// Tests for the derived class (numeric, boolean helpers)
describe('AppQueryParams', () => {
  it('number() should parse numbers and ignore invalid', () => {
    const params = new AppQueryParams({
      count: '42',
      invalid: 'abc',
      empty: '',
    });
    expect(params.number('count')).toBe(42);
    expect(params.number('invalid')).toBeUndefined();
    expect(params.number('empty')).toBeUndefined();
    expect(params.number('missing')).toBeUndefined();
  });

  it('boolean() should parse boolean values', () => {
    const params = new AppQueryParams({
      active: 'true',
      inactive: 'false',
      invalid: 'maybe',
    });
    expect(params.boolean('active')).toBe(true);
    expect(params.boolean('inactive')).toBe(false);
    expect(params.boolean('invalid')).toBeUndefined();
    expect(params.boolean('missing')).toBeUndefined();
  });

  it('date() should parse ISO date strings', () => {
    const params = new AppQueryParams({
      valid: '2025-10-04T12:00:00Z',
      validShort: '2025-10-04',
      invalid: 'not-a-date',
      empty: '',
    });
    const validDate = params.date('valid');
    expect(validDate).toBeInstanceOf(Date);
    expect(validDate?.toISOString()).toBe('2025-10-04T12:00:00.000Z');

    const shortDate = params.date('validShort');
    expect(shortDate).toBeInstanceOf(Date);

    expect(params.date('invalid')).toBeUndefined();
    expect(params.date('empty')).toBeUndefined();
    expect(params.date('missing')).toBeUndefined();
  });

  it('enumKey() should return enum keys', () => {
    const TestEnum = {
      First: 'first',
      Second: 'second',
      Third: 'third',
    };

    const params = new AppQueryParams({
      mode: 'First',
      invalid: 'NotAnEnum',
    });

    expect(params.enumKey(TestEnum, 'mode')).toBe('First');
    expect(params.enumKey(TestEnum, 'invalid')).toBeUndefined();
    expect(params.enumKey(TestEnum, 'missing')).toBeUndefined();
  });

  it('enumKey() should support case-insensitive matching', () => {
    const TestEnum = {
      First: 'first',
      Second: 'second',
    };

    const params = new AppQueryParams({
      mode: 'first',
    });

    // Without ignoreCase, should not match
    expect(params.enumKey(TestEnum, 'mode', { ignoreCase: false })).toBeUndefined();

    // With ignoreCase, should match
    expect(params.enumKey(TestEnum, 'mode', { ignoreCase: true })).toBe('First');
  });

  it('enumKey() should support convert option to match by value', () => {
    const TestEnum = {
      First: 'first',
      Second: 'second',
    };

    const params = new AppQueryParams({
      mode: 'first', // This is the value, not the key
    });

    // With convert, should match by value and return key
    expect(params.enumKey(TestEnum, 'mode', { convert: true })).toBe('First');
  });

  it('enumValue() should return enum values', () => {
    const TestEnum = {
      First: 'first',
      Second: 'second',
      Third: 'third',
    };

    const params = new AppQueryParams({
      mode: 'First',
      invalid: 'NotAnEnum',
    });

    expect(params.enumValue(TestEnum, 'mode')).toBe('first');
    expect(params.enumValue(TestEnum, 'invalid')).toBeUndefined();
    expect(params.enumValue(TestEnum, 'missing')).toBeUndefined();
  });

  it('enumValue() should support convert and ignoreCase options', () => {
    const TestEnum = {
      First: 'first',
      Second: 'second',
    };

    const params = new AppQueryParams({
      byValue: 'first',
      byKey: 'SECOND',
    });

    // Match by value with convert
    expect(params.enumValue(TestEnum, 'byValue', { convert: true })).toBe('first');

    // Match by key with ignoreCase
    expect(params.enumValue(TestEnum, 'byKey', { ignoreCase: true })).toBe('second');
  });

  it('enum methods should work with numeric enum values', () => {
    const NumericEnum = {
      Zero: 0,
      One: 1,
      Two: 2,
    };

    const params = new AppQueryParams({
      key: 'One',
      value: '1',
    });

    expect(params.enumKey(NumericEnum, 'key')).toBe('One');
    expect(params.enumValue(NumericEnum, 'key')).toBe(1);

    // Convert value string to match enum value
    expect(params.enumKey(NumericEnum, 'value', { convert: true })).toBe('One');
    expect(params.enumValue(NumericEnum, 'value', { convert: true })).toBe(1);
  });
});

// Integration tests relying on routing & getQuery usage of derived helpers
describe('AppQueryParams integration with routing', () => {
  it('should decode special characters in complex URLs', () => {
    const routes = [
      {
        path: 'search/[term]',
        getQuery: (params: AppQueryParams) => ({
          sort: params.value('sort'),
        }),
        title: () => 'Search',
      },
    ];
    const url = '/search/complex%20query%20with%20%26%20special%20characters?sort=relevance';
    const result = findRoute(url, routes);
    expect(result?.params).toEqual({
      term: 'complex query with & special characters',
    });
    expect(result?.query).toEqual({ sort: 'relevance' });
  });

  it('should deduplicate repeated query parameters', () => {
    const routes = [
      {
        path: 'filter',
        getQuery: (params: AppQueryParams) => ({
          tags: params.values('tag'),
        }),
        title: () => 'Filters',
      },
    ];
    const url = '/filter?tag=red&tag=blue&tag=green&tag=red';
    // The inline route object matches Route<'filter', AppQueryParams, { tags: string[] }, object, object>
    const result = findRoute<(typeof routes)[number]>(url, routes);
    expect(result?.query).toEqual({ tags: ['red', 'blue', 'green'] });
  });
});
