<script lang="ts">
    import { tools } from '$lib/stores/tools.svelte';

    let { onclose }: { onclose: () => void } = $props();

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
            <span class="title">Spotlight Settings</span>
            <button class="close" onclick={onclose}>x</button>
        </div>
        <div class="settings">
            <div class="setting">
                <label class="label" for="above">Lines above cursor</label>
                <div class="control">
                    <button class="step" onclick={() => tools.shrinkSpotlight('up')}>-</button>
                    <span class="value">{tools.spotlightAbove}</span>
                    <button class="step" onclick={() => tools.adjustSpotlight('up')}>+</button>
                </div>
            </div>
            <div class="setting">
                <label class="label" for="below">Lines below cursor</label>
                <div class="control">
                    <button class="step" onclick={() => tools.shrinkSpotlight('down')}>-</button>
                    <span class="value">{tools.spotlightBelow}</span>
                    <button class="step" onclick={() => tools.adjustSpotlight('down')}>+</button>
                </div>
            </div>
            <div class="divider"></div>
            <div class="setting">
                <label class="label" for="margin">Scroll margin</label>
                <span class="hint">Lines kept visible below cursor while navigating</span>
                <div class="control">
                    <button class="step" onclick={() => { tools.scrollMargin = Math.max(0, tools.scrollMargin - 1); }}>-</button>
                    <span class="value">{tools.scrollMargin}</span>
                    <button class="step" onclick={() => { tools.scrollMargin = Math.min(20, tools.scrollMargin + 1); }}>+</button>
                </div>
            </div>
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
        width: 320px;
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
    .settings {
        padding: 12px 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
    }
    .setting {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }
    .label {
        font-family: var(--font-body);
        font-size: 13px;
        color: var(--text);
    }
    .hint {
        font-family: var(--font-mono);
        font-size: 10px;
        color: var(--muted);
    }
    .control {
        display: flex;
        align-items: center;
        gap: 8px;
    }
    .step {
        background: none;
        border: 1px solid var(--border);
        border-radius: 4px;
        color: var(--text);
        font-family: var(--font-mono);
        font-size: 14px;
        width: 28px;
        height: 28px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 100ms ease-out;
    }
    .step:hover {
        border-color: var(--accent);
        color: var(--accent);
    }
    .value {
        font-family: var(--font-mono);
        font-size: 14px;
        color: var(--accent);
        min-width: 24px;
        text-align: center;
    }
    .divider {
        border-top: 1px solid var(--border);
    }
</style>
