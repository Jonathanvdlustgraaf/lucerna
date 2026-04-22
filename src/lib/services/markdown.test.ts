import { describe, it, expect } from 'vitest';
import { parseLines } from './markdown';

describe('parseLines', () => {
	it('parses h1 headings', () => {
		const lines = parseLines('# Title');
		expect(lines[0]).toMatchObject({ type: 'h1', content: 'Title', number: 1 });
	});

	it('parses h2 and h3 headings', () => {
		const lines = parseLines('## Section\n### Sub');
		expect(lines[0]).toMatchObject({ type: 'h2', content: 'Section' });
		expect(lines[1]).toMatchObject({ type: 'h3', content: 'Sub' });
	});

	it('parses paragraphs', () => {
		const lines = parseLines('Hello world');
		expect(lines[0]).toMatchObject({ type: 'p', content: 'Hello world' });
	});

	it('parses list items with dash and asterisk', () => {
		const lines = parseLines('- Item 1\n* Item 2');
		expect(lines[0]).toMatchObject({ type: 'li', content: 'Item 1' });
		expect(lines[1]).toMatchObject({ type: 'li', content: 'Item 2' });
	});

	it('parses blank lines', () => {
		const lines = parseLines('Line 1\n\nLine 2');
		expect(lines[1]).toMatchObject({ type: 'blank', content: '' });
	});

	it('parses horizontal rules as meta', () => {
		const lines = parseLines('---');
		expect(lines[0]).toMatchObject({ type: 'meta' });
	});

	it('numbers lines starting from 1', () => {
		const lines = parseLines('A\nB\nC');
		expect(lines.map((l) => l.number)).toEqual([1, 2, 3]);
	});

	it('preserves raw content', () => {
		const lines = parseLines('# Title');
		expect(lines[0].raw).toBe('# Title');
	});

	it('handles empty input', () => {
		const lines = parseLines('');
		expect(lines).toHaveLength(1);
		expect(lines[0]).toMatchObject({ type: 'blank' });
	});
});
