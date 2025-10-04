import type { QueryParamsReader } from "./query.types.js";
import { getQueryValues } from "./util.js";

export class QueryParamsBase implements QueryParamsReader {
  constructor(protected readonly params: Record<string, string | string[]>) {}

  value(key: string): string | undefined {
    return this.firstValue(key);
  }

  values(key: string): string[] {
    return getQueryValues(this.params, key);
  }

  protected firstValue(key: string): string | undefined {
    const valuesByKey = this.values(key);
    return valuesByKey.length > 0 ? valuesByKey[0] : undefined;
  }
}
