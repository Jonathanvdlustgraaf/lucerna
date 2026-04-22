import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getRepoPath } from '$lib/server/config';
import { createGitService } from '$lib/server/git';

export const POST: RequestHandler = async ({ request }) => {
	const { message, files } = await request.json();
	if (!message) throw error(400, 'Commit message is required');
	const git = createGitService(getRepoPath());
	const sha = await git.commit(message, files);
	return json({ sha });
};
