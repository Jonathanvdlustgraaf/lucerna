<script lang="ts">
    import { searchCommands } from '$lib/services/commands';
    import { onMount } from 'svelte';

    let { onclose }: { onclose: () => void } = $props();

    let query = $state('');
    let activeIndex = $state(0);
    let results = $derived(searchCommands(query));
    let inputEl: HTMLInputElement;

    $effect(() => {
        // Reset active index whenever query changes
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        query;
        activeIndex = 0;
    });

    onMount(() => {
        inputEl?.focus();
    });

    function highlightMatch(label: string, q: string): { char: string; matched: boolean }[] {
        const segments: { char: string; matched: boolean }[] = [];
        let qi = 0;
        const lowerQuery = q.toLowerCase();
        for (let i = 0; i < label.length; i++) {
            if (qi < lowerQuery.length && label[i].toLowerCase() === lowerQuery[qi]) {
                segments.push({ char: label[i], matched: true });
                qi++;
            } else {
                segments.push({ char: label[i], matched: false });
            }
        }
        return segments;
    }

    function scrollActiveIntoView() {
        requestAnimationFrame(() => {
            const el = document.querySelector('.results li.active');
            if (el) el.scrollIntoView({ block: 'nearest' });
        });
    }

    function handleKeydown(e: KeyboardEvent) {
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
            results[activeIndex]?.handler();
            onclose();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            onclose();
        }
    }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="backdrop" onclick={onclose}>
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div class="palette" role="dialog" aria-modal="true" aria-label="Command Palette" onclick={(e) => e.stopPropagation()} onkeydown={handleKeydown}>
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
                        onclick={() => { result.handler(); onclose(); }}
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
    </div>
</div>

<style>
    .backdrop {
        position: fixed;
        inset: 0;
        background: color-mix(in srgb, var(--canvas) 60%, transparent);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
    }

    .palette {
        width: 480px;
        max-height: 400px;
        background: var(--surface);
        border-radius: var(--radius-lg);
        border: 1px solid var(--border);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        box-shadow: 0 16px 48px rgba(0, 0, 0, 0.4);
    }

    .input-row {
        display: flex;
        align-items: center;
        padding: var(--space-sm) var(--space-md);
        gap: var(--space-sm);
        border-bottom: 1px solid var(--border);
    }

    .caret {
        font-family: var(--font-mono);
        font-size: 14px;
        color: var(--muted);
        user-select: none;
        flex-shrink: 0;
    }

    input {
        font-family: var(--font-mono);
        font-size: 14px;
        color: var(--text);
        background: transparent;
        border: none;
        outline: none;
        width: 100%;
        caret-color: var(--accent);
        padding: 0;
    }

    input::placeholder {
        color: var(--muted);
    }

    .results {
        list-style: none;
        margin: 0;
        padding: var(--space-sm) 0;
        overflow-y: auto;
        flex: 1;
    }

    li {
        display: flex;
        align-items: baseline;
        gap: var(--space-sm);
        padding: var(--space-sm) var(--space-md);
        cursor: pointer;
        font-family: var(--font-mono);
        font-size: 13px;
        color: var(--text);
        border-radius: var(--radius);
        margin: 0 var(--space-sm);
    }

    li.active {
        background: var(--highlight);
    }

    .label {
        flex-shrink: 0;
    }

    .description {
        color: var(--muted);
        font-size: 12px;
        font-family: var(--font-body);
        flex: 1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .shortcut {
        font-family: var(--font-mono);
        font-size: 11px;
        color: var(--muted);
        background: var(--canvas);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        padding: 1px 5px;
        white-space: nowrap;
        flex-shrink: 0;
    }

    .match {
        color: var(--accent);
    }
</style>
