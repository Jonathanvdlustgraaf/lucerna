import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getRepoPath } from '$lib/server/config';
import { getFile } from '$lib/server/files';
import { renderToHtml } from '$lib/server/export';
import type { TemplateName } from '$lib/server/export';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { path, template } = (await request.json()) as { path: string; template: TemplateName };
		const markdown = await getFile(getRepoPath(), path);
		const html = await renderToHtml({ markdown, template });

		const puppeteer = await import('puppeteer');
		const browser = await puppeteer.default.launch({ headless: true, args: ['--no-sandbox'] });
		const page = await browser.newPage();
		await page.setContent(html, { waitUntil: 'networkidle0' });
		const pdf = await page.pdf({
			format: 'A4',
			margin: { top: '2cm', bottom: '2cm', left: '2.5cm', right: '2.5cm' },
			printBackground: true
		});
		await browser.close();

		return new Response(pdf, {
			headers: {
				'Content-Type': 'application/pdf',
				'Content-Disposition': `attachment; filename="${path.replace('.md', '.pdf')}"`
			}
		});
	} catch (err) {
		throw error(500, 'Failed to export PDF');
	}
};
