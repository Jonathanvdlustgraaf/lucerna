import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import simpleGit from 'simple-git';
import { createGitService } from './git';

describe('Git Service', () => {
	let repoPath: string;

	beforeEach(async () => {
		repoPath = await mkdtemp(join(tmpdir(), 'lucerna-git-test-'));
		const git = simpleGit(repoPath);
		await git.init();
		await git.addConfig('user.name', 'Test');
		await git.addConfig('user.email', 'test@test.com');
		await writeFile(join(repoPath, 'README.md'), '# Test');
		await git.add('.');
		await git.commit('init');
	});

	afterEach(async () => {
		await rm(repoPath, { recursive: true });
	});

	describe('status', () => {
		it('returns clean status with no changes', async () => {
			const service = createGitService(repoPath);
			const status = await service.status();
			expect(status.modified).toEqual([]);
			expect(status.branch).toBeTruthy();
		});

		it('detects modified files', async () => {
			await writeFile(join(repoPath, 'README.md'), '# Changed');
			const service = createGitService(repoPath);
			const status = await service.status();
			expect(status.modified).toContain('README.md');
		});

		it('detects new untracked files', async () => {
			await writeFile(join(repoPath, 'new.md'), '# New');
			const service = createGitService(repoPath);
			const status = await service.status();
			expect(status.modified).toContain('new.md');
		});
	});

	describe('commit', () => {
		it('commits all changes when no files specified', async () => {
			await writeFile(join(repoPath, 'new.md'), '# New');
			const service = createGitService(repoPath);
			const sha = await service.commit('add new file');
			expect(sha).toBeTruthy();

			const status = await service.status();
			expect(status.modified).toEqual([]);
		});

		it('commits only specified files', async () => {
			await writeFile(join(repoPath, 'a.md'), '# A');
			await writeFile(join(repoPath, 'b.md'), '# B');
			const service = createGitService(repoPath);
			await service.commit('add a only', ['a.md']);

			const status = await service.status();
			expect(status.modified).toContain('b.md');
			expect(status.modified).not.toContain('a.md');
		});
	});

	describe('log', () => {
		it('returns commit history', async () => {
			const service = createGitService(repoPath);
			const log = await service.log();
			expect(log.length).toBeGreaterThan(0);
			expect(log[0].message).toBe('init');
			expect(log[0].sha).toBeTruthy();
			expect(log[0].author).toBe('Test');
		});

		it('returns history for specific file', async () => {
			await writeFile(join(repoPath, 'tracked.md'), 'v1');
			const git = simpleGit(repoPath);
			await git.add('tracked.md');
			await git.commit('add tracked');

			await writeFile(join(repoPath, 'other.md'), 'other');
			await git.add('other.md');
			await git.commit('add other');

			const service = createGitService(repoPath);
			const log = await service.log('tracked.md');
			expect(log).toHaveLength(1);
			expect(log[0].message).toBe('add tracked');
		});
	});
});
