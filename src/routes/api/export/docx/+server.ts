import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getRepoPath } from '$lib/server/config';
import { getFile } from '$lib/server/files';
import { parseLines } from '$lib/services/markdown';
import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel, PageBreak } from 'docx';

export const POST: RequestHandler = async ({ request }) => {
    try {
        const { path } = await request.json();
        const markdown = await getFile(getRepoPath(), path);
        const lines = parseLines(markdown);

        const title = lines.find((l) => l.type === 'h1')?.content || 'Untitled';
        const tocEntries = lines.filter((l) => l.type === 'h2').map((l) => l.content);

        const children: Paragraph[] = [];

        // Voorpagina
        children.push(new Paragraph({ spacing: { before: 4000 } }));
        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: title, bold: true, size: 48, font: 'Calibri' })]
        }));
        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: 'Jonathan van de Lustgraaf', size: 24, color: '666666' })]
        }));
        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: new Date().toLocaleDateString('nl-NL'), size: 24, color: '666666' })]
        }));
        children.push(new Paragraph({ children: [new PageBreak()] }));

        // Inhoudsopgave
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun({ text: 'Inhoudsopgave' })]
        }));
        tocEntries.forEach((entry, i) => {
            children.push(new Paragraph({
                children: [new TextRun({ text: `${i + 1}. ${entry}` })]
            }));
        });
        children.push(new Paragraph({ children: [new PageBreak()] }));

        // Content
        for (const line of lines) {
            switch (line.type) {
                case 'h1': break;
                case 'h2':
                    children.push(new Paragraph({ children: [new PageBreak()] }));
                    children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: line.content })] }));
                    break;
                case 'h3':
                    children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: line.content })] }));
                    break;
                case 'p':
                    children.push(new Paragraph({ children: [new TextRun({ text: line.content })] }));
                    break;
                case 'li':
                    children.push(new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text: line.content })] }));
                    break;
                case 'blank':
                    children.push(new Paragraph({}));
                    break;
            }
        }

        const doc = new Document({ sections: [{ children }] });
        const buffer = await Packer.toBuffer(doc);

        return new Response(buffer, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': `attachment; filename="${path.replace('.md', '.docx')}"`
            }
        });
    } catch (err) {
        throw error(500, 'Failed to export Word');
    }
};
