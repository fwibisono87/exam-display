<script lang="ts">
	import { afterUpdate, onDestroy, onMount } from 'svelte';
	import type { Checkpoint } from '$lib/types';

	const DEFAULT_ACCENT = '#0F62FE';
	const MIN_FONT_SIZE = 32;
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

	let timeElement: HTMLElement | null = null;
	let clockCanvas: HTMLElement | null = null;
	let labelElement: HTMLElement | null = null;
	let metaElement: HTMLElement | null = null;
	let phaseElement: HTMLElement | null = null;
	let progressElement: HTMLElement | null = null;
	let resizeObserver: ResizeObserver | null = null;

	$: accentColor = activeCheckpoint?.color || nextCheckpoint?.color || DEFAULT_ACCENT;
	$: clockLabel = serverTime ? 'Official exam time' : 'Waiting for time source';
	$: panelClass = highContrastMode
		? 'border-white bg-black text-white shadow-none'
		: 'border-slate-300 bg-white text-slate-900';
	$: mutedClass = highContrastMode ? 'text-slate-300' : 'text-slate-600';
	$: labelClass = highContrastMode ? 'text-yellow-300' : 'text-slate-500';
	$: showExamStatus = Boolean(activeCheckpoint || nextCheckpoint);
	$: currentPhaseName = activeCheckpoint?.name || 'Awaiting exam start';
	$: currentPhaseTimeLabel = activeCheckpoint ? 'Since' : nextCheckpoint ? 'Next marker' : '';
	$: currentPhaseTimeValue = activeCheckpoint?.time || nextCheckpoint?.time || '';

	function adjustFontSize() {
		if (!timeElement || !clockCanvas || typeof window === 'undefined') return;

		const width = clockCanvas.clientWidth;
		const height = clockCanvas.clientHeight;
		const computedStyles = window.getComputedStyle(clockCanvas);
		const verticalPadding =
			parseFloat(computedStyles.paddingTop) + parseFloat(computedStyles.paddingBottom);
		const labelHeight = labelElement?.offsetHeight ?? 0;
		const metaHeight = metaElement?.offsetHeight ?? 0;
		const phaseHeight = phaseElement?.offsetHeight ?? 0;
		const progressHeight = progressElement?.offsetHeight ?? 0;
		const reservedHeight =
			verticalPadding +
			labelHeight +
			metaHeight +
			phaseHeight +
			progressHeight +
			(metaElement ? 32 : 20) +
			(phaseElement ? 20 : 0) +
			(progressElement ? 24 : 0);
		const characterCount = Math.max(serverTime?.length || 8, 8);
		const widthBound = width / (characterCount * 0.58);
		const heightBound = Math.max(0, height - reservedHeight) * 0.92;
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
		if (phaseElement) resizeObserver.observe(phaseElement);
		if (progressElement) resizeObserver.observe(progressElement);
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

<div class="flex h-full min-h-0 flex-col">
	<section
		bind:this={clockCanvas}
		data-testid="clock-panel"
		class={`glass-panel flex min-h-[10rem] flex-1 flex-col overflow-hidden border px-5 py-5 text-center md:px-10 md:py-8 ${
			highContrastMode
				? 'border-white bg-black text-white shadow-none'
				: 'border-slate-300 bg-white text-slate-900'
		}`}
	>
		<div class="flex flex-1 flex-col items-center justify-center">
			<p
				bind:this={labelElement}
				class={`mb-4 shrink-0 text-base font-semibold tracking-[0.16em] uppercase md:mb-6 md:text-xl ${mutedClass}`}
			>
				{clockLabel}
			</p>

			<div
				bind:this={timeElement}
				data-testid="clock-time"
				class="max-w-full shrink-0 overflow-hidden font-mono leading-none font-semibold tracking-[-0.055em] whitespace-nowrap"
				style:color={highContrastMode ? '#ffffff' : accentColor}
			>
				{serverTime || 'NTP unavailable'}
			</div>

			{#if showDate || showTimezone}
				<div
					bind:this={metaElement}
					class={`mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-xl md:mt-8 md:text-2xl ${mutedClass}`}
				>
					{#if showDate}
						<p>{serverDate}</p>
					{/if}
					{#if showTimezone && timezone}
						<p>{timezone}</p>
					{/if}
				</div>
			{/if}

			{#if showExamStatus}
				<div bind:this={phaseElement} class="mt-5 shrink-0 text-center md:mt-6">
					<p class={`text-sm font-semibold tracking-[0.18em] uppercase ${labelClass}`}>
						Current Phase
					</p>
					<p data-testid="current-phase" class="mt-2 text-xl font-semibold md:text-2xl">
						{currentPhaseName}
					</p>
					{#if currentPhaseTimeValue}
						<p class={`mt-1 text-sm md:text-base ${mutedClass}`}>
							{currentPhaseTimeLabel}
							<span class="font-mono"> {currentPhaseTimeValue}</span>
						</p>
					{/if}
				</div>
			{/if}
		</div>

		{#if showExamStatus}
			<div
				bind:this={progressElement}
				data-testid="exam-progress"
				class={`mt-6 w-full shrink-0 border-t pt-4 text-left ${
					highContrastMode ? 'border-white/20' : 'border-slate-200'
				}`}
			>
				<div
					class={`mb-2 flex items-center justify-between gap-3 text-sm md:text-base ${mutedClass}`}
				>
					<span class="font-semibold tracking-[0.12em] uppercase">Exam Progress</span>
					<span class="font-mono">{examProgress}%</span>
				</div>
				<div
					data-testid="exam-progress-track"
					class={`h-3 w-full border md:h-4 ${
						highContrastMode ? 'border-white bg-black' : 'border-slate-300 bg-white'
					}`}
				>
					<div
						class="h-full transition-[width] duration-500"
						style:width={`${examProgress}%`}
						style:background={highContrastMode ? '#f1c21b' : accentColor}
					></div>
				</div>
			</div>
		{/if}
	</section>
</div>
