<script lang="ts">
    import TabBar from './TabBar.svelte';
    import StatusBar from './StatusBar.svelte';
    import CommandPalette from './CommandPalette.svelte';
    import FilterSidebar from './FilterSidebar.svelte';
    import GitPanel from './GitPanel.svelte';
    import Line from './Line.svelte';
    import EditableArea from './EditableArea.svelte';
    import ZenMode from './ZenMode.svelte';
    import { editor } from '$lib/stores/editor.svelte';
    import { tools } from '$lib/stores/tools.svelte';
    import { git } from '$lib/stores/git.svelte';
    import { register, handleKeydown } from '$lib/services/keyboard';
    import { registerCommand } from '$lib/services/commands';
    import { setupAutosave, triggerAutosave } from '$lib/services/autosave';
    import { parseLines } from '$lib/services/markdown';
    import type { ParsedLine } from '$lib/services/markdown';
    import { onMount } from 'svelte';

    interface FileTreeEntry {
        path: string;
        name: string;
        type: 'file' | 'directory';
    }

    let { fileTree = [] }: { fileTree: FileTreeEntry[] } = $props();

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

    function handleContentChange(value: string) {
        editor.updateContent(value);
        triggerAutosave();
    }

    let markdownFiles = $derived(fileTree.filter((f) => f.type === 'file'));

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
                handler: () => tools.toggle('spotlight'),
                description: 'Toggle spotlight'
            }),
            register({
                key: 'l',
                ctrl: true,
                handler: () => tools.toggle('selectLine'),
                description: 'Toggle select-line cursor'
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
            })
        ];
        const cmdUnsubs = [
            registerCommand({ id: 'toggle-spotlight', label: 'Toggle Spotlight', description: 'Focus window around cursor', shortcut: 'Ctrl+Shift+S', handler: () => tools.toggle('spotlight') }),
            registerCommand({ id: 'toggle-select-line', label: 'Toggle Select-Line', description: 'Highlight current line', shortcut: 'Ctrl+L', handler: () => tools.toggle('selectLine') }),
            registerCommand({ id: 'toggle-line-numbers', label: 'Toggle Line Numbers', description: 'Show/hide gutter', shortcut: 'Ctrl+G', handler: () => tools.toggle('lineNumbers') }),
            registerCommand({ id: 'toggle-zen', label: 'Toggle Zen Mode', description: 'Fullscreen focus', shortcut: 'Ctrl+Shift+Z', handler: () => tools.toggle('zenMode') }),
            registerCommand({ id: 'toggle-filter', label: 'Toggle Filter', description: 'Section filter sidebar', shortcut: 'Ctrl+Shift+F', handler: () => tools.toggle('filter') }),
            registerCommand({ id: 'toggle-git', label: 'Toggle Git Panel', description: 'Commit, push, pull', shortcut: 'Ctrl+Shift+G', handler: () => tools.toggle('gitPanel') }),
            registerCommand({ id: 'toggle-edit', label: 'Toggle Edit Mode', description: 'Switch view/edit', shortcut: 'Ctrl+E', handler: () => editor.toggleEdit() }),
            registerCommand({ id: 'save', label: 'Save File', description: 'Save current file', shortcut: 'Ctrl+S', handler: () => saveFile() })
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
                                />
                            {/each}
                        </div>
                    </ZenMode>
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
                            />
                        {/each}
                    </div>
                {/if}
            {/if}
        {:else}
            <div class="empty">
                <p class="title">Lucerna</p>
                <p class="subtitle">Open a file to start editing</p>
                {#if markdownFiles.length > 0}
                    <div class="file-list">
                        {#each markdownFiles as file}
                            <button class="file-item" onclick={() => openFile(file.path, file.name)}>
                                {file.path}
                            </button>
                        {/each}
                    </div>
                {/if}
            </div>
        {/if}
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
    {#if tools.isActive('commandPalette')}
        <CommandPalette onclose={() => tools.dismiss('commandPalette')} />
    {/if}
</div>

<style>
    .editor {
        display: flex;
        flex-direction: column;
        height: 100vh;
        background: var(--canvas);
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
    .file-list {
        display: flex;
        flex-direction: column;
        gap: var(--space-xs);
        max-width: 400px;
        width: 100%;
    }
    .file-item {
        background: none;
        border: 1px solid var(--border);
        border-radius: var(--radius);
        color: var(--text);
        font-family: var(--font-mono);
        font-size: 13px;
        padding: var(--space-sm) var(--space-md);
        cursor: pointer;
        text-align: left;
        transition: all 150ms ease-out;
    }
    .file-item:hover {
        background: var(--surface);
        border-color: var(--accent);
        color: var(--accent);
    }
</style>
