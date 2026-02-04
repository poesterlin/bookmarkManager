// Bun Test Setup - Global mocks and DOM utilities

// Mock window.matchMedia for responsive design testing
if (typeof window !== 'undefined') {
	Object.defineProperty(window, 'matchMedia', {
		writable: true,
		value: (query: string) => ({
			matches: false,
			media: query,
			onchange: null,
			addListener: () => {},
			removeListener: () => {},
			addEventListener: () => {},
			removeEventListener: () => {},
			dispatchEvent: () => {}
		})
	});
}

// Mock IntersectionObserver
if (typeof global !== 'undefined') {
	(global as any).IntersectionObserver = class IntersectionObserver {
		constructor() {}
		disconnect() {}
		observe() {}
		takeRecords() {
			return [];
		}
		unobserve() {}
	};
}
