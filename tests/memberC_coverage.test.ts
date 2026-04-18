import {describe, expect, it, vi} from 'vitest';
import {MemberCTarget, type RequestFunction} from '../src/memberC_target';

const noopCallback = vi.fn();

describe('Member C real coverage for getRequestFunction chain', () => {
  it('returns the fallback request function when no custom request is provided', () => {
    const httpRequest = vi.fn(() => 'http-result') as RequestFunction;
    const target = new MemberCTarget(
      {
        url: new URL('http://example.com'),
      },
      {httpRequest},
    );

    const request = target.getRequestFunction();
    const result = request?.(new URL('http://example.com'), {a: 1}, noopCallback);

    expect(httpRequest).toHaveBeenCalledOnce();
    expect(result).toBe('http-result');
  });

  it('uses https fallback when protocol is https without http2', () => {
    const httpsRequest = vi.fn(() => 'https-result') as RequestFunction;
    const target = new MemberCTarget(
      {
        url: new URL('https://example.com'),
      },
      {httpsRequest},
    );

    const request = target.getRequestFunction();
    const result = request?.(new URL('https://example.com'), {secure: true}, noopCallback);

    expect(httpsRequest).toHaveBeenCalledOnce();
    expect(result).toBe('https-result');
  });

  it('uses http2 auto request for supported https + http2 environments', () => {
    const http2Auto = vi.fn(() => 'http2-result') as RequestFunction;
    const target = new MemberCTarget(
      {
        url: new URL('https://example.com'),
        http2: true,
      },
      {
        http2Auto,
        nodeVersionMajor: 18,
        nodeVersionMinor: 0,
      },
    );

    const request = target.getRequestFunction();
    const result = request?.(new URL('https://example.com'), {}, noopCallback);

    expect(http2Auto).toHaveBeenCalledOnce();
    expect(result).toBe('http2-result');
  });

  it('uses the default http2 auto implementation when no override is provided', () => {
    const target = new MemberCTarget(
      {
        url: new URL('https://example.com'),
        http2: true,
      },
      {
        nodeVersionMajor: 18,
        nodeVersionMinor: 0,
      },
    );

    const request = target.getRequestFunction();
    const result = request?.(new URL('https://example.com'), {}, noopCallback);

    expect(result).toBe('http2-auto');
  });

  it('throws EUNSUPPORTED for https + http2 on old Node versions', () => {
    const target = new MemberCTarget(
      {
        url: new URL('https://example.com'),
        http2: true,
      },
      {
        nodeVersionMajor: 15,
        nodeVersionMinor: 9,
      },
    );

    expect(() => target.getRequestFunction()).toThrowError(/15\.10\.0 or above/);
    expect(() => target.getRequestFunction()).toThrowError(
      expect.objectContaining({code: 'EUNSUPPORTED'}),
    );
  });

  it('returns undefined when neither customRequest nor fallback URL exists', () => {
    const target = new MemberCTarget();

    expect(target.getRequestFunction()).toBeUndefined();
  });

  it('falls back when customRequest returns a non-promise value', () => {
    const httpRequest = vi.fn(() => 'fallback-after-sync') as RequestFunction;
    const customRequest = vi.fn(() => 'custom-sync') as RequestFunction;
    const target = new MemberCTarget(
      {
        request: customRequest,
        url: new URL('http://example.com'),
      },
      {httpRequest},
    );

    const request = target.getRequestFunction();
    const result = request(new URL('http://example.com'), {x: 1}, noopCallback);

    expect(customRequest).toHaveBeenCalledOnce();
    expect(httpRequest).toHaveBeenCalledOnce();
    expect(result).toBe('fallback-after-sync');
  });

  it('returns resolved custom promise values directly', async () => {
    const customRequest = vi.fn(() => Promise.resolve('async-custom')) as RequestFunction;
    const httpRequest = vi.fn(() => 'should-not-run') as RequestFunction;
    const target = new MemberCTarget(
      {
        request: customRequest,
        url: new URL('http://example.com'),
      },
      {httpRequest},
    );

    const request = target.getRequestFunction();
    const result = await request(new URL('http://example.com'), {}, noopCallback);

    expect(result).toBe('async-custom');
    expect(httpRequest).not.toHaveBeenCalled();
  });

  it('falls back when custom promise resolves to undefined', async () => {
    const customRequest = vi.fn(() => Promise.resolve(undefined)) as RequestFunction;
    const httpRequest = vi.fn(() => 'fallback-after-undefined') as RequestFunction;
    const target = new MemberCTarget(
      {
        request: customRequest,
        url: new URL('http://example.com'),
      },
      {httpRequest},
    );

    const request = target.getRequestFunction();
    const result = await request(new URL('http://example.com'), {}, noopCallback);

    expect(result).toBe('fallback-after-undefined');
    expect(httpRequest).toHaveBeenCalledOnce();
  });

  it('throws when fallback request function is missing during customRequest fallback', () => {
    const customRequest = vi.fn(() => 'custom-sync') as RequestFunction;
    const target = new MemberCTarget({
      request: customRequest,
    });

    const request = target.getRequestFunction();

    expect(() => request(new URL('http://example.com'), {}, noopCallback)).toThrow(
      'The request function must return a value',
    );
  });

  it('throws when fallback request returns undefined', () => {
    const customRequest = vi.fn(() => 'custom-sync') as RequestFunction;
    const httpRequest = vi.fn(() => undefined) as RequestFunction;
    const target = new MemberCTarget(
      {
        request: customRequest,
        url: new URL('http://example.com'),
      },
      {httpRequest},
    );

    const request = target.getRequestFunction();

    expect(() => request(new URL('http://example.com'), {}, noopCallback)).toThrow(
      'The request function must return a value',
    );
  });

  it('resolves promised fallback results', async () => {
    const customRequest = vi.fn(() => 'custom-sync') as RequestFunction;
    const httpRequest = vi.fn(() => Promise.resolve('promised-fallback')) as RequestFunction;
    const target = new MemberCTarget(
      {
        request: customRequest,
        url: new URL('http://example.com'),
      },
      {httpRequest},
    );

    const request = target.getRequestFunction();
    const result = await request(new URL('http://example.com'), {}, noopCallback);

    expect(result).toBe('promised-fallback');
  });

  it('throws when promised fallback resolves to undefined', async () => {
    const customRequest = vi.fn(() => 'custom-sync') as RequestFunction;
    const httpRequest = vi.fn(() => Promise.resolve(undefined)) as RequestFunction;
    const target = new MemberCTarget(
      {
        request: customRequest,
        url: new URL('http://example.com'),
      },
      {httpRequest},
    );

    const request = target.getRequestFunction();

    await expect(
      request(new URL('http://example.com'), {}, noopCallback),
    ).rejects.toThrow('The request function must return a value');
  });
});
