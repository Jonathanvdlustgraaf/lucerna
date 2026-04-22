<script lang="ts">
	import { editor } from '$lib/stores/editor.svelte';
	import { git } from '$lib/stores/git.svelte';

	let { toolStatus = '' }: { toolStatus?: string } = $props();

	let filePath = $derived(editor.activeFile?.path ?? 'No file open');
	let position = $derived(`Ln ${editor.cursorLine}, Col ${editor.cursorCol}`);
	let syncIndicator = $derived(
		git.syncing
			? '\u21BB'
			: git.ahead > 0
				? `\u2191${git.ahead}`
				: git.behind > 0
					? `\u2193${git.behind}`
					: '\u2713'
	);
</script>

<div class="status-bar">
	<span class="left">{filePath}</span>
	{#if toolStatus}
		<span class="center">{toolStatus}</span>
	{/if}
	<span class="right">
		<span>{position}</span>
		<span class="sync">{syncIndicator}</span>
	</span>
</div>

<style>
	.status-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		background: var(--surface);
		border-top: 1px solid var(--border);
		padding: 0 var(--space-md);
		height: 24px;
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--muted);
	}
	.left {
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.center {
		color: var(--accent);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}
	.right {
		display: flex;
		gap: var(--space-md);
		flex-shrink: 0;
	}
	.sync { color: var(--accent); }
</style>
