import { findRoute } from '../src/helpers.js';
import { describe, expect, it } from 'vitest';
import { AppQueryParams } from '../examples/app-query.js';

// Enums & enum-like objects
enum StringEnum {
  Fruit = 'Apple',
  Vegetable = 'Cucumber',
  Nut = 'Almond',
}

enum NumericEnum {
  One = 1,
  Two = 2,
  Three = 3,
}

const customEnumLike = {
  A: 'ValueA',
  B: 'ValueB',
  C: 123,
};

const emptyEnumLike = {} as const;

// Tests for the derived class (numeric, boolean, dateTime, enum helpers)
describe('AppQueryParams', () => {
  it('number() should parse numbers and ignore invalid', () => {
    const params = new AppQueryParams({ count: '42', invalid: 'abc', empty: '' });
    expect(params.number('count')).toBe(42);
    expect(params.number('invalid')).toBeUndefined();
    expect(params.number('empty')).toBeUndefined();
    expect(params.number('missing')).toBeUndefined();
  });

  it('boolean() should parse boolean values', () => {
    const params = new AppQueryParams({ active: 'true', inactive: 'false', invalid: 'maybe' });
    expect(params.boolean('active')).toBe(true);
    expect(params.boolean('inactive')).toBe(false);
    expect(params.boolean('invalid')).toBeUndefined();
    expect(params.boolean('missing')).toBeUndefined();
  });

  it('date() should parse ISO date strings', () => {
    const params = new AppQueryParams({ date: '2023-01-15T12:30:45Z', invalid: 'not-a-date' });
    expect(params.date('date')).toBeInstanceOf(Date);
    expect(params.date('date')?.toISOString()).toBe('2023-01-15T12:30:45.000Z');
    expect(params.date('invalid')).toBeUndefined();
    expect(params.date('missing')).toBeUndefined();
  });

  it('enumKey() should resolve enum keys (case-insensitive)', () => {
    const params = new AppQueryParams({ fruit: 'FRUIT' });
    expect(params.enumKey(StringEnum, 'fruit')).toBe('Fruit');
    expect(params.enumKey(StringEnum, 'unknown')).toBeUndefined();
  });

  it('enumValue() should resolve enum values (case-insensitive)', () => {
    const params = new AppQueryParams({ fruit: 'APPLE', count: '1' });
    expect(params.enumValue(StringEnum, 'fruit')).toBe('Apple');
    expect(params.enumValue(NumericEnum, 'count')).toBe('One');
  });

  it('enum helpers should return undefined for invalid values', () => {
    const params = new AppQueryParams({ fruit: 'Banana', count: 'abc' });
    expect(params.enumValue(StringEnum, 'fruit')).toBeUndefined();
    expect(params.enumValue(NumericEnum, 'count')).toBeUndefined();
  });

  it('enum helpers should work with custom enum-like objects (keys)', () => {
    const params = new AppQueryParams({ type: 'A', number: 'C' });
    expect(params.enumKey(customEnumLike, 'type')).toBe('A');
    expect(params.enumKey(customEnumLike, 'number')).toBe('C');
  });

  it('enum helpers should work with custom enum-like objects (values)', () => {
    const params = new AppQueryParams({ type: 'ValueA', number: '123' });
    expect(params.enumValue(customEnumLike, 'type')).toBe('ValueA');
    expect(params.enumValue(customEnumLike, 'number')).toBe(123);
  });

  it('enum helpers should return undefined for empty enum-like objects', () => {
    const params = new AppQueryParams({ test: 'value' });
    expect(params.enumValue(emptyEnumLike, 'test')).toBeUndefined();
    expect(params.enumKey(emptyEnumLike, 'test')).toBeUndefined();
  });

  it('enumKey() should match by value (case-insensitive)', () => {
    const params = new AppQueryParams({ type: 'one' });
    expect(params.enumKey({ One: 'one', Two: 'two', Three: 'three' }, 'type')).toBe('One');
  });

  it('enumKey() should match by value uppercase', () => {
    const params = new AppQueryParams({ type: 'ONE' });
    expect(params.enumKey({ One: 'one', Two: 'two', Three: 'three' }, 'type')).toBe('One');
  });

  it('enumKey() should return undefined for non-matching value', () => {
    const params = new AppQueryParams({ type: 'four' });
    expect(params.enumKey({ One: 'one', Two: 'two', Three: 'three' }, 'type')).toBeUndefined();
  });

  it('enumKey() should return undefined for missing param', () => {
    const params = new AppQueryParams({});
    expect(params.enumKey({ One: 'one', Two: 'two', Three: 'three' }, 'type')).toBeUndefined();
  });

  it('enumValue() should return value for key or value', () => {
    const params = new AppQueryParams({ byValue: 'one', byKey: 'One' });
    expect(params.enumValue({ One: 'one', Two: 'two', Three: 'three' }, 'byValue')).toBe('one');
    expect(params.enumValue({ One: 'one', Two: 'two', Three: 'three' }, 'byKey')).toBe('one');
  });

  it('enum helpers should work with numeric enums for key & value', () => {
    const params = new AppQueryParams({ byValue: '2', byKey: 'Two' });
    expect(params.enumValue(NumericEnum, 'byValue')).toBe('Two');
    expect(params.enumKey(NumericEnum, 'byKey')).toBe('Two');
  });

  it('enumValue() should return undefined for non-matching value', () => {
    const params = new AppQueryParams({ type: 'invalid' });
    expect(params.enumValue({ One: 'one', Two: 'two', Three: 'three' }, 'type')).toBeUndefined();
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
    expect(result?.params).toEqual({ term: 'complex query with & special characters' });
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
