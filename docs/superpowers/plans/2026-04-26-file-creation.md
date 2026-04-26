# File Creation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users create a new `.md` file from the FileTree sidebar (inline input) or Command Palette (filename sub-mode), with the file opening immediately in edit mode.

**Architecture:** No backend changes are needed — the existing `PUT /api/files/[...path]` endpoint already creates files via `writeFile`. Each entry point (FileTree, CommandPalette) collects a filename and passes it up to Editor.svelte via an `oncreate` callback. Editor.svelte performs the PUT, opens the file, and activates edit mode.

**Tech Stack:** SvelteKit 5 (Svelte runes: `$state`, `$props`, `$derived`), TypeScript, Vitest

---

## File Structure

| File | Change |
|---|---|
| `src/lib/components/FileTree.svelte` | Add `oncreate` prop, `creatingFile` state, `+` button, inline input |
| `src/lib/components/CommandPalette.svelte` | Add `oncreate` prop, `mode` state (`'search'` \| `'newFile'`), filename input sub-mode |
| `src/lib/components/Editor.svelte` | Add `createFile` function, `oncreate` handlers, register `new-file` command |

---

## Task 1: FileTree — inline file creation

**Files:**
- Modify: `src/lib/components/FileTree.svelte`

### Context

The FileTree browse-mode header currently has a `..` nav button, a path input, and a close button. We add a `+` button that triggers an inline filename input at the top of the file list. On confirm the parent is called via `oncreate(fullPath, name)`.

The component currently has this prop interface:

```ts
let {
    activePath = '',
    onselect,
    onclose
}: {
    activePath: string;
    onselect: (path: string, name: string) => void;
    onclose: () => void;
} = $props();
```

- [ ] **Step 1: Add `oncreate` prop and `creatingFile` state**

In `FileTree.svelte`, extend the props interface and add local state (place after the existing `let errorMsg = $state('')` line, around line 27):

```svelte
<script lang="ts">
    import { onMount } from 'svelte';

    interface BrowseEntry {
        path: string;
        name: string;
        type: 'file' | 'directory';
    }

    let {
        activePath = '',
        onselect,
        onclose,
        oncreate
    }: {
        activePath: string;
        onselect: (path: string, name: string) => void;
        onclose: () => void;
        oncreate: (path: string, name: string) => void;
    } = $props();

    let mode = $state<'browse' | 'search'>('browse');

    // Browse state
    let currentPath = $state('/home');
    let pathInput = $state('/home');
    let entries = $state<BrowseEntry[]>([]);
    let loading = $state(false);
    let errorMsg = $state('');

    // New file creation state
    let creatingFile = $state(false);
    let newFileName = $state('');
    let newFileInput = $state<HTMLInputElement | null>(null);
    let createError = $state('');
```

- [ ] **Step 2: Add `startCreate`, `confirmCreate`, and `cancelCreate` functions**

Add these functions after the existing `switchMode` function (around line 133):

```ts
function startCreate() {
    creatingFile = true;
    newFileName = '';
    createError = '';
    requestAnimationFrame(() => newFileInput?.focus());
}

function cancelCreate() {
    creatingFile = false;
    newFileName = '';
    createError = '';
}

async function confirmCreate() {
    const raw = newFileName.trim();
    if (!raw) return;
    const name = raw.endsWith('.md') ? raw : `${raw}.md`;
    const fullPath = `${currentPath}/${name}`;

    try {
        const res = await fetch(`/api/files/${encodeURIComponent(fullPath)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: '' })
        });
        if (!res.ok) {
            createError = 'Could not create file';
            return;
        }
        creatingFile = false;
        newFileName = '';
        createError = '';
        await browse(currentPath);
        oncreate(fullPath, name);
    } catch {
        createError = 'Could not create file';
    }
}

function handleNewFileKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        confirmCreate();
    } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        cancelCreate();
    }
}
```

- [ ] **Step 3: Add the `+` button to the browse-mode header**

In the template, find the browse-mode header block (around line 150). Replace:

```svelte
    {#if mode === 'browse'}
        <div class="header">
            <button class="nav-btn" onclick={goUp} title="Go up one level">..</button>
            <input
                class="path-input"
                type="text"
                bind:value={pathInput}
                onkeydown={handlePathKeydown}
                spellcheck="false"
            />
        </div>
```

With:

```svelte
    {#if mode === 'browse'}
        <div class="header">
            <button class="nav-btn" onclick={goUp} title="Go up one level">..</button>
            <input
                class="path-input"
                type="text"
                bind:value={pathInput}
                onkeydown={handlePathKeydown}
                spellcheck="false"
            />
            <button class="nav-btn" onclick={startCreate} title="New file">+</button>
        </div>
```

- [ ] **Step 4: Add the inline creation input to the file list**

In the template, find the browse-mode `<nav class="tree">` block (around line 160). Add the inline input at the top, inside the `{:else}` branch (after `entries.length === 0` check):

```svelte
        <nav class="tree">
            {#if loading}
                <div class="status">Loading...</div>
            {:else if errorMsg}
                <div class="status error">{errorMsg}</div>
            {:else if entries.length === 0 && !creatingFile}
                <div class="status">Empty directory</div>
            {:else}
                {#if creatingFile}
                    <div class="create-row">
                        <span class="tree-icon file-icon">-</span>
                        <input
                            bind:this={newFileInput}
                            class="create-input"
                            type="text"
                            bind:value={newFileName}
                            onkeydown={handleNewFileKeydown}
                            placeholder="filename.md"
                            spellcheck="false"
                        />
                    </div>
                    {#if createError}
                        <div class="status error">{createError}</div>
                    {/if}
                {/if}
                {#each entries as entry}
```

Also close the `{/if}` for `creatingFile` before the `{/each}` closing. The full updated block:

```svelte
        <nav class="tree">
            {#if loading}
                <div class="status">Loading...</div>
            {:else if errorMsg}
                <div class="status error">{errorMsg}</div>
            {:else if entries.length === 0 && !creatingFile}
                <div class="status">Empty directory</div>
            {:else}
                {#if creatingFile}
                    <div class="create-row">
                        <span class="tree-icon file-icon">-</span>
                        <input
                            bind:this={newFileInput}
                            class="create-input"
                            type="text"
                            bind:value={newFileName}
                            onkeydown={handleNewFileKeydown}
                            placeholder="filename.md"
                            spellcheck="false"
                        />
                    </div>
                    {#if createError}
                        <div class="status error">{createError}</div>
                    {/if}
                {/if}
                {#each entries as entry}
                    {#if entry.type === 'directory'}
                        <button
                            class="tree-item tree-dir"
                            onclick={() => browse(entry.path)}
                        >
                            <span class="tree-icon">▸</span>
                            <span class="tree-name">{entry.name}</span>
                        </button>
                    {:else}
                        <button
                            class="tree-item tree-file"
                            class:active={entry.path === activePath}
                            onclick={() => onselect(entry.path, entry.name)}
                        >
                            <span class="tree-icon file-icon">-</span>
                            <span class="tree-name">{entry.name}</span>
                        </button>
                    {/if}
                {/each}
            {/if}
        </nav>
```

- [ ] **Step 5: Add styles for the inline creation input**

In the `<style>` block, add after the `.tree-file .file-icon` rule:

```css
    .create-row {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 4px 12px;
    }

    .create-input {
        flex: 1;
        min-width: 0;
        background: none;
        border: 1px solid var(--accent);
        border-radius: 4px;
        color: var(--text);
        font-family: var(--font-mono);
        font-size: 13px;
        padding: 2px 6px;
        outline: none;
    }

    .create-input::placeholder {
        color: var(--muted);
    }
```

- [ ] **Step 6: Manual verification**

Start the dev server (`npm run dev`). Open the FileTree (`Ctrl+B`). Navigate to a directory. Click `+`. Verify:
- Inline input appears at top of file list, auto-focused.
- Type `test-note`, press Enter.
- File `test-note.md` appears in the tree.
- File opens in editor with edit mode active.
- Press Escape in the input cancels creation with no file created.
- `.md` is appended if omitted; typing `test-note.md` directly also works.

- [ ] **Step 7: Commit**

```bash
git add src/lib/components/FileTree.svelte
git commit -m "feat: add inline file creation to FileTree"
```

---

## Task 2: CommandPalette — newFile mode

**Files:**
- Modify: `src/lib/components/CommandPalette.svelte`

### Context

The palette currently has two states: open (showing results) or closed. We add a third mode `'newFile'` where the input clears and shows `Enter filename...`. When the `new-file` command is selected via Enter (or click), instead of closing the palette, it switches to `newFile` mode. On Enter in that mode, it calls `oncreate(filename)` and closes.

- [ ] **Step 1: Add `oncreate` prop and `mode` state**

Replace the top of the `<script>` in `CommandPalette.svelte`:

```svelte
<script lang="ts">
    import { searchCommands } from '$lib/services/commands';
    import { onMount } from 'svelte';

    let { onclose, oncreate }: {
        onclose: () => void;
        oncreate: (filename: string) => void;
    } = $props();

    let query = $state('');
    let activeIndex = $state(0);
    let mode = $state<'search' | 'newFile'>('search');
    let newFileName = $state('');
    let newFileInput = $state<HTMLInputElement | null>(null);
    let results = $derived(searchCommands(query));
    let inputEl: HTMLInputElement;
```

- [ ] **Step 2: Update `handleKeydown` to intercept `new-file` and handle `newFile` mode**

Replace the existing `handleKeydown` function:

```ts
    function handleKeydown(e: KeyboardEvent) {
        if (mode === 'newFile') {
            if (e.key === 'Enter') {
                e.preventDefault();
                const raw = newFileName.trim();
                if (!raw) return;
                const name = raw.endsWith('.md') ? raw : `${raw}.md`;
                oncreate(name);
                onclose();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                mode = 'search';
                query = '';
                requestAnimationFrame(() => inputEl?.focus());
            }
            return;
        }

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            e.stopPropagation();
            activeIndex = Math.min(activeIndex + 1, results.length - 1);
            scrollActiveIntoView();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            e.stopPropagation();
            activeIndex = Math.max(activeIndex - 1, 0);
            scrollActiveIntoView();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const selected = results[activeIndex];
            if (!selected) return;
            if (selected.id === 'new-file') {
                mode = 'newFile';
                newFileName = '';
                requestAnimationFrame(() => newFileInput?.focus());
            } else {
                selected.handler();
                onclose();
            }
        } else if (e.key === 'Escape') {
            e.preventDefault();
            onclose();
        }
    }
```

- [ ] **Step 3: Update the click handler on result items to also intercept `new-file`**

Find the `onclick` on the `<li>` element (around line 91) and replace:

```svelte
                        onclick={() => { result.handler(); onclose(); }}
```

With:

```svelte
                        onclick={() => {
                            if (result.id === 'new-file') {
                                mode = 'newFile';
                                newFileName = '';
                                requestAnimationFrame(() => newFileInput?.focus());
                            } else {
                                result.handler();
                                onclose();
                            }
                        }}
```

- [ ] **Step 4: Add the `newFile` mode UI to the template**

The palette template currently has a single `.input-row`. Replace the entire `<div class="palette">` contents so that the input row and results list are conditional on `mode`:

```svelte
    <div class="palette" role="dialog" aria-modal="true" aria-label="Command Palette" onclick={(e) => e.stopPropagation()} onkeydown={handleKeydown}>
        {#if mode === 'search'}
            <div class="input-row">
                <span class="caret" aria-hidden="true">&gt;</span>
                <input
                    bind:this={inputEl}
                    bind:value={query}
                    type="text"
                    placeholder="Type a command..."
                    autocomplete="off"
                    spellcheck="false"
                />
            </div>
            {#if results.length > 0}
                <ul class="results" role="listbox">
                    {#each results as result, i}
                        <!-- svelte-ignore a11y_click_events_have_key_events -->
                        <li
                            role="option"
                            aria-selected={i === activeIndex}
                            class:active={i === activeIndex}
                            onclick={() => {
                                if (result.id === 'new-file') {
                                    mode = 'newFile';
                                    newFileName = '';
                                    requestAnimationFrame(() => newFileInput?.focus());
                                } else {
                                    result.handler();
                                    onclose();
                                }
                            }}
                        >
                            <span class="label">
                                {#each highlightMatch(result.label, query) as segment}
                                    {#if segment.matched}
                                        <span class="match">{segment.char}</span>
                                    {:else}
                                        {segment.char}
                                    {/if}
                                {/each}
                            </span>
                            {#if result.description}
                                <span class="description">{result.description}</span>
                            {/if}
                            {#if result.shortcut}
                                <span class="shortcut">{result.shortcut}</span>
                            {/if}
                        </li>
                    {/each}
                </ul>
            {/if}
        {:else}
            <div class="input-row">
                <span class="caret" aria-hidden="true">+</span>
                <input
                    bind:this={newFileInput}
                    bind:value={newFileName}
                    type="text"
                    placeholder="Enter filename..."
                    autocomplete="off"
                    spellcheck="false"
                />
            </div>
            <div class="new-file-hint">Press Enter to create · Escape to go back</div>
        {/if}
    </div>
```

- [ ] **Step 5: Add style for the hint line**

Add to the `<style>` block:

```css
    .new-file-hint {
        padding: var(--space-sm) var(--space-md);
        font-family: var(--font-mono);
        font-size: 11px;
        color: var(--muted);
        border-top: 1px solid var(--border);
    }
```

- [ ] **Step 6: Manual verification (partial — command not wired yet)**

The palette won't show "New File" yet (command registered in Task 3). Skip full test until Task 3 is done.

- [ ] **Step 7: Commit**

```bash
git add src/lib/components/CommandPalette.svelte
git commit -m "feat: add newFile mode to CommandPalette"
```

---

## Task 3: Editor — wire creation handlers and register command

**Files:**
- Modify: `src/lib/components/Editor.svelte`

### Context

Editor.svelte is the orchestrator. It already has `openFile` (fetches and opens a file in the editor) and `saveFile`. We add `createFile(dirPath, filename)` which PUTs empty content, then calls `openFile`, then calls `editor.toggleEdit()` to activate edit mode.

The `new-file` command is registered here (like the other commands in `onMount`). Its handler is a no-op — the CommandPalette intercepts the id directly and switches to `newFile` mode without calling the handler.

The `FileTree` usage in the template gets an `oncreate` prop.  
The `CommandPalette` usage in the template gets an `oncreate` prop.

- [ ] **Step 1: Add `createFile` function**

In `Editor.svelte`, add `createFile` after the `saveFile` function (around line 116):

```ts
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
```

Note: `openFile` already handles the case where the file is already open (it just switches to it). After `createFile` calls `openFile`, the new empty file is the active file. Then `editor.toggleEdit()` activates edit mode only if it wasn't already on.

- [ ] **Step 2: Add a helper to get the target directory for the Command Palette**

Add this helper after `createFile`:

```ts
    function activeFileDir(): string {
        const path = editor.activeFile?.path;
        if (!path) return '/home';
        return path.replace(/\/[^/]+$/, '') || '/home';
    }
```

- [ ] **Step 3: Register the `new-file` command**

In the `onMount` block, inside the `cmdUnsubs` array (after the `super-dark` command around line 442), add:

```ts
            registerCommand({ id: 'new-file', label: 'New File', description: 'Create a new markdown file', handler: () => {} }),
```

- [ ] **Step 4: Wire `oncreate` on FileTree**

In the template, find the `<FileTree>` usage (around line 458):

```svelte
        <FileTree
            activePath={editor.activeFile?.path ?? ''}
            onselect={(path, name) => openFile(path, name)}
            onclose={() => tools.dismiss('fileTree')}
        />
```

Replace with:

```svelte
        <FileTree
            activePath={editor.activeFile?.path ?? ''}
            onselect={(path, name) => openFile(path, name)}
            onclose={() => tools.dismiss('fileTree')}
            oncreate={(path, name) => openFile(path, name).then(() => { if (!editor.editMode) editor.toggleEdit(); })}
        />
```

Note: FileTree's `confirmCreate` already does the PUT itself and calls `browse` to refresh. It then calls `oncreate(fullPath, name)`. So `oncreate` in Editor only needs to open and activate edit mode — no need to call `createFile` here.

- [ ] **Step 5: Wire `oncreate` on CommandPalette**

In the template, find the `<CommandPalette>` usage (around line 606):

```svelte
    {#if tools.isActive('commandPalette')}
        <CommandPalette onclose={() => tools.dismiss('commandPalette')} />
    {/if}
```

Replace with:

```svelte
    {#if tools.isActive('commandPalette')}
        <CommandPalette
            onclose={() => tools.dismiss('commandPalette')}
            oncreate={(filename) => createFile(activeFileDir(), filename)}
        />
    {/if}
```

- [ ] **Step 6: Full manual verification**

Start the dev server (`npm run dev`).

**FileTree flow:**
1. Press `Ctrl+B` to open the FileTree.
2. Navigate to a directory.
3. Click `+`.
4. Inline input appears, focused. Type `my-note`, press Enter.
5. `my-note.md` appears in the tree, opens in the editor, edit mode is on (cursor visible in textarea).
6. Press `Ctrl+B` again, click `+`, type a name, press Escape — nothing is created, input disappears.
7. Type `already-has-extension.md` — file created as `already-has-extension.md` (not double-extension).

**Command Palette flow:**
1. Press `Ctrl+K` to open the palette.
2. Type `new` — "New File" appears in results.
3. Press Enter — palette switches to filename input mode, caret shows `+`, placeholder says `Enter filename...`.
4. Type `from-palette`, press Enter.
5. File `from-palette.md` is created in the same directory as the currently open file, opens, edit mode activates.
6. Open palette with no file open → file is created in `/home`.
7. Press Escape in filename mode → returns to normal command search.

- [ ] **Step 7: Commit**

```bash
git add src/lib/components/Editor.svelte
git commit -m "feat: wire file creation in Editor, register new-file command"
```
