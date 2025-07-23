import { invalidateAll } from '$app/navigation';
import type { Bookmark, Category } from '$lib/server/db/schema';

class DragStore {
    card = $state<Bookmark>();
    pos = $state<{ x: number, y: number }>();
    isDragging = $state(false);

    start(bookmark: Bookmark) {
        this.card = bookmark;
    }
    
    activate() {
        this.isDragging = !!this.pos && !!this.card;
        document.documentElement.style.userSelect = "none";
    }

    move(x: number, y: number) {
        this.pos = { x, y };
    }

    end() {
        this.card = undefined;
        this.pos = undefined;
        this.isDragging = false;
        document.documentElement.style.userSelect = "auto";
    }

    async addToCategory(category: Category) {
        if (!this.isDragging) {
            return;
        }

        const form = new FormData();
        form.append("bookmark", this.card!.id);
        form.append("category", category.id);

        this.end();

        await fetch("?/update-category", {
            method: "POST",
            body: form
        });
        await invalidateAll();
    }


}

export const dragStore = new DragStore();
