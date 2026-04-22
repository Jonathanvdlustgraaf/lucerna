import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getRepoPath } from '$lib/server/config';
import { listFiles } from '$lib/server/files';

export const GET: RequestHandler = async () => {
	const tree = await listFiles(getRepoPath());
	return json(tree);
};
