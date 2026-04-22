interface Shortcut {
	key: string;
	ctrl?: boolean;
	shift?: boolean;
	alt?: boolean;
	handler: () => void;
	description: string;
}

const registry: Shortcut[] = [];

export function register(shortcut: Shortcut): () => void {
	registry.push(shortcut);
	return () => {
		const index = registry.indexOf(shortcut);
		if (index >= 0) registry.splice(index, 1);
	};
}

export function handleKeydown(event: KeyboardEvent): void {
	const key = event.key.toLowerCase();

	for (const shortcut of registry) {
		if (
			key === shortcut.key.toLowerCase() &&
			!!event.ctrlKey === !!shortcut.ctrl &&
			!!event.shiftKey === !!shortcut.shift &&
			!!event.altKey === !!shortcut.alt
		) {
			event.preventDefault();
			shortcut.handler();
			return;
		}
	}
}

export function getAll(): readonly Shortcut[] {
	return registry;
}
