export async function storedValue<T>(key: string, defaultValue?: T) {
	let state = $state(defaultValue);

	await browser.storage.local.get<{ [key]: T | undefined }>(key).then((current) => {
		console.log('initial value', current);
		const value = current?.[key] ?? defaultValue;
		state = value;
	});

	browser.storage.onChanged.addListener((changes, area) => {
		console.log('storage changed', JSON.stringify(changes, null, 2));
		if (area !== 'local' || key in changes === false) {
			return;
		}

		const newValue = changes[key].newValue;
		if (newValue !== undefined && newValue !== state) {
			state = newValue;
		}
	});

	return {
		get: () => state,
		set: async (value: T) => {
			state = value;
			await browser.storage.local.set({ [key]: value });
		},
		state
	};
}

export type StoredValue<T> = {
	get: () => T | undefined;
	set: (value: T) => Promise<void>;
	state: T | undefined;
};

export const challengeKey = 'challenge';
export const tokenKey = 'token';
