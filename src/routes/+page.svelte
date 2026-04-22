<script lang="ts">
	import Editor from '$lib/components/Editor.svelte';

	let { data } = $props();
</script>

<Editor fileTree={data.fileTree} />
