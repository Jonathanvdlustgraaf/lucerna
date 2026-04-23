<script lang="ts">
	import type { ParsedLine } from '$lib/services/markdown';

	let {
		line,
		showLineNumbers = false,
		isCurrent = false,
		spotlight = false,
		spotlightAbove = 3,
		spotlightBelow = 2,
		cursorLine = 1,
		selectLine = 'off' as 'off' | 'bright' | 'underline' | 'weight' | 'glow',
		folded = false,
		marked = false,
		activeTableRow = -1,
		onfold
	}: {
		line: ParsedLine;
		showLineNumbers?: boolean;
		isCurrent?: boolean;
		spotlight?: boolean;
		spotlightAbove?: number;
		spotlightBelow?: number;
		cursorLine?: number;
		selectLine?: 'off' | 'bright' | 'underline' | 'weight' | 'glow';
		folded?: boolean;
		marked?: boolean;
		activeTableRow?: number;
		onfold?: () => void;
	} = $props();

	let lineStyle = $derived.by(() => {
		let styles: string[] = [];

		// Opacity and spotlight border
		if (spotlight) {
			if (isCurrent) {
				styles.push('opacity: 1');
				styles.push('border-left: 2px solid rgba(212, 168, 67, 0.55)');
				styles.push('padding-left: 6px');
			} else {
				const distance = Math.abs(line.number - cursorLine);
				const reach = distance <= 0 ? 0 : (line.number < cursorLine ? spotlightAbove : spotlightBelow);
				if (reach > 0 && distance <= reach) {
					const opacity = 0.9 - (distance / reach) * 0.2;
					styles.push(`opacity: ${opacity.toFixed(2)}`);
				} else {
					styles.push('opacity: 0.2');
				}

				// Boundary hairlines
				const aboveBoundary = line.number < cursorLine && distance === spotlightAbove;
				const belowBoundary = line.number > cursorLine && distance === spotlightBelow;
				if (aboveBoundary) {
					styles.push('border-top: 1px solid rgba(212, 168, 67, 0.08)');
				}
				if (belowBoundary) {
					styles.push('border-bottom: 1px solid rgba(212, 168, 67, 0.08)');
				}
			}
		}

		// Select-line styles (current line only)
		if (isCurrent && selectLine !== 'off') {
			switch (selectLine) {
				case 'underline':
					styles.push('border-bottom: 1px solid rgba(212, 168, 67, 0.4)');
					break;
				case 'weight':
					styles.push('font-weight: 500');
					break;
				case 'glow':
					styles.push('background: rgba(212, 168, 67, 0.04)');
					break;
			}
		}

		return styles.join('; ');
	});
</script>

<div class="line" data-type={line.type} data-linenum={line.number} style={lineStyle}>
	{#if marked}
		<span class="mark-dot"></span>
	{/if}
	{#if showLineNumbers}
		<span class="gutter">
			{#if (line.type === 'h2' || line.type === 'h3') && onfold}
				<button class="fold-icon" class:folded onclick={(e) => { e.stopPropagation(); onfold?.(); }}>
					{folded ? '\u25B6' : '\u25BC'}
				</button>
			{/if}
			{line.number}
		</span>
	{/if}
	<span class="content">
		{#if line.type === 'blank'}
			&nbsp;
		{:else if line.type === 'table' && line.table}
			<table class="md-table">
				<thead>
					<tr>
						{#each line.table.headers as header}
							<th>{header}</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each line.table.rows as row, ri}
						<tr class:table-row-active={isCurrent && activeTableRow === ri}>
							{#each row as cell}
								<td>{cell}</td>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
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
		transition: opacity 150ms ease-out;
		position: relative;
	}
	.mark-dot {
		width: 4px;
		height: 4px;
		border-radius: 50%;
		background: var(--accent);
		position: absolute;
		left: 4px;
		top: 50%;
		transform: translateY(-50%);
	}
	.gutter {
		position: relative;
		width: 48px;
		text-align: right;
		padding-right: var(--space-sm);
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--muted);
		user-select: none;
		flex-shrink: 0;
	}
	.fold-icon {
		position: absolute;
		left: 0;
		top: 50%;
		transform: translateY(-50%);
		background: none;
		border: none;
		color: var(--muted);
		font-size: 8px;
		cursor: pointer;
		padding: 2px;
		opacity: 0;
		transition: opacity 150ms ease-out;
	}
	.line:hover .fold-icon {
		opacity: 0.6;
	}
	.fold-icon:hover {
		opacity: 1;
		color: var(--accent);
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
	.md-table {
		border-collapse: collapse;
		font-family: var(--font-mono);
		font-size: 13px;
		margin: var(--space-xs) 0;
		width: 100%;
	}
	.md-table th,
	.md-table td {
		border: 1px solid var(--border);
		padding: 4px 10px;
		text-align: left;
	}
	.md-table th {
		color: var(--text-bright);
		font-weight: 600;
		background: rgba(212, 168, 67, 0.06);
	}
	.md-table td {
		color: var(--text);
	}
	.md-table tr.table-row-active td {
		background: rgba(212, 168, 67, 0.1);
		color: var(--text-bright);
	}
</style>
