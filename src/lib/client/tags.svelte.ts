class TagStore {
	public selected = $state<string[]>([]);
	public existingTags = $state<string[]>([]);
	public tagInput = $state<string>('');
    public activeSuggestionIndex = $state(-1);


	public filteredTags = $derived.by(() => {
		if (!this.tagInput?.trim()) {
			return [];
		}

		return this.existingTags.filter(
			(tag) =>
				tag.toLowerCase().includes(this.tagInput.toLowerCase()) && !this.selected.includes(tag)
		);
	});

	public showSuggestions = $derived(this.filteredTags.length > 0 && this.tagInput.trim() !== '');


    public handleTagInputKeydown(event: KeyboardEvent) {
		if (!this.tagInput || this.tagInput.trim() === '') {
			return;
		}

		switch (event.key) {
			case 'Enter':
			case ' ':
			case ',': // Add tag on comma as well
				event.preventDefault(); // Prevent form submission or typing comma
				if (this.showSuggestions && this.activeSuggestionIndex > -1) {
					this.addTag(this.filteredTags[this.activeSuggestionIndex]);
				} else if (this.tagInput.trim()) {
					this.addTag(this.tagInput);
				}
				break;
			case 'Backspace':
				if (this.tagInput === '' && this.selected.length > 0) {
					// Remove last tag on backspace if input is empty
					this.removeTag(this.selected[this.selected.length - 1]);
				}
				break;
			case 'ArrowDown':
				event.preventDefault(); // Prevent cursor move
				if (this.showSuggestions) {
					this.activeSuggestionIndex = Math.min(
						this.activeSuggestionIndex + 1,
						this.filteredTags.length - 1
					);
				}
				break;
			case 'ArrowUp':
				event.preventDefault(); // Prevent cursor move
				if (this.showSuggestions) {
					this.activeSuggestionIndex = Math.max(this.activeSuggestionIndex - 1, 0);
				}
				break;
			case 'Escape':
				this.tagInput = '';
				break;
		}
	}

    

	public removeTag(tagToRemove: string) {
		this.selected = this.selected.filter((tag) => tag !== tagToRemove);
	}

    public addTag(tag: string) {
		const trimmedTag = tag.trim();
		if (trimmedTag && !this.selected.includes(trimmedTag)) {
			this.selected = [...this.selected, trimmedTag];
		}
		this.tagInput = ''; // Clear input after adding
	}
}


export const tagStore = new TagStore();
