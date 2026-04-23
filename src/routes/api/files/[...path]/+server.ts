import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getRepoPath } from '$lib/server/config';
import { getFile, putFile, getFileAbsolute, putFileAbsolute } from '$lib/server/files';
import { createGitService } from '$lib/server/git';

export const GET: RequestHandler = async ({ params }) => {
	try {
		const filePath = params.path;
		if (filePath.startsWith('/')) {
			const content = await getFileAbsolute(filePath);
			return json({ content });
		}
		const content = await getFile(getRepoPath(), filePath);
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
		const filePath = params.path;

		if (filePath.startsWith('/')) {
			await putFileAbsolute(filePath, content);
			return json({ success: true });
		}

		await putFile(getRepoPath(), filePath, content);

		if (autoCommit) {
			const git = createGitService(getRepoPath());
			const commitMsg = message || `update ${filePath}`;
			await git.commit(commitMsg, [filePath]);
		}

		return json({ success: true });
	} catch (err) {
		if (err instanceof Error && err.message === 'Path traversal detected') {
			throw error(403, 'Forbidden');
		}
		throw error(500, 'Failed to write file');
	}
};
