import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { searchFiles } from '$lib/server/files';

export const GET: RequestHandler = async ({ url }) => {
	const q = url.searchParams.get('q');
	const root = url.searchParams.get('root') || '/home';
	if (!q) {
		throw error(400, 'q query parameter is required');
	}
	try {
		const results = await searchFiles(root, q);
		return json(results);
	} catch {
		throw error(500, 'Search failed');
	}
};
