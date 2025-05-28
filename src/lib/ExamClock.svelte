<script lang="ts">
	import CheckpointBanner from './CheckpointBanner.svelte';
	import { createEventDispatcher } from 'svelte';

	export let serverTime: string;
	export let serverDate: string;
	export let timezone: string;
	export let is24Hour: boolean;
	export let activeCheckpoint: any;
	export let nextCheckpoint: any;

	const dispatch = createEventDispatcher();

	function toggleTimeFormat() {
		dispatch('toggleTimeFormat');
	}
</script>

<div class="bg-white rounded-lg shadow-xl p-8 mb-6">
	<div class="text-center">
		<!-- Active Checkpoint Banner -->
		<CheckpointBanner checkpoint={activeCheckpoint} />
		
		<div class="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl p-8 mb-4" style="{activeCheckpoint ? `background: linear-gradient(135deg, ${activeCheckpoint.color}10, ${activeCheckpoint.color}20);` : ''}">
			<!-- Exam Time Display -->
			<div class="text-7xl md:text-8xl font-mono font-bold mb-4 leading-none" style="color: {activeCheckpoint ? activeCheckpoint.color : '#4F46E5'};">
				{serverTime || 'Loading...'}
			</div>
			
			<!-- Date Display -->
			<div class="text-xl md:text-2xl text-gray-700 mb-3 font-medium">
				{serverDate || ''}
			</div>
			
			{#if timezone}
				<div class="text-base text-gray-600">
					{timezone}
				</div>
			{/if}
			
			<!-- Next Checkpoint Info -->
			{#if nextCheckpoint}
				<div class="mt-4 p-3 bg-white bg-opacity-70 rounded-lg">
					<div class="flex items-center justify-center">
						<span class="text-lg mr-2">{nextCheckpoint.emoji}</span>
						<div class="text-sm">
							<span class="font-medium">Next: {nextCheckpoint.name}</span>
							<span class="text-gray-600 ml-2">at {nextCheckpoint.time}</span>
						</div>
					</div>
				</div>
			{/if}
		</div>
		
		<div class="flex items-center justify-center space-x-4 text-sm text-gray-500">
			<div class="flex items-center space-x-2">
				<span class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
				<span>Live clock • Syncs with server every 5 minutes</span>
			</div>
			<button 
				on:click={toggleTimeFormat}
				class="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded-lg transition-colors text-sm font-medium border"
				title="Toggle between 12-hour and 24-hour format"
			>
				{is24Hour ? '24H' : '12H'}
			</button>
		</div>
	</div>
</div>
