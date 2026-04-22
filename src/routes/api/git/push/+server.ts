import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getRepoPath } from '$lib/server/config';
import { createGitService } from '$lib/server/git';

export const POST: RequestHandler = async () => {
	try {
		const git = createGitService(getRepoPath());
		await git.push();
		return json({ success: true });
	} catch {
		throw error(500, 'Push failed - is a remote configured?');
	}
};
