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
