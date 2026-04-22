class GitState {
	branch = $state('main');
	modified = $state<string[]>([]);
	ahead = $state(0);
	behind = $state(0);
	syncing = $state(false);

	async refresh() {
		this.syncing = true;
		try {
			const res = await fetch('/api/git/status');
			if (res.ok) {
				const data = await res.json();
				this.branch = data.branch;
				this.modified = data.modified;
				this.ahead = data.ahead;
				this.behind = data.behind;
			}
		} finally {
			this.syncing = false;
		}
	}
}

export const git = new GitState();
