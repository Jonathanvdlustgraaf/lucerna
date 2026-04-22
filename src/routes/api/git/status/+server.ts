import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getRepoPath } from '$lib/server/config';
import { createGitService } from '$lib/server/git';

export const GET: RequestHandler = async () => {
	const git = createGitService(getRepoPath());
	const status = await git.status();
	return json(status);
};
