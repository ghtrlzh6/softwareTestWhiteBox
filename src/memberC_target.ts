import http from 'node:http';
import https from 'node:https';

export type RequestFunction = (
  url?: URL,
  options?: unknown,
  callback?: ((response: unknown) => void) | undefined,
) => unknown;

type PromiseLikeValue<T> = Promise<T> | {then: (...args: unknown[]) => unknown};

export type TargetInternals = {
  request?: RequestFunction;
  url?: URL;
  http2?: boolean;
};

export type RuntimeDeps = {
  isPromise: (value: unknown) => value is PromiseLikeValue<unknown>;
  httpRequest: RequestFunction;
  httpsRequest: RequestFunction;
  http2Auto: RequestFunction;
  nodeVersionMajor: number;
  nodeVersionMinor: number;
};

const defaultDeps: RuntimeDeps = {
  isPromise: (value): value is PromiseLikeValue<unknown> =>
    typeof (value as {then?: unknown})?.then === 'function',
  httpRequest: http.request as unknown as RequestFunction,
  httpsRequest: https.request as unknown as RequestFunction,
  http2Auto: (() => 'http2-auto') as RequestFunction,
  nodeVersionMajor: Number(process.versions.node.split('.')[0] ?? 0),
  nodeVersionMinor: Number(process.versions.node.split('.')[1] ?? 0),
};

export class MemberCTarget {
  #internals: TargetInternals;
  #deps: RuntimeDeps;

  constructor(internals: TargetInternals = {}, deps: Partial<RuntimeDeps> = {}) {
    this.#internals = internals;
    this.#deps = {
      ...defaultDeps,
      ...deps,
    };
  }

  getRequestFunction() {
    const {request: customRequest} = this.#internals;

    if (!customRequest) {
      return this.#getFallbackRequestFunction();
    }

    const requestWithFallback: RequestFunction = (url, options, callback) => {
      const result = customRequest(url, options, callback);

      if (this.#deps.isPromise(result)) {
        return this.#resolveRequestWithFallback(
          result as Promise<unknown>,
          url,
          options,
          callback,
        );
      }

      return this.#callFallbackRequest(url, options, callback);
    };

    return requestWithFallback;
  }

  #getFallbackRequestFunction() {
    const url = this.#internals.url as URL | undefined;

    if (!url) {
      return;
    }

    if (url.protocol === 'https:') {
      if (this.#internals.http2) {
        const {nodeVersionMajor: major, nodeVersionMinor: minor} = this.#deps;
        if (major < 15 || (major === 15 && minor < 10)) {
          const error = new Error(
            'To use the `http2` option, install Node.js 15.10.0 or above',
          ) as Error & {code?: string};
          error.code = 'EUNSUPPORTED';
          throw error;
        }

        return this.#deps.http2Auto;
      }

      return this.#deps.httpsRequest;
    }

    return this.#deps.httpRequest;
  }

  #callFallbackRequest(
    url?: URL,
    options?: unknown,
    callback?: ((response: unknown) => void) | undefined,
  ) {
    const fallbackRequest = this.#getFallbackRequestFunction();

    if (!fallbackRequest) {
      throw new TypeError('The request function must return a value');
    }

    const fallbackResult = fallbackRequest(url, options, callback);

    if (fallbackResult === undefined) {
      throw new TypeError('The request function must return a value');
    }

    if (this.#deps.isPromise(fallbackResult)) {
      return this.#resolveFallbackRequestResult(fallbackResult as Promise<unknown>);
    }

    return fallbackResult;
  }

  async #resolveRequestWithFallback(
    requestResult: Promise<unknown>,
    url?: URL,
    options?: unknown,
    callback?: ((response: unknown) => void) | undefined,
  ) {
    const result = await requestResult;

    if (result !== undefined) {
      return result;
    }

    return this.#callFallbackRequest(url, options, callback);
  }

  async #resolveFallbackRequestResult(fallbackResult: Promise<unknown>) {
    const resolvedFallbackResult = await fallbackResult;

    if (resolvedFallbackResult === undefined) {
      throw new TypeError('The request function must return a value');
    }

    return resolvedFallbackResult;
  }
}
