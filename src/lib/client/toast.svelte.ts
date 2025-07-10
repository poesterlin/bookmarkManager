class ToastStore {
	toasts = $state([] as { message: string; id: number }[]);

	show(message: string) {
		const id = Math.random();
		this.toasts.push({ message, id });
		this.toasts = [...this.toasts];
		setTimeout(() => {
			this.toasts = this.toasts.filter((t) => t.id !== id);
		}, 2500);
	}
}

export const toastStore = new ToastStore();
