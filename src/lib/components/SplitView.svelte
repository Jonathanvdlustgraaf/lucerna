<script lang="ts">
    import type { Snippet } from 'svelte';

    let { leftContent, rightContent }: { leftContent: Snippet; rightContent: Snippet } = $props();
    let splitRatio = $state(50);
    let dragging = $state(false);
    let containerEl: HTMLElement;

    function handleMouseDown() { dragging = true; }

    function handleMouseUp() { dragging = false; }

    function handleMouseMove(e: MouseEvent) {
        if (!dragging || !containerEl) return;
        const rect = containerEl.getBoundingClientRect();
        splitRatio = Math.max(20, Math.min(80, ((e.clientX - rect.left) / rect.width) * 100));
    }
</script>

<svelte:window onmouseup={handleMouseUp} onmousemove={handleMouseMove} />

<div class="split" bind:this={containerEl}>
    <div class="pane left" style="width: {splitRatio}%">
        {@render leftContent()}
    </div>
    <div class="separator" onmousedown={handleMouseDown}></div>
    <div class="pane right" style="width: {100 - splitRatio}%">
        {@render rightContent()}
    </div>
</div>

<style>
    .split {
        display: flex;
        flex: 1;
        overflow: hidden;
    }
    .pane {
        overflow-y: auto;
        overflow-x: hidden;
    }
    .separator {
        width: 1px;
        background: var(--border);
        cursor: col-resize;
        flex-shrink: 0;
        position: relative;
    }
    .separator::after {
        content: '';
        position: absolute;
        top: 0;
        bottom: 0;
        left: -3px;
        right: -3px;
    }
    .separator:hover {
        background: var(--accent);
    }
</style>
