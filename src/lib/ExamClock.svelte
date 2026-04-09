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
	export let nextCheckpointProgress: number = 0;

	let layoutRoot: HTMLElement | null = null;
	let timeElement: HTMLElement | null = null;
	let clockCanvas: HTMLElement | null = null;
	let labelElement: HTMLElement | null = null;
	let metaElement: HTMLElement | null = null;
	let layoutHeight = 0;
	let resizeObserver: ResizeObserver | null = null;

	$: accentColor = activeCheckpoint?.color || nextCheckpoint?.color || DEFAULT_ACCENT;
	$: clockLabel = serverTime ? 'Official exam time' : 'Waiting for time source';
	$: panelClass = highContrastMode
		? 'border-white bg-black text-white shadow-none'
		: 'border-slate-300 bg-white text-slate-900';
	$: mutedClass = highContrastMode ? 'text-slate-300' : 'text-slate-600';
	$: labelClass = highContrastMode ? 'text-yellow-300' : 'text-slate-500';
	$: hasMilestones = Boolean(activeCheckpoint || nextCheckpoint);
	$: isCompact = hasMilestones && layoutHeight < 760;
	$: isUltraCompact = hasMilestones && layoutHeight < 640;
	$: milestonePanelPaddingClass = isUltraCompact
		? 'px-4 py-3'
		: isCompact
			? 'px-4 py-3.5'
			: 'px-5 py-4';
	$: milestoneGapClass = isUltraCompact ? 'gap-2' : 'gap-3';
	$: milestoneLabelTextClass = isUltraCompact
		? 'mb-1 text-xs'
		: isCompact
			? 'mb-1.5 text-xs md:text-sm'
			: 'mb-2 text-sm md:text-base';
	$: milestoneEmojiClass = isUltraCompact
		? 'text-3xl md:text-4xl'
		: isCompact
			? 'text-4xl md:text-5xl'
			: 'text-5xl md:text-6xl';
	$: milestoneTitleClass = isUltraCompact
		? 'text-xl md:text-2xl'
		: isCompact
			? 'text-2xl md:text-3xl'
			: 'text-2xl md:text-4xl';
	$: milestoneMetaClass = isUltraCompact
		? 'mt-0.5 text-sm md:text-base'
		: isCompact
			? 'mt-0.5 text-base md:text-lg'
			: 'mt-1 text-lg md:text-xl';
	$: progressTextClass = isUltraCompact ? 'text-sm md:text-base' : 'text-base md:text-lg';
	$: progressBarClass = isUltraCompact ? 'h-3 md:h-4' : 'h-4 md:h-5';
	$: progressWidthClass = isUltraCompact ? 'min-w-44' : isCompact ? 'min-w-48' : 'min-w-56';
	$: clockPanelPaddingClass = isUltraCompact
		? 'px-4 py-4 md:px-6 md:py-5'
		: isCompact
			? 'px-5 py-5 md:px-8 md:py-6'
			: 'px-5 py-6 md:px-10 md:py-8';
	$: clockLabelSpacingClass = isUltraCompact ? 'mb-3' : 'mb-4 md:mb-6';
	$: clockMetaSpacingClass = isUltraCompact
		? 'mt-4 text-base md:text-xl'
		: 'mt-8 text-xl md:text-2xl';

	function syncLayoutDensity() {
		layoutHeight = layoutRoot?.clientHeight ?? 0;
	}

	function adjustFontSize() {
		if (!timeElement || !clockCanvas || typeof window === 'undefined') return;

		const width = clockCanvas.clientWidth;
		const height = clockCanvas.clientHeight;
		const computedStyles = window.getComputedStyle(clockCanvas);
		const verticalPadding =
			parseFloat(computedStyles.paddingTop) + parseFloat(computedStyles.paddingBottom);
		const labelHeight = labelElement?.offsetHeight ?? 0;
		const metaHeight = metaElement?.offsetHeight ?? 0;
		const reservedHeight = verticalPadding + labelHeight + metaHeight + (metaElement ? 32 : 20);
		const characterCount = Math.max(serverTime?.length || 8, 8);
		const widthBound = width / (characterCount * 0.58);
		const heightBound = Math.max(0, height - reservedHeight) * 0.92;
		const nextFontSize = Math.floor(
			Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, Math.min(widthBound, heightBound)))
		);

		timeElement.style.fontSize = `${nextFontSize}px`;
	}

	onMount(() => {
		if (typeof window === 'undefined' || !clockCanvas || !layoutRoot) return;

		resizeObserver = new ResizeObserver(() => {
			syncLayoutDensity();
			requestAnimationFrame(adjustFontSize);
		});
		resizeObserver.observe(layoutRoot);
		resizeObserver.observe(clockCanvas);
		syncLayoutDensity();
		requestAnimationFrame(adjustFontSize);
	});

	afterUpdate(() => {
		if (typeof window !== 'undefined') {
			syncLayoutDensity();
			requestAnimationFrame(adjustFontSize);
		}
	});

	onDestroy(() => {
		resizeObserver?.disconnect();
	});
