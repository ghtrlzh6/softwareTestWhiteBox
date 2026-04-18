303: 						options.hostname = 'fallbackSite';
304: 					}
1027: 	| 'getRequestFunction'
1028: 	| 'freeze';
1029: 
1030: export type InternalsType = Except<Options, OptionsToSkip>;
1031: 
1032: export type OptionsError = NodeJS.ErrnoException & {options?: Options};
1033: 
1034: export type OptionsInit =
1035: 	Except<Partial<InternalsType>, 'hooks' | 'retry' | 'isStream'>
1036: 	& {
1037: 		hooks?: Partial<Hooks>;
1038: 		retry?: Partial<RetryOptions>;
1039: 		preserveHooks?: boolean;
1040: 	};
1041: 
1042: const globalCache = new Map();
1043: let globalDnsCache: CacheableLookup;
1044: 
1045: const getGlobalDnsCache = (): CacheableLookup => {
1046: 	if (globalDnsCache) {
1047: 		return globalDnsCache;
1048: 	}
3242: 	getRequestFunction() {
3243: 		const {request: customRequest} = this.#internals;
3244: 
3245: 		if (!customRequest) {
3246: 			return this.#getFallbackRequestFunction();
3247: 		}
3249: 		const requestWithFallback: RequestFunction = (url, options, callback?) => {
3250: 			const result = customRequest(url, options, callback);
3251: 
3252: 			if (is.promise(result)) {
3253: 				return this.#resolveRequestWithFallback(result, url, options, callback);
3254: 			}
3260: 			return this.#callFallbackRequest(url, options, callback);
3261: 		};
3262: 
3263: 		return requestWithFallback;
3264: 	}
3335: 	#getFallbackRequestFunction() {
3336: 		const url = this.#internals.url as (URL | undefined);
3337: 
3338: 		if (!url) {
3339: 			return;
3340: 		}
3360: 	#callFallbackRequest(
3361: 		url: URL,
3362: 		options: NativeRequestOptions,
3363: 		callback?: (response: AcceptableResponse) => void,
3364: 	): AcceptableResponse | ClientRequest | Promise<AcceptableResponse | ClientRequest> {
3365: 		const fallbackRequest = this.#getFallbackRequestFunction();
3366: 
3367: 		if (!fallbackRequest) {
3368: 			throw new TypeError('The request function must return a value');
3369: 		}
3371: 		const fallbackResult = fallbackRequest(url, options, callback);
3372: 
3373: 		if (fallbackResult === undefined) {
3374: 			throw new TypeError('The request function must return a value');
3375: 		}
3377: 		if (is.promise(fallbackResult)) {
3378: 			return this.#resolveFallbackRequestResult(fallbackResult);
3379: 		}
3381: 		return fallbackResult;
3382: 	}
3384: 	async #resolveRequestWithFallback(
3385: 		requestResult: Promise<AcceptableResponse | ClientRequest | undefined>,
3386: 		url: URL,
3387: 		options: NativeRequestOptions,
3388: 		callback?: (response: AcceptableResponse) => void,
3389: 	): Promise<AcceptableResponse | ClientRequest> {
3390: 		const result = await requestResult;
3391: 
3392: 		if (result !== undefined) {
3393: 			return result;
3394: 		}
3396: 		return this.#callFallbackRequest(url, options, callback);
3397: 	}
3399: 	async #resolveFallbackRequestResult(fallbackResult: Promise<AcceptableResponse | ClientRequest | undefined>): Promise<AcceptableResponse | ClientRequest> {
3400: 		const resolvedFallbackResult = await fallbackResult;
3401: 
3402: 		if (resolvedFallbackResult === undefined) {
3403: 			throw new TypeError('The request function must return a value');
3404: 		}
3406: 		return resolvedFallbackResult;
3407: 	}
