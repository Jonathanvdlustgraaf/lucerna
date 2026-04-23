export type ToolName =
	| 'spotlight'
	| 'selectLine'
	| 'filter'
	| 'commandPalette'
	| 'lineNumbers'
	| 'zenMode'
	| 'splitView'
	| 'gitPanel'
	| 'exportPreview'
	| 'fileTree';

class ToolsState {
	active = $state<Record<ToolName, boolean>>({
		spotlight: false,
		selectLine: false,
		filter: false,
		commandPalette: false,
		lineNumbers: false,
		zenMode: false,
		splitView: false,
		gitPanel: false,
		exportPreview: false,
		fileTree: true
	});

	isActive(tool: ToolName): boolean {
		return this.active[tool];
	}

	toggle(tool: ToolName) {
		this.active[tool] = !this.active[tool];
	}

	dismiss(tool: ToolName) {
		this.active[tool] = false;
	}

	dismissAll() {
		for (const key of Object.keys(this.active) as ToolName[]) {
			this.active[key] = false;
		}
	}

	spotlightAbove = $state(3);
	spotlightBelow = $state(2);
	selectLineVariant = $state<'bright' | 'underline' | 'weight' | 'glow'>('bright');

	adjustSpotlight(direction: 'up' | 'down') {
		if (direction === 'up') {
			this.spotlightAbove = Math.min(this.spotlightAbove + 1, 20);
		} else {
			this.spotlightBelow = Math.min(this.spotlightBelow + 1, 20);
		}
	}

	shrinkSpotlight(direction: 'up' | 'down') {
		if (direction === 'up') {
			this.spotlightAbove = Math.max(this.spotlightAbove - 1, 0);
		} else {
			this.spotlightBelow = Math.max(this.spotlightBelow - 1, 0);
		}
	}
}

export const tools = new ToolsState();
