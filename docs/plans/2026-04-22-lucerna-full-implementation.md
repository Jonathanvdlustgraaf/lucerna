# Lucerna Full Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build every feature in the Lucerna architecture spec, from the current read-only scaffold to a fully functional git-native markdown editor with spotlight, command palette, filter, zen mode, splits, git panel, and export.

**Architecture:** SvelteKit monolith with Svelte 5 runes ($state, $derived, $props). Components in src/lib/components/, stores in src/lib/stores/, services in src/lib/services/, server logic in src/lib/server/, API routes in src/routes/api/. Test repo at ./test-repo/ for development.

**Tech Stack:** SvelteKit, Svelte 5, TypeScript, simple-git, vitest

**Specs:**
- Architecture: `claude-hub/docs/superpowers/specs/2026-04-22-lucerna-architecture.md`
- Design system: `claude-hub/docs/superpowers/specs/2026-04-22-career-lab-editor-design-system.md`
- Claude Design mockups: `~/Downloads/Markdown UI for Career project-2.zip`

**Existing codebase state:** 9 commits, 22 passing tests. Editor shell renders files read-only. File and git server services work. Design tokens complete. Tool store tracks 8 tools but none have UI. Only 1 keyboard shortcut wired (Ctrl+G).

---

## Phase Overview

| Phase | Delivers | Tasks | Depends on |
|---|---|---|---|
| 1 | Core Editing | 1-5 | None |
| 2 | Spotlight + Select-Line | 6-9 | Phase 1 |
| 3 | Command Palette + Shortcuts | 10-13 | Phase 1 |
| 4 | Filter Sidebar + Collapse | 14-17 | Phase 2 |
| 5 | Zen Mode + Marks | 18-21 | Phase 2 |
| 6 | Git Panel + History | 22-27 | Phase 1 |
| 7 | Split View | 28-30 | Phase 2 |
| 8 | Export System | 31-36 | Phase 1 |

---

## Phase 1: Core Editing

Adds the ability to edit markdown files, save them, and see dirty state indicators.

### Task 1: Add edit mode to editor store

**Files:**
- Modify: `src/lib/stores/editor.svelte.ts`

- [ ] **Step 1: Add editing state to EditorState**

Add these fields and methods to the `EditorState` class in `src/lib/stores/editor.svelte.ts`:

```typescript
// Add after cursorCol = $state(1);
editMode = $state(false);

// Add after markClean method
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
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/stores/editor.svelte.ts
git commit -m "feat: add edit mode state and content update to editor store"
```

### Task 2: Create EditableArea component

**Files:**
- Create: `src/lib/components/EditableArea.svelte`

- [ ] **Step 1: Create the EditableArea component**

Create `src/lib/components/EditableArea.svelte`:

```svelte
<script lang="ts">
    let {
        content = '',
        onchange
    }: {
        content: string;
        onchange: (value: string) => void;
    } = $props();

    function handleInput(e: Event) {
        const target = e.target as HTMLTextAreaElement;
        onchange(target.value);
    }
</script>

<div class="editable-area">
    <textarea
        class="editor-textarea"
        value={content}
        oninput={handleInput}
        spellcheck="false"
    ></textarea>
</div>

<style>
    .editable-area {
        flex: 1;
        display: flex;
    }
    .editor-textarea {
        flex: 1;
        background: var(--canvas);
        color: var(--text);
        font-family: var(--font-mono);
        font-size: 14px;
        line-height: 1.75;
        border: none;
        outline: none;
        resize: none;
        padding: 0;
        tab-size: 4;
        white-space: pre-wrap;
        word-wrap: break-word;
    }
    .editor-textarea::selection {
        background: rgba(212, 168, 67, 0.25);
    }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/components/EditableArea.svelte
git commit -m "feat: add EditableArea component with monospace textarea"
```

### Task 3: Wire edit mode into Editor component

**Files:**
- Modify: `src/lib/components/Editor.svelte`

- [ ] **Step 1: Add edit mode toggle and EditableArea to Editor**

Replace the full content of `src/lib/components/Editor.svelte`:

```svelte
<script lang="ts">
    import TabBar from './TabBar.svelte';
    import StatusBar from './StatusBar.svelte';
    import Line from './Line.svelte';
    import EditableArea from './EditableArea.svelte';
    import { editor } from '$lib/stores/editor.svelte';
    import { tools } from '$lib/stores/tools.svelte';
    import { register, handleKeydown } from '$lib/services/keyboard';
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
    }

    let markdownFiles = $derived(fileTree.filter((f) => f.type === 'file'));

    onMount(() => {
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
            })
        ];
        return () => unsubs.forEach((fn) => fn());
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
                <div class="content">
                    {#each lines as line (line.number)}
                        <Line {line} {showLineNumbers} />
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
```

- [ ] **Step 2: Run dev server and verify**

Run: `cd /Users/jonathanvandelustgraaf/Code/lucerna && npm run dev`

Verify:
1. Open a file - renders as markdown (view mode)
2. Press Ctrl+E - switches to raw textarea (edit mode)
3. Type changes - tab shows dirty indicator
4. Press Ctrl+S - saves, dirty indicator clears
5. Press Ctrl+E - back to rendered view with changes applied

- [ ] **Step 3: Commit**

```bash
git add src/lib/components/Editor.svelte
git commit -m "feat: wire edit mode toggle (Ctrl+E) and save (Ctrl+S) into Editor"
```

### Task 4: Update StatusBar to show edit mode

**Files:**
- Modify: `src/lib/components/StatusBar.svelte`

- [ ] **Step 1: Read current StatusBar**

Read `src/lib/components/StatusBar.svelte` to see current implementation.

- [ ] **Step 2: Add edit mode indicator to StatusBar**

