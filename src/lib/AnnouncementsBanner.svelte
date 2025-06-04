<script lang="ts">
	import { fly, slide } from 'svelte/transition';
	import { quintOut, backOut } from 'svelte/easing';
	import { onMount } from 'svelte';
	import MarkdownIt from 'markdown-it';

	export let announcements: string;
	export let showAnnouncements: boolean;
	export let position: 'top' | 'left';
	export let fontSize: number = 16;
	export let highContrastMode: boolean = false;
	
	// Initialize markdown parser with safe options
	let md: MarkdownIt;
	let renderedMarkdown: string = '';

	// Create the markdown parser instance once component is mounted
	onMount(() => {
		md = new MarkdownIt({
			html: false, // Disable HTML tags in source
			breaks: true, // Convert '\n' in paragraphs into <br>
			linkify: true, // Autoconvert URL-like text to links
			typographer: true // Enable some language-neutral replacements
		});
		parseMarkdown();
	});

	// Parse markdown when announcements change
	$: if (md && announcements) {
		parseMarkdown();
	}
	
	function parseMarkdown() {
		try {
			renderedMarkdown = md ? md.render(announcements) : announcements;
		} catch(e) {
			console.warn('Error parsing markdown:', e);
			renderedMarkdown = announcements; // Fallback to plain text
		}
	}
</script>

{#if showAnnouncements && announcements.trim()}
	<div 
		class="rounded-lg shadow-lg p-4 {position === 'left' ? 'xl:p-4' : 'p-6'} transition-all duration-500 ease-out transform hover:shadow-xl hover:scale-102 {position === 'left' ? 'sticky top-8' : 'mb-8'} {highContrastMode ? 'bg-yellow-400 border-4 border-white text-black' : 'bg-yellow-50 border-l-4 border-yellow-400'}"
		in:fly="{{ y: position === 'top' ? -50 : 0, x: position === 'left' ? -50 : 0, duration: 600, easing: quintOut }}"
		out:slide="{{ duration: 400, easing: quintOut }}"
	>
		<div class="flex items-start">
			<div class="flex-1 min-w-0">
				<h2 
					class="{position === 'left' ? 'text-lg xl:text-xl' : 'text-xl'} font-semibold mb-3 flex items-center transition-all duration-300 ease-out {highContrastMode ? 'text-black' : 'text-yellow-800'}"
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
					class="{position === 'left' ? 'text-sm xl:text-base' : 'text-lg'} leading-relaxed transition-all duration-400 ease-out markdown-content {highContrastMode ? 'text-black font-bold' : 'text-yellow-800'}"
					style="font-size: {fontSize}px;"
					in:fly={{ y: 20, duration: 500, delay: 300, easing: quintOut }}
				>
					{#if md}
						{@html renderedMarkdown}
					{:else}
						<p class="whitespace-pre-line">{announcements}</p>
					{/if}
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	/* Styles for markdown content */
	:global(.markdown-content) {
		/* Remove default whitespace-pre-line to allow markdown to format properly */
		white-space: normal;
	}
	
	:global(.markdown-content p) {
		margin-bottom: 1em;
	}
	
	:global(.markdown-content h1),
	:global(.markdown-content h2),
	:global(.markdown-content h3),
	:global(.markdown-content h4),
	:global(.markdown-content h5) {
		font-weight: bold;
		margin-top: 1em;
		margin-bottom: 0.5em;
	}
	
	:global(.markdown-content h1) {
		font-size: 1.5em;
	}
	
	:global(.markdown-content h2) {
		font-size: 1.3em;
	}
	
	:global(.markdown-content h3) {
		font-size: 1.2em;
	}
	
	:global(.markdown-content ul),
	:global(.markdown-content ol) {
		margin-left: 2em;
		margin-bottom: 1em;
	}
	
	:global(.markdown-content ul) {
		list-style-type: disc;
	}
	
	:global(.markdown-content ol) {
		list-style-type: decimal;
	}
	
	:global(.markdown-content li) {
		margin-bottom: 0.3em;
	}
	
	:global(.markdown-content a) {
		color: #3182ce;
		text-decoration: underline;
	}
	
	:global(.markdown-content code) {
		font-family: monospace;
		background-color: rgba(0, 0, 0, 0.1);
		padding: 0.1em 0.3em;
		border-radius: 3px;
		font-size: 0.9em;
	}
	
	:global(.markdown-content pre) {
		background-color: rgba(0, 0, 0, 0.1);
		padding: 0.5em;
		border-radius: 5px;
		overflow-x: auto;
		margin-bottom: 1em;
	}
	
	:global(.markdown-content blockquote) {
		border-left: 4px solid #718096;
		padding-left: 1em;
		font-style: italic;
		margin: 1em 0;
	}
</style>
