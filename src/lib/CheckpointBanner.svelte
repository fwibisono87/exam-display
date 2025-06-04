<script lang="ts">
	import { fly, scale } from 'svelte/transition';
	import { bounceOut, quintOut } from 'svelte/easing';

	export let checkpoint: {
		id: string;
		name: string;
		time: string;
		enabled: boolean;
		emoji: string;
		color: string;
		isCustom: boolean;
	} | null;
	export let highContrastMode: boolean = false;
	export let progress: number = 0; // 0-100 representing overall exam progress
	
	// Helper function to determine if a color is light or dark
	// Returns true for light colors, false for dark colors
	function isLightColor(hexColor: string): boolean {
		// If no color provided, assume dark
		if (!hexColor) return false;
		
		// Remove hash if present
		hexColor = hexColor.replace(/^#/, '');
		
		// Convert 3-digit hex to 6-digit
		if (hexColor.length === 3) {
			hexColor = hexColor[0] + hexColor[0] + hexColor[1] + hexColor[1] + hexColor[2] + hexColor[2];
		}
		
		// Convert hex to RGB
		const r = parseInt(hexColor.substr(0, 2), 16);
		const g = parseInt(hexColor.substr(2, 2), 16);
		const b = parseInt(hexColor.substr(4, 2), 16);
		
		// Calculate brightness (YIQ formula)
		const brightness = (r * 299 + g * 587 + b * 114) / 1000;
		
		// Return true for light colors (>128), false for dark (<128)
		return brightness > 128;
	}
	
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
	$: progressBgColor = checkpoint?.color || '#4F46E5';
	$: grayBgColor = 'rgb(229, 231, 235)'; // bg-gray-200
	
	// Text colors for different parts of the banner
	$: textColorOnProgress = getTextColorForBackground(progressBgColor);
	$: textColorOnGray = getTextColorForBackground(grayBgColor, '#000000');
	
	// Determine effective text color based on progress percentage and position
	$: leftSideTextColor = progress > 30 ? textColorOnProgress : textColorOnGray;
	$: rightSideTextColor = progress > 85 ? textColorOnProgress : textColorOnGray;
</script>

{#if checkpoint}
	<div 
		class="mb-6 rounded-lg transition-all duration-500 ease-out relative overflow-hidden" 
		style="border: {highContrastMode ? '4px solid white' : `2px solid ${checkpoint?.color || '#000000'}`}; 
				box-shadow: {highContrastMode ? `0 0 10px ${checkpoint?.color || '#FFFFFF'}, 0 0 15px ${checkpoint?.color || '#FFFFFF'}` : 'none'};"
		in:fly={{ y: -30, duration: 600, easing: quintOut }}
		out:scale={{ duration: 300, easing: quintOut }}
	>
		<!-- Progress bar background - gray for unfilled area -->
		<div class="absolute inset-0 w-full bg-gray-200"></div>
		
		<!-- Progress bar fill - checkpoint color -->
		<div class="absolute top-0 left-0 h-full transition-all duration-500 ease-out"
			style="width: {progress}%; 
				background-color: {checkpoint.color};">
		</div>
		
		<!-- Content container -->
		<div class="p-4 flex items-center justify-between relative z-10 w-full">
			<div class="flex items-center">
				<span 
					class="text-3xl mr-3 transition-transform duration-300 ease-out"
					in:scale={{ delay: 200, duration: 400, easing: bounceOut }}
				>
					{checkpoint.emoji}
				</span>
				<div class="text-left flex flex-row gap-2">
					<div 
						class="text-lg font-bold transition-all duration-300 ease-out" 
						style="color: {highContrastMode ? 'white' : leftSideTextColor}; 
							text-shadow: {highContrastMode ? 
								`0 0 5px ${checkpoint.color}, 0 0 10px ${checkpoint.color}, 0 0 15px ${checkpoint.color}` : 
								'none'};"
						in:fly={{ x: 20, duration: 400, delay: 100, easing: quintOut }}
					>
						{checkpoint.name}
					</div>
					<div 
						class="text-md my-auto transition-all duration-300 ease-out"
						style="color: {highContrastMode ? 'white' : leftSideTextColor}; 
							text-shadow: {highContrastMode ? 
								`0 0 3px ${checkpoint.color}, 0 0 6px ${checkpoint.color}` : 
								'none'};"
						in:fly={{ x: 20, duration: 400, delay: 200, easing: quintOut }}
					>
						(Since {checkpoint.time})
					</div>
				</div>
			</div>
			
			<!-- Progress percentage -->
			<div class="font-mono text-lg font-bold" 
				style="color: {highContrastMode ? 'white' : rightSideTextColor}; 
					padding: 0 4px;
					background-color: {highContrastMode ? 'transparent' : 'rgba(255,255,255,0.6)'};
					border-radius: 4px;">
				{progress}%
			</div>
		</div>
	</div>
{/if}
