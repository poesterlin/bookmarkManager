/**
 * Small in-memory limiter for failed attempts (PIN, login). State is per process and is lost
 * on restart, which is fine for a single-instance deployment.
 */
export class FailureLimiter {
	private failures = new Map<string, { count: number; resetAt: number }>();

	constructor(
		private readonly maxFailures: number,
		private readonly windowMs: number
	) {}

	/** Seconds until the key may try again, or 0 if it is not blocked. */
	retryAfter(key: string): number {
		const entry = this.failures.get(key);
		if (!entry) return 0;
		if (Date.now() >= entry.resetAt) {
			this.failures.delete(key);
			return 0;
		}
		return entry.count >= this.maxFailures ? Math.ceil((entry.resetAt - Date.now()) / 1000) : 0;
	}

	fail(key: string) {
		const now = Date.now();
		const entry = this.failures.get(key);
		if (!entry || now >= entry.resetAt) {
			this.failures.set(key, { count: 1, resetAt: now + this.windowMs });
		} else {
			entry.count++;
		}

		// keep the map from growing without bound
		if (this.failures.size > 10_000) {
			for (const [k, v] of this.failures) {
				if (now >= v.resetAt) this.failures.delete(k);
			}
		}
	}

	reset(key: string) {
		this.failures.delete(key);
	}
}

/** 5 wrong PINs per user per 15 minutes */
export const pinLimiter = new FailureLimiter(5, 15 * 60 * 1000);

/** 10 wrong passwords per username per 15 minutes */
export const loginLimiter = new FailureLimiter(10, 15 * 60 * 1000);
