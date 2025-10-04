import { describe, expect, it } from 'vitest';
import { QueryParamsBase } from '../src/query.js';

// Tests for the base class focus only on raw value extraction & de-duplication.
describe('QueryParamsBase', () => {
  it('values() should return distinct trimmed values preserving single occurrences', () => {
    const params = new QueryParamsBase({
      tag: ['  react', 'react', 'typescript', ''],
    });
    expect(params.values('tag')).toEqual(['react', 'typescript']);
    expect(params.values('missing')).toEqual([]);
  });

  it('value() should return first non-empty value', () => {
    const params = new QueryParamsBase({
      id: [' 123', '456'],
      empty: '',
      other: [''],
    });
    expect(params.value('id')).toBe('123');
    expect(params.value('empty')).toBeUndefined();
    expect(params.value('missing')).toBeUndefined();
  });
});
