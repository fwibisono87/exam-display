<script lang="ts">
	/* eslint-disable svelte/no-at-html-tags */
	import { fly, slide } from 'svelte/transition';
	import { quintOut, backOut } from 'svelte/easing';
	import { onMount } from 'svelte';
	import MarkdownIt from 'markdown-it';

	const ALLOWED_TAGS = new Set([
		'A',
		'BLOCKQUOTE',
		'BR',
		'CODE',
		'EM',
		'H1',
		'H2',
		'H3',
		'H4',
		'H5',
		'LI',
		'OL',
		'P',
		'PRE',
		'STRONG',
		'UL'
	]);
	const SAFE_PROTOCOLS = new Set(['http:', 'https:', 'mailto:']);

	export let announcements: string;
	export let showAnnouncements: boolean;
	export let position: 'top' | 'left';
	export let fontSize: number = 16;
	export let highContrastMode: boolean = false;

	// Initialize markdown parser with safe options
	let md: MarkdownIt | null = null;
	let renderedMarkdown: string = '';

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
		}
	});

	// Parse markdown when announcements change
	$: if (announcements) {
		parseMarkdown();
	} else {
		renderedMarkdown = '';
	}

	function sanitizeHref(href: string): string | null {
		if (href.startsWith('#') || href.startsWith('/')) {
			return href;
		}

		try {
			const url = new URL(href);
			return SAFE_PROTOCOLS.has(url.protocol) ? href : null;
		} catch {
			return null;
		}
	}

	function sanitizeRenderedMarkdown(html: string): string {
		if (typeof window === 'undefined') {
			return html;
		}

		const template = document.createElement('template');
		template.innerHTML = html;

		const sanitizeNode = (node: Node) => {
			if (node.nodeType !== Node.ELEMENT_NODE) {
				return;
			}

			const element = node as HTMLElement;

			for (const child of Array.from(element.childNodes)) {
				sanitizeNode(child);
			}

			if (!ALLOWED_TAGS.has(element.tagName)) {
				element.replaceWith(...Array.from(element.childNodes));
				return;
			}

			for (const attribute of Array.from(element.attributes)) {
				if (element.tagName === 'A' && attribute.name === 'href') {
					const safeHref = sanitizeHref(attribute.value);

					if (safeHref) {
						element.setAttribute('href', safeHref);
						element.setAttribute('rel', 'noopener noreferrer');
						element.setAttribute('target', '_blank');
					} else {
						element.removeAttribute(attribute.name);
					}

					continue;
				}

				element.removeAttribute(attribute.name);
			}
		};

		for (const child of Array.from(template.content.childNodes)) {
			sanitizeNode(child);
		}

		return template.innerHTML;
	}

	function parseMarkdown() {
		if (!announcements.trim()) {
			renderedMarkdown = '';
			return;
		}

		// Check if we're in browser environment
		if (typeof window === 'undefined') {
			renderedMarkdown = announcements; // On server, just use plain text
			return;
		}

		try {
			renderedMarkdown = md ? sanitizeRenderedMarkdown(md.render(announcements)) : announcements;
		} catch (error) {
			console.warn('Error parsing markdown:', error);
			renderedMarkdown = announcements; // Fallback to plain text
		}
	}
</script>

{#if showAnnouncements && announcements.trim()}
	<div
		class="rounded-lg p-4 shadow-lg {position === 'left'
			? 'xl:p-4'
			: 'p-6'} transform transition-all duration-500 ease-out hover:scale-102 hover:shadow-xl {position ===
		'left'
			? 'sticky top-8'
			: 'mb-8'} {highContrastMode
			? 'border-4 border-white bg-yellow-400 text-black'
			: 'border-l-4 border-yellow-400 bg-yellow-50'}"
		in:fly={{
			y: position === 'top' ? -50 : 0,
			x: position === 'left' ? -50 : 0,
			duration: 600,
			easing: quintOut
		}}
		out:slide={{ duration: 400, easing: quintOut }}
	>
		<div class="flex items-start">
			<div class="min-w-0 flex-1">
				<h2
					class="{position === 'left'
						? 'text-lg xl:text-xl'
						: 'text-xl'} mb-3 flex items-center font-semibold transition-all duration-300 ease-out {highContrastMode
						? 'text-black'
						: 'text-yellow-800'}"
					in:fly={{ y: -10, duration: 400, delay: 200, easing: backOut }}
				>
					<svg
						class="{position === 'left'
							? 'h-4 w-4'
							: 'h-5 w-5'} mr-2 flex-shrink-0 transition-transform duration-300 ease-out hover:scale-125 hover:rotate-12"
						fill="currentColor"
						viewBox="0 0 20 20"
					>
						<path
							fill-rule="evenodd"
							d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
							clip-rule="evenodd"
						></path>
					</svg>
					<span class="truncate">Announcements</span>
				</h2>

				<div
					class="{position === 'left'
						? 'text-sm xl:text-base'
						: 'text-lg'} markdown-content leading-relaxed transition-all duration-400 ease-out {highContrastMode
						? 'font-bold text-black'
						: 'text-yellow-800'}"
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
