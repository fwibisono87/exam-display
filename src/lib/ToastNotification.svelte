<script lang="ts">
	import { onMount } from 'svelte';
	import { fly, fade } from 'svelte/transition';

	export let message: string = '';
	export let type: 'info' | 'warning' | 'critical' = 'info';
	export let duration: number = 5000; // milliseconds
	export let onClose: (() => void) | undefined = undefined;

	let visible = true;
	let timeout: ReturnType<typeof setTimeout>;

	$: typeStyles = {
		info: 'bg-blue-500 border-blue-600',
		warning: 'bg-amber-500 border-amber-600',
		critical: 'bg-red-500 border-red-600'
	}[type];

	$: icon = {
		info: 'ℹ️',
		warning: '⚠️',
		critical: '🚨'
	}[type];

	onMount(() => {
		if (duration > 0) {
			timeout = setTimeout(close, duration);
		}

		return () => {
			if (timeout) clearTimeout(timeout);
		};
	});

	function close() {
		visible = false;
		if (onClose) {
			// Wait for transition to complete before calling onClose
			setTimeout(onClose, 300);
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			close();
		}
	}
</script>

{#if visible}
	<div
		role="alert"
		aria-live="polite"
		aria-atomic="true"
		class="fixed top-4 right-4 z-50 max-w-md"
		transition:fly={{ y: -20, duration: 300 }}
		on:keydown={handleKeydown}
		tabindex="-1"
	>
		<div class="flex items-start gap-3 p-4 rounded-lg shadow-lg border-2 text-white {typeStyles}">
			<span class="text-2xl flex-shrink-0" aria-hidden="true">{icon}</span>
			<div class="flex-1 min-w-0">
				<p class="text-sm font-medium break-words">{message}</p>
			</div>
			<button
				on:click={close}
				class="flex-shrink-0 text-white hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-transparent rounded"
				aria-label="Close notification"
				title="Close notification"
			>
				<svg
					class="w-5 h-5"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
					aria-hidden="true"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M6 18L18 6M6 6l12 12"
					/>
				</svg>
			</button>
		</div>
	</div>
{/if}

<style>
	/* Ensure proper focus visibility */
	button:focus-visible {
		outline: 2px solid white;
		outline-offset: 2px;
	}
</style>
