import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getRepoPath } from '$lib/server/config';
import { createGitService } from '$lib/server/git';

export const POST: RequestHandler = async () => {
	const git = createGitService(getRepoPath());
	const result = await git.pull();
	return json(result);
};
