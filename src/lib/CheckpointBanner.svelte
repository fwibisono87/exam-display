<script lang="ts">
	export let checkpoint: {
		id: string;
		name: string;
		time: string;
		enabled: boolean;
		emoji: string;
		color: string;
		isCustom: boolean;
	} | null;
</script>

{#if checkpoint}
	<div class="mb-6 p-4 rounded-lg flex items-center justify-center" style="background-color: {checkpoint.color}20; border: 2px solid {checkpoint.color};">
		<span class="text-3xl mr-3">{checkpoint.emoji}</span>
		<div class="text-left">
			<div class="text-lg font-bold" style="color: {checkpoint.color};">{checkpoint.name}</div>
			<div class="text-sm text-gray-600">Active since {checkpoint.time}</div>
		</div>
	</div>
{/if}