The StatusBar should show "VIEW" or "EDIT" in accent color when in the respective mode. Add the editor store import and a mode indicator span between the file path and cursor position. Reference `editor.editMode` to determine which label to show.

- [ ] **Step 3: Commit**

```bash
git add src/lib/components/StatusBar.svelte
git commit -m "feat: show VIEW/EDIT mode indicator in status bar"
```

### Task 5: Add auto-save with debounce

**Files:**
- Create: `src/lib/services/autosave.ts`
- Modify: `src/lib/components/Editor.svelte`

- [ ] **Step 1: Create autosave service**

Create `src/lib/services/autosave.ts`:

```typescript
let timer: ReturnType<typeof setTimeout> | null = null;
let saveFn: (() => Promise<void>) | null = null;

export function setupAutosave(save: () => Promise<void>, delayMs = 2000) {
    saveFn = save;
    return () => {
        if (timer) clearTimeout(timer);
        saveFn = null;
    };
}

export function triggerAutosave() {
    if (!saveFn) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(async () => {
        if (saveFn) await saveFn();
    }, 2000);
}
```

- [ ] **Step 2: Wire autosave into Editor**

In `Editor.svelte`, import `setupAutosave` and `triggerAutosave`. Call `setupAutosave(saveFile)` in `onMount`. In `handleContentChange`, call `triggerAutosave()` after `editor.updateContent(value)`.

- [ ] **Step 3: Verify auto-save works**

Open a file, press Ctrl+E, make changes, wait 2 seconds. Dirty indicator should clear automatically.

- [ ] **Step 4: Commit**

```bash
git add src/lib/services/autosave.ts src/lib/components/Editor.svelte
git commit -m "feat: add auto-save with 2s debounce in edit mode"
```

---

## Phase 2: Spotlight + Select-Line

The hero feature. Adds configurable focus window and current-line highlighting to the Line component.

### Task 6: Add spotlight store state

**Files:**
- Modify: `src/lib/stores/tools.svelte.ts`

- [ ] **Step 1: Add spotlight configuration to ToolsState**

Add spotlight-specific state to `ToolsState`:

```typescript
// Add after the active state
spotlightAbove = $state(3);
spotlightBelow = $state(2);
selectLineVariant = $state<'bright' | 'underline' | 'weight' | 'glow'>('bright');

adjustSpotlight(direction: 'up' | 'down') {
    if (direction === 'up') {
        this.spotlightAbove = Math.min(this.spotlightAbove + 1, 20);
    } else {
        this.spotlightBelow = Math.min(this.spotlightBelow + 1, 20);
    }
}

shrinkSpotlight(direction: 'up' | 'down') {
    if (direction === 'up') {
        this.spotlightAbove = Math.max(this.spotlightAbove - 1, 0);
    } else {
        this.spotlightBelow = Math.max(this.spotlightBelow - 1, 0);
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/stores/tools.svelte.ts
git commit -m "feat: add spotlight config and select-line variant to tools store"
```

### Task 7: Upgrade Line component with spotlight and select-line

**Files:**
- Modify: `src/lib/components/Line.svelte`

- [ ] **Step 1: Rewrite Line.svelte with spotlight effects**

Replace `src/lib/components/Line.svelte` with a version that accepts these additional props:

```typescript
let {
    line,
    showLineNumbers = false,
    isCurrent = false,
    spotlight = false,
    spotlightAbove = 3,
    spotlightBelow = 2,
    cursorLine = 1,
    selectLine = 'off' as 'off' | 'bright' | 'underline' | 'weight' | 'glow'
}: { ... } = $props();
```

Compute opacity based on distance from cursor line:
- If spotlight is off: opacity = 1
- If line is current: opacity = 1
- If inside spotlight window: opacity = 0.9 - (distance / reach) * 0.2 (gradient from 0.9 to 0.7)
- If outside spotlight window: opacity = 0.2

Apply select-line styles to current line only:
- `bright`: no extra style (opacity handles it since neighbors are dimmed)
- `underline`: add 1px amber bottom border at 40% opacity
- `weight`: font-weight 500
- `glow`: background rgba(212, 168, 67, 0.04)

Current line when spotlight is active: add 2px left border in amber at 55% opacity.

Spotlight boundary hairlines: when a line is at the exact boundary (distance === spotlightAbove or distance === spotlightBelow), add a 1px top/bottom border with a gradient from transparent to amber at 30%.

Keep all existing line type styling (h1, h2, h3, p, li, meta, blank).

- [ ] **Step 2: Commit**

```bash
git add src/lib/components/Line.svelte
git commit -m "feat: add spotlight opacity gradient and select-line cursor variants to Line"
```

### Task 8: Wire spotlight into Editor

**Files:**
- Modify: `src/lib/components/Editor.svelte`

- [ ] **Step 1: Pass spotlight props from Editor to Line**

In the `#each lines` loop, pass the spotlight and select-line props to each `Line` component:

```svelte
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
```

Add click handler on the content area to set cursor line:

```svelte
<div class="content" onclick={(e) => {
    const lineEl = (e.target as HTMLElement).closest('.line');
    if (lineEl) {
        const num = parseInt(lineEl.dataset.linenum || '1');
        editor.setCursor(num, 1);
    }
}}>
```

Add `data-linenum={line.number}` to the Line component's root div.

- [ ] **Step 2: Register spotlight keyboard shortcuts**

Add these shortcuts in the `onMount` block:

```typescript
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
})
```

- [ ] **Step 3: Verify spotlight works**

Run dev server. Open a file. Click a line to set cursor. Press Ctrl+Shift+S to activate spotlight. Verify:
- Current line is full brightness with amber left border
- Lines within window fade gradually (90% to 70%)
- Lines outside window are at 20%
- Ctrl+Up/Down resizes the window
- Status bar shows spotlight state

