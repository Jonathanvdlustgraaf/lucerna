<script lang="ts">
	import type { ParsedLine } from '$lib/services/markdown';

	let {
		lines,
		checkedSections,
		ontoggle,
		onclose
	}: {
		lines: ParsedLine[];
		checkedSections: Record<number, boolean>;
		ontoggle: (lineNumber: number) => void;
		onclose: () => void;
	} = $props();

	let tocEntries = $derived(lines.filter((l) => l.type === 'h2' || l.type === 'h3'));
	let checkedCount = $derived(tocEntries.filter((e) => checkedSections[e.number] !== false).length);
</script>

<svelte:window onkeydown={(e) => { if (e.key === 'Escape') onclose(); }} />

<div class="filter-sidebar">
	<header class="sidebar-header">
		<span class="title">FILTER . TOC</span>
		<span class="count">{checkedCount}/{tocEntries.length} sections</span>
	</header>

	<div class="sidebar-body">
		{#each tocEntries as entry}
			<label class="toc-item" class:indent={entry.type === 'h3'}>
				<input
					type="checkbox"
					checked={checkedSections[entry.number] !== false}
					onchange={() => ontoggle(entry.number)}
				/>
				<span class="label">{entry.content}</span>
			</label>
		{/each}
	</div>

	<footer class="sidebar-footer">
		<span class="hint">Esc dismiss</span>
	</footer>
</div>

<style>
	.filter-sidebar {
		position: fixed;
		top: 0;
		right: 0;
		bottom: 0;
		width: 280px;
		background: var(--surface);
		border-left: 1px solid var(--border);
		display: flex;
		flex-direction: column;
		z-index: 50;
		animation: slideIn 250ms ease-out;
	}

	@keyframes slideIn {
		from { transform: translateX(100%); }
		to { transform: translateX(0); }
	}

	.sidebar-header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		padding: var(--space-md);
		border-bottom: 1px solid var(--border);
		font-family: var(--font-mono);
		flex-shrink: 0;
	}

	.title {
		font-size: 11px;
		color: var(--muted);
		letter-spacing: 0.5px;
		text-transform: uppercase;
	}

	.count {
		font-size: 11px;
		color: var(--muted);
		font-family: var(--font-mono);
	}

	.sidebar-body {
		flex: 1;
		overflow-y: auto;
		padding: var(--space-sm) 0;
	}

	.toc-item {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: 6px var(--space-md);
		cursor: pointer;
		font-family: var(--font-body);
		font-size: 13px;
		color: var(--text);
		user-select: none;
	}

	.toc-item:hover {
		background: color-mix(in srgb, var(--accent) 8%, transparent);
	}

	.toc-item.indent {
		padding-left: calc(var(--space-md) + 16px);
	}

	.toc-item .label {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		flex: 1;
	}

	input[type="checkbox"] {
		appearance: none;
		width: 14px;
		height: 14px;
		border: 1px solid var(--border);
		border-radius: 2px;
		cursor: pointer;
		flex-shrink: 0;
	}

	input[type="checkbox"]:checked {
		background: var(--accent);
		border-color: var(--accent);
	}

	.sidebar-footer {
		padding: var(--space-sm) var(--space-md);
		border-top: 1px solid var(--border);
		flex-shrink: 0;
	}

	.hint {
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--muted);
		opacity: 0.6;
	}
</style>
