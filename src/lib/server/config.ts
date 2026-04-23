import { env } from '$env/dynamic/private';
import { resolve } from 'node:path';
import { homedir } from 'node:os';

export function getRepoPath(): string {
	const path = env.REPO_PATH;
	if (!path) return homedir();
	return resolve(path);
}
