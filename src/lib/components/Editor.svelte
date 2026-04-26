<script lang="ts">
    import TabBar from './TabBar.svelte';
    import StatusBar from './StatusBar.svelte';
    import CommandPalette from './CommandPalette.svelte';
    import FilterSidebar from './FilterSidebar.svelte';
    import GitPanel from './GitPanel.svelte';
    import ExportPreview from './ExportPreview.svelte';
    import FileTree from './FileTree.svelte';
    import ShortcutHelp from './ShortcutHelp.svelte';
    import SpotlightSettings from './SpotlightSettings.svelte';
    import Line from './Line.svelte';
    import SplitView from './SplitView.svelte';
    import EditableArea from './EditableArea.svelte';
    import ZenMode from './ZenMode.svelte';
    import { editor } from '$lib/stores/editor.svelte';
    import { tools } from '$lib/stores/tools.svelte';
    import { git } from '$lib/stores/git.svelte';
    import { register, handleKeydown } from '$lib/services/keyboard';
    import { registerCommand, NEW_FILE_COMMAND_ID } from '$lib/services/commands';
    import { setupAutosave, triggerAutosave } from '$lib/services/autosave';
    import { parseLines } from '$lib/services/markdown';
    import type { ParsedLine } from '$lib/services/markdown';
    import { onMount } from 'svelte';

    let lines = $derived<ParsedLine[]>(
        editor.activeFile ? parseLines(editor.activeFile.content) : []
    );

    let showLineNumbers = $derived(tools.isActive('lineNumbers'));

    let filteredLines = $derived.by(() => {
        if (!editor.activeFile || !tools.isActive('filter')) return lines;

        const checked = editor.getChecked(editor.activeFile.path);
        // If nothing is unchecked, return all lines
        const hasUnchecked = Object.values(checked).some(v => v === false);
        if (!hasUnchecked) return lines;

        const result: ParsedLine[] = [];
        let hiding = false;
        let hiddenCount = 0;
        let hiddenHeader = '';
        let currentLevel: 'h2' | 'h3' | null = null;

        for (const line of lines) {
            if (line.type === 'h2' || line.type === 'h3') {
                // Flush any hidden section
                if (hiding && hiddenCount > 0) {
                    result.push({
                        type: 'meta' as const,
                        content: `${hiddenHeader} (${hiddenCount} lines hidden)`,
                        raw: '',
                        number: -1
                    });
                }

                if (checked[line.number] === false) {
                    hiding = true;
                    hiddenCount = 0;
                    hiddenHeader = line.content;
                    currentLevel = line.type;
                } else {
                    // Check if this is a sub-header of a hidden section
                    if (hiding && line.type === 'h3' && currentLevel === 'h2') {
                        hiddenCount++;
                    } else {
                        hiding = false;
                        result.push(line);
                    }
                }
            } else if (hiding) {
                hiddenCount++;
            } else {
                result.push(line);
            }
        }

        // Flush final hidden section
        if (hiding && hiddenCount > 0) {
            result.push({
                type: 'meta' as const,
                content: `${hiddenHeader} (${hiddenCount} lines hidden)`,
                raw: '',
                number: -1
            });
        }

        return result;
    });

    async function openFile(path: string, name: string) {
        const existing = editor.files.find((f) => f.path === path);
        if (existing) {
            editor.open(path, name, existing.content);
            return;
        }
        const res = await fetch(`/api/files/${encodeURIComponent(path)}`);
        if (res.ok) {
            const data = await res.json();
            editor.open(path, name, data.content);
        }
    }

    async function saveFile() {
        const file = editor.activeFile;
        if (!file || !file.dirty) return;
        const res = await fetch(`/api/files/${encodeURIComponent(file.path)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: file.content })
        });
        if (res.ok) {
            editor.markClean(file.path);
            git.refresh();
        }
    }

    async function createFile(dirPath: string, filename: string) {
        const name = filename.endsWith('.md') ? filename : `${filename}.md`;
        const fullPath = `${dirPath}/${name}`;
        const res = await fetch(`/api/files/${encodeURIComponent(fullPath)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: '' })
        });
        if (res.ok) {
            await openFile(fullPath, name);
            if (!editor.editMode) editor.toggleEdit();
        }
    }

    function activeFileDir(): string {
        const path = editor.activeFile?.path;
        if (!path) return '/home';
        return path.replace(/\/[^/]+$/, '') || '/home';
    }

    function currentTableLine(): ParsedLine | null {
        return filteredLines.find(l => l.type === 'table' && l.number === editor.cursorLine) ?? null;
    }

    function nextLineNumber(current: number): number {
        for (const line of filteredLines) {
            if (line.number > current) return line.number;
        }
        return current;
    }

    function prevLineNumber(current: number): number {
        let prev = current;
        for (const line of filteredLines) {
            if (line.number >= current) break;
            prev = line.number;
        }
        return prev;
    }

    function handleContentChange(value: string) {
        editor.updateContent(value);
        triggerAutosave();
    }

    function scrollCursorIntoView() {
        requestAnimationFrame(() => {
            const container = document.querySelector('.zen-content') || document.querySelector('.body');
            if (!container) return;

            const cursorEl = document.querySelector(`[data-linenum="${editor.cursorLine}"]`) as HTMLElement;
            if (!cursorEl) return;

            const marginPx = tools.scrollMargin * 28;

            const containerRect = container.getBoundingClientRect();
            const cursorRect = cursorEl.getBoundingClientRect();

            if (cursorRect.bottom + marginPx > containerRect.bottom) {
                container.scrollTop += (cursorRect.bottom + marginPx) - containerRect.bottom;
            } else if (cursorRect.top - marginPx < containerRect.top) {
                container.scrollTop -= containerRect.top - (cursorRect.top - marginPx);
            }
        });
    }

    let gitLog = $state<Array<{ sha: string; message: string; author: string; date: string }>>([]);

    async function refreshGitLog() {
        const path = editor.activeFile?.path;
        const res = await fetch(path ? `/api/git/log/${encodeURIComponent(path)}` : '/api/git/log/');
        if (res.ok) {
            const data = await res.json();
            gitLog = data.log;
        }
    }

    onMount(() => {
        const cleanupAutosave = setupAutosave(saveFile);
        const gitInterval = setInterval(() => {
            if (tools.isActive('gitPanel')) git.refresh();
        }, 30000);
        const unsubs = [
            register({
                key: 'b',
                ctrl: true,
                handler: () => tools.toggle('fileTree'),
                description: 'Toggle file tree'
            }),
            register({
                key: 'g',
                ctrl: true,
                handler: () => tools.toggle('lineNumbers'),
                description: 'Toggle line numbers'
            }),
            register({
                key: 'e',
                ctrl: true,
                handler: () => editor.toggleEdit(),
                description: 'Toggle edit mode'
            }),
            register({
                key: 's',
                ctrl: true,
                handler: () => saveFile(),
                description: 'Save file'
            }),
            register({
                key: 's',
                ctrl: true,
                shift: true,
                handler: () => {
                    if (tools.isActive('spotlightSettings')) {
                        tools.dismiss('spotlightSettings');
                        tools.dismiss('spotlight');
                    } else if (tools.isActive('spotlight')) {
                        tools.toggle('spotlightSettings');
                    } else {
                        tools.toggle('spotlight');
                    }
                },
                description: 'Toggle spotlight / settings'
            }),
            register({
                key: 'l',
                ctrl: true,
                handler: () => tools.toggle('selectLine'),
                description: 'Toggle select-line cursor'
            }),
            register({
                key: 'ArrowUp',
                handler: () => {
                    if (editor.editMode || tools.isActive('commandPalette')) return false;
                    if (editor.activeFile) {
                        const tbl = currentTableLine();
                        if (tbl && editor.tableRow > 0) {
                            editor.tableRow--;
                        } else if (tbl && editor.tableRow === 0) {
                            editor.tableRow = -1;
                        } else {
                            editor.tableRow = -1;
                            const newLine = prevLineNumber(editor.cursorLine);
                            editor.setCursor(newLine, editor.cursorCol);
                            scrollCursorIntoView();
                        }
                    }
                },
                description: 'Move cursor up'
            }),
            register({
                key: 'ArrowDown',
                handler: () => {
                    if (editor.editMode || tools.isActive('commandPalette')) return false;
                    if (editor.activeFile) {
                        const tbl = currentTableLine();
                        if (tbl && editor.tableRow >= 0 && tbl.table && editor.tableRow < tbl.table.rows.length - 1) {
                            editor.tableRow++;
                        } else {
                            editor.tableRow = -1;
                            const newLine = nextLineNumber(editor.cursorLine);
                            editor.setCursor(newLine, editor.cursorCol);
                            scrollCursorIntoView();
                        }
                    }
                },
                description: 'Move cursor down'
            }),
            register({
                key: 'ArrowRight',
                handler: () => {
                    if (editor.editMode || tools.isActive('commandPalette')) return false;
                    const tbl = currentTableLine();
                    if (tbl && tbl.table && editor.tableRow < 0) {
                        editor.tableRow = 0;
                    }
                },
                description: 'Enter table'
            }),
            register({
                key: 'ArrowLeft',
                handler: () => {
                    if (editor.editMode || tools.isActive('commandPalette')) return false;
                    if (editor.tableRow >= 0) {
                        editor.tableRow = -1;
                    }
                },
                description: 'Exit table'
            }),
            register({
                key: 'ArrowUp',
                ctrl: true,
                handler: () => {
                    if (tools.isActive('spotlight')) tools.adjustSpotlight('up');
                },
                description: 'Expand spotlight up'
            }),
            register({
                key: 'ArrowDown',
                ctrl: true,
                handler: () => {
                    if (tools.isActive('spotlight')) tools.adjustSpotlight('down');
                },
                description: 'Expand spotlight down'
            }),
            register({
                key: 'k',
                ctrl: true,
                handler: () => tools.toggle('commandPalette'),
                description: 'Toggle command palette'
            }),
            register({
                key: 'f',
                ctrl: true,
                shift: true,
                handler: () => tools.toggle('filter'),
                description: 'Toggle filter sidebar'
            }),
            register({
                key: 'z',
                ctrl: true,
                shift: true,
                handler: () => tools.toggle('zenMode'),
                description: 'Toggle zen mode'
            }),
            register({
                key: 'g',
                ctrl: true,
                shift: true,
                handler: () => {
                    tools.toggle('gitPanel');
                    if (tools.isActive('gitPanel')) {
                        git.refresh();
                        refreshGitLog();
                    }
                },
                description: 'Toggle git panel'
            }),
            register({
                key: 'm',
                ctrl: true,
                handler: () => {
                    const file = editor.activeFile;
                    if (file) editor.toggleMark(file.path, editor.cursorLine);
                },
                description: 'Toggle mark on current line'
            }),
            register({
                key: "'",
                ctrl: true,
                handler: () => {
                    const file = editor.activeFile;
                    if (file) {
                        const next = editor.nextMark(file.path);
                        if (next !== null) editor.setCursor(next, 1);
                    }
                },
                description: 'Jump to next mark'
            }),
            register({
                key: "'",
                ctrl: true,
                shift: true,
                handler: () => {
                    const file = editor.activeFile;
                    if (file) {
                        const prev = editor.prevMark(file.path);
                        if (prev !== null) editor.setCursor(prev, 1);
                    }
                },
                description: 'Jump to previous mark'
            }),
            register({
                key: '\\',
                ctrl: true,
                handler: () => {
                    if (tools.isActive('splitView')) {
                        tools.dismiss('splitView');
                        editor.setSplit(null);
                    } else {
                        const nextIndex = (editor.activeIndex + 1) % editor.files.length;
                        if (editor.files.length > 1) {
                            editor.setSplit(nextIndex);
                            tools.toggle('splitView');
                        }
                    }
                },
                description: 'Toggle split view'
            }),
            register({
                key: '/',
                ctrl: true,
                handler: () => tools.toggle('shortcutHelp'),
                description: 'Show keyboard shortcuts'
            })
        ];
        const cmdUnsubs = [
            registerCommand({ id: 'toggle-file-tree', label: 'Toggle File Tree', description: 'Show/hide file sidebar', shortcut: 'Ctrl+B', handler: () => tools.toggle('fileTree') }),
            registerCommand({ id: 'toggle-spotlight', label: 'Toggle Spotlight', description: 'Focus window around cursor', shortcut: 'Ctrl+Shift+S', handler: () => tools.toggle('spotlight') }),
            registerCommand({ id: 'toggle-select-line', label: 'Toggle Select-Line', description: 'Highlight current line', shortcut: 'Ctrl+L', handler: () => tools.toggle('selectLine') }),
            registerCommand({ id: 'toggle-line-numbers', label: 'Toggle Line Numbers', description: 'Show/hide gutter', shortcut: 'Ctrl+G', handler: () => tools.toggle('lineNumbers') }),
            registerCommand({ id: 'toggle-zen', label: 'Toggle Zen Mode', description: 'Fullscreen focus', shortcut: 'Ctrl+Shift+Z', handler: () => tools.toggle('zenMode') }),
            registerCommand({ id: 'toggle-filter', label: 'Toggle Filter', description: 'Section filter sidebar', shortcut: 'Ctrl+Shift+F', handler: () => tools.toggle('filter') }),
            registerCommand({ id: 'toggle-git', label: 'Toggle Git Panel', description: 'Commit, push, pull', shortcut: 'Ctrl+Shift+G', handler: () => tools.toggle('gitPanel') }),
            registerCommand({ id: 'toggle-edit', label: 'Toggle Edit Mode', description: 'Switch view/edit', shortcut: 'Ctrl+E', handler: () => editor.toggleEdit() }),
            registerCommand({ id: 'save', label: 'Save File', description: 'Save current file', shortcut: 'Ctrl+S', handler: () => saveFile() }),
            registerCommand({ id: 'export-preview', label: 'Export Preview', description: 'Show export preview', handler: () => tools.toggle('exportPreview') }),
            registerCommand({ id: 'export-pdf', label: 'Export PDF', description: 'Export current file as PDF', handler: async () => {
                const file = editor.activeFile;
                if (!file) return;
                const res = await fetch('/api/export/pdf', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ path: file.path, template: 'professional' })
                });
                if (res.ok) {
                    const blob = await res.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = file.path.replace('.md', '.pdf');
                    a.click();
                    URL.revokeObjectURL(url);
                }
            } }),
            registerCommand({ id: 'export-word', label: 'Export Word', description: 'Export current file as Word', handler: async () => {
                const file = editor.activeFile;
                if (!file) return;
                const res = await fetch('/api/export/docx', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ path: file.path, template: 'professional' })
                });
                if (res.ok) {
                    const blob = await res.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = file.path.replace('.md', '.docx');
                    a.click();
                    URL.revokeObjectURL(url);
                }
            } }),
            registerCommand({ id: 'super-dark', label: 'Super Dark', description: 'Toggle pure black background', handler: () => {
                document.documentElement.classList.toggle('super-dark');
            } }),
            registerCommand({ id: NEW_FILE_COMMAND_ID, label: 'New File', description: 'Create a new markdown file', handler: () => {} })
        ];
        return () => {
            cleanupAutosave();
            clearInterval(gitInterval);
            unsubs.forEach((fn) => fn());
            cmdUnsubs.forEach((fn) => fn());
        };
    });
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="editor">
    <TabBar />
    <div class="main-area">
    {#if tools.isActive('fileTree') && !tools.isActive('zenMode')}
        <FileTree
            activePath={editor.activeFile?.path ?? ''}
            onselect={(path, name) => openFile(path, name)}
            onclose={() => tools.dismiss('fileTree')}
            oncreate={async (path, name) => {
                await openFile(path, name);
                if (!editor.editMode) editor.toggleEdit();
            }}
        />
    {/if}
    <div class="body">
        {#if editor.activeFile}
            {#if editor.editMode}
                <EditableArea
                    content={editor.activeFile.content}
                    onchange={handleContentChange}
                />
            {:else}
                {#if tools.isActive('zenMode')}
                    <ZenMode>
                        <div class="content" onclick={(e) => {
                            const lineEl = (e.target as HTMLElement).closest('[data-linenum]');
                            if (lineEl) {
                                const num = parseInt((lineEl as HTMLElement).dataset.linenum || '1');
                                editor.setCursor(num, 1);
                            }
                        }}>
                            {#each filteredLines as line, i (line.number > 0 ? line.number : `collapsed-${i}`)}
                                <Line
                                    {line}
                                    {showLineNumbers}
                                    isCurrent={line.number === editor.cursorLine}
                                    spotlight={tools.isActive('spotlight')}
                                    spotlightAbove={tools.spotlightAbove}
                                    spotlightBelow={tools.spotlightBelow}
                                    cursorLine={editor.cursorLine}
                                    selectLine={tools.isActive('selectLine') ? tools.selectLineVariant : 'off'}
                                    marked={editor.activeFile ? editor.getMarks(editor.activeFile.path).includes(line.number) : false}
                                    activeTableRow={line.number === editor.cursorLine ? editor.tableRow : -1}
                                />
                            {/each}
                        </div>
                    </ZenMode>
                {:else}
                    {#if tools.isActive('splitView') && editor.splitFile}
                        <SplitView>
                            {#snippet leftContent()}
                                <div class="content" onclick={(e) => {
                                    const lineEl = (e.target as HTMLElement).closest('[data-linenum]');
                                    if (lineEl) {
                                        const num = parseInt((lineEl as HTMLElement).dataset.linenum || '1');
                                        editor.setCursor(num, 1);
                                    }
                                }}>
                                    {#each filteredLines as line, i (line.number > 0 ? line.number : `collapsed-${i}`)}
                                        <Line
                                            {line}
                                            {showLineNumbers}
                                            isCurrent={line.number === editor.cursorLine}
                                            spotlight={tools.isActive('spotlight')}
                                            spotlightAbove={tools.spotlightAbove}
                                            spotlightBelow={tools.spotlightBelow}
                                            cursorLine={editor.cursorLine}
                                            selectLine={tools.isActive('selectLine') ? tools.selectLineVariant : 'off'}
                                            marked={editor.activeFile ? editor.getMarks(editor.activeFile.path).includes(line.number) : false}
                                        />
                                    {/each}
                                </div>
                            {/snippet}
                            {#snippet rightContent()}
                                <div class="content">
                                    {#each parseLines(editor.splitFile.content) as line (line.number)}
                                        <Line {line} {showLineNumbers} />
                                    {/each}
                                </div>
                            {/snippet}
                        </SplitView>
                    {:else}
                        <div class="content" onclick={(e) => {
                            const lineEl = (e.target as HTMLElement).closest('[data-linenum]');
                            if (lineEl) {
                                const num = parseInt((lineEl as HTMLElement).dataset.linenum || '1');
                                editor.setCursor(num, 1);
                            }
                        }}>
                            {#each filteredLines as line, i (line.number > 0 ? line.number : `collapsed-${i}`)}
                                <Line
                                    {line}
                                    {showLineNumbers}
                                    isCurrent={line.number === editor.cursorLine}
                                    spotlight={tools.isActive('spotlight')}
                                    spotlightAbove={tools.spotlightAbove}
                                    spotlightBelow={tools.spotlightBelow}
                                    cursorLine={editor.cursorLine}
                                    selectLine={tools.isActive('selectLine') ? tools.selectLineVariant : 'off'}
                                    marked={editor.activeFile ? editor.getMarks(editor.activeFile.path).includes(line.number) : false}
                                    activeTableRow={line.number === editor.cursorLine ? editor.tableRow : -1}
                                />
                            {/each}
                        </div>
                    {/if}
                {/if}
            {/if}
        {:else}
            <div class="empty">
                <p class="title">Lucerna</p>
                <p class="subtitle">Open a file from the sidebar</p>
            </div>
        {/if}
    </div>
    </div>
    <StatusBar />
    {#if tools.isActive('filter') && editor.activeFile}
        <FilterSidebar
            {lines}
            checkedSections={editor.getChecked(editor.activeFile.path)}
            ontoggle={(lineNumber) => editor.toggleSection(editor.activeFile!.path, lineNumber)}
            onclose={() => tools.dismiss('filter')}
        />
    {/if}
    {#if tools.isActive('gitPanel')}
        <GitPanel
            modified={git.modified}
            log={gitLog}
            oncommit={async (message) => {
                await fetch('/api/git/commit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message })
                });
                await git.refresh();
                await refreshGitLog();
            }}
            onpush={async () => {
                await fetch('/api/git/push', { method: 'POST' });
                await git.refresh();
            }}
            onpull={async () => {
                await fetch('/api/git/pull', { method: 'POST' });
                await git.refresh();
            }}
            onclose={() => tools.dismiss('gitPanel')}
        />
    {/if}
    {#if tools.isActive('exportPreview') && editor.activeFile}
        <ExportPreview
            lines={lines}
            filePath={editor.activeFile.path}
            onclose={() => tools.dismiss('exportPreview')}
        />
    {/if}
    {#if tools.isActive('commandPalette')}
        <CommandPalette
            onclose={() => tools.dismiss('commandPalette')}
            oncreate={(filename) => createFile(activeFileDir(), filename)}
        />
    {/if}
    {#if tools.isActive('shortcutHelp')}
        <ShortcutHelp onclose={() => tools.dismiss('shortcutHelp')} />
    {/if}
    {#if tools.isActive('spotlightSettings')}
        <SpotlightSettings onclose={() => tools.dismiss('spotlightSettings')} />
    {/if}
</div>

<style>
    .editor {
        display: flex;
        flex-direction: column;
        height: 100vh;
        background: var(--canvas);
    }
    .main-area {
        flex: 1;
        display: flex;
        overflow: hidden;
    }
    .body {
        flex: 1;
        overflow-y: auto;
        padding: var(--space-md) var(--space-lg);
        display: flex;
    }
    .content { max-width: 80ch; flex: 1; }
    .empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        flex: 1;
        gap: var(--space-sm);
    }
    .title {
        font-family: var(--font-heading);
        font-size: 24px;
        font-weight: 700;
        color: var(--accent);
    }
    .subtitle {
        font-family: var(--font-body);
        font-size: 16px;
        color: var(--muted);
        margin-bottom: var(--space-lg);
    }

</style>
