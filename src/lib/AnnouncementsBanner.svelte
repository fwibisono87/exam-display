<script lang="ts">
	import { fly, slide } from 'svelte/transition';
	import { quintOut, backOut } from 'svelte/easing';

	export let announcements: string;
	export let showAnnouncements: boolean;
	export let position: 'top' | 'left';
</script>

{#if showAnnouncements && announcements.trim()}
	<div 
		class="bg-yellow-50 border-l-4 border-yellow-400 rounded-lg shadow-lg p-4 {position === 'left' ? 'xl:p-4' : 'p-6'} transition-all duration-500 ease-out transform hover:shadow-xl hover:scale-102 {position === 'left' ? 'sticky top-8' : 'mb-8'}"
		in:fly="{{ y: position === 'top' ? -50 : 0, x: position === 'left' ? -50 : 0, duration: 600, easing: quintOut }}"
		out:slide="{{ duration: 400, easing: quintOut }}"
	>
		<div class="flex items-start">
			<div class="flex-1 min-w-0">
				<h2 
					class="{position === 'left' ? 'text-lg xl:text-xl' : 'text-xl'} font-semibold text-yellow-800 mb-3 flex items-center transition-all duration-300 ease-out"
					in:fly="{{ y: -10, duration: 400, delay: 200, easing: backOut }}"
				>
					<svg 
						class="{position === 'left' ? 'w-4 h-4' : 'w-5 h-5'} mr-2 transition-transform duration-300 ease-out hover:scale-125 hover:rotate-12 flex-shrink-0" 
						fill="currentColor" 
						viewBox="0 0 20 20"
					>
						<path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
					</svg>
					<span class="truncate">Announcements</span>
				</h2>
				
				<div 
					class="{position === 'left' ? 'text-sm xl:text-base' : 'text-lg'} text-yellow-800 whitespace-pre-line leading-relaxed transition-all duration-400 ease-out"
					in:fly="{{ y: 20, duration: 500, delay: 300, easing: quintOut }}"
				>
					{announcements}
				</div>
			</div>
		</div>
	</div>
{/if}
