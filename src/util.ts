export function getRelativePart(urlString: string | URL): string | undefined {
  if (urlString == null) return undefined;

  try {
    // Consider using URL.canParse() when widely supported
    // https://caniuse.com/mdn-api_url_canparse_static

    let url: URL;

    if (urlString instanceof URL) {
      // The .toString() is necessary to avoid the error "Cannot access event.url.hash" on the server.
      url = new URL(urlString.toString());
    } else if (typeof urlString === "string") {
      // Handle string input
      const input = urlString.trim();

      // Check if it's a fully qualified URL (starts with a scheme like http:// or https://)
      if (/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(input)) {
        url = new URL(input);
      } else {
        // Treat as relative part (with or without leading /)
        // Use a dummy base URL to parse the relative part
        const relative = input.startsWith("/") ? input.slice(1) : input;
        url = new URL(`http://dummy.com/${relative}`);
      }
    } else {
      return undefined;
    }

    // Return the relative part without the leading /
    return url.pathname.slice(1) + url.search + url.hash;
  } catch (error) {
    console.debug(
      "getRelativePart|Error:",
      error instanceof Error ? error.message : error
    );
    return undefined;
  }
}

export function escapeRegex(value: string): string {
  return value.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
}

// Convert a route path to a regex for matching and parameter extraction
export interface PathRegex {
  regex: RegExp;
  paramNames: string[];
}

export function pathToRegex(path: string): PathRegex {
  // Basic validation to surface configuration errors early.
  if (path == null) throw new Error("pathToRegex: path is null or undefined");
  if (typeof path !== "string")
    throw new Error("pathToRegex: path must be a string");
  const original = path;
  path = path.trim();
  if (path !== original) {
    // Trim only; no error, but avoid accidental invisible whitespace differences.
  }
  if (path.includes("//"))
    throw new Error(
      `pathToRegex: path contains duplicate slash segment: "${original}"`
    );
  if (/\s/.test(path))
    throw new Error(`pathToRegex: path contains whitespace: "${original}"`);
  if (path.startsWith("/"))
    throw new Error(
      `pathToRegex: path should not start with '/': "${original}"`
    );
  if (path.endsWith("/") && path !== "")
    throw new Error(`pathToRegex: path should not end with '/': "${original}"`);

  const segments = path.split("/");
  const paramNames: string[] = [];
  const regexParts: string[] = [];

  for (const segment of segments) {
    let segmentRegex = "";
    const paramPattern = /\[(.*?)\]/g;
    let match;

    // Find all parameters in the segment
    let lastIndex = 0;
    while ((match = paramPattern.exec(segment)) !== null) {
      const paramName = match[1]!;
      paramNames.push(paramName);

      // Escape the part before the parameter
      const before = escapeRegex(segment.slice(lastIndex, match.index));
      segmentRegex += `${before}([^/]+)`;
      lastIndex = match.index + match[0].length;
    }

    // Escape any remaining part of the segment after the last parameter
    if (lastIndex < segment.length) {
      segmentRegex += escapeRegex(segment.slice(lastIndex));
    } else if (segmentRegex === "") {
      // If no parameters were found, escape the entire segment
      segmentRegex = escapeRegex(segment);
    }

    regexParts.push(segmentRegex);
  }

  const regexStr = `^${path === "" ? "" : regexParts.join("/")}$`;

  const regex = new RegExp(regexStr);
  return { regex, paramNames };
}

export function extractParamNames(path: string): string[] {
  const segments = path.split("/");
  const paramNames: string[] = [];

  for (const segment of segments) {
    const paramPattern = /\[(.*?)\]/g;
    let match: RegExpExecArray | null;
    while ((match = paramPattern.exec(segment)) !== null) {
      paramNames.push(match[1]!);
    }
  }

  return paramNames;
}

export function getQueryValues(
  params: Record<string, string | string[]>,
  key: string
): string[] {
  const stringOrArray = params[key];
  const values = Array.isArray(stringOrArray) ? stringOrArray : [stringOrArray];
  const trimmed = values.map((v) => v?.trim() ?? "");
  const nonEmpty = trimmed.filter((v) => v !== "");
  const distinct = new Set(nonEmpty);
  return Array.from(distinct);
}
