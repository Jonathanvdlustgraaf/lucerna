import { env } from '$env/dynamic/private';
import { resolve } from 'node:path';

export function getRepoPath(): string {
	const path = env.REPO_PATH;
	if (!path) throw new Error('REPO_PATH environment variable is required');
	return resolve(path);
}