- [ ] **Step 4: Commit**

```bash
git add src/lib/components/Editor.svelte src/lib/components/Line.svelte
git commit -m "feat: wire spotlight and select-line into editor with keyboard shortcuts"
```

### Task 9: Update StatusBar for spotlight status

**Files:**
- Modify: `src/lib/components/StatusBar.svelte`

- [ ] **Step 1: Show active tool status in StatusBar**

Add a tool status section that displays active tools. When spotlight is active, show `SPOTLIGHT {above}up {below}down` in accent color. When select-line is active, show `SELECT-LINE`. Combine with the edit mode indicator.

Format: `~/career-lab/roadmap-medior.md  .  SPOTLIGHT 3up 2down  .  SELECT-LINE  .  Ln 14, Col 1  .  4.2KB  .  UTF-8`

- [ ] **Step 2: Commit**

```bash
git add src/lib/components/StatusBar.svelte
git commit -m "feat: show active tool status in status bar"
```

---

## Phase 3: Command Palette + Shortcuts

The single entry point for all features. Fuzzy search across actions, files, and content.

### Task 10: Create CommandPalette component

**Files:**
- Create: `src/lib/components/CommandPalette.svelte`

- [ ] **Step 1: Build the CommandPalette**

Create `src/lib/components/CommandPalette.svelte`. The component:

- Centered overlay, 480px wide, max 400px tall
- Background: var(--surface), border-radius: var(--radius-lg)
- Backdrop: var(--canvas) at 60% opacity with backdrop-filter blur(8px)
- Input: JetBrains Mono, 14px, full width, no visible border, amber cursor blink
- A caret character `>` before the input in muted color
- Results list below: each result has icon, label (matched chars in accent), description, optional shortcut badge
- Active result: var(--highlight) background
- Arrow keys navigate, Enter executes, Esc dismisses

Fuzzy matching logic: for each character in the query, find the next matching character in the label (case-insensitive). Highlight matched characters with `color: var(--accent)`.

- [ ] **Step 2: Commit**

```bash
git add src/lib/components/CommandPalette.svelte
git commit -m "feat: add CommandPalette component with fuzzy matching"
```

### Task 11: Create command registry service

**Files:**
- Create: `src/lib/services/commands.ts`

- [ ] **Step 1: Create the command registry**

Create `src/lib/services/commands.ts`:

```typescript
export interface Command {
    id: string;
    label: string;
    description: string;
    shortcut?: string;
    icon?: string;
    handler: () => void;
}

const commands: Command[] = [];

export function registerCommand(command: Command): () => void {
    commands.push(command);
    return () => {
        const i = commands.indexOf(command);
        if (i >= 0) commands.splice(i, 1);
    };
}

export function searchCommands(query: string): Command[] {
    if (!query) return commands.slice(0, 10);
    const q = query.toLowerCase();
    return commands
        .filter((cmd) => {
            let qi = 0;
            for (const ch of cmd.label.toLowerCase()) {
                if (qi < q.length && ch === q[qi]) qi++;
            }
            return qi === q.length;
        })
        .slice(0, 10);
}

export function getAllCommands(): readonly Command[] {
    return commands;
}
```

- [ ] **Step 2: Write test for fuzzy matching**

Create `src/lib/services/commands.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { registerCommand, searchCommands } from './commands';

describe('searchCommands', () => {
    beforeEach(() => {
        registerCommand({ id: 'export-pdf', label: 'Export PDF', description: 'Export as PDF', handler: () => {} });
        registerCommand({ id: 'export-word', label: 'Export Word', description: 'Export as Word', handler: () => {} });
        registerCommand({ id: 'toggle-spotlight', label: 'Toggle Spotlight', description: 'Toggle spotlight mode', handler: () => {} });
    });

    it('returns all commands for empty query', () => {
        const results = searchCommands('');
        expect(results.length).toBeGreaterThanOrEqual(3);
    });

    it('fuzzy matches "exp" to Export commands', () => {
        const results = searchCommands('exp');
        expect(results.length).toBe(2);
        expect(results[0].label).toContain('Export');
    });

    it('fuzzy matches "tsp" to Toggle Spotlight', () => {
        const results = searchCommands('tsp');
        expect(results.some((r) => r.id === 'toggle-spotlight')).toBe(true);
    });
});
```

- [ ] **Step 3: Run tests**

Run: `cd /Users/jonathanvandelustgraaf/Code/lucerna && npx vitest run`
Expected: All tests pass including the new command tests.

- [ ] **Step 4: Commit**

```bash
git add src/lib/services/commands.ts src/lib/services/commands.test.ts
git commit -m "feat: add command registry with fuzzy search and tests"
```

### Task 12: Wire CommandPalette into Editor

**Files:**
- Modify: `src/lib/components/Editor.svelte`

- [ ] **Step 1: Add CommandPalette to Editor**

Import CommandPalette. Render it conditionally when `tools.isActive('commandPalette')`:

```svelte
{#if tools.isActive('commandPalette')}
    <CommandPalette onclose={() => tools.dismiss('commandPalette')} />
{/if}
```

Register the Ctrl+K shortcut to toggle the command palette. When command palette opens, it should dismiss other overlays (filter sidebar).

- [ ] **Step 2: Commit**

```bash
git add src/lib/components/Editor.svelte
git commit -m "feat: wire command palette into editor with Ctrl+K"
```

### Task 13: Register all commands

**Files:**
- Modify: `src/lib/components/Editor.svelte`

- [ ] **Step 1: Register all planned commands in onMount**

Register commands for every feature using `registerCommand`:

