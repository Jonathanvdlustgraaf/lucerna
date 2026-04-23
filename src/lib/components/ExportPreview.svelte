<script lang="ts">
	import type { ParsedLine } from '$lib/services/markdown';

	let {
		lines = [] as ParsedLine[],
		filePath = '',
		onclose
	}: {
		lines?: ParsedLine[];
		filePath?: string;
		onclose: () => void;
	} = $props();

	let selectedTemplate = $state<'professional' | 'proposal' | 'technical'>('professional');
	let exporting = $state(false);

	let title = $derived(lines.find(l => l.type === 'h1')?.content || 'Untitled');
	let tocEntries = $derived(lines.filter(l => l.type === 'h2').map(l => l.content));

	async function exportPdf() {
		exporting = true;
		try {
			const res = await fetch('/api/export/pdf', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ path: filePath, template: selectedTemplate })
			});
			if (res.ok) {
				const blob = await res.blob();
				const url = URL.createObjectURL(blob);
				const a = document.createElement('a');
				a.href = url;
				a.download = filePath.replace('.md', '.pdf');
				a.click();
				URL.revokeObjectURL(url);
			}
		} finally {
			exporting = false;
		}
	}

	async function exportWord() {
		exporting = true;
		try {
			const res = await fetch('/api/export/docx', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ path: filePath, template: selectedTemplate })
			});
			if (res.ok) {
				const blob = await res.blob();
				const url = URL.createObjectURL(blob);
				const a = document.createElement('a');
				a.href = url;
				a.download = filePath.replace('.md', '.docx');
				a.click();
				URL.revokeObjectURL(url);
			}
		} finally {
			exporting = false;
		}
	}
</script>

<svelte:window onkeydown={(e) => { if (e.key === 'Escape') onclose(); }} />

<div class="export-preview">
	<div class="preview-header">
		<select class="template-select" bind:value={selectedTemplate}>
			<option value="professional">Professional</option>
			<option value="proposal">Proposal</option>
			<option value="technical">Technical Report</option>
		</select>
		<div class="preview-actions">
			<button class="btn-primary" onclick={exportPdf} disabled={exporting}>
				{exporting ? 'Exporting...' : 'Export PDF'}
			</button>
			<button class="btn-ghost" onclick={exportWord} disabled={exporting}>Export Word</button>
			<button class="btn-ghost" onclick={onclose}>Close</button>
		</div>
	</div>
	<div class="preview-body">
		<div class="paper">
			<div class="voorpagina">
				<h1>{title}</h1>
				<hr>
				<p class="author">Jonathan van de Lustgraaf</p>
				<p class="date">{new Date().toLocaleDateString('nl-NL')}</p>
			</div>
			<div class="toc-page">
				<h2>Inhoudsopgave</h2>
				{#each tocEntries as entry, i}
					<div class="toc-row">{i + 1}. {entry}</div>
				{/each}
			</div>
			<div class="content-preview">
				{#each lines as line}
					{#if line.type === 'h2'}
						<h2>{line.content}</h2>
					{:else if line.type === 'h3'}
						<h3>{line.content}</h3>
					{:else if line.type === 'p'}
						<p>{line.content}</p>
					{:else if line.type === 'li'}
						<p class="li-item">- {line.content}</p>
					{/if}
				{/each}
			</div>
		</div>
	</div>
</div>

<style>
	.export-preview {
		position: fixed;
		top: 0;
		right: 0;
		bottom: 0;
		width: 50%;
		background: var(--surface);
		border-left: 1px solid var(--border);
		display: flex;
		flex-direction: column;
		z-index: 60;
		animation: slideIn 400ms ease-in-out;
	}

	@keyframes slideIn {
		from { transform: translateX(100%); }
		to { transform: translateX(0); }
	}

	.preview-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-sm) var(--space-md);
		border-bottom: 1px solid var(--border);
		background: var(--surface);
		flex-shrink: 0;
		gap: var(--space-md);
	}

	.template-select {
		background: var(--canvas);
		color: var(--text);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: var(--space-xs) var(--space-sm);
		font-family: var(--font-mono);
		font-size: 12px;
		cursor: pointer;
		outline: none;
	}

	.template-select:focus {
		border-color: var(--accent);
	}

	.preview-actions {
		display: flex;
		gap: var(--space-xs);
		align-items: center;
	}

	.btn-primary {
		background: #d97706;
		color: #fff;
		border: none;
		border-radius: var(--radius);
		padding: var(--space-xs) var(--space-md);
		font-family: var(--font-mono);
		font-size: 12px;
		cursor: pointer;
		font-weight: 500;
	}

	.btn-primary:hover:not(:disabled) {
		background: #b45309;
	}

	.btn-primary:disabled {
		opacity: 0.6;
		cursor: not-allowed;
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

	.btn-ghost:hover:not(:disabled) {
		color: var(--text);
		border-color: var(--text);
	}

	.btn-ghost:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.preview-body {
		flex: 1;
		overflow-y: auto;
		background: #e5e5e0;
		padding: var(--space-md);
		display: flex;
		justify-content: center;
	}

	.paper {
		background: #fafaf9;
		color: #1c1917;
		width: 100%;
		max-width: 720px;
		min-height: 100%;
		box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
		padding: 48px 56px;
		box-sizing: border-box;
		font-family: Georgia, 'Times New Roman', serif;
		line-height: 1.7;
	}

	.voorpagina {
		min-height: 280px;
		display: flex;
		flex-direction: column;
		justify-content: flex-start;
		padding-bottom: 40px;
		margin-bottom: 40px;
		border-bottom: 2px solid #d6d3d1;
	}

	.voorpagina h1 {
		font-size: 28px;
		font-weight: 700;
		color: #1c1917;
		margin: 0 0 24px 0;
		line-height: 1.2;
		font-family: Georgia, serif;
	}

	.voorpagina hr {
		border: none;
		border-top: 1px solid #a8a29e;
		margin: 0 0 20px 0;
	}

	.voorpagina .author {
		font-size: 14px;
		color: #57534e;
		margin: 0 0 4px 0;
		font-family: 'Helvetica Neue', Arial, sans-serif;
		font-style: italic;
	}

	.voorpagina .date {
		font-size: 13px;
		color: #78716c;
		margin: 0;
		font-family: 'Helvetica Neue', Arial, sans-serif;
	}

	.toc-page {
		padding-bottom: 40px;
		margin-bottom: 40px;
		border-bottom: 1px solid #e7e5e4;
	}

	.toc-page h2 {
		font-size: 16px;
		font-weight: 600;
		color: #1c1917;
		margin: 0 0 16px 0;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		font-family: 'Helvetica Neue', Arial, sans-serif;
	}

	.toc-row {
		font-size: 13px;
		color: #44403c;
		padding: 4px 0;
		font-family: 'Helvetica Neue', Arial, sans-serif;
		border-bottom: 1px dotted #d6d3d1;
	}

	.content-preview h2 {
		font-size: 20px;
		font-weight: 700;
		color: #1c1917;
		margin: 36px 0 12px 0;
		font-family: Georgia, serif;
	}

	.content-preview h3 {
		font-size: 16px;
		font-weight: 600;
		color: #292524;
		margin: 24px 0 8px 0;
		font-family: 'Helvetica Neue', Arial, sans-serif;
	}

	.content-preview p {
		font-size: 14px;
		color: #44403c;
		margin: 0 0 12px 0;
	}

	.content-preview .li-item {
		font-size: 14px;
		color: #44403c;
		margin: 0 0 6px 0;
		padding-left: 16px;
	}
</style>
