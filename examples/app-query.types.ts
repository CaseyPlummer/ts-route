import type { QueryParamsReader } from '../src/query.types.js';

export interface AppQueryParamsReader extends QueryParamsReader {
  number(key: string): number | undefined;
  boolean(key: string): boolean | undefined;
}
