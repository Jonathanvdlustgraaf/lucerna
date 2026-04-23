import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getRepoPath } from '$lib/server/config';
import { createGitService } from '$lib/server/git';

export const GET: RequestHandler = async ({ params }) => {
	try {
		const git = createGitService(getRepoPath());
		const log = await git.log(params.path || undefined);
		return json({ log });
	} catch (err) {
		throw error(500, 'Failed to get log');
	}
};
