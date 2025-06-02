<script lang="ts">
	export let healthStatus: string;
	export let highContrastMode: boolean = false;
</script>

<div class="flex items-center justify-center mt-2 mb-2">
	<span class="w-3 h-3 rounded-full mr-2 animate-pulse {highContrastMode ? 'outline outline-1 outline-white' : ''}"
		style="box-shadow: {highContrastMode ? '0 0 5px rgba(255,255,255,0.5)' : 'none'}"
		class:bg-green-500={healthStatus === 'healthy' && !highContrastMode}
		class:bg-yellow-400={!highContrastMode && (healthStatus === 'syncing' || healthStatus === 'checking...')}
		class:bg-red-500={healthStatus === 'unhealthy' && !highContrastMode}
		class:bg-white={highContrastMode && healthStatus === 'healthy'}
		class:bg-yellow-300={highContrastMode && (healthStatus === 'syncing' || healthStatus === 'checking...')}
		class:bg-red-400={highContrastMode && healthStatus === 'unhealthy'}
	></span>
	<span class="text-xs font-semibold {highContrastMode ? 'text-white text-shadow' : ''}"
		class:text-green-700={!highContrastMode && healthStatus === 'healthy'}
		class:text-yellow-700={!highContrastMode && (healthStatus === 'syncing' || healthStatus === 'checking...')}
		class:text-red-700={!highContrastMode && healthStatus === 'unhealthy'}
	>
		{healthStatus === 'healthy' ? 'Healthy' : healthStatus === 'unhealthy' ? 'Unhealthy' : 'Syncing...'}
	</span>
</div>

<style>
	.text-shadow {
		text-shadow: 1px 1px 3px rgba(0,0,0,0.8);
	}
</style>
