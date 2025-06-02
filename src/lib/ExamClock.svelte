<script lang="ts">
	import CheckpointBanner from './CheckpointBanner.svelte';
	import { createEventDispatcher, onMount, onDestroy, afterUpdate } from 'svelte';
	import { fly, fade } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';

	export let serverTime: string;
	export let serverDate: string;
	export let timezone: string;
	export let is24Hour: boolean;
	export let activeCheckpoint: any;
	export let nextCheckpoint: any;
	export let highContrastMode: boolean = false;
	export let showDate: boolean = false;
	export let showTimezone: boolean = false;

	// Reference to the time element and its container
	let timeElement: HTMLElement;
	let containerElement: HTMLElement;
	let fontSize: number = 0;
	let containerWidth: number = 0;
	
	// Coefficient to control how aggressively the font size fills the container
	// Higher values = larger font (can be adjusted as needed)
	const FONT_SIZE_COEFFICIENT = 0.65;
	const MAX_FONT_SIZE = 320; // Maximum font size in pixels
	const MIN_FONT_SIZE = 60;  // Minimum font size in pixels
	
	// Function to adjust font size based on container width and time length
	function adjustFontSize() {
		if (!timeElement || !containerElement) return;
		
		// Get the width of the container
		containerWidth = containerElement.clientWidth;
		const containerHeight = window.innerHeight * 0.4; // Use ~40% of viewport height
		
		// Calculate optimal font size based on container width and text length
		// The longer the time string, the smaller the font should be
		const contentLength = serverTime?.length || 5;
		
		// Calculate based on width
		let widthBasedSize = (containerWidth / contentLength) * FONT_SIZE_COEFFICIENT;
		
		// Also consider height to prevent overflow
		let heightBasedSize = containerHeight * 0.9; // Leave some margin
		
		// Take the smaller of the two to ensure fitting in both dimensions
		fontSize = Math.min(widthBasedSize, heightBasedSize);
		
		// Apply constraints
		fontSize = Math.min(Math.max(fontSize, MIN_FONT_SIZE), MAX_FONT_SIZE);
		
		// Apply the calculated font size
		timeElement.style.fontSize = `${fontSize}px`;
	}
	
	// Set up the resize observer and event listeners
	onMount(() => {
		// Initial size adjustment
		adjustFontSize();
		
		// Add resize event listener
		window.addEventListener('resize', adjustFontSize);
	});
	
	// Clean up event listeners when component is destroyed
	onDestroy(() => {
		window.removeEventListener('resize', adjustFontSize);
	});
	
	// Adjust size when the time changes
	afterUpdate(() => {
		adjustFontSize();
	});

	const dispatch = createEventDispatcher();

	function toggleTimeFormat() {
		dispatch('toggleTimeFormat');
	}
</script>

<div class="w-full text-center">
	<!-- Active Checkpoint Banner -->
	<CheckpointBanner checkpoint={activeCheckpoint} {highContrastMode} />
	
	<!-- Full Width Time Display -->
	<div 
		bind:this={containerElement}
		class="w-full py-4 transition-all duration-700 ease-out {highContrastMode ? 'bg-black' : ''}" 
		style="{activeCheckpoint && !highContrastMode ? `background: linear-gradient(135deg, ${activeCheckpoint.color}10, ${activeCheckpoint.color}20);` : ''}"
	>
		<!-- Exam Time Display - Adaptive Size -->
		<div 
			bind:this={timeElement}
			class="font-mono font-bold mb-2 leading-none transition-all duration-500 ease-out w-full text-center"
			style="color: {highContrastMode ? '#FFFF00' : (activeCheckpoint ? activeCheckpoint.color : '#4F46E5')};"
			in:fly="{{ y: -20, duration: 600, easing: quintOut }}"
		>
			{serverTime || 'Loading...'}
		</div>
		
		<!-- Date Display -->
		{#if showDate}
			<div 
				class="text-2xl md:text-3xl lg:text-4xl xl:text-5xl mb-2 font-medium transition-all duration-300 ease-out {highContrastMode ? 'text-white font-bold' : 'text-gray-700'}"
				in:fade="{{ delay: 200, duration: 400 }}"
			>
				{serverDate || ''}
			</div>
		{/if}
		
		{#if showTimezone}
			{#if timezone}
				<div 
					class="text-xl md:text-2xl lg:text-3xl transition-all duration-300 ease-out {highContrastMode ? 'text-gray-300 font-bold' : 'text-gray-600'}"
					in:fade="{{ delay: 300, duration: 400 }}"
				>
					{timezone}
				</div>
			{/if}
		{/if}
		
		<!-- Next Checkpoint Info -->
		{#if nextCheckpoint}
			<div 
				class="mt-6 mx-auto max-w-md p-4 rounded-lg transition-all duration-400 ease-out transform hover:scale-102 {highContrastMode ? 'bg-yellow-400 border-2 border-white' : 'bg-white bg-opacity-70'}"
				in:fly="{{ y: 20, duration: 500, delay: 400, easing: quintOut }}"
			>
				<div class="flex items-center justify-center">
					<span class="text-2xl mr-3 transition-transform duration-200 hover:scale-125">{nextCheckpoint.emoji}</span>
					<div class="text-base md:text-lg">
						<span class="font-medium {highContrastMode ? 'text-black' : ''}">Next: {nextCheckpoint.name}</span>
						<span class="ml-2 {highContrastMode ? 'text-black font-bold' : 'text-gray-600'}">at {nextCheckpoint.time}</span>
					</div>
				</div>
			</div>
		{/if}
	</div>
	
	<div class="flex items-center justify-center space-x-4 text-base md:text-lg mt-4 transition-all duration-300 ease-out {highContrastMode ? 'text-white' : 'text-gray-500'}">
		<div class="flex items-center space-x-2">
			<span class="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
			<span class="{highContrastMode ? 'font-bold' : ''}">Live clock • Syncs with server every 5 minutes</span>
		</div>
		<button 
			on:click={toggleTimeFormat}
			class="px-4 py-2 rounded-lg transition-all duration-200 ease-out text-base font-medium border transform hover:scale-105 active:scale-95 {highContrastMode ? 'bg-yellow-400 hover:bg-yellow-300 text-black border-2 border-white hover:shadow-lg' : 'bg-gray-100 hover:bg-gray-200 text-gray-700 hover:shadow-md'}"
			title="Toggle between 12-hour and 24-hour format"
		>
			{is24Hour ? '24H' : '12H'}
		</button>
	</div>
</div>
