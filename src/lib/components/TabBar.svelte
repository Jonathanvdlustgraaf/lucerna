<script lang="ts">
	import { editor } from '$lib/stores/editor.svelte';
	import { tools } from '$lib/stores/tools.svelte';

	function closeTab(index: number, event: MouseEvent) {
		event.stopPropagation();
		editor.close(index);
	}

	let dragIndex = $state<number | null>(null);

	function handleDragStart(index: number) {
		dragIndex = index;
	}

	function handleDragEnd(e: DragEvent) {
		if (dragIndex === null) return;
		const midpoint = window.innerWidth / 2;
		if (e.clientX > midpoint && editor.files.length > 1) {
			editor.setSplit(dragIndex);
			tools.toggle('splitView');
		}
		dragIndex = null;
	}
</script>

<div class="tab-bar">
	{#each editor.files as file, i}
		<button
			class="tab"
			class:active={i === editor.activeIndex}
			draggable="true"
			ondragstart={() => handleDragStart(i)}
			ondragend={handleDragEnd}
			onclick={() => editor.setActive(i)}
		>
			<span class="tab-name">{file.name}</span>
			{#if file.dirty}
				<span class="dot">&#9679;</span>
			{/if}
			<span class="close" role="button" tabindex="-1" onclick={(e) => closeTab(i, e)}>&times;</span>
		</button>
	{/each}
</div>

<style>
	.tab-bar {
		display: flex;
		background: var(--surface);
		border-bottom: 1px solid var(--border);
		height: 36px;
		align-items: stretch;
		overflow-x: auto;
	}
	.tab {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: 0 var(--space-md);
		background: none;
		border: none;
		border-bottom: 2px solid transparent;
		color: var(--muted);
		font-family: var(--font-body);
		font-size: 13px;
		font-weight: 400;
		cursor: pointer;
		white-space: nowrap;
	}
	.tab:hover { color: var(--text); }
	.tab.active {
		color: var(--text);
		font-weight: 500;
		border-bottom-color: var(--accent);
	}
	.dot { color: var(--accent); font-size: 8px; }
	.close {
		display: none;
		color: var(--muted);
		font-size: 14px;
		cursor: pointer;
		padding: 0 2px;
	}
	.tab:hover .close { display: inline; }
	.close:hover { color: var(--text); }
</style>
