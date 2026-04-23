export interface OpenFile {
	path: string;
	name: string;
	content: string;
	dirty: boolean;
}

class EditorState {
	files = $state<OpenFile[]>([]);
	activeIndex = $state(0);
	cursorLine = $state(1);
	cursorCol = $state(1);
	editMode = $state(false);

	get activeFile(): OpenFile | undefined {
		return this.files[this.activeIndex];
	}

	open(path: string, name: string, content: string) {
		const i = this.files.findIndex((f) => f.path === path);
		if (i >= 0) {
			this.activeIndex = i;
		} else {
			this.files.push({ path, name, content, dirty: false });
			this.activeIndex = this.files.length - 1;
		}
	}

	close(index: number) {
		this.files.splice(index, 1);
		if (this.activeIndex >= this.files.length) {
			this.activeIndex = Math.max(0, this.files.length - 1);
		}
	}

	setActive(index: number) {
		if (index >= 0 && index < this.files.length) {
			this.activeIndex = index;
		}
	}

	setCursor(line: number, col: number) {
		this.cursorLine = line;
		this.cursorCol = col;
	}

	markDirty() {
		const file = this.activeFile;
		if (file) file.dirty = true;
	}

	markClean(path: string) {
		const file = this.files.find((f) => f.path === path);
		if (file) file.dirty = false;
	}

	toggleEdit() {
		this.editMode = !this.editMode;
	}

	updateContent(content: string) {
		const file = this.activeFile;
		if (file) {
			file.content = content;
			file.dirty = true;
		}
	}

	checkedSections = $state<Record<string, Record<number, boolean>>>({});

	getChecked(path: string): Record<number, boolean> {
		return this.checkedSections[path] || {};
	}

	toggleSection(path: string, lineNumber: number) {
		if (!this.checkedSections[path]) {
			this.checkedSections[path] = {};
		}
		const current = this.checkedSections[path][lineNumber];
		this.checkedSections[path][lineNumber] = current === undefined ? false : !current;
	}

	marks = $state<Record<string, number[]>>({});

	toggleMark(path: string, line: number) {
		if (!this.marks[path]) this.marks[path] = [];
		const idx = this.marks[path].indexOf(line);
		if (idx >= 0) {
			this.marks[path].splice(idx, 1);
		} else {
			this.marks[path].push(line);
		}
	}

	getMarks(path: string): number[] {
		return this.marks[path] || [];
	}

	nextMark(path: string): number | null {
		const m = this.getMarks(path).sort((a, b) => a - b);
		const current = this.cursorLine;
		return m.find((n) => n > current) ?? m[0] ?? null;
	}

	prevMark(path: string): number | null {
		const m = this.getMarks(path).sort((a, b) => b - a);
		const current = this.cursorLine;
		return m.find((n) => n < current) ?? m[0] ?? null;
	}

	splitIndex = $state<number | null>(null);

	get splitFile(): OpenFile | undefined {
		return this.splitIndex !== null ? this.files[this.splitIndex] : undefined;
	}

	setSplit(index: number | null) {
		this.splitIndex = index;
	}
}

export const editor = new EditorState();
