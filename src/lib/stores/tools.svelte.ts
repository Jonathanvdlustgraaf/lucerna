export type ToolName =
	| 'spotlight'
	| 'selectLine'
	| 'filter'
	| 'commandPalette'
	| 'lineNumbers'
	| 'zenMode'
	| 'splitView'
	| 'gitPanel';

class ToolsState {
	active = $state<Record<ToolName, boolean>>({
		spotlight: false,
		selectLine: false,
		filter: false,
		commandPalette: false,
		lineNumbers: false,
		zenMode: false,
		splitView: false,
		gitPanel: false
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
}

export const tools = new ToolsState();
