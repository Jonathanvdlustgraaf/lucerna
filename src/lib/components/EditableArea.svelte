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
