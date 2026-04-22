import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { listFiles, getFile, putFile } from './files';

describe('File Service', () => {
	let repoPath: string;

	beforeEach(async () => {
		repoPath = await mkdtemp(join(tmpdir(), 'lucerna-test-'));
		await mkdir(join(repoPath, 'journal'), { recursive: true });
		await writeFile(join(repoPath, 'README.md'), '# Test Repo');
		await writeFile(join(repoPath, 'roadmap.md'), '## Phase 1\n\n- Task A');
		await writeFile(join(repoPath, 'journal', 'entry.md'), '# Journal Entry');
		await writeFile(join(repoPath, 'image.png'), 'not markdown');
		await writeFile(join(repoPath, '.hidden.md'), 'secret');
	});

	afterEach(async () => {
		await rm(repoPath, { recursive: true });
	});

	describe('listFiles', () => {
		it('lists markdown files recursively', async () => {
			const files = await listFiles(repoPath);
			const paths = files.filter((f) => f.type === 'file').map((f) => f.path);
			expect(paths).toContain('README.md');
			expect(paths).toContain('roadmap.md');
			expect(paths).toContain(join('journal', 'entry.md'));
		});

		it('includes directories', async () => {
			const files = await listFiles(repoPath);
			const dirs = files.filter((f) => f.type === 'directory').map((f) => f.path);
			expect(dirs).toContain('journal');
		});

		it('skips hidden files and directories', async () => {
			const files = await listFiles(repoPath);
			const paths = files.map((f) => f.path);
			expect(paths).not.toContain('.hidden.md');
		});

		it('only lists .md files (not other extensions)', async () => {
			const files = await listFiles(repoPath);
			const filePaths = files.filter((f) => f.type === 'file').map((f) => f.path);
			expect(filePaths).not.toContain('image.png');
		});
	});

	describe('getFile', () => {
		it('reads file content', async () => {
			const content = await getFile(repoPath, 'README.md');
			expect(content).toBe('# Test Repo');
		});

		it('reads nested file content', async () => {
			const content = await getFile(repoPath, join('journal', 'entry.md'));
			expect(content).toBe('# Journal Entry');
		});

		it('throws on nonexistent file', async () => {
			await expect(getFile(repoPath, 'nope.md')).rejects.toThrow();
		});

		it('rejects path traversal', async () => {
			await expect(getFile(repoPath, '../../../etc/passwd')).rejects.toThrow(
				'Path traversal detected'
			);
		});
	});

	describe('putFile', () => {
		it('writes file content', async () => {
			await putFile(repoPath, 'README.md', '# Updated');
			const content = await getFile(repoPath, 'README.md');
			expect(content).toBe('# Updated');
		});

		it('rejects path traversal', async () => {
			await expect(putFile(repoPath, '../evil.md', 'hack')).rejects.toThrow(
				'Path traversal detected'
			);
		});
	});
});
