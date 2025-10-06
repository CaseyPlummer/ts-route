import { describe, expect, it } from 'vitest';
import { WildcardRoute } from '../src/routes.types';
import { applyRouteDefaults } from '../src/route-defaults';
import { QueryParamsBase } from '../src/query';

describe('applyRouteDefaults', () => {
  const routes: WildcardRoute[] = [
    { path: 'r1', title: () => 'R1' },
    { path: 'r2', title: () => 'R2' },
  ];

  it('applies encoder when provided', () => {
    const encoder = (v: unknown) => String(v).toUpperCase();
    const result = applyRouteDefaults(routes, {
      queryParamsFactory: (raw) => new QueryParamsBase(raw),
      encodeQueryValue: encoder,
    });
    expect(result[0].encodeQueryValue).toBe(encoder);
    expect(result[1].encodeQueryValue).toBe(encoder);
  });

  it('applies serializeQuery when provided', () => {
    const serializeQuery = () => 'a=1';
    const result = applyRouteDefaults(routes, {
      queryParamsFactory: (raw) => new QueryParamsBase(raw),
      serializeQuery,
    });
    expect(result[0].serializeQuery).toBe(serializeQuery);
  });

  it('applies both encoder and serializeQuery when provided', () => {
    const encoder = (v: unknown) => String(v);
    const serializeQuery = () => 'x=1';
    const result = applyRouteDefaults(routes, {
      queryParamsFactory: (raw) => new QueryParamsBase(raw),
      encodeQueryValue: encoder,
      serializeQuery,
    });
    expect(result[0].encodeQueryValue).toBe(encoder);
    expect(result[0].serializeQuery).toBe(serializeQuery);
  });

  it('throws when no query params factory provided', () => {
    expect(() => applyRouteDefaults(routes)).toThrow('applyRouteDefaults: A query params factory must be provided.');
  });

  it('throws when neither encoder nor serializeQuery provided', () => {
    expect(() => applyRouteDefaults(routes, { queryParamsFactory: (raw) => new QueryParamsBase(raw) })).toThrow(
      'applyRouteDefaults: At least one encoding method must be provided.',
    );
  });

  it('does not override existing route-specific properties', () => {
    const custom: WildcardRoute = {
      path: 'custom',
      title: () => 'Custom',
      encodeQueryValue: () => 'x',
      serializeQuery: () => 'y=1',
    } as const;
    const encoder = (v: unknown) => String(v);
    const serializeQuery = () => 'a=1';
    const result = applyRouteDefaults([custom], {
      queryParamsFactory: (raw) => new QueryParamsBase(raw),
      encodeQueryValue: encoder,
      serializeQuery,
    });
    expect(result[0].encodeQueryValue).not.toBe(encoder); // kept original
    expect(result[0].serializeQuery).not.toBe(serializeQuery); // kept original
  });

  it('homogeneous overload preserves specific query type inference', () => {
    // Create a narrow route type with a custom query shape
    type MyRoute = WildcardRoute & { getQuery: () => { foo: number } };
    const r1: MyRoute = { path: 'only', title: () => 'Only', getQuery: () => ({ foo: 1 }) };
    const result = applyRouteDefaults([r1], {
      queryParamsFactory: (raw) => new QueryParamsBase(raw),
      serializeQuery: (query) => {
        // query should be inferred (structurally) to include foo when accessed through runtime path.
        // We can do a runtime assertion without compile-time error.
        return 'foo=' + (query as { foo?: number }).foo;
      },
    });
    const invokeArgs = {
      params: {} as Record<string, never>,
      meta: {},
      context: {},
      queryParams: new QueryParamsBase({}),
    } as const;
    expect(
      result[0].serializeQuery?.(
        { foo: 2 },
        invokeArgs as unknown as Parameters<NonNullable<(typeof result)[0]['serializeQuery']>>[1],
      ),
    ).toBe('foo=2');
  });
});
