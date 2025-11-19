<script lang="ts">
	import { onMount } from 'svelte';
	import { fade, scale } from 'svelte/transition';

	export let isOpen: boolean = false;
	export let title: string = 'Confirm Action';
	export let message: string = 'Are you sure you want to proceed?';
	export let confirmText: string = 'Confirm';
	export let cancelText: string = 'Cancel';
	export let onConfirm: (() => void) | undefined = undefined;
	export let onCancel: (() => void) | undefined = undefined;
	export let isDangerous: boolean = false;

	let dialogElement: HTMLElement;
	let previousActiveElement: HTMLElement | null = null;

	$: if (isOpen) {
		trapFocus();
	} else {
		restoreFocus();
	}

	function trapFocus() {
		if (typeof window === 'undefined') return;

		previousActiveElement = document.activeElement as HTMLElement;

		// Wait for the dialog to be rendered
		setTimeout(() => {
			if (dialogElement) {
				const focusableElements = dialogElement.querySelectorAll(
					'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
				);

				if (focusableElements.length > 0) {
					(focusableElements[0] as HTMLElement).focus();
				}
			}
		}, 100);
	}

	function restoreFocus() {
		if (previousActiveElement && typeof previousActiveElement.focus === 'function') {
			previousActiveElement.focus();
		}
	}

	function handleConfirm() {
		if (onConfirm) {
			onConfirm();
		}
		isOpen = false;
	}

	function handleCancel() {
		if (onCancel) {
			onCancel();
		}
		isOpen = false;
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			handleCancel();
		}

		// Trap tab focus within dialog
		if (event.key === 'Tab') {
			const focusableElements = dialogElement.querySelectorAll(
				'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
			);

			const firstElement = focusableElements[0] as HTMLElement;
			const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

			if (event.shiftKey && document.activeElement === firstElement) {
				event.preventDefault();
				lastElement.focus();
			} else if (!event.shiftKey && document.activeElement === lastElement) {
				event.preventDefault();
				firstElement.focus();
			}
		}
	}

	function handleBackdropClick(event: MouseEvent) {
		// Only close if clicking the backdrop itself, not its children
		if (event.target === event.currentTarget) {
			handleCancel();
		}
	}
</script>

{#if isOpen}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
		transition:fade={{ duration: 200 }}
		on:click={handleBackdropClick}
		on:keydown={handleKeydown}
		role="presentation"
	>
		<div
			bind:this={dialogElement}
			role="dialog"
			aria-modal="true"
			aria-labelledby="dialog-title"
			aria-describedby="dialog-description"
			class="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
			transition:scale={{ duration: 200, start: 0.95 }}
		>
			<h2 id="dialog-title" class="text-xl font-bold mb-4 text-gray-900">
				{title}
			</h2>

			<p id="dialog-description" class="text-gray-700 mb-6">
				{message}
			</p>

			<div class="flex gap-3 justify-end">
				<button
					on:click={handleCancel}
					class="px-4 py-2 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
				>
					{cancelText}
				</button>

				<button
					on:click={handleConfirm}
					class="px-4 py-2 rounded-md {isDangerous
						? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
						: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'} text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors"
				>
					{confirmText}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	/* Ensure proper focus visibility */
	button:focus-visible {
		outline: 2px solid currentColor;
		outline-offset: 2px;
	}
</style>
