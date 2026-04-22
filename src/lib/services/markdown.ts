export type LineType = 'h1' | 'h2' | 'h3' | 'p' | 'li' | 'blank' | 'meta';

export interface ParsedLine {
	type: LineType;
	content: string;
	raw: string;
	number: number;
}

export function parseLines(markdown: string): ParsedLine[] {
	return markdown.split('\n').map((raw, i) => {
		const trimmed = raw.trim();

		if (trimmed === '') return { type: 'blank', content: '', raw, number: i + 1 };
		if (trimmed.startsWith('### ')) return { type: 'h3', content: trimmed.slice(4), raw, number: i + 1 };
		if (trimmed.startsWith('## ')) return { type: 'h2', content: trimmed.slice(3), raw, number: i + 1 };
		if (trimmed.startsWith('# ')) return { type: 'h1', content: trimmed.slice(2), raw, number: i + 1 };
		if (trimmed.startsWith('- ')) return { type: 'li', content: trimmed.slice(2), raw, number: i + 1 };
		if (trimmed.startsWith('* ')) return { type: 'li', content: trimmed.slice(2), raw, number: i + 1 };
		if (trimmed.startsWith('---')) return { type: 'meta', content: '', raw, number: i + 1 };

		return { type: 'p', content: raw, raw, number: i + 1 };
	});
}
