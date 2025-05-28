<script lang="ts">
	export let announcements: string;
	export let showAnnouncements: boolean;
	export let position: 'top' | 'left';
</script>

{#if showAnnouncements && announcements.trim()}
	<div class="bg-yellow-50 border-l-4 border-yellow-400 rounded-lg shadow-lg p-6 {position === 'left' ? 'sticky top-8' : 'mb-8'}">
		<div class="flex items-start">
			<div class="flex-1">
				<h2 class="text-xl font-semibold text-yellow-800 mb-3 flex items-center {position === 'left' ? '' : ''}">
					<svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
						<path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
					</svg>
					Announcements
				</h2>
				
				<div class="text-{position === 'left' ? 'base' : 'lg'} text-yellow-800 whitespace-pre-line leading-relaxed">
					{announcements}
				</div>
			</div>
		</div>
	</div>
{/if}
