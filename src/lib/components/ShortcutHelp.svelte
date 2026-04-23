<script lang="ts">
    import { getAll } from '$lib/services/keyboard';

    let { onclose }: { onclose: () => void } = $props();

    let shortcuts = $derived(getAll().filter(s => s.description));

    function formatKey(s: typeof shortcuts[number]): string {
        const parts: string[] = [];
        if (s.ctrl) parts.push('Ctrl');
        if (s.shift) parts.push('Shift');
        if (s.alt) parts.push('Alt');
        parts.push(s.key.length === 1 ? s.key.toUpperCase() : s.key.replace('Arrow', ''));
        return parts.join('+');
    }

    function handleKeydown(e: KeyboardEvent) {
        if (e.key === 'Escape') {
            e.preventDefault();
            onclose();
        }
    }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="overlay" onclick={onclose} role="none">
    <div class="panel" onclick={(e) => e.stopPropagation()} role="dialog">
        <div class="header">
            <span class="title">Keyboard Shortcuts</span>
            <button class="close" onclick={onclose}>x</button>
        </div>
        <div class="list">
            {#each shortcuts as shortcut}
                <div class="row">
                    <kbd class="key">{formatKey(shortcut)}</kbd>
                    <span class="desc">{shortcut.description}</span>
                </div>
            {/each}
        </div>
    </div>
</div>

<style>
    .overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 100;
        animation: fadeIn 100ms ease-out;
    }
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    .panel {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 8px;
        width: 420px;
        max-height: 70vh;
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }
    .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        border-bottom: 1px solid var(--border);
    }
    .title {
        font-family: var(--font-heading);
        font-size: 14px;
        font-weight: 600;
        color: var(--text-bright);
    }
    .close {
        background: none;
        border: none;
        color: var(--muted);
        font-family: var(--font-mono);
        font-size: 12px;
        cursor: pointer;
        padding: 2px 6px;
        border-radius: 4px;
    }
    .close:hover {
        background: var(--border);
        color: var(--text);
    }
    .list {
        overflow-y: auto;
        padding: 8px 0;
    }
    .row {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 5px 16px;
    }
    .key {
        flex-shrink: 0;
        min-width: 110px;
        font-family: var(--font-mono);
        font-size: 11px;
        color: var(--accent);
        background: rgba(212, 168, 67, 0.06);
        border: 1px solid var(--border);
        border-radius: 4px;
        padding: 2px 6px;
        text-align: center;
    }
    .desc {
        font-family: var(--font-body);
        font-size: 13px;
        color: var(--text);
    }
</style>
