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
        onclose
    }: {
        activePath: string;
        onselect: (path: string, name: string) => void;
        onclose: () => void;
    } = $props();

    let currentPath = $state('/home');
    let pathInput = $state('/home');
    let entries = $state<BrowseEntry[]>([]);
    let loading = $state(false);
    let errorMsg = $state('');

    async function browse(path: string) {
        loading = true;
        errorMsg = '';
        try {
            const res = await fetch(`/api/files/browse?path=${encodeURIComponent(path)}`);
            if (!res.ok) {
                errorMsg = 'Could not open directory';
                return;
            }
            const data: BrowseEntry[] = await res.json();
            entries = data;
            currentPath = path;
            pathInput = path;
        } catch {
            errorMsg = 'Could not open directory';
        } finally {
            loading = false;
        }
    }

    function goUp() {
        const parent = currentPath.replace(/\/[^/]+\/?$/, '') || '/';
        browse(parent);
    }

    function handlePathKeydown(e: KeyboardEvent) {
        if (e.key === 'Enter') {
            e.preventDefault();
            browse(pathInput.trim());
        }
    }

    function handleKeydown(e: KeyboardEvent) {
        if (e.key === 'Escape') {
            e.preventDefault();
            onclose();
        }
    }

    onMount(() => {
        browse(currentPath);
    });
</script>

<svelte:window onkeydown={handleKeydown} />

<aside class="file-tree">
    <div class="header">
        <button class="nav-btn" onclick={goUp} title="Go up one level">..</button>
        <input
            class="path-input"
            type="text"
            bind:value={pathInput}
            onkeydown={handlePathKeydown}
            spellcheck="false"
        />
        <button class="header-close" onclick={onclose}>x</button>
    </div>
    <nav class="tree">
        {#if loading}
            <div class="status">Loading...</div>
        {:else if errorMsg}
            <div class="status error">{errorMsg}</div>
        {:else if entries.length === 0}
            <div class="status">Empty directory</div>
        {:else}
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
</aside>

<style>
    .file-tree {
        width: 260px;
        min-width: 260px;
        background: var(--surface);
        border-right: 1px solid var(--border);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        animation: slideInLeft 200ms ease-out;
    }

    @keyframes slideInLeft {
        from { transform: translateX(-100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }

    .header {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 6px 8px;
        border-bottom: 1px solid var(--border);
    }

    .nav-btn {
        background: none;
        border: none;
        color: var(--muted);
        font-family: var(--font-mono);
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        padding: 2px 6px;
        border-radius: 4px;
        flex-shrink: 0;
        transition: all 150ms ease-out;
    }
    .nav-btn:hover {
        background: var(--border);
        color: var(--text);
    }

    .path-input {
        flex: 1;
        min-width: 0;
        background: none;
        border: 1px solid transparent;
        border-radius: 4px;
        color: var(--text);
        font-family: var(--font-mono);
        font-size: 11px;
        padding: 3px 6px;
        outline: none;
        transition: border-color 150ms ease-out;
    }
    .path-input:focus {
        border-color: var(--accent);
    }

    .header-close {
        background: none;
        border: none;
        color: var(--muted);
        font-family: var(--font-mono);
        font-size: 12px;
        cursor: pointer;
        padding: 2px 6px;
        border-radius: 4px;
        flex-shrink: 0;
        transition: all 150ms ease-out;
    }
    .header-close:hover {
        background: var(--border);
        color: var(--text);
    }

    .tree {
        flex: 1;
        overflow-y: auto;
        padding: var(--space-xs) 0;
    }

    .status {
        padding: 12px;
        font-family: var(--font-mono);
        font-size: 12px;
        color: var(--muted);
    }
    .status.error {
        color: var(--accent);
    }

    .tree-item {
        display: flex;
        align-items: center;
        gap: 6px;
        width: 100%;
        background: none;
        border: none;
        color: var(--muted);
        font-family: var(--font-mono);
        font-size: 13px;
        padding: 4px 12px;
        cursor: pointer;
        text-align: left;
        transition: all 100ms ease-out;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .tree-item:hover {
        background: rgba(212, 168, 67, 0.06);
        color: var(--text);
    }

    .tree-item.active {
        background: rgba(212, 168, 67, 0.1);
        color: var(--accent);
    }

    .tree-icon {
        font-size: 10px;
        width: 12px;
        flex-shrink: 0;
        color: var(--muted);
    }

    .tree-dir .tree-icon {
        color: var(--accent);
    }

    .tree-dir .tree-name {
        font-weight: 500;
        color: var(--text);
    }

    .tree-file .file-icon {
        color: var(--border);
    }

    .tree-name {
        overflow: hidden;
        text-overflow: ellipsis;
    }
</style>
