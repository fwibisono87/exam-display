<script lang="ts">
	export let healthStatus: string;
	export let highContrastMode: boolean = false;

	$: statusTone =
		healthStatus === 'healthy'
			? highContrastMode
				? 'bg-emerald-300'
				: 'bg-emerald-600'
			: healthStatus === 'unhealthy'
				? highContrastMode
					? 'bg-red-400'
					: 'bg-red-600'
				: highContrastMode
					? 'bg-yellow-300'
					: 'bg-amber-400';

	$: statusLabel =
		healthStatus === 'healthy'
			? 'Clock sync healthy'
			: healthStatus === 'unhealthy'
				? 'Clock sync unavailable'
				: 'Checking time source';
</script>

<div
	class={`inline-flex items-center gap-4 border px-5 py-3 text-base font-semibold ${
		highContrastMode
			? 'border-white bg-black text-white'
			: 'border-slate-300 bg-white text-slate-700'
	}`}
>
	<span class={`h-4 w-4 rounded-full ${statusTone}`}></span>
	<span>{statusLabel}</span>
</div>
