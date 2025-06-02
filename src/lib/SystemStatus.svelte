<script lang="ts">
	export let healthStatus: string;
	export let highContrastMode: boolean = false;
</script>

<div class="flex items-center justify-center mt-2 mb-2">
	<span class="w-3 h-3 rounded-full mr-2 animate-pulse"
		class:bg-green-500={healthStatus === 'healthy'}
		class:bg-yellow-400={healthStatus === 'syncing' || healthStatus === 'checking...'}
		class:bg-red-500={healthStatus === 'unhealthy'}
		class:bg-white={highContrastMode && healthStatus === 'healthy'}
		class:bg-yellow-300={highContrastMode && (healthStatus === 'syncing' || healthStatus === 'checking...')}
		class:bg-red-400={highContrastMode && healthStatus === 'unhealthy'}
	></span>
	<span class="text-xs font-semibold"
		class:text-green-700={healthStatus === 'healthy'}
		class:text-yellow-700={healthStatus === 'syncing' || healthStatus === 'checking...'}
		class:text-red-700={healthStatus === 'unhealthy'}
		class:text-white={highContrastMode}
	>
		{healthStatus === 'healthy' ? 'Healthy' : healthStatus === 'unhealthy' ? 'Unhealthy' : 'Syncing...'}
	</span>
</div>
