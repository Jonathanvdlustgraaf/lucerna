<script lang="ts">
	import '@fontsource-variable/sora';
	import '@fontsource-variable/inter';
	import '@fontsource-variable/jetbrains-mono';
	import '$lib/styles/tokens.css';
	import '$lib/styles/global.css';

	let { children } = $props();
</script>

{@render children()}
