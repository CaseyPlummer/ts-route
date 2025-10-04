export interface QueryParamsReader {
  value(key: string): string | undefined;
  values(key: string): string[];
}

// Factory type for constructing a query params reader implementation from raw key->values map
export type QueryParamsFactory<QP extends QueryParamsReader> = (raw: Record<string, string[]>) => QP;
