<script lang="ts">
    import { tools } from '$lib/stores/tools.svelte';
    import { fade } from 'svelte/transition';

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

<svelte:window onkeydown={(e) => { if (e.key === 'Escape') tools.dismiss('zenMode'); }} />

<div class="zen" onmousemove={handleMouseMove}>
    {#if showPeekTabs}
        <div class="zen-peek" transition:fade={{ duration: 200 }}>
            <!-- TabBar will be rendered by parent via snippet -->
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
        max-width: 100ch;
        padding: var(--space-xl) var(--space-lg);
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