```typescript
registerCommand({ id: 'toggle-spotlight', label: 'Toggle Spotlight', description: 'Focus window around cursor', shortcut: 'Ctrl+Shift+S', handler: () => tools.toggle('spotlight') });
registerCommand({ id: 'toggle-select-line', label: 'Toggle Select-Line', description: 'Highlight current line', shortcut: 'Ctrl+L', handler: () => tools.toggle('selectLine') });
registerCommand({ id: 'toggle-line-numbers', label: 'Toggle Line Numbers', description: 'Show/hide gutter', shortcut: 'Ctrl+G', handler: () => tools.toggle('lineNumbers') });
registerCommand({ id: 'toggle-zen', label: 'Toggle Zen Mode', description: 'Fullscreen focus', shortcut: 'Ctrl+Shift+Z', handler: () => tools.toggle('zenMode') });
registerCommand({ id: 'toggle-filter', label: 'Toggle Filter', description: 'Section filter sidebar', shortcut: 'Ctrl+Shift+F', handler: () => tools.toggle('filter') });
registerCommand({ id: 'toggle-git', label: 'Toggle Git Panel', description: 'Commit, push, pull', shortcut: 'Ctrl+Shift+G', handler: () => tools.toggle('gitPanel') });
registerCommand({ id: 'toggle-edit', label: 'Toggle Edit Mode', description: 'Switch view/edit', shortcut: 'Ctrl+E', handler: () => editor.toggleEdit() });
registerCommand({ id: 'save', label: 'Save File', description: 'Save current file', shortcut: 'Ctrl+S', handler: () => saveFile() });
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/components/Editor.svelte
git commit -m "feat: register all commands for command palette discovery"
```

---

## Phase 4: Filter Sidebar + Collapse

TOC sidebar with checkboxes to show/hide sections.

### Task 14: Create FilterSidebar component

**Files:**
- Create: `src/lib/components/FilterSidebar.svelte`

- [ ] **Step 1: Build FilterSidebar**

Create `src/lib/components/FilterSidebar.svelte`. The component:

- Slides in from right, 280px wide, background var(--surface)
- Left border: 1px var(--border) with subtle glass morphism effect
- Header: "FILTER . TOC" in monospace, muted color, with count "N/M sections"
- Body: list of all H2/H3 headers extracted from the current document
- Each item has a checkbox (amber when checked, border color when unchecked)
- H3 items indented 16px from H2
- Footer: "Esc dismiss" hint
- Slide-in animation: 250ms ease-out transform from right

Props:

```typescript
let {
    lines,
    checkedSections,
    ontoggle,
    onclose
}: {
    lines: ParsedLine[];
    checkedSections: Record<number, boolean>;
    ontoggle: (lineNumber: number) => void;
    onclose: () => void;
} = $props();
```

Extract TOC entries from lines where type is 'h2' or 'h3'.

- [ ] **Step 2: Commit**

```bash
git add src/lib/components/FilterSidebar.svelte
git commit -m "feat: add FilterSidebar with TOC checkboxes and slide animation"
```

### Task 15: Add filter state to editor store

**Files:**
- Modify: `src/lib/stores/editor.svelte.ts`

- [ ] **Step 1: Add section filter state**

Add to `EditorState`:

```typescript
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
```

By default, all sections are visible (checked). When a section is toggled to false, it becomes hidden.

- [ ] **Step 2: Commit**

```bash
git add src/lib/stores/editor.svelte.ts
git commit -m "feat: add section filter state to editor store"
```

### Task 16: Wire FilterSidebar into Editor

**Files:**
- Modify: `src/lib/components/Editor.svelte`

- [ ] **Step 1: Add FilterSidebar and filtering logic**

Import FilterSidebar. Render it when `tools.isActive('filter')`.

Add a `$derived` that filters lines based on checked sections: when a section header (h2/h3) is unchecked, hide all lines from that header to the next header of equal or higher level. Replace hidden sections with a single collapsed indicator line: `{ type: 'collapsed', content: 'Section Name (N lines hidden)', number: -1 }`.

Add the `collapsed` type to the ParsedLine types and handle it in Line.svelte with muted styling and a `>` indicator.

Register the Ctrl+Shift+F shortcut.

- [ ] **Step 2: Commit**

```bash
git add src/lib/components/Editor.svelte src/lib/components/Line.svelte src/lib/services/markdown.ts
git commit -m "feat: wire filter sidebar with section hiding and collapse indicators"
```

### Task 17: Add fold indicators to Line gutter

**Files:**
- Modify: `src/lib/components/Line.svelte`

- [ ] **Step 1: Add fold icons when line numbers are visible**

When `showLineNumbers` is true and the line type is 'h2' or 'h3', show a small fold indicator (triangle) next to the line number. Clicking the fold icon toggles that section's visibility through the filter state.

The fold icon uses the same toggle as the filter sidebar checkboxes. When filter sidebar is not open, fold icons provide inline section control.

- [ ] **Step 2: Commit**

```bash
git add src/lib/components/Line.svelte
git commit -m "feat: add fold icons to gutter for h2/h3 headers"
```

---

## Phase 5: Zen Mode + Marks

### Task 18: Create ZenMode wrapper

**Files:**
- Create: `src/lib/components/ZenMode.svelte`

- [ ] **Step 1: Build ZenMode component**

Create `src/lib/components/ZenMode.svelte`. The component:

- Wraps the content area in a fullscreen overlay
- Removes tabs and status bar
- Centers content with 20% viewport horizontal padding
- Background: var(--canvas)
- Mouse-to-top-edge (within 20px): briefly show tabs (fade in 200ms, auto-hide after 2s)
- Esc exits zen mode

