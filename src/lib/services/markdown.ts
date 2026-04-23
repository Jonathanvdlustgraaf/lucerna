export type LineType = 'h1' | 'h2' | 'h3' | 'p' | 'li' | 'blank' | 'meta' | 'table';

export interface TableData {
	headers: string[];
	rows: string[][];
}

export interface ParsedLine {
	type: LineType;
	content: string;
	raw: string;
	number: number;
	endNumber?: number;
	table?: TableData;
}

function isTableRow(line: string): boolean {
	const t = line.trim();
	return t.startsWith('|') && t.endsWith('|');
}

function isSeparatorRow(line: string): boolean {
	return /^\|[\s\-:|]+\|$/.test(line.trim());
}

function parseCells(line: string): string[] {
	return line.trim().slice(1, -1).split('|').map(c => c.trim());
}

export function parseLines(markdown: string): ParsedLine[] {
	const rawLines = markdown.split('\n');
	const result: ParsedLine[] = [];
	let i = 0;

	while (i < rawLines.length) {
		const raw = rawLines[i];
		const trimmed = raw.trim();

		if (isTableRow(trimmed) && i + 1 < rawLines.length && isSeparatorRow(rawLines[i + 1].trim())) {
			const startLine = i + 1;
			const headers = parseCells(trimmed);
			i += 2; // skip header + separator
			const rows: string[][] = [];
			while (i < rawLines.length && isTableRow(rawLines[i].trim())) {
				rows.push(parseCells(rawLines[i]));
				i++;
			}
			result.push({
				type: 'table',
				content: '',
				raw: '',
				number: startLine,
				endNumber: startLine + 1 + rows.length,
				table: { headers, rows }
			});
			continue;
		}

		if (trimmed === '') { result.push({ type: 'blank', content: '', raw, number: i + 1 }); }
		else if (trimmed.startsWith('### ')) { result.push({ type: 'h3', content: trimmed.slice(4), raw, number: i + 1 }); }
		else if (trimmed.startsWith('## ')) { result.push({ type: 'h2', content: trimmed.slice(3), raw, number: i + 1 }); }
		else if (trimmed.startsWith('# ')) { result.push({ type: 'h1', content: trimmed.slice(2), raw, number: i + 1 }); }
		else if (trimmed.startsWith('- ')) { result.push({ type: 'li', content: trimmed.slice(2), raw, number: i + 1 }); }
		else if (trimmed.startsWith('* ')) { result.push({ type: 'li', content: trimmed.slice(2), raw, number: i + 1 }); }
		else if (trimmed.startsWith('---')) { result.push({ type: 'meta', content: '', raw, number: i + 1 }); }
		else { result.push({ type: 'p', content: raw, raw, number: i + 1 }); }

		i++;
	}

	return result;
}
