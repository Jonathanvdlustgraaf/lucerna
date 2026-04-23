import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, extname, resolve } from 'node:path';

export interface FileEntry {
	path: string;
	name: string;
	type: 'file' | 'directory';
}

function assertSafePath(repoPath: string, filePath: string): string {
	const base = resolve(repoPath);
	const resolved = resolve(repoPath, filePath);
	if (!resolved.startsWith(base + '/') && resolved !== base) {
		throw new Error('Path traversal detected');
	}
	return resolved;
}

export async function listFiles(repoPath: string, subPath = ''): Promise<FileEntry[]> {
	const fullPath = join(repoPath, subPath);
	const entries = await readdir(fullPath, { withFileTypes: true });
	const results: FileEntry[] = [];

	for (const entry of entries) {
		if (entry.name.startsWith('.')) continue;
		const entryPath = subPath ? join(subPath, entry.name) : entry.name;

		if (entry.isDirectory()) {
			results.push({ path: entryPath, name: entry.name, type: 'directory' });
			const children = await listFiles(repoPath, entryPath);
			results.push(...children);
		} else if (extname(entry.name) === '.md') {
			results.push({ path: entryPath, name: entry.name, type: 'file' });
		}
	}

	return results;
}

export async function browseDirectory(absolutePath: string): Promise<FileEntry[]> {
	const resolved = resolve(absolutePath);
	const entries = await readdir(resolved, { withFileTypes: true });
	const results: FileEntry[] = [];

	for (const entry of entries) {
		if (entry.name.startsWith('.')) continue;

		const entryPath = join(resolved, entry.name);

		if (entry.isDirectory()) {
			results.push({ path: entryPath, name: entry.name, type: 'directory' });
		} else if (extname(entry.name) === '.md') {
			results.push({ path: entryPath, name: entry.name, type: 'file' });
		}
	}

	results.sort((a, b) => {
		if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
		return a.name.localeCompare(b.name);
	});

	return results;
}

export async function getFile(repoPath: string, filePath: string): Promise<string> {
	const resolved = assertSafePath(repoPath, filePath);
	return readFile(resolved, 'utf-8');
}

export async function putFile(repoPath: string, filePath: string, content: string): Promise<void> {
	const resolved = assertSafePath(repoPath, filePath);
	await writeFile(resolved, content, 'utf-8');
}

export async function searchFiles(root: string, query: string, maxResults = 50): Promise<FileEntry[]> {
	const q = query.toLowerCase();
	const results: FileEntry[] = [];

	async function walk(dir: string) {
		if (results.length >= maxResults) return;
		let entries;
		try {
			entries = await readdir(dir, { withFileTypes: true });
		} catch {
			return;
		}
		for (const entry of entries) {
			if (results.length >= maxResults) return;
			if (entry.name.startsWith('.')) continue;
			const fullPath = join(dir, entry.name);

			if (entry.isDirectory()) {
				if (entry.name === 'node_modules') continue;
				await walk(fullPath);
			} else if (extname(entry.name) === '.md' && entry.name.toLowerCase().includes(q)) {
				results.push({ path: fullPath, name: entry.name, type: 'file' });
			}
		}
	}

	await walk(resolve(root));
	return results;
}

export async function getFileAbsolute(absolutePath: string): Promise<string> {
	return readFile(resolve(absolutePath), 'utf-8');
}

export async function putFileAbsolute(absolutePath: string, content: string): Promise<void> {
	await writeFile(resolve(absolutePath), content, 'utf-8');
}
