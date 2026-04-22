import simpleGit, { type SimpleGit } from 'simple-git';

export interface GitStatus {
	branch: string;
	modified: string[];
	ahead: number;
	behind: number;
}

export interface GitLogEntry {
	sha: string;
	message: string;
	author: string;
	date: string;
}

export function createGitService(repoPath: string) {
	const git: SimpleGit = simpleGit(repoPath);

	return {
		async status(): Promise<GitStatus> {
			const s = await git.status();
			return {
				branch: s.current ?? 'unknown',
				modified: [...s.modified, ...s.not_added, ...s.created],
				ahead: s.ahead,
				behind: s.behind
			};
		},

		async commit(message: string, files?: string[]): Promise<string> {
			if (files && files.length > 0) {
				await git.add(files);
			} else {
				await git.add('.');
			}
			const result = await git.commit(message);
			return result.commit;
		},

		async push(): Promise<void> {
			await git.push();
		},

		async pull(): Promise<{ conflicts: boolean }> {
			try {
				await git.pull();
				return { conflicts: false };
			} catch {
				return { conflicts: true };
			}
		},

		async log(filePath?: string): Promise<GitLogEntry[]> {
			const options = filePath ? { file: filePath } : {};
			const result = await git.log(options);
			return result.all.map((entry) => ({
				sha: entry.hash,
				message: entry.message,
				author: entry.author_name,
				date: entry.date
			}));
		}
	};
}