```svelte
<script lang="ts">
    import { tools } from '$lib/stores/tools.svelte';

    let { children } = $props();
    let showPeekTabs = $state(false);
    let peekTimer: ReturnType<typeof setTimeout> | null = null;

    function handleMouseMove(e: MouseEvent) {
        if (e.clientY < 20) {
            showPeekTabs = true;
            if (peekTimer) clearTimeout(peekTimer);
            peekTimer = setTimeout(() => { showPeekTabs = false; }, 2000);
        }
    }
</script>

<div class="zen" onmousemove={handleMouseMove}>
    {#if showPeekTabs}
        <div class="zen-peek" transition:fade={{ duration: 200 }}>
            <!-- TabBar rendered here -->
        </div>
    {/if}
    <div class="zen-content">
        {@render children()}
    </div>
</div>

<style>
    .zen {
        position: fixed;
        inset: 0;
        background: var(--canvas);
        z-index: 100;
        display: flex;
        justify-content: center;
    }
    .zen-content {
        width: 100%;
        max-width: 80ch;
        padding: var(--space-xl) 20%;
        overflow-y: auto;
    }
    .zen-peek {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 101;
    }
</style>
```

- [ ] **Step 2: Wire into Editor**

In Editor.svelte, wrap the content area with ZenMode when `tools.isActive('zenMode')`. Register Ctrl+Shift+Z shortcut.

- [ ] **Step 3: Commit**

```bash
git add src/lib/components/ZenMode.svelte src/lib/components/Editor.svelte
git commit -m "feat: add zen mode with peek tabs on mouse hover"
```

### Task 19: Add marks to editor store

**Files:**
- Modify: `src/lib/stores/editor.svelte.ts`

- [ ] **Step 1: Add marks state**

Add to `EditorState`:

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/stores/editor.svelte.ts
git commit -m "feat: add marks (bookmarks) to editor store with navigation"
```

### Task 20: Render marks in Line component

**Files:**
- Modify: `src/lib/components/Line.svelte`

- [ ] **Step 1: Add mark indicator**

Add a `marked` boolean prop to Line. When true, render a small amber dot (4px circle) in the left margin, positioned just before the content. Visible even when gutter is hidden.

```svelte
{#if marked}
    <span class="mark-dot"></span>
{/if}
```

```css
.mark-dot {
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: var(--accent);
    position: absolute;
    left: 4px;
    top: 50%;
    transform: translateY(-50%);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/components/Line.svelte
git commit -m "feat: render amber mark dots on bookmarked lines"
```

### Task 21: Wire mark shortcuts

**Files:**
- Modify: `src/lib/components/Editor.svelte`

- [ ] **Step 1: Register mark shortcuts**

```typescript
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
```

Pass marks to Line component:

```svelte
marked={editor.activeFile ? editor.getMarks(editor.activeFile.path).includes(line.number) : false}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/components/Editor.svelte
git commit -m "feat: wire mark shortcuts (Ctrl+M, Ctrl+', Ctrl+Shift+')"
```

---

## Phase 6: Git Panel + History

### Task 22: Add git log and diff API routes

**Files:**
- Create: `src/routes/api/git/log/[...path]/+server.ts`
- Create: `src/routes/api/git/diff/[sha]/+server.ts`

- [ ] **Step 1: Create git log route**

Create `src/routes/api/git/log/[...path]/+server.ts`:

```typescript
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getRepoPath } from '$lib/server/config';
import { createGitService } from '$lib/server/git';

export const GET: RequestHandler = async ({ params }) => {
    try {
        const git = createGitService(getRepoPath());
        const log = await git.log(params.path || undefined);
        return json({ log });
    } catch (err) {
        throw error(500, 'Failed to get log');
    }
};
```

- [ ] **Step 2: Add diff method to git service**

Add to `src/lib/server/git.ts` in the returned object:

```typescript
async diff(sha: string): Promise<string> {
    const result = await git.diff([`${sha}~1`, sha]);
    return result;
}
```

- [ ] **Step 3: Create git diff route**

Create `src/routes/api/git/diff/[sha]/+server.ts`:

```typescript
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getRepoPath } from '$lib/server/config';
import { createGitService } from '$lib/server/git';

