<script lang="ts">
	import type { ParsedLine } from '$lib/services/markdown';

	let { line, showLineNumbers = false }: { line: ParsedLine; showLineNumbers?: boolean } = $props();
</script>

<div class="line" data-type={line.type}>
	{#if showLineNumbers}
		<span class="gutter">{line.number}</span>
	{/if}
	<span class="content">
		{#if line.type === 'blank'}
			&nbsp;
		{:else}
			{line.content}
		{/if}
	</span>
</div>

<style>
	.line {
		display: flex;
		min-height: 1.75em;
		line-height: 1.75;
	}
	.gutter {
		width: 48px;
		text-align: right;
		padding-right: var(--space-sm);
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--muted);
		user-select: none;
		flex-shrink: 0;
	}
	.content { flex: 1; }
	.line[data-type='h1'] .content {
		font-family: var(--font-heading);
		font-size: 24px;
		font-weight: 700;
		color: var(--text-bright);
		margin-top: var(--space-lg);
		margin-bottom: var(--space-sm);
	}
	.line[data-type='h2'] .content {
		font-family: var(--font-heading);
		font-size: 20px;
		font-weight: 600;
		color: var(--text-bright);
		margin-top: var(--space-lg);
		margin-bottom: var(--space-xs);
	}
	.line[data-type='h3'] .content {
		font-family: var(--font-heading);
		font-size: 16px;
		font-weight: 600;
		color: var(--text-bright);
		margin-top: var(--space-md);
	}
	.line[data-type='p'] .content {
		font-family: var(--font-body);
		font-size: 15px;
		color: var(--text);
	}
	.line[data-type='li'] .content {
		font-family: var(--font-body);
		font-size: 15px;
		color: var(--text);
		padding-left: var(--space-md);
	}
	.line[data-type='li'] .content::before {
		content: '\2022';
		margin-right: var(--space-sm);
		color: var(--muted);
	}
	.line[data-type='meta'] { padding: var(--space-sm) 0; }
	.line[data-type='meta'] .content { border-bottom: 1px solid var(--border); }
	.line[data-type='blank'] .content { height: 1.75em; }
</style>
