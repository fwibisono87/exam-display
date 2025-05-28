<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let healthStatus: string;
	export let lastHealthCheck: string;
	export let responseTime: number;

	const dispatch = createEventDispatcher();

	function updateNow() {
		dispatch('updateNow');
	}
</script>

<div class="bg-white rounded-lg shadow-md p-4">
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
		<div class="flex items-center space-x-3">
			<h3 class="text-sm font-medium text-gray-700">System Status</h3>
			<div class="flex items-center space-x-2">
				<div class="w-2 h-2 rounded-full {healthStatus === 'healthy' ? 'bg-green-500' : 'bg-red-500'}"></div>
				<span class="text-xs font-medium capitalize {healthStatus === 'healthy' ? 'text-green-700' : 'text-red-700'}">
					{healthStatus}
				</span>
			</div>
		</div>
		
		<div class="flex items-center space-x-4 text-xs text-gray-500">
			<div>
				<span class="text-gray-400">Last Check:</span>
				<span class="font-mono ml-1">{lastHealthCheck}</span>
			</div>
			<div>
				<span class="text-gray-400">Response:</span>
				<span class="font-mono ml-1">{responseTime}ms</span>
			</div>
			<button 
				on:click={updateNow}
				class="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-xs transition-colors"
			>
				Update Now
			</button>
		</div>
	</div>
</div>