export const GET: RequestHandler = async ({ params }) => {
    try {
        const git = createGitService(getRepoPath());
        const diff = await git.diff(params.sha);
        return json({ diff });
    } catch (err) {
        throw error(500, 'Failed to get diff');
    }
};
```

- [ ] **Step 4: Commit**

```bash
git add src/routes/api/git/log src/routes/api/git/diff src/lib/server/git.ts
git commit -m "feat: add git log and diff API routes"
```

### Task 23: Create GitPanel component

**Files:**
- Create: `src/lib/components/GitPanel.svelte`

- [ ] **Step 1: Build GitPanel**

Create `src/lib/components/GitPanel.svelte`. The component has two sections:

**Changes section:**
- Lists modified files from git status
- Each file shows its name and a diff indicator
- Commit message textarea (monospace, 2 lines)
- Commit button (primary amber style)
- Push/Pull buttons (ghost style)

**History section:**
- Shows commit log for the current file (or all files)
- Each entry: short SHA, message, author, relative date
- Click an entry to show its diff in a modal or inline

The panel slides in from the right (like FilterSidebar, 320px wide). Background var(--surface). Shares the same slide animation pattern.

- [ ] **Step 2: Commit**

```bash
git add src/lib/components/GitPanel.svelte
git commit -m "feat: add GitPanel with changes, commit, and history views"
```

### Task 24: Wire GitPanel into Editor

**Files:**
- Modify: `src/lib/components/Editor.svelte`

- [ ] **Step 1: Add GitPanel and shortcuts**

Import GitPanel. Render when `tools.isActive('gitPanel')`. Register Ctrl+Shift+G shortcut. The git panel should call the API routes for status, commit, push, pull, and log.

Wire the git store's `refresh()` method to poll `/api/git/status` periodically (every 30s) and on file save.

- [ ] **Step 2: Commit**

```bash
git add src/lib/components/Editor.svelte
git commit -m "feat: wire git panel into editor with Ctrl+Shift+G"
```

### Task 25: Add commit flow

**Files:**
- Modify: `src/lib/components/GitPanel.svelte`

- [ ] **Step 1: Implement commit, push, pull handlers**

Wire the commit button to POST `/api/git/commit` with the message and modified files. After commit, refresh git status. Wire push to POST `/api/git/push`. Wire pull to POST `/api/git/pull`. Show success/error feedback inline (not alerts).

Add Ctrl+Enter shortcut: when git panel is open and commit message has text, commit.

- [ ] **Step 2: Commit**

```bash
git add src/lib/components/GitPanel.svelte
git commit -m "feat: wire commit, push, pull in git panel"
```

### Task 26: Add diff viewer

**Files:**
- Create: `src/lib/components/DiffView.svelte`

- [ ] **Step 1: Build DiffView component**

Create `src/lib/components/DiffView.svelte`. Renders a unified diff with:
- Added lines: green-tinted background, `+` prefix
- Removed lines: red-tinted background, `-` prefix
- Context lines: normal background
- File header: monospace, muted
- Line numbers on both sides

The component receives a raw diff string and parses it into displayable lines.

- [ ] **Step 2: Wire into GitPanel**

When a commit entry in the history is clicked, fetch its diff from `/api/git/diff/[sha]` and render it in DiffView.

- [ ] **Step 3: Commit**

```bash
git add src/lib/components/DiffView.svelte src/lib/components/GitPanel.svelte
git commit -m "feat: add diff viewer for git history entries"
```

### Task 27: Add auto-commit on save option

**Files:**
- Modify: `src/routes/api/files/[...path]/+server.ts`

- [ ] **Step 1: Add autoCommit option to PUT**

Modify the PUT handler to accept an optional `autoCommit` boolean and `message` string. When `autoCommit` is true, after writing the file, commit it with the provided message (or a generated one like "update {filename}").

```typescript
export const PUT: RequestHandler = async ({ params, request }) => {
    try {
        const { content, autoCommit, message } = await request.json();
        await putFile(getRepoPath(), params.path, content);

        if (autoCommit) {
            const git = createGitService(getRepoPath());
            const commitMsg = message || `update ${params.path}`;
            await git.commit(commitMsg, [params.path]);
        }

        return json({ success: true });
    } catch (err) {
        if (err instanceof Error && err.message === 'Path traversal detected') {
            throw error(403, 'Forbidden');
        }
        throw error(500, 'Failed to write file');
    }
};
```

- [ ] **Step 2: Commit**

```bash
git add src/routes/api/files/[...path]/+server.ts
git commit -m "feat: add optional auto-commit on file save"
```

---

## Phase 7: Split View

### Task 28: Create SplitView component

**Files:**
- Create: `src/lib/components/SplitView.svelte`

- [ ] **Step 1: Build SplitView**

Create `src/lib/components/SplitView.svelte`. The component:

- Takes two content slots (left and right pane)
- Vertical separator: 1px var(--border), draggable to resize
- Each pane scrolls independently
- Default split: 50/50
- Drag handle: cursor changes to col-resize on hover

```svelte
<script lang="ts">
    let { leftContent, rightContent } = $props();
    let splitRatio = $state(50);
    let dragging = $state(false);

    function handleMouseDown() { dragging = true; }
    function handleMouseUp() { dragging = false; }
    function handleMouseMove(e: MouseEvent) {
        if (!dragging) return;
        const container = e.currentTarget as HTMLElement;
        const rect = container.getBoundingClientRect();
        splitRatio = Math.max(20, Math.min(80, ((e.clientX - rect.left) / rect.width) * 100));
    }
</script>

<div class="split" onmousemove={handleMouseMove} onmouseup={handleMouseUp}>
    <div class="pane left" style="width: {splitRatio}%">
        {@render leftContent()}
    </div>
    <div class="separator" onmousedown={handleMouseDown}></div>
    <div class="pane right" style="width: {100 - splitRatio}%">
        {@render rightContent()}
    </div>
</div>
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/components/SplitView.svelte
git commit -m "feat: add SplitView with draggable separator"
```

### Task 29: Wire SplitView into Editor

**Files:**
- Modify: `src/lib/components/Editor.svelte`
- Modify: `src/lib/stores/editor.svelte.ts`

- [ ] **Step 1: Add split state to editor store**

Add to `EditorState`:

```typescript
splitIndex = $state<number | null>(null);

get splitFile(): OpenFile | undefined {
    return this.splitIndex !== null ? this.files[this.splitIndex] : undefined;
}

