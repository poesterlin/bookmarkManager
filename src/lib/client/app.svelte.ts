class AppState {
	isDarkMode = $state(false);
	yClamped = $state(0);
	isTouching = false;
	yPos = $state(0);

	setDarkMode(dark: boolean) {
		this.isDarkMode = dark;
	}

	updateScroll(e: UIEvent & { currentTarget: EventTarget & HTMLElement; }) {
		const deltaY = e.currentTarget.scrollTop - this.yPos;
		const mod = this.isTouching ? 1.1 : 2;
		this.yPos = e.currentTarget.scrollTop;
		this.yClamped = clamp(this.yClamped - deltaY / mod, -55, 0);
	}
}

function clamp(val: number, min: number, max: number) {
	return Math.max(Math.min(val, max), min);
}

export const app = new AppState();
