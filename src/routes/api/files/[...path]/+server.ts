import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getRepoPath } from '$lib/server/config';
import { getFile, putFile } from '$lib/server/files';
import { createGitService } from '$lib/server/git';

export const GET: RequestHandler = async ({ params }) => {
	try {
		const content = await getFile(getRepoPath(), params.path);
		return json({ content });
	} catch (err) {
		if (err instanceof Error && err.message === 'Path traversal detected') {
			throw error(403, 'Forbidden');
		}
		throw error(404, 'File not found');
	}
};

export const PUT: RequestHandler = async ({ params, request }) => {
	try {
		const { content, autoCommit, message } = await request.json();
		await putFile(getRepoPath(), params.path, content);

		if (autoCommit) {
			const git = createGitService(getRepoPath());
			const commitMsg = message || `update ${params.path}`;
			await git.commit(commitMsg, [params.path]);
		}

		return json({ success: true });
	} catch (err) {
		if (err instanceof Error && err.message === 'Path traversal detected') {
			throw error(403, 'Forbidden');
		}
		throw error(500, 'Failed to write file');
	}
};