</script>

<div
	bind:this={layoutRoot}
	class={`flex h-full min-h-0 flex-col ${isUltraCompact ? 'gap-3' : 'gap-5'}`}
>
	{#if activeCheckpoint}
		<section
			class={`glass-panel overflow-hidden border-l-[6px] ${milestonePanelPaddingClass} ${panelClass}`}
			style:border-left-color={highContrastMode ? '#f1c21b' : activeCheckpoint.color}
		>
			<div class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
				<div>
					<p
						class={`${milestoneLabelTextClass} font-semibold tracking-[0.18em] uppercase ${labelClass}`}
					>
						Current phase
					</p>
					<div class={`flex items-center ${milestoneGapClass}`}>
						<span class={milestoneEmojiClass} aria-hidden="true">{activeCheckpoint.emoji}</span>
						<div>
							<h2 class={`font-semibold tracking-[0.03em] normal-case ${milestoneTitleClass}`}>
								{activeCheckpoint.name}
							</h2>
							<p class={`${milestoneMetaClass} ${mutedClass}`}>
								Since {activeCheckpoint.time}
							</p>
						</div>
					</div>
				</div>
				<div class={progressWidthClass}>
					<div class={`mb-2 flex items-center justify-between font-medium ${progressTextClass}`}>
						<span class={mutedClass}>Exam progress</span>
						<span class="font-mono">{examProgress}%</span>
					</div>
					<div
						class={`border ${progressBarClass} ${highContrastMode ? 'border-white bg-black' : 'border-slate-300 bg-slate-100'}`}
					>
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
		data-testid="clock-panel"
		class={`glass-panel flex min-h-[10rem] flex-1 flex-col items-center justify-center overflow-hidden border text-center ${clockPanelPaddingClass} ${
			highContrastMode
				? 'border-white bg-black text-white shadow-none'
				: 'border-slate-300 bg-white text-slate-900'
		}`}
	>
		<p
			bind:this={labelElement}
			class={`${clockLabelSpacingClass} shrink-0 text-base font-semibold tracking-[0.16em] uppercase md:text-xl ${mutedClass}`}
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
				class={`${clockMetaSpacingClass} flex flex-wrap items-center justify-center gap-x-6 gap-y-3 ${mutedClass}`}
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
		<section class={`glass-panel border ${milestonePanelPaddingClass} ${panelClass}`}>
			<div class="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
				<div class="max-w-2xl">
					<p
						class={`${milestoneLabelTextClass} font-semibold tracking-[0.18em] uppercase ${labelClass}`}
					>
						Next milestone
					</p>
					<div class={`flex items-center ${milestoneGapClass}`}>
						<span class={milestoneEmojiClass} aria-hidden="true">{nextCheckpoint.emoji}</span>
						<div>
							<h2 class={`font-semibold tracking-[0.03em] normal-case ${milestoneTitleClass}`}>
								{nextCheckpoint.name}
							</h2>
							<p class={`${milestoneMetaClass} ${mutedClass}`}>
								At {nextCheckpoint.time}
							</p>
						</div>
					</div>
				</div>

				<div
					class={`${isUltraCompact ? 'min-w-44' : isCompact ? 'min-w-48' : 'min-w-64'} flex-1 lg:max-w-md`}
				>
					<div class={`mb-2 flex items-center justify-between font-medium ${progressTextClass}`}>
						<span class={mutedClass}>Path to milestone</span>
						<span class="font-mono">{nextCheckpointProgress}%</span>
					</div>
					<div
						class={`border ${progressBarClass} ${highContrastMode ? 'border-white bg-black' : 'border-slate-300 bg-slate-100'}`}
					>
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
