<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { fly, scale } from 'svelte/transition';
	import { quintOut, backOut } from 'svelte/easing';

	export let healthStatus: string;
	export let lastHealthCheck: string;
	export let responseTime: number;

	const dispatch = createEventDispatcher();

	function updateNow() {
		dispatch('updateNow');
	}
</script>

<div 
	class="bg-white rounded-lg shadow-md p-4 transition-all duration-500 ease-out transform hover:shadow-lg hover:scale-102"
	in:fly="{{ y: 30, duration: 500, delay: 200, easing: quintOut }}"
>
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
		<div class="flex items-center space-x-3">
			<h3 
				class="text-sm font-medium text-gray-700 transition-all duration-300 ease-out"
				in:fly="{{ x: -20, duration: 400, delay: 100, easing: quintOut }}"
			>
				System Status
			</h3>
			<div 
				class="flex items-center space-x-2"
				in:scale="{{ delay: 200, duration: 400, easing: backOut }}"
			>
				<div class="w-2 h-2 rounded-full transition-all duration-500 ease-out {healthStatus === 'healthy' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}"></div>
				<span class="text-xs font-medium capitalize transition-all duration-300 ease-out {healthStatus === 'healthy' ? 'text-green-700' : 'text-red-700'}">
					{healthStatus}
				</span>
			</div>
		</div>
		
		<div 
			class="flex items-center space-x-4 text-xs text-gray-500"
			in:fly="{{ x: 20, duration: 400, delay: 300, easing: quintOut }}"
		>
			<div class="transition-all duration-300 ease-out hover:text-gray-700">
				<span class="text-gray-400">Last Check:</span>
				<span class="font-mono ml-1">{lastHealthCheck}</span>
			</div>
			<div class="transition-all duration-300 ease-out hover:text-gray-700">
				<span class="text-gray-400">Response:</span>
				<span class="font-mono ml-1">{responseTime}ms</span>
			</div>
			<button 
				on:click={updateNow}
				class="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-xs transition-all duration-200 ease-out transform hover:scale-105 active:scale-95 hover:shadow-md"
			>
				Update Now
			</button>
		</div>
	</div>
</div>
