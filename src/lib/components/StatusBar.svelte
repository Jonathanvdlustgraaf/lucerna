<script lang="ts">
	import { editor } from '$lib/stores/editor.svelte';
	import { git } from '$lib/stores/git.svelte';
	import { tools } from '$lib/stores/tools.svelte';

	let filePath = $derived(editor.activeFile?.path ?? 'No file open');
	let modeLabel = $derived(editor.editMode ? 'EDIT' : 'VIEW');
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

	let spotlightStatus = $derived(
		tools.isActive('spotlight')
			? `SPOTLIGHT ${tools.spotlightAbove}up ${tools.spotlightBelow}down`
			: ''
	);
	let selectLineStatus = $derived(tools.isActive('selectLine') ? 'SELECT-LINE' : '');
</script>

<div class="status-bar">
	<span class="left">{filePath}</span>
	<span class="sep">·</span>
	<span class="mode">{modeLabel}</span>
	{#if spotlightStatus}
		<span class="sep">·</span>
		<span class="center">{spotlightStatus}</span>
	{/if}
	{#if selectLineStatus}
		<span class="sep">·</span>
		<span class="center">{selectLineStatus}</span>
	{/if}
	<span class="sep">·</span>
	<span class="right">
		<span>{position}</span>
		<span class="sep">·</span>
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
	.mode {
		color: var(--accent);
		text-transform: uppercase;
		letter-spacing: 0.5px;
		flex-shrink: 0;
	}
	.sep {
		flex-shrink: 0;
		padding: 0 var(--space-sm, 4px);
		opacity: 0.4;
	}
	.sync { color: var(--accent); }
</style>
