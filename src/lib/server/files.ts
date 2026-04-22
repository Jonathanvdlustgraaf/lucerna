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

export async function getFile(repoPath: string, filePath: string): Promise<string> {
	const resolved = assertSafePath(repoPath, filePath);
	return readFile(resolved, 'utf-8');
}

export async function putFile(repoPath: string, filePath: string, content: string): Promise<void> {
	const resolved = assertSafePath(repoPath, filePath);
	await writeFile(resolved, content, 'utf-8');
}
