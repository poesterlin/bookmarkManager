type ToastType = 'success' | 'error' | 'info';

interface Toast {
	id: number;
	message: string;
	type: ToastType;
}

let nextId = 0;
let toasts = $state<Toast[]>([]);

export function showToast(message: string, type: ToastType = 'info') {
	const id = nextId++;
	toasts = [...toasts, { id, message, type }];
	setTimeout(() => {
		toasts = toasts.filter((t) => t.id !== id);
	}, 3000);
}

export function getToasts() {
	return toasts;
}
