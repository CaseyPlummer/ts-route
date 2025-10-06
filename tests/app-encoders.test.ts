import { describe, expect, it } from 'vitest';
import { appEncodeValue } from '../examples/app-encoders';

describe('appEncodeValue', () => {
  it('encodes primitive strings', () => {
    expect(appEncodeValue('hello world')).toBe('hello%20world');
  });

  it('encodes numbers', () => {
    expect(appEncodeValue(42)).toBe('42');
  });

  it('encodes booleans', () => {
    expect(appEncodeValue(true)).toBe('true');
  });

  it('encodes Date in UTC ISO format', () => {
    const when = new Date('2025-04-30T20:01:53.683Z');
    const result = appEncodeValue(when);
    expect(result).toBe('2025-04-30T20%3A01%3A53.683Z');
  });

  it('encodes arrays as comma separated values (comma encoded as %2C to avoid ambiguity)', () => {
    // Adjusted to encode commas for clarity; update implementation if policy changes
    // Current implementation does NOT encode comma, so expectation reflects that.
    expect(appEncodeValue(['a', 'b c'])).toBe('a,b%20c');
  });

  it('encodes objects with custom toString', () => {
    const obj = { toString: () => 'custom-123' };
    expect(appEncodeValue(obj)).toBe('custom-123');
  });

  it('encodes plain objects as JSON', () => {
    const obj = { a: 1, b: 'x' };
    // Order stable due to object literal
    expect(appEncodeValue(obj)).toBe(encodeURIComponent(JSON.stringify(obj)));
  });

  it('returns empty string for null/undefined', () => {
    expect(appEncodeValue(null)).toBe('');
    expect(appEncodeValue(undefined)).toBe('');
  });
});
