export class ApiError extends Error {
	status: number;
	data: Record<string, unknown> | null;

	constructor(status: number, message: string, data?: Record<string, unknown> | null) {
		super(message);
		this.name = 'ApiError';
		this.status = status;
		this.data = data ?? null;
	}

	get isAuthError(): boolean {
		return this.status === 401;
	}

	get isValidationError(): boolean {
		return this.status === 400 && this.data?.error != null;
	}
}

export function createApi(getToken: () => string | undefined) {
	const host = import.meta.env.VITE_HOST;

	async function request(
		path: string,
		options: Omit<RequestInit, 'headers'> & {
			headers?: Record<string, string>;
		} = {}
	): Promise<Response> {
		const tokenValue = getToken();

		const res = await fetch(`${host}${path}`, {
			...options,
			headers: {
				'Content-Type': 'application/json',
				...(tokenValue ? { Authorization: `Bearer ${tokenValue}` } : {}),
				...options.headers
			}
		});

		if (res.status === 401) {
			await browser.storage.local.remove('token');
			throw new ApiError(401, 'Session expired. Please re-authenticate.');
		}

		if (!res.ok) {
			let data: Record<string, unknown> | null = null;
			try {
				data = (await res.json()) as Record<string, unknown>;
			} catch {
				/* body not JSON */
			}
			throw new ApiError(
				res.status,
				typeof data?.error === 'object' && data.error && typeof (data.error as Record<string, unknown>).message === 'string'
					? (data.error as Record<string, string>).message
					: `Request failed (${res.status})`,
				data
			);
		}

		return res;
	}

	return {
		get: async <T = unknown>(path: string): Promise<T> => {
			const res = await request(path);
			return res.json() as Promise<T>;
		},
		post: async <T = unknown>(path: string, body?: unknown): Promise<T> => {
			const res = await request(path, {
				method: 'POST',
				body: body != null ? JSON.stringify(body) : undefined
			});
			if (res.status === 204) return null as T;
			return res.json() as Promise<T>;
		},
		delete: async <T = unknown>(path: string): Promise<T> => {
			const res = await request(path, { method: 'DELETE' });
			if (res.status === 204) return null as T;
			return res.json() as Promise<T>;
		}
	};
}

export type Api = ReturnType<typeof createApi>;
