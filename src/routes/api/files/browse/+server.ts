import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { browseDirectory } from '$lib/server/files';

export const GET: RequestHandler = async ({ url }) => {
	const path = url.searchParams.get('path');
	if (!path) {
		throw error(400, 'path query parameter is required');
	}
	try {
		const entries = await browseDirectory(path);
		return json(entries);
	} catch {
		throw error(404, 'Directory not found');
	}
};
