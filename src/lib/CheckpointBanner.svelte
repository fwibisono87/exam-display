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
</script>

{#if checkpoint}
	<div 
		class="mb-6 p-4 rounded-lg flex items-center justify-center transition-all duration-500 ease-out transform hover:scale-105 hover:shadow-lg" 
		style="background-color: {checkpoint.color}20; border: 2px solid {checkpoint.color};"
		in:fly="{{ y: -30, duration: 600, easing: quintOut }}"
		out:scale="{{ duration: 300, easing: quintOut }}"
	>
		<span 
			class="text-3xl mr-3 transition-transform duration-300 ease-out hover:scale-125 hover:rotate-12"
			in:scale="{{ delay: 200, duration: 400, easing: bounceOut }}"
		>
			{checkpoint.emoji}
		</span>
		<div class="text-left">
			<div 
				class="text-lg font-bold transition-all duration-300 ease-out" 
				style="color: {checkpoint.color};"
				in:fly="{{ x: 20, duration: 400, delay: 100, easing: quintOut }}"
			>
				{checkpoint.name}
			</div>
			<div 
				class="text-sm text-gray-600 transition-all duration-300 ease-out"
				in:fly="{{ x: 20, duration: 400, delay: 200, easing: quintOut }}"
			>
				Active since {checkpoint.time}
			</div>
		</div>
	</div>
{/if}
