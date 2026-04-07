<script lang="ts">
	import { afterUpdate, onDestroy, onMount } from 'svelte';
	import type { Checkpoint } from '$lib/types';

	const DEFAULT_ACCENT = '#0F62FE';
	const MIN_FONT_SIZE = 112;
	const MAX_FONT_SIZE = 460;

	export let serverTime: string;
	export let serverDate: string;
	export let timezone: string;
	export let activeCheckpoint: Checkpoint | null = null;
	export let nextCheckpoint: Checkpoint | null = null;
	export let highContrastMode: boolean = false;
	export let showDate: boolean = false;
	export let showTimezone: boolean = false;
	export let examProgress: number = 0;
	export let nextCheckpointProgress: number = 0;

	let timeElement: HTMLElement | null = null;
	let clockCanvas: HTMLElement | null = null;
	let resizeObserver: ResizeObserver | null = null;

	$: accentColor = activeCheckpoint?.color || nextCheckpoint?.color || DEFAULT_ACCENT;
	$: clockLabel = serverTime ? 'Official exam time' : 'Waiting for time source';
	$: panelClass = highContrastMode
		? 'border-white bg-black text-white shadow-none'
		: 'border-slate-300 bg-white text-slate-900';
	$: mutedClass = highContrastMode ? 'text-slate-300' : 'text-slate-600';
	$: labelClass = highContrastMode ? 'text-yellow-300' : 'text-slate-500';

	function adjustFontSize() {
		if (!timeElement || !clockCanvas || typeof window === 'undefined') return;

		const width = clockCanvas.clientWidth;
		const height = clockCanvas.clientHeight;
		const characterCount = Math.max(serverTime?.length || 8, 8);
		const widthBound = width / (characterCount * 0.58);
		const heightBound = height * 0.48;
		const nextFontSize = Math.floor(
			Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, Math.min(widthBound, heightBound)))
		);

		timeElement.style.fontSize = `${nextFontSize}px`;
	}

	onMount(() => {
		if (typeof window === 'undefined' || !clockCanvas) return;

		resizeObserver = new ResizeObserver(() => {
			requestAnimationFrame(adjustFontSize);
		});
		resizeObserver.observe(clockCanvas);
		requestAnimationFrame(adjustFontSize);
	});

	afterUpdate(() => {
		if (typeof window !== 'undefined') {
			requestAnimationFrame(adjustFontSize);
		}
	});

	onDestroy(() => {
		resizeObserver?.disconnect();
	});
</script>

<div class="flex flex-col gap-5">
	{#if activeCheckpoint}
		<section
			class={`glass-panel overflow-hidden border-l-[6px] px-5 py-4 ${panelClass}`}
			style:border-left-color={highContrastMode ? '#f1c21b' : activeCheckpoint.color}
		>
			<div class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
				<div>
					<p class={`mb-2 text-sm font-semibold uppercase tracking-[0.18em] md:text-base ${labelClass}`}>
						Current phase
					</p>
					<div class="flex items-center gap-3">
						<span class="text-5xl md:text-6xl" aria-hidden="true">{activeCheckpoint.emoji}</span>
						<div>
							<h2 class="text-2xl font-semibold normal-case tracking-[0.03em] md:text-4xl">
								{activeCheckpoint.name}
							</h2>
							<p class={`mt-1 text-lg md:text-xl ${mutedClass}`}>
								Since {activeCheckpoint.time}
							</p>
						</div>
					</div>
				</div>
				<div class="min-w-56">
					<div class="mb-2 flex items-center justify-between text-base font-medium md:text-lg">
						<span class={mutedClass}>Exam progress</span>
						<span class="font-mono">{examProgress}%</span>
					</div>
					<div class={`h-4 border md:h-5 ${highContrastMode ? 'border-white bg-black' : 'border-slate-300 bg-slate-100'}`}>
						<div
							class="h-full transition-[width] duration-500"
							style:width={`${examProgress}%`}
							style:background={highContrastMode ? '#f1c21b' : activeCheckpoint.color}
						></div>
					</div>
				</div>
			</div>
		</section>
	{/if}

	<section
		bind:this={clockCanvas}
		class={`glass-panel flex min-h-[34rem] flex-col items-center justify-center border px-5 py-8 text-center md:min-h-[40rem] md:px-10 ${
			highContrastMode ? 'border-white bg-black text-white shadow-none' : 'border-slate-300 bg-white text-slate-900'
		}`}
	>
		<p class={`mb-6 text-base font-semibold uppercase tracking-[0.16em] md:text-xl ${mutedClass}`}>
			{clockLabel}
		</p>

		<div
			bind:this={timeElement}
			class="font-mono leading-none font-semibold tracking-[-0.055em]"
			style:color={highContrastMode ? '#ffffff' : accentColor}
		>
			{serverTime || 'NTP unavailable'}
		</div>

		{#if showDate || showTimezone}
			<div
				class={`mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-xl md:text-2xl ${mutedClass}`}
			>
				{#if showDate}
					<p>{serverDate}</p>
				{/if}
				{#if showTimezone && timezone}
					<p>{timezone}</p>
				{/if}
			</div>
		{/if}
	</section>

	{#if nextCheckpoint}
		<section class={`glass-panel border px-5 py-4 ${panelClass}`}>
			<div class="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
				<div class="max-w-2xl">
					<p class={`mb-2 text-sm font-semibold uppercase tracking-[0.18em] md:text-base ${labelClass}`}>
						Next milestone
					</p>
					<div class="flex items-center gap-3">
						<span class="text-5xl md:text-6xl" aria-hidden="true">{nextCheckpoint.emoji}</span>
						<div>
							<h2 class="text-2xl font-semibold normal-case tracking-[0.03em] md:text-4xl">
								{nextCheckpoint.name}
							</h2>
							<p class={`mt-1 text-lg md:text-xl ${mutedClass}`}>
								At {nextCheckpoint.time}
							</p>
						</div>
					</div>
				</div>

				<div class="min-w-64 flex-1 lg:max-w-md">
					<div class="mb-2 flex items-center justify-between text-base font-medium md:text-lg">
						<span class={mutedClass}>
							Path to milestone
						</span>
						<span class="font-mono">{nextCheckpointProgress}%</span>
					</div>
					<div class={`h-4 border md:h-5 ${highContrastMode ? 'border-white bg-black' : 'border-slate-300 bg-slate-100'}`}>
						<div
							class="h-full transition-[width] duration-500"
							style:width={`${nextCheckpointProgress}%`}
							style:background={highContrastMode ? '#f1c21b' : nextCheckpoint.color}
						></div>
					</div>
				</div>
			</div>
		</section>
	{/if}
</div>
