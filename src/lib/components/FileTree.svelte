<script lang="ts">
    interface FileTreeEntry {
        path: string;
        name: string;
        type: 'file' | 'directory';
    }

    interface TreeNode {
        name: string;
        path: string;
        type: 'file' | 'directory';
        children: TreeNode[];
    }

    let {
        fileTree = [],
        activePath = '',
        onselect,
        onclose
    }: {
        fileTree: FileTreeEntry[];
        activePath: string;
        onselect: (path: string, name: string) => void;
        onclose: () => void;
    } = $props();

    let expandedDirs = $state<Set<string>>(new Set());

    // Build hierarchical tree from flat list
    let tree = $derived.by(() => {
        const root: TreeNode[] = [];
        const dirMap = new Map<string, TreeNode>();

        // First pass: create directory nodes
        for (const entry of fileTree) {
            if (entry.type === 'directory') {
                const node: TreeNode = { name: entry.name, path: entry.path, type: 'directory', children: [] };
                dirMap.set(entry.path, node);
            }
        }

        // Second pass: place files and directories into parents
        for (const entry of fileTree) {
            const parts = entry.path.split('/');
            const parentPath = parts.slice(0, -1).join('/');

            if (entry.type === 'directory') {
                const node = dirMap.get(entry.path)!;
                const parent = dirMap.get(parentPath);
                if (parent) {
                    parent.children.push(node);
                } else {
                    root.push(node);
                }
            } else {
                const node: TreeNode = { name: entry.name, path: entry.path, type: 'file', children: [] };
                const parent = dirMap.get(parentPath);
                if (parent) {
                    parent.children.push(node);
                } else {
                    root.push(node);
                }
            }
        }

        // Sort: directories first, then files, alphabetical within each
        function sortNodes(nodes: TreeNode[]) {
            nodes.sort((a, b) => {
                if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
                return a.name.localeCompare(b.name);
            });
            for (const n of nodes) {
                if (n.children.length > 0) sortNodes(n.children);
            }
        }
        sortNodes(root);

        // Auto-expand directories on first render
        if (expandedDirs.size === 0) {
            for (const entry of fileTree) {
                if (entry.type === 'directory') {
                    expandedDirs.add(entry.path);
                }
            }
        }

        return root;
    });

    function toggleDir(path: string) {
        if (expandedDirs.has(path)) {
            expandedDirs.delete(path);
        } else {
            expandedDirs.add(path);
        }
        expandedDirs = new Set(expandedDirs); // trigger reactivity
    }

    function handleKeydown(e: KeyboardEvent) {
        if (e.key === 'Escape') {
            e.preventDefault();
            onclose();
        }
    }
</script>

<svelte:window onkeydown={handleKeydown} />

<aside class="file-tree">
    <div class="header">
        <span class="header-title">FILES</span>
        <button class="header-close" onclick={onclose}>x</button>
    </div>
    <nav class="tree">
        {#each tree as node}
            {@render treeNode(node, 0)}
        {/each}
    </nav>
</aside>

{#snippet treeNode(node: TreeNode, depth: number)}
    {#if node.type === 'directory'}
        <button
            class="tree-item tree-dir"
            style="padding-left: {12 + depth * 16}px"
            onclick={() => toggleDir(node.path)}
        >
            <span class="tree-icon">{expandedDirs.has(node.path) ? '▾' : '▸'}</span>
            <span class="tree-name">{node.name}</span>
        </button>
        {#if expandedDirs.has(node.path)}
            {#each node.children as child}
                {@render treeNode(child, depth + 1)}
            {/each}
        {/if}
    {:else}
        <button
            class="tree-item tree-file"
            class:active={node.path === activePath}
            style="padding-left: {12 + depth * 16}px"
            onclick={() => onselect(node.path, node.name)}
        >
            <span class="tree-icon file-icon">-</span>
            <span class="tree-name">{node.name}</span>
        </button>
    {/if}
{/snippet}

<style>
    .file-tree {
        width: 240px;
        min-width: 240px;
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
        justify-content: space-between;
        padding: var(--space-sm) var(--space-md);
        border-bottom: 1px solid var(--border);
    }

    .header-title {
        font-family: var(--font-mono);
        font-size: 11px;
        font-weight: 500;
        color: var(--muted);
        letter-spacing: 0.05em;
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
