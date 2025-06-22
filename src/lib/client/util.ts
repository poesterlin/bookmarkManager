import type { ImageWorker } from './worker';
import Worker from '$lib/client/worker?worker';
import { wrap } from 'comlink';

export function assert(condition: unknown, message: string): asserts condition {
	if (!condition) {
		throw new Error(message);
	}
}

export function assertInstanceOf<T>(p: any, type: new (...args: any[]) => T): asserts p is T {
    if (!(p instanceof type)) {
        throw new Error('Assertion failed');
    }
}

let workerInstance: ImageWorker | null = null;

export function getWorkerInstance(): ImageWorker {
	if (workerInstance) {
		return workerInstance;
	}

	const instance = new Worker();
	workerInstance = wrap<ImageWorker>(instance);
	return workerInstance;
}

/** function to return a version of the current url with the query parameter toggled.
 * if the parameter is already set, it will be removed, if not, it will be added.
 * @param url the url to modify
 * @param param the query parameter to toggle
 * @param value the value to set for the query parameter, defaults to true
 * @returns the modified url
 */
export function toggleQueryParam(url: URL, param: string, value: string | boolean = true): string {
	url = new URL(url.toString()); // Ensure we are working with a fresh URL object
	if (url.searchParams.has(param)) {
		url.searchParams.delete(param);
	} else {
		url.searchParams.set(param, String(value));
	}
	return url.toString();
}

export function removeQueryParam(url: URL, param: string): string {
	url = new URL(url.toString()); // Ensure we are working with a fresh URL object
	url.searchParams.delete(param);
	return url.toString();
}

export function addQueryParam(url: URL, param: string, value: string | boolean = true): string {
	url = new URL(url.toString()); // Ensure we are working with a fresh URL object
	url.searchParams.set(param, String(value));
	return url.toString();
}