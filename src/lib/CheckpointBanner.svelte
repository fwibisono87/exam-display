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
</script>

{#if checkpoint}
	<div 
		class="mb-6 rounded-lg transition-all duration-500 ease-out relative overflow-hidden" 
		style="border: {highContrastMode ? '4px solid white' : `2px solid ${checkpoint?.color || '#000000'}`}; 
				box-shadow: {highContrastMode ? `0 0 10px ${checkpoint?.color || '#FFFFFF'}, 0 0 15px ${checkpoint?.color || '#FFFFFF'}` : 'none'};"
		in:fly={{ y: -30, duration: 600, easing: quintOut }}
		out:scale={{ duration: 300, easing: quintOut }}
	>
		<!-- Progress bar background -->
		<div class="absolute inset-0 w-full bg-gray-200 opacity-25"></div>
		
		<!-- Progress bar fill -->
		<div class="absolute top-0 left-0 h-full transition-all duration-500 ease-out"
			style="width: {progress}%; background-color: {highContrastMode ? 'white' : checkpoint.color}; opacity: {highContrastMode ? '0.4' : '0.3'};"></div>
		
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
						style="color: {highContrastMode ? 'white' : checkpoint.color}; 
							text-shadow: {highContrastMode ? 
								`0 0 5px ${checkpoint.color}, 0 0 10px ${checkpoint.color}, 0 0 15px ${checkpoint.color}` : 
								'none'};"
						in:fly={{ x: 20, duration: 400, delay: 100, easing: quintOut }}
					>
						{checkpoint.name}
					</div>
					<div 
						class="text-md my-auto transition-all duration-300 ease-out {highContrastMode ? 'text-white font-bold' : 'text-gray-600'}"
						style="text-shadow: {highContrastMode ? 
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
				style="color: {highContrastMode ? 'white' : checkpoint.color}; 
					text-shadow: {highContrastMode ? 
						`0 0 5px ${checkpoint.color}, 0 0 10px ${checkpoint.color}` : 
						'none'};">
				{progress}%
			</div>
		</div>
	</div>
{/if}
