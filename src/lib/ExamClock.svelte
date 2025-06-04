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
	const FONT_SIZE_COEFFICIENT = 0.85; // Increased from 0.65 to be more aggressive
	const MAX_FONT_SIZE = 380; // Maximum font size in pixels - increased
	const MIN_FONT_SIZE = 60;  // Minimum font size in pixels
	
	// Viewport-specific scaling factors to ensure we fill different screen sizes appropriately
	function getViewportScalingFactor(): number {
		// During server-side rendering, return the default value
		if (typeof window === 'undefined') return 1.02;
		
		const width = window.innerWidth;
		
		// Special case for problematic width around 1024px
		if (width >= 1000 && width <= 1100) {
			return 1.25; // Much more aggressive boost specifically for 1024px width
		} else if (width >= 950 && width < 1000) {
			return 1.15; // Stronger boost for screens just below 1024px
		} else if (width >= 1100 && width < 1300) {
			return 1.12; // Strong boost for screens above 1024px
		} else if (width >= 768 && width < 950) {
			return 1.08; // Moderate boost for tablet-sized screens
		} else if (width >= 1300) {
			return 1.04; // Slight boost for large screens
		}
		return 1.02; // Small default boost for all other screens
	}
	
	// Function to adjust font size based on container width and time length
	function adjustFontSize() {
		if (!timeElement || !containerElement || typeof window === 'undefined') return;
		
		try {
			// Get the width of the container
			containerWidth = containerElement.clientWidth || 0;
			const containerHeight = typeof window !== 'undefined' ? window.innerHeight * 0.45 : 400; // Default height for SSR
			
			// Safety check - if container width is unusually small or zero, use fallback
			if (containerWidth < 20 && typeof window !== 'undefined') {
				containerWidth = window.innerWidth * 0.8; // Fallback to 80% of window width
			} else if (containerWidth < 20) {
				containerWidth = 800; // Reasonable default for SSR
			}
			
			// Determine character width factor - different characters take different amounts of space
			// Time format examples: "12:34" (5 chars), "12:34:56" (8 chars)
			const contentLength = serverTime?.length || 5;
			const timeHasSeconds = contentLength > 5;
			const charWidthFactor = timeHasSeconds ? 0.95 : 1.05; // Adjust based on format
		
			// Apply viewport-specific scaling
			const viewportScaling = getViewportScalingFactor();
			
			// Calculate based on width with more aggressive sizing
			let widthBasedSize = (containerWidth / contentLength) * FONT_SIZE_COEFFICIENT * charWidthFactor * viewportScaling;
			
			// Apply a fixed minimum at 1024px screen width to ensure we fill the space - only in browser
			if (typeof window !== 'undefined' && window.innerWidth >= 1000 && window.innerWidth <= 1100) {
				// For 1024px screens, enforce a minimum size based on container width
				const minSizeAt1024 = containerWidth * 0.18; // Ensure we use at least 18% of container width for each character
				widthBasedSize = Math.max(widthBasedSize, minSizeAt1024);
			}
			
			// Also consider height to prevent overflow
			let heightBasedSize = containerHeight * 0.95; // Increased from 0.9
			
			// Take the smaller of the two to ensure fitting in both dimensions
			fontSize = Math.min(widthBasedSize, heightBasedSize);
			
			// Apply constraints
			fontSize = Math.min(Math.max(fontSize, MIN_FONT_SIZE), MAX_FONT_SIZE);
			
			try {
				// Apply the calculated font size
				if (timeElement && fontSize > 0) {
					timeElement.style.fontSize = `${Math.floor(fontSize)}px`;
				}
			} catch (err) {
				console.warn('Error applying font size:', err);
			}
		} catch (error) {
			console.warn('Error calculating font size:', error);
		}
	}
	
	// Debounce function to limit how frequently we resize
	function debounce(func: Function, wait: number) {
		let timeout: ReturnType<typeof setTimeout>;
		return function executedFunction(...args: any[]) {
			const later = () => {
				clearTimeout(timeout);
				func(...args);
			};
			clearTimeout(timeout);
			timeout = setTimeout(later, wait);
		};
	}
	
	// Create a debounced version of the adjustFontSize function
	const debouncedAdjustFontSize = debounce(adjustFontSize, 100);
	
	// Set up resize observer for more reliable size detection
	let resizeObserver: ResizeObserver;
	
	// Set up the resize observer and event listeners
	onMount(() => {
		// Browser-only code - make sure we're running in the browser
		if (typeof window === 'undefined') return;
		
		// Initial size adjustment (with slight delay to ensure DOM is ready)
		setTimeout(adjustFontSize, 50);
		
		// Use ResizeObserver for more accurate container size tracking
		if (typeof ResizeObserver !== 'undefined') {
			try {
				resizeObserver = new ResizeObserver(entries => {
					requestAnimationFrame(() => adjustFontSize());
				});
				
				if (containerElement) {
					resizeObserver.observe(containerElement);
				}
			} catch (err) {
				console.warn('ResizeObserver failed to initialize:', err);
				// Fallback to window resize events only
			}
		}
		
		// Fallback to window resize events
		window.addEventListener('resize', debouncedAdjustFontSize);
		
		// Also adjust font size when the orientation changes
		window.addEventListener('orientationchange', adjustFontSize);
	});
	
	// Clean up event listeners when component is destroyed
	onDestroy(() => {
		// Browser-only cleanup
		if (typeof window !== 'undefined') {
			window.removeEventListener('resize', debouncedAdjustFontSize);
			window.removeEventListener('orientationchange', adjustFontSize);
			
			if (resizeObserver && containerElement) {
				resizeObserver.unobserve(containerElement);
				resizeObserver.disconnect();
			}
		}
	});
	
	// Adjust size when the time changes or when component updates
	afterUpdate(() => {
		// Only run in browser context
		if (typeof window !== 'undefined') {
			// Wait a tiny bit to ensure DOM is ready
			setTimeout(adjustFontSize, 10);
		}
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
		class="w-full py-2 transition-all duration-700 ease-out {highContrastMode ? 'bg-black' : ''}" 
		style="{activeCheckpoint ? 
			(highContrastMode ? 
				`background: linear-gradient(135deg, ${activeCheckpoint.color}30, ${activeCheckpoint.color}40);` : 
				`background: linear-gradient(135deg, ${activeCheckpoint.color}10, ${activeCheckpoint.color}20);`) 
			: ''}"
	>
		<!-- Exam Time Display - Adaptive Size -->
		<div 
			bind:this={timeElement}
			class="font-mono font-bold mb-0 leading-[0.9] transition-all duration-500 ease-out w-full text-center overflow-visible px-2"
			style="color: {highContrastMode ? 
				(activeCheckpoint ? '#FFFFFF' : '#FFFF00') : 
				(activeCheckpoint ? activeCheckpoint.color : '#4F46E5')}; 
				text-shadow: {highContrastMode ? 
					(activeCheckpoint ? 
						`0 0 5px ${activeCheckpoint.color}, 0 0 10px ${activeCheckpoint.color}, 0 0 15px ${activeCheckpoint.color}, 0 0 20px ${activeCheckpoint.color}` : 
						'0 0 5px #FFFF00, 0 0 10px #FFFF00, 0 0 15px #FFFF00, 0 0 20px #FFFF00') : 
					'none'}; 
				letter-spacing: -0.02em;"
			in:fly={{ y: -20, duration: 600, easing: quintOut }}
		>
			{serverTime || 'Loading...'}
		</div>
		
		<!-- Date/Timezone Combined Display - More compact for better clock placement -->
		{#if showDate || showTimezone}
			<div class="flex justify-center items-center space-x-3 mb-1">
				{#if showDate}
					<div 
						class="text-xl md:text-2xl lg:text-3xl font-medium transition-all duration-300 ease-out {highContrastMode ? 'text-white font-bold' : 'text-gray-700'}"
						in:fade="{{ delay: 200, duration: 400 }}"
					>
						{serverDate || ''}
					</div>
				{/if}
				{#if showTimezone && timezone}
					<div 
						class="text-lg md:text-xl lg:text-2xl transition-all duration-300 ease-out {highContrastMode ? 'text-gray-300 font-bold' : 'text-gray-600'}"
						in:fade="{{ delay: 300, duration: 400 }}"
					>
						{timezone}
					</div>
				{/if}
			</div>
		{/if}
		
		<!-- Next Checkpoint Info -->
		{#if nextCheckpoint}
			<div 
				class="mt-6 mx-auto max-w-md p-4 rounded-lg transition-all duration-400 ease-out"
				style="background-color: {highContrastMode ? nextCheckpoint.color : 'rgba(255, 255, 255, 0.7)'}; 
					border: {highContrastMode ? '2px solid white' : 'none'};
					box-shadow: {highContrastMode ? `0 0 10px ${nextCheckpoint.color}, 0 0 15px ${nextCheckpoint.color}` : 'none'};"
				in:fly="{{ y: 20, duration: 500, delay: 400, easing: quintOut }}"
			>
				<div class="flex items-center justify-center">
					<span class="text-2xl mr-3 transition-transform duration-200">{nextCheckpoint.emoji}</span>
					<div class="text-base md:text-lg">
						<span class="font-medium" style="color: {highContrastMode ? 'black' : ''}">Next: {nextCheckpoint.name}</span>
						<span class="ml-2 {highContrastMode ? 'font-bold' : ''}" style="color: {highContrastMode ? 'black' : '#4B5563'}">at {nextCheckpoint.time}</span>
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
