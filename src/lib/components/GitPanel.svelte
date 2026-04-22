<script lang="ts">
	let {
		modified = [] as string[],
		log = [] as Array<{ sha: string; message: string; author: string; date: string }>,
		oncommit,
		onpush,
		onpull,
		onclose,
		onselect
	}: {
		modified?: string[];
		log?: Array<{ sha: string; message: string; author: string; date: string }>;
		oncommit: (message: string) => void;
		onpush: () => void;
		onpull: () => void;
		onclose: () => void;
		onselect?: (sha: string) => void;
	} = $props();

	let commitMessage = $state('');
	let feedback = $state('');
</script>

<svelte:window onkeydown={(e) => { if (e.key === 'Escape') onclose(); }} />

<div class="git-panel">
	<header class="panel-header">
		<span class="title">GIT</span>
	</header>

	<div class="panel-body">
		<div class="section">
			<h3 class="section-title">Changes ({modified.length})</h3>
			{#each modified as file}
				<div class="file-entry">{file}</div>
			{/each}
			{#if modified.length === 0}
				<div class="empty-hint">No changes</div>
			{/if}
		</div>

		<div class="commit-area">
			<textarea
				class="commit-input"
				placeholder="Commit message..."
				bind:value={commitMessage}
				rows="2"
			></textarea>
			<div class="commit-actions">
				<button
					class="btn-primary"
					onclick={() => { oncommit(commitMessage); commitMessage = ''; }}
				>
					Commit
				</button>
				<button class="btn-ghost" onclick={onpush}>Push</button>
				<button class="btn-ghost" onclick={onpull}>Pull</button>
			</div>
		</div>

		{#if feedback}
			<div class="feedback">{feedback}</div>
		{/if}

		<div class="section">
			<h3 class="section-title">History</h3>
			{#each log as entry}
				<button class="log-entry" onclick={() => onselect?.(entry.sha)}>
					<span class="sha">{entry.sha.slice(0, 7)}</span>
					<span class="msg">{entry.message}</span>
					<span class="meta">{entry.author} · {entry.date}</span>
				</button>
			{/each}
			{#if log.length === 0}
				<div class="empty-hint">No history</div>
			{/if}
		</div>
	</div>

	<footer class="panel-footer">
		<span class="hint">Esc dismiss</span>
	</footer>
</div>

<style>
	.git-panel {
		position: fixed;
		top: 0;
		right: 0;
		bottom: 0;
		width: 320px;
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

	.panel-header {
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

	.panel-body {
		flex: 1;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 0;
	}

	.section {
		padding: var(--space-sm) 0;
		border-bottom: 1px solid var(--border);
	}

	.section-title {
		font-family: var(--font-mono);
		font-size: 10px;
		color: var(--muted);
		text-transform: uppercase;
		letter-spacing: 0.5px;
		margin: 0 0 var(--space-xs) 0;
		padding: 0 var(--space-md);
		font-weight: 500;
	}

	.file-entry {
		padding: 5px var(--space-md);
		font-family: var(--font-mono);
		font-size: 12px;
		color: var(--text);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.file-entry:hover {
		background: color-mix(in srgb, var(--accent) 8%, transparent);
	}

	.empty-hint {
		padding: var(--space-xs) var(--space-md);
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--muted);
		opacity: 0.6;
	}

	.commit-area {
		padding: var(--space-sm) var(--space-md);
		border-bottom: 1px solid var(--border);
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		flex-shrink: 0;
	}

	.commit-input {
		width: 100%;
		background: var(--canvas);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		color: var(--text);
		font-family: var(--font-mono);
		font-size: 12px;
		padding: var(--space-xs) var(--space-sm);
		resize: none;
		box-sizing: border-box;
		line-height: 1.5;
	}

	.commit-input:focus {
		outline: none;
		border-color: var(--accent);
	}

	.commit-input::placeholder {
		color: var(--muted);
		opacity: 0.6;
	}

	.commit-actions {
		display: flex;
		gap: var(--space-xs);
		align-items: center;
	}

	.btn-primary {
		background: var(--accent);
		color: var(--canvas);
		border: none;
		border-radius: var(--radius);
		padding: var(--space-xs) var(--space-md);
		font-family: var(--font-mono);
		font-size: 12px;
		cursor: pointer;
		font-weight: 500;
	}

	.btn-primary:hover {
		filter: brightness(1.1);
	}

	.btn-ghost {
		background: none;
		color: var(--muted);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: var(--space-xs) var(--space-sm);
		font-family: var(--font-mono);
		font-size: 12px;
		cursor: pointer;
	}

	.btn-ghost:hover {
		color: var(--text);
		border-color: var(--text);
	}

	.feedback {
		padding: var(--space-xs) var(--space-md);
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--accent);
		flex-shrink: 0;
	}

	.log-entry {
		display: flex;
		flex-direction: column;
		gap: 2px;
		width: 100%;
		padding: var(--space-xs) var(--space-md);
		background: none;
		border: none;
		text-align: left;
		cursor: pointer;
	}

	.log-entry:hover {
		background: color-mix(in srgb, var(--accent) 8%, transparent);
	}

	.sha {
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--accent);
		letter-spacing: 0.3px;
	}

	.msg {
		font-family: var(--font-body);
		font-size: 12px;
		color: var(--text);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.meta {
		font-family: var(--font-mono);
		font-size: 10px;
		color: var(--muted);
		opacity: 0.7;
	}

	.panel-footer {
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
