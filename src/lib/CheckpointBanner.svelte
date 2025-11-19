<script lang="ts">
	import { fly, scale } from 'svelte/transition';
	import { bounceOut, quintOut } from 'svelte/easing';
	import { getReadableTextColor } from '$lib/utils/colorUtils';
	import type { Checkpoint } from '$lib/utils/checkpointManager';

	export let checkpoint: Checkpoint | null;
	export let highContrastMode: boolean = false;
	export let progress: number = 0; // 0-100 representing overall exam progress

	// Determine colors based on position within progress bar
	$: progressBgColor = checkpoint?.color || '#4F46E5';
	$: grayBgColor = '#E5E7EB'; // bg-gray-200

	// Get readable text colors using WCAG-compliant algorithm
	$: textOnProgress = highContrastMode
		? { color: '#FFFFFF', textShadow: 'none' }
		: getReadableTextColor(progressBgColor, { largeText: true, addShadow: false });

	$: textOnGray = highContrastMode
		? { color: '#FFFFFF', textShadow: 'none' }
		: getReadableTextColor(grayBgColor, { largeText: true, addShadow: false });

	// Determine effective text color based on progress percentage and position
	// Use smooth transitions instead of hard cutoffs
	$: leftSideTextColor = progress > 30 ? textOnProgress.color : textOnGray.color;
	$: rightSideTextColor = progress > 85 ? textOnProgress.color : textOnGray.color;
</script>

{#if checkpoint}
	<div
		role="progressbar"
		aria-valuenow={progress}
		aria-valuemin={0}
		aria-valuemax={100}
		aria-label="Exam progress: {checkpoint.name} - {progress}% complete"
		class="mb-6 rounded-lg transition-all duration-500 ease-out relative overflow-hidden"
		style="border: {highContrastMode ? '4px solid white' : `2px solid ${checkpoint?.color || '#000000'}`};"
		in:fly={{ y: -30, duration: 600, easing: quintOut }}
		out:scale={{ duration: 300, easing: quintOut }}
	>
		<!-- Progress bar background - gray for unfilled area -->
		<div class="absolute inset-0 w-full bg-gray-200" aria-hidden="true"></div>

		<!-- Progress bar fill - checkpoint color -->
		<div
			class="absolute top-0 left-0 h-full transition-all duration-500 ease-out"
			style="width: {progress}%; background-color: {checkpoint.color};"
			aria-hidden="true"
		></div>

		<!-- Content container -->
		<div class="p-4 flex items-center justify-between relative z-10 w-full">
			<div class="flex items-center">
				<span
					class="text-3xl mr-3 transition-transform duration-300 ease-out"
					role="img"
					aria-label={checkpoint.name}
					in:scale={{ delay: 200, duration: 400, easing: bounceOut }}
				>
					{checkpoint.emoji}
				</span>
				<div class="text-left flex flex-row gap-2">
					<div
						class="text-lg font-bold transition-all duration-300 ease-out"
						style="color: {highContrastMode ? 'white' : leftSideTextColor};"
						in:fly={{ x: 20, duration: 400, delay: 100, easing: quintOut }}
					>
						{checkpoint.name}
					</div>
					<div
						class="text-md my-auto transition-all duration-300 ease-out"
						style="color: {highContrastMode ? 'white' : leftSideTextColor};"
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
					background-color: {highContrastMode ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.6)'};
					border-radius: 4px;"
			>
				{progress}%
			</div>
		</div>
	</div>
{/if}
