<script lang="ts">
	import { fly, scale } from 'svelte/transition';
	import { bounceOut, quintOut } from 'svelte/easing';
	import type { Checkpoint } from '$lib/types';

	const DEFAULT_PROGRESS_COLOR = '#4F46E5';
	const GRAY_BG_COLOR = 'rgb(229, 231, 235)';

	export let checkpoint: Checkpoint | null;
	export let highContrastMode: boolean = false;
	export let progress: number = 0; // 0-100 representing overall exam progress

	// Enhanced function to determine text color with improved contrast
	function getTextColorForBackground(bgColor: string, defaultColor: string = '#FFFFFF'): string {
		if (!bgColor || highContrastMode) return defaultColor;

		// Remove hash if present and handle rgba format
		if (bgColor.startsWith('rgba')) {
			// Extract RGB values from rgba format
			const matches = bgColor.match(/rgba\((\d+),\s*(\d+),\s*(\d+)/);
			if (!matches) return defaultColor;

			const r = parseInt(matches[1]);
			const g = parseInt(matches[2]);
			const b = parseInt(matches[3]);

			// Calculate luminance - more sophisticated than simple brightness
			const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

			// Higher threshold for better contrast
			return luminance > 0.55 ? '#000000' : '#FFFFFF';
		}

		let hexColor = bgColor.replace(/^#/, '');

		// Convert 3-digit hex to 6-digit
		if (hexColor.length === 3) {
			hexColor = hexColor[0] + hexColor[0] + hexColor[1] + hexColor[1] + hexColor[2] + hexColor[2];
		}

		// Convert hex to RGB
		const r = parseInt(hexColor.substr(0, 2), 16);
		const g = parseInt(hexColor.substr(2, 2), 16);
		const b = parseInt(hexColor.substr(4, 2), 16);

		// Calculate luminance - more sophisticated than simple brightness
		const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

		// Higher threshold for better contrast
		return luminance > 0.55 ? '#000000' : '#FFFFFF';
	}

	// Determine colors based on position within progress bar
	$: progressBgColor = checkpoint?.color ?? DEFAULT_PROGRESS_COLOR;

	// Text colors for different parts of the banner
	$: textColorOnProgress = getTextColorForBackground(progressBgColor);
	$: textColorOnGray = highContrastMode
		? '#000000'
		: getTextColorForBackground(GRAY_BG_COLOR, '#000000');

	// Determine effective text color based on progress percentage and position
	$: leftSideTextColor = progress > 30 ? textColorOnProgress : textColorOnGray;
	$: rightSideTextColor = progress > 85 ? textColorOnProgress : textColorOnGray;
</script>

{#if checkpoint}
	<div
		class="relative mb-6 overflow-hidden rounded-lg transition-all duration-500 ease-out"
		style="border: {highContrastMode
			? '4px solid white'
			: `2px solid ${checkpoint?.color || '#000000'}`}; 
				box-shadow: {highContrastMode
			? `0 0 10px ${checkpoint?.color || '#FFFFFF'}, 0 0 15px ${checkpoint?.color || '#FFFFFF'}`
			: 'none'};"
		in:fly={{ y: -30, duration: 600, easing: quintOut }}
		out:scale={{ duration: 300, easing: quintOut }}
	>
		<!-- Progress bar background - gray for unfilled area -->
		<div class="absolute inset-0 w-full bg-gray-200"></div>

		<!-- Progress bar fill - checkpoint color -->
		<div
			class="absolute top-0 left-0 h-full transition-all duration-500 ease-out"
			style="width: {progress}%; 
				background-color: {checkpoint.color};"
		></div>

		<!-- Content container -->
		<div class="relative z-10 flex w-full items-center justify-between p-4">
			<div class="flex items-center">
				<span
					class="mr-3 text-3xl transition-transform duration-300 ease-out"
					in:scale={{ delay: 200, duration: 400, easing: bounceOut }}
				>
					{checkpoint.emoji}
				</span>
				<div class="flex flex-row gap-2 text-left">
					<div
						class="text-lg font-bold transition-all duration-300 ease-out"
						style="color: {highContrastMode ? 'white' : leftSideTextColor}; 
							text-shadow: {highContrastMode
							? `0 0 5px ${checkpoint.color}, 0 0 10px ${checkpoint.color}, 0 0 15px ${checkpoint.color}`
							: 'none'};"
						in:fly={{ x: 20, duration: 400, delay: 100, easing: quintOut }}
					>
						{checkpoint.name}
					</div>
					<div
						class="text-md my-auto transition-all duration-300 ease-out"
						style="color: {highContrastMode ? 'white' : leftSideTextColor}; 
							text-shadow: {highContrastMode
							? `0 0 3px ${checkpoint.color}, 0 0 6px ${checkpoint.color}`
							: 'none'};"
						in:fly={{ x: 20, duration: 400, delay: 200, easing: quintOut }}
					>
						(Since {checkpoint.time})
					</div>
				</div>
			</div>

			<!-- Progress percentage -->
			<div
				class="font-mono text-lg font-bold"
				style="color: {highContrastMode ? 'white' : rightSideTextColor}; 
					padding: 0 4px;
					background-color: {highContrastMode ? 'transparent' : 'rgba(255,255,255,0.6)'};
					border-radius: 4px;"
			>
				{progress}%
			</div>
		</div>
	</div>
{/if}
