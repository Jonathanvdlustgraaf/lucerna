import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseLines } from '$lib/services/markdown';

export type TemplateName = 'professional' | 'proposal' | 'technical';

export interface ExportOptions {
	markdown: string;
	template: TemplateName;
	author?: string;
	date?: string;
}

export async function renderToHtml(options: ExportOptions): Promise<string> {
	const templatePath = join(process.cwd(), 'templates', `${options.template}.html`);
	const templateHtml = await readFile(templatePath, 'utf-8');
	const lines = parseLines(options.markdown);

	const title = lines.find((l) => l.type === 'h1')?.content || 'Untitled';
	const toc = lines
		.filter((l) => l.type === 'h2')
		.map((l, i) => ({ title: l.content, page: i + 3 }));

	const bodyHtml = linesToHtml(lines);
	const tocHtml = toc
		.map((t) => `<div class="toc-row"><span>${t.title}</span><span>${t.page}</span></div>`)
		.join('\n');

	return templateHtml
		.replace('{{title}}', title)
		.replace('{{author}}', options.author || 'Jonathan van de Lustgraaf')
		.replace('{{date}}', options.date || new Date().toLocaleDateString('nl-NL'))
		.replace('{{toc}}', tocHtml)
		.replace('{{body}}', bodyHtml);
}

function linesToHtml(lines: import('$lib/services/markdown').ParsedLine[]): string {
	return lines
		.map((l) => {
			switch (l.type) {
				case 'h1':
					return `<h1>${l.content}</h1>`;
				case 'h2':
					return `<div class="page-break"></div><h2>${l.content}</h2>`;
				case 'h3':
					return `<h3>${l.content}</h3>`;
				case 'p':
					return `<p>${l.content}</p>`;
				case 'li':
					return `<li>${l.content}</li>`;
				case 'meta':
					return `<hr/>`;
				case 'blank':
					return '';
				default:
					return `<p>${l.content}</p>`;
			}
		})
		.join('\n');
}
