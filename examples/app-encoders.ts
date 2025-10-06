import { encodeValue } from '../src';

// If serializeQuery is not used, this can be used as a per-value encoder for query params
export function appEncodeValue(value: unknown): string {
  // Handle app-specific types first
  if (value instanceof Date) {
    return encodeURIComponent(value.toISOString());
  }

  // Delegate all other types to the core encodeValue function
  return encodeValue(value);
}
