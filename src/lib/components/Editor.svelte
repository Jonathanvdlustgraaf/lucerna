<script lang="ts">
    import TabBar from './TabBar.svelte';
    import StatusBar from './StatusBar.svelte';
    import CommandPalette from './CommandPalette.svelte';
    import Line from './Line.svelte';
    import EditableArea from './EditableArea.svelte';
    import { editor } from '$lib/stores/editor.svelte';
    import { tools } from '$lib/stores/tools.svelte';
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
        }
    }

    function handleContentChange(value: string) {
        editor.updateContent(value);
        triggerAutosave();
    }

    let markdownFiles = $derived(fileTree.filter((f) => f.type === 'file'));

    onMount(() => {
        const cleanupAutosave = setupAutosave(saveFile);
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
            })
        ];
        return () => {
            cleanupAutosave();
            unsubs.forEach((fn) => fn());
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
                <div class="content" onclick={(e) => {
                    const lineEl = (e.target as HTMLElement).closest('[data-linenum]');
                    if (lineEl) {
                        const num = parseInt((lineEl as HTMLElement).dataset.linenum || '1');
                        editor.setCursor(num, 1);
                    }
                }}>
                    {#each lines as line (line.number)}
                        <Line
                            {line}
                            {showLineNumbers}
                            isCurrent={line.number === editor.cursorLine}
                            spotlight={tools.isActive('spotlight')}
                            spotlightAbove={tools.spotlightAbove}
                            spotlightBelow={tools.spotlightBelow}
                            cursorLine={editor.cursorLine}
                            selectLine={tools.isActive('selectLine') ? tools.selectLineVariant : 'off'}
                        />
                    {/each}
                </div>
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
