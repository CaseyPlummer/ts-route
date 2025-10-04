import { QueryParamsBase } from "../src/query.js";
import type { AppQueryParamsReader } from "./app-query.types.js";

// Lightweight parse helpers (inline implementations)
function parseNumber(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const num = Number(value);
  return isNaN(num) ? undefined : num;
}

function parseBoolean(value: string | undefined): boolean | undefined {
  if (!value) return undefined;
  const lower = value.toLowerCase();
  if (lower === "true") return true;
  if (lower === "false") return false;
  return undefined;
}

/**
 * Application-level query params providing typed helpers.
 */
export class AppQueryParams
  extends QueryParamsBase
  implements AppQueryParamsReader
{
  number(key: string): number | undefined {
    return parseNumber(this.value(key));
  }

  boolean(key: string): boolean | undefined {
    return parseBoolean(this.value(key));
  }
}
