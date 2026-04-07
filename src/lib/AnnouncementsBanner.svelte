<script lang="ts">
	/* eslint-disable svelte/no-at-html-tags */
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
	export let fontSize: number = 32;
	export let highContrastMode: boolean = false;

	let md: MarkdownIt | null = null;
	let renderedMarkdown = '';

	onMount(() => {
		if (typeof window === 'undefined') return;

		md = new MarkdownIt({
			html: false,
			breaks: true,
			linkify: true,
			typographer: true
		});

		parseMarkdown();
	});

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
			if (node.nodeType !== Node.ELEMENT_NODE) return;

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

		if (typeof window === 'undefined') {
			renderedMarkdown = announcements;
			return;
		}

		try {
			renderedMarkdown = md ? sanitizeRenderedMarkdown(md.render(announcements)) : announcements;
		} catch {
			renderedMarkdown = announcements;
		}
	}
</script>

{#if showAnnouncements && announcements.trim()}
	<section
		class={`overflow-hidden border ${
			highContrastMode
				? 'border-white bg-black text-white shadow-none'
				: 'border-slate-300 bg-white text-slate-900'
		}`}
	>
		<div
			class={`border-b px-5 py-3 ${
				highContrastMode
					? 'border-white bg-yellow-300 text-black'
					: 'border-slate-200 bg-slate-100'
			}`}
		>
			<p class="text-sm font-semibold uppercase tracking-[0.18em] md:text-base">Student Notice</p>
		</div>
		<div class="px-5 py-4">
			<div
				class="announcement-copy leading-relaxed {position === 'left'
					? 'text-lg xl:text-xl'
					: 'text-xl md:text-2xl'}"
				style:font-size={`${fontSize}px`}
			>
				{#if md}
					{@html renderedMarkdown}
				{:else}
					<p class="whitespace-pre-line">{announcements}</p>
				{/if}
			</div>
		</div>
	</section>
{/if}

<style>
	:global(.announcement-copy) {
		white-space: normal;
	}

	:global(.announcement-copy p) {
		margin-bottom: 0.75em;
	}

	:global(.announcement-copy h1),
	:global(.announcement-copy h2),
	:global(.announcement-copy h3),
	:global(.announcement-copy h4),
	:global(.announcement-copy h5) {
		font-family: var(--font-display);
		font-size: 1em;
		letter-spacing: 0.08em;
		margin: 0 0 0.8em;
		text-transform: uppercase;
	}

	:global(.announcement-copy ul),
	:global(.announcement-copy ol) {
		margin: 0 0 0.75em 1.3em;
	}

	:global(.announcement-copy li) {
		margin-bottom: 0.35em;
	}

	:global(.announcement-copy blockquote) {
		margin: 0 0 0.75em;
		padding-left: 1em;
		border-left: 3px solid rgba(15, 98, 254, 0.35);
	}

	:global(.announcement-copy code) {
		font-family: var(--font-mono);
		font-size: 0.9em;
	}

	:global(.announcement-copy a) {
		color: #0f62fe;
		text-decoration: underline;
	}
</style>