setSplit(index: number | null) {
    this.splitIndex = index;
}
```

- [ ] **Step 2: Wire into Editor**

When `tools.isActive('splitView')` and `editor.splitFile` exists, render SplitView with the active file on the left and split file on the right. Each pane renders its own set of Line components with independent scroll and tool states.

Register Ctrl+\ shortcut: opens split with the next tab, or closes split if already open.

- [ ] **Step 3: Update StatusBar for split mode**

When split is active, StatusBar shows both file paths with a separator.

- [ ] **Step 4: Commit**

```bash
git add src/lib/components/Editor.svelte src/lib/stores/editor.svelte.ts src/lib/components/StatusBar.svelte
git commit -m "feat: wire split view with independent panes and status bar"
```

### Task 30: Add tab drag to split

**Files:**
- Modify: `src/lib/components/TabBar.svelte`

- [ ] **Step 1: Add drag handling to tabs**

When a tab is dragged to the right half of the editor, activate split view with that tab in the right pane. Add `draggable="true"` to tab elements. On dragend, check if the drop position is in the right half of the editor.

- [ ] **Step 2: Commit**

```bash
git add src/lib/components/TabBar.svelte
git commit -m "feat: add tab drag to create/close split views"
```

---

## Phase 8: Export System

### Task 31: Create export templates

**Files:**
- Create: `templates/professional.html`
- Create: `templates/proposal.html`
- Create: `templates/technical.html`

- [ ] **Step 1: Create Professional template**

Create `templates/professional.html`. A full HTML document styled for PDF/Word output:

- White background, dark text (#1c1917)
- Voorpagina: centered title (from H1), author, date, horizontal rule
- Inhoudsopgave: auto-generated from H2 headings with page numbers
- Body: Sora headings, Inter body text, generous margins
- Page breaks before each H2
- Footer: page numbers
- Print-optimized CSS (@media print)

- [ ] **Step 2: Create Proposal template**

Create `templates/proposal.html`. Similar to Professional but with:
- "PROPOSAL" kicker above the title on voorpagina
- Left-border callouts for blockquotes (accent-print color)
- Subtitle line below title
- Document metadata box (author, date, pages)

- [ ] **Step 3: Create Technical Report template**

Create `templates/technical.html`:
- Simpler title page
- Monospace for code blocks and data
- Table styling with alternating row colors
- Optional inhoudsopgave

- [ ] **Step 4: Commit**

```bash
git add templates/
git commit -m "feat: add Professional, Proposal, and Technical export templates"
```

### Task 32: Create export service

**Files:**
- Create: `src/lib/server/export.ts`

- [ ] **Step 1: Build the export service**

Create `src/lib/server/export.ts`:

```typescript
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseLines } from '$lib/services/markdown';

export type TemplateName = 'professional' | 'proposal' | 'technical';

export interface ExportOptions {
    markdown: string;
    template: TemplateName;
    author?: string;
    date?: string;
}

export async function renderToHtml(options: ExportOptions): Promise<string> {
    const templatePath = join(process.cwd(), 'templates', `${options.template}.html`);
    const templateHtml = await readFile(templatePath, 'utf-8');
    const lines = parseLines(options.markdown);

    const title = lines.find((l) => l.type === 'h1')?.content || 'Untitled';
    const toc = lines
        .filter((l) => l.type === 'h2')
        .map((l, i) => ({ title: l.content, page: i + 3 }));

    const bodyHtml = linesToHtml(lines);
    const tocHtml = toc.map((t) => `<div class="toc-row"><span>${t.title}</span><span>${t.page}</span></div>`).join('\n');

    return templateHtml
        .replace('{{title}}', title)
        .replace('{{author}}', options.author || 'Jonathan van de Lustgraaf')
        .replace('{{date}}', options.date || new Date().toLocaleDateString('nl-NL'))
        .replace('{{toc}}', tocHtml)
        .replace('{{body}}', bodyHtml);
}

function linesToHtml(lines: import('$lib/services/markdown').ParsedLine[]): string {
    return lines.map((l) => {
        switch (l.type) {
            case 'h1': return `<h1>${l.content}</h1>`;
            case 'h2': return `<div class="page-break"></div><h2>${l.content}</h2>`;
            case 'h3': return `<h3>${l.content}</h3>`;
            case 'p': return `<p>${l.content}</p>`;
            case 'li': return `<li>${l.content}</li>`;
            case 'meta': return `<hr/>`;
            case 'blank': return '';
            default: return `<p>${l.content}</p>`;
        }
    }).join('\n');
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/server/export.ts
git commit -m "feat: add export service with template rendering"
```

### Task 33: Add PDF export route

**Files:**
- Create: `src/routes/api/export/pdf/+server.ts`

- [ ] **Step 1: Create PDF export endpoint**

Create `src/routes/api/export/pdf/+server.ts`:

```typescript
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getRepoPath } from '$lib/server/config';
import { getFile } from '$lib/server/files';
import { renderToHtml } from '$lib/server/export';
import type { TemplateName } from '$lib/server/export';

export const POST: RequestHandler = async ({ request }) => {
    try {
        const { path, template } = await request.json() as { path: string; template: TemplateName };
        const markdown = await getFile(getRepoPath(), path);
        const html = await renderToHtml({ markdown, template });

        const puppeteer = await import('puppeteer');
        const browser = await puppeteer.default.launch({ headless: true, args: ['--no-sandbox'] });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
        const pdf = await page.pdf({
            format: 'A4',
            margin: { top: '2cm', bottom: '2cm', left: '2.5cm', right: '2.5cm' },
            printBackground: true
        });
        await browser.close();

        return new Response(pdf, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${path.replace('.md', '.pdf')}"`
            }
        });
    } catch (err) {
        throw error(500, 'Failed to export PDF');
    }
};
```

- [ ] **Step 2: Commit**

```bash
git add src/routes/api/export/pdf/+server.ts
git commit -m "feat: add PDF export endpoint using puppeteer"
```

### Task 34: Add Word export route

**Files:**
- Create: `src/routes/api/export/docx/+server.ts`

- [ ] **Step 1: Create Word export endpoint**

Create `src/routes/api/export/docx/+server.ts`. Use the `docx` npm package to generate a .docx file:

- Create a Document with sections
- First section: voorpagina (centered title paragraph, author, date)
- Second section: inhoudsopgave (generated from H2 headings)
- Remaining sections: content mapped from parsed lines
- H1 = Title style, H2 = Heading1 style, H3 = Heading2 style, p = Normal, li = ListParagraph

```typescript
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getRepoPath } from '$lib/server/config';
import { getFile } from '$lib/server/files';
import { parseLines } from '$lib/services/markdown';
import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel, PageBreak } from 'docx';

