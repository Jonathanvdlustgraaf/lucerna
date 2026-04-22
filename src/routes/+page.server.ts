import type { PageServerLoad } from './$types';
import { getRepoPath } from '$lib/server/config';
import { listFiles } from '$lib/server/files';

export const load: PageServerLoad = async () => {
	try {
		const fileTree = await listFiles(getRepoPath());
		return { fileTree };
	} catch {
		return { fileTree: [] };
	}
};
