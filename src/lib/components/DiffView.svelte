<script lang="ts">
	let { diff = '' }: { diff: string } = $props();

	interface DiffLine {
		type: 'add' | 'remove' | 'context' | 'header';
		content: string;
		oldNum?: number;
		newNum?: number;
	}

	let parsedLines = $derived.by(() => {
		const lines: DiffLine[] = [];
		let oldNum = 0;
		let newNum = 0;

		for (const raw of diff.split('\n')) {
			if (raw.startsWith('diff --git') || raw.startsWith('index ') || raw.startsWith('---') || raw.startsWith('+++')) {
				lines.push({ type: 'header', content: raw });
			} else if (raw.startsWith('@@')) {
				const match = raw.match(/@@ -(\d+),?\d* \+(\d+),?\d* @@/);
				if (match) {
					oldNum = parseInt(match[1]) - 1;
					newNum = parseInt(match[2]) - 1;
				}
				lines.push({ type: 'header', content: raw });
			} else if (raw.startsWith('+')) {
				newNum++;
				lines.push({ type: 'add', content: raw.slice(1), newNum });
			} else if (raw.startsWith('-')) {
				oldNum++;
				lines.push({ type: 'remove', content: raw.slice(1), oldNum });
			} else {
				oldNum++;
				newNum++;
				lines.push({ type: 'context', content: raw.startsWith(' ') ? raw.slice(1) : raw, oldNum, newNum });
			}
		}
		return lines;
	});
</script>

<div class="diff-view">
	{#each parsedLines as line}
		<div class="diff-line" data-type={line.type}>
			{#if line.type === 'header'}
				<span class="header-content">{line.content}</span>
			{:else}
				<span class="line-num old">{line.oldNum ?? ''}</span>
				<span class="line-num new">{line.newNum ?? ''}</span>
				<span class="prefix">{line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '}</span>
				<span class="diff-content">{line.content}</span>
			{/if}
		</div>
	{/each}
</div>

<style>
	.diff-view {
		font-family: var(--font-mono);
		font-size: 12px;
		line-height: 1.6;
		overflow-x: auto;
	}
	.diff-line {
		display: flex;
		min-height: 1.6em;
	}
	.diff-line[data-type='add'] {
		background: rgba(74, 222, 128, 0.08);
	}
	.diff-line[data-type='remove'] {
		background: rgba(248, 113, 113, 0.08);
	}
	.diff-line[data-type='header'] {
		color: var(--muted);
		padding: var(--space-xs) 0;
	}
	.line-num {
		width: 40px;
		text-align: right;
		padding-right: var(--space-xs);
		color: var(--muted);
		user-select: none;
		flex-shrink: 0;
	}
	.prefix {
		width: 16px;
		text-align: center;
		flex-shrink: 0;
	}
	.diff-line[data-type='add'] .prefix { color: rgba(74, 222, 128, 0.8); }
	.diff-line[data-type='remove'] .prefix { color: rgba(248, 113, 113, 0.8); }
	.diff-content { flex: 1; white-space: pre-wrap; }
	.header-content { padding-left: var(--space-sm); }
</style>