export const POST: RequestHandler = async ({ request }) => {
    try {
        const { path, template } = await request.json();
        const markdown = await getFile(getRepoPath(), path);
        const lines = parseLines(markdown);

        const title = lines.find((l) => l.type === 'h1')?.content || 'Untitled';
        const tocEntries = lines.filter((l) => l.type === 'h2').map((l) => l.content);

        const children: Paragraph[] = [];

        // Voorpagina
        children.push(new Paragraph({ spacing: { before: 4000 } }));
        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: title, bold: true, size: 48, font: 'Calibri' })]
        }));
        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: 'Jonathan van de Lustgraaf', size: 24, color: '666666' })]
        }));
        children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: new Date().toLocaleDateString('nl-NL'), size: 24, color: '666666' })]
        }));
        children.push(new Paragraph({ children: [new PageBreak()] }));

        // Inhoudsopgave
        children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun({ text: 'Inhoudsopgave' })]
        }));
        tocEntries.forEach((entry, i) => {
            children.push(new Paragraph({
                children: [new TextRun({ text: `${i + 1}. ${entry}` })]
            }));
        });
        children.push(new Paragraph({ children: [new PageBreak()] }));

        // Content
        for (const line of lines) {
            switch (line.type) {
                case 'h1': break; // already on voorpagina
                case 'h2':
                    children.push(new Paragraph({ children: [new PageBreak()] }));
                    children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: line.content })] }));
                    break;
                case 'h3':
                    children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: line.content })] }));
                    break;
                case 'p':
                    children.push(new Paragraph({ children: [new TextRun({ text: line.content })] }));
                    break;
                case 'li':
                    children.push(new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text: line.content })] }));
                    break;
                case 'blank':
                    children.push(new Paragraph({}));
                    break;
            }
        }

        const doc = new Document({ sections: [{ children }] });
        const buffer = await Packer.toBuffer(doc);

        return new Response(buffer, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': `attachment; filename="${path.replace('.md', '.docx')}"`
            }
        });
    } catch (err) {
        throw error(500, 'Failed to export Word');
    }
};
```

- [ ] **Step 2: Install docx dependency**

Run: `npm install docx`

- [ ] **Step 3: Commit**

```bash
git add src/routes/api/export/docx/+server.ts package.json package-lock.json
git commit -m "feat: add Word export with voorpagina and inhoudsopgave"
```

### Task 35: Create ExportPreview component

**Files:**
- Create: `src/lib/components/ExportPreview.svelte`

- [ ] **Step 1: Build ExportPreview**

Create `src/lib/components/ExportPreview.svelte`. The component:

- Slides in from right (400ms ease-in-out), takes 50% of the editor width
- White/paper background (var(--paper))
- Shows the document rendered with the selected template styling
- Header bar: template selector dropdown, "Export PDF" button (primary), "Export Word" button (ghost), "Close" button
- The preview renders the voorpagina, inhoudsopgave, and content in light-theme styling
- Status bar updates to show "EXPORT . Template name . Format"

Template selector: dropdown with three options (Professional, Proposal, Technical Report).

Export buttons trigger fetch to `/api/export/pdf` or `/api/export/docx` and download the result.

- [ ] **Step 2: Commit**

```bash
git add src/lib/components/ExportPreview.svelte
git commit -m "feat: add ExportPreview with template selection and download"
```

### Task 36: Wire ExportPreview into Editor

**Files:**
- Modify: `src/lib/components/Editor.svelte`

- [ ] **Step 1: Add ExportPreview to Editor**

Import ExportPreview. Add a new tool type 'exportPreview' to the tools store. When active, render the editor content on the left and ExportPreview on the right (similar to SplitView but with the light-theme preview instead of a second document).

Register the export commands in the command palette:
```typescript
registerCommand({ id: 'export-preview', label: 'Export Preview', description: 'Show export preview', handler: () => tools.toggle('exportPreview') });
registerCommand({ id: 'export-pdf', label: 'Export PDF', description: 'Export current file as PDF', handler: () => exportPdf() });
registerCommand({ id: 'export-word', label: 'Export Word', description: 'Export current file as Word', handler: () => exportWord() });
```

- [ ] **Step 2: Add exportPreview to ToolName type**

In `src/lib/stores/tools.svelte.ts`, add `'exportPreview'` to the `ToolName` type and initialize it as `false` in the active state.

- [ ] **Step 3: Commit**

```bash
git add src/lib/components/Editor.svelte src/lib/stores/tools.svelte.ts
git commit -m "feat: wire export preview and export commands into editor"
```

---

## Final Verification

After all 36 tasks are complete, verify every feature works:

- [ ] Open a file, edit it (Ctrl+E), save (Ctrl+S), verify changes persist
- [ ] Activate spotlight (Ctrl+Shift+S), verify opacity gradient, resize with Ctrl+Up/Down
- [ ] Activate select-line (Ctrl+L), verify current line highlighting
- [ ] Open command palette (Ctrl+K), search for commands, execute one
- [ ] Open filter sidebar (Ctrl+Shift+F), uncheck a section, verify it collapses
- [ ] Enter zen mode (Ctrl+Shift+Z), verify all chrome hidden, mouse-to-top reveals tabs
- [ ] Set marks (Ctrl+M), jump between them (Ctrl+')
- [ ] Open git panel (Ctrl+Shift+G), commit changes, view history, see diffs
- [ ] Create a split view (Ctrl+\), verify independent scroll and tools
- [ ] Export to PDF via command palette, verify voorpagina and inhoudsopgave
- [ ] Export to Word, verify .docx opens correctly with formatted content
- [ ] All 15+ keyboard shortcuts work
- [ ] Status bar reflects all active tools
- [ ] All existing tests still pass

Run: `npx vitest run`
Expected: All tests pass (existing 22 + new tests from this plan).
