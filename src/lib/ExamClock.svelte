<script lang="ts">
	import CheckpointBanner from './CheckpointBanner.svelte';
	import { createEventDispatcher } from 'svelte';
	import { fly, fade } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';

	export let serverTime: string;
	export let serverDate: string;
	export let timezone: string;
	export let is24Hour: boolean;
	export let activeCheckpoint: any;
	export let nextCheckpoint: any;
	export let highContrastMode: boolean = false;

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
		class="w-full py-4 transition-all duration-700 ease-out {highContrastMode ? 'bg-black' : ''}" 
		style="{activeCheckpoint && !highContrastMode ? `background: linear-gradient(135deg, ${activeCheckpoint.color}10, ${activeCheckpoint.color}20);` : ''}"
	>
		<!-- Exam Time Display - Maximized -->
		<div 
			class="text-9xl sm:text-[12rem] md:text-[16rem] lg:text-[20rem] xl:text-[24rem] 2xl:text-[28rem] font-mono font-bold mb-2 leading-none transition-all duration-500 ease-out w-full" 
			style="color: {highContrastMode ? '#FFFF00' : (activeCheckpoint ? activeCheckpoint.color : '#4F46E5')};"
			in:fly="{{ y: -20, duration: 600, easing: quintOut }}"
		>
			{serverTime || 'Loading...'}
		</div>
		
		<!-- Date Display -->
		<div 
			class="text-2xl md:text-3xl lg:text-4xl xl:text-5xl mb-2 font-medium transition-all duration-300 ease-out {highContrastMode ? 'text-white font-bold' : 'text-gray-700'}"
			in:fade="{{ delay: 200, duration: 400 }}"
		>
			{serverDate || ''}
		</div>
		
		{#if timezone}
			<div 
				class="text-xl md:text-2xl lg:text-3xl transition-all duration-300 ease-out {highContrastMode ? 'text-gray-300 font-bold' : 'text-gray-600'}"
				in:fade="{{ delay: 300, duration: 400 }}"
			>
				{timezone}
			</div>
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
