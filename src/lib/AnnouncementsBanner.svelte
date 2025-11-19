<script lang="ts">
	import { fly, slide } from 'svelte/transition';
	import { quintOut, backOut } from 'svelte/easing';
	import { onMount } from 'svelte';
	import MarkdownIt from 'markdown-it';

	export let announcements: string;
	export let showAnnouncements: boolean;
	export let position: 'top' | 'left' | 'bottom' | 'overlay';
	export let fontSize: number = 16;
	export let highContrastMode: boolean = false;
	export let priority: 'info' | 'warning' | 'critical' = 'info';

	// Initialize markdown parser with safe options
	let md: MarkdownIt;
	let renderedMarkdown: string = '';
	let previousAnnouncements: string = '';

	// Create the markdown parser instance once component is mounted
	onMount(() => {
		// Only initialize in browser environment
		if (typeof window !== 'undefined') {
			md = new MarkdownIt({
				html: false, // Disable HTML tags in source
				breaks: true, // Convert '\n' in paragraphs into <br>
				linkify: true, // Autoconvert URL-like text to links
				typographer: true // Enable some language-neutral replacements
			});
			parseMarkdown();
			previousAnnouncements = announcements;
		}
	});

	// Parse markdown when announcements change
	$: if (md && announcements) {
		parseMarkdown();
	}

	// Track announcements changes (for aria-live)
	$: if (announcements !== previousAnnouncements && typeof window !== 'undefined') {
		previousAnnouncements = announcements;
	}

	function parseMarkdown() {
		// Check if we're in browser environment
		if (typeof window === 'undefined') {
			renderedMarkdown = announcements; // On server, just use plain text
			return;
		}

		try {
			renderedMarkdown = md ? md.render(announcements) : announcements;
		} catch(e) {
			console.warn('Error parsing markdown:', e);
			renderedMarkdown = announcements; // Fallback to plain text
		}
	}

	// Get styles based on priority
	$: priorityStyles = highContrastMode
		? {
				info: 'bg-yellow-400 border-white text-black',
				warning: 'bg-yellow-400 border-white text-black',
				critical: 'bg-red-500 border-white text-white'
		  }[priority]
		: {
				info: 'bg-blue-50 border-blue-400 text-blue-900',
				warning: 'bg-yellow-50 border-yellow-400 text-yellow-900',
				critical: 'bg-red-50 border-red-400 text-red-900'
		  }[priority];

	$: priorityIcon = {
		info: 'ℹ️',
		warning: '⚠️',
		critical: '🚨'
	}[priority];

	let ariaLive: 'assertive' | 'polite' = 'polite';
	$: ariaLive = priority === 'critical' ? 'assertive' : 'polite';
</script>

{#if showAnnouncements && announcements.trim()}
	<section
		role="region"
		aria-label="Exam announcements"
		aria-live={ariaLive}
		aria-atomic="true"
		class="rounded-lg shadow-lg p-4 {position === 'left' ? 'xl:p-4' : 'p-6'} transition-all duration-500 ease-out {position === 'left' ? 'sticky top-8' : position === 'bottom' ? 'mt-8' : position === 'overlay' ? 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-40 max-w-2xl' : 'mb-8'} border-4 {priorityStyles} {highContrastMode ? 'shadow-2xl' : ''}"
		in:fly="{{ y: position === 'top' ? -50 : position === 'bottom' ? 50 : 0, x: position === 'left' ? -50 : 0, duration: 600, easing: quintOut }}"
		out:slide="{{ duration: 400, easing: quintOut }}"
	>
		<div class="flex items-start">
			<div class="flex-1 min-w-0">
				<h2
					id="announcements-heading"
					class="{position === 'left' ? 'text-lg xl:text-xl' : 'text-xl'} font-semibold mb-3 flex items-center transition-all duration-300 ease-out"
					in:fly="{{ y: -10, duration: 400, delay: 200, easing: backOut }}"
				>
					<span class="text-2xl mr-2 flex-shrink-0" role="img" aria-label="{priority} priority">
						{priorityIcon}
					</span>
					<span class="truncate">Announcements</span>
				</h2>

				<div
					class="{position === 'left' ? 'text-sm xl:text-base' : 'text-lg'} leading-relaxed transition-all duration-400 ease-out markdown-content {highContrastMode ? 'font-bold' : ''}"
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
	</section>
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
