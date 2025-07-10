class AppState {
	isDarkMode = $state(false);

	setDarkMode(dark: boolean) {
		this.isDarkMode = dark;
	}
}

export const app = new AppState();
