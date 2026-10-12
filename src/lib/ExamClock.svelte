<script lang="ts">
	import { afterUpdate, onDestroy, onMount } from 'svelte';
	import type { Checkpoint } from '$lib/types';

	const DEFAULT_ACCENT = '#0F62FE';
	const MIN_FONT_SIZE = 32;
	const BASE_MAX_FONT_SIZE = 460;
	const MIN_TIME_VIEWPORT_SHARE = 0.35;
	const MAX_TIME_VIEWPORT_SHARE = 0.42;

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
	let metaElement: HTMLElement | null = null;
	let phaseElement: HTMLElement | null = null;
	let progressElement: HTMLElement | null = null;
	let resizeObserver: ResizeObserver | null = null;
	let renderMeta = false;
	let renderPhase = false;
	let renderProgress = false;
	let clockHeight = 0;
	let viewportHeight = 0;

	$: accentColor = activeCheckpoint?.color || nextCheckpoint?.color || DEFAULT_ACCENT;
	$: panelClass = highContrastMode
		? 'border-white bg-black text-white shadow-none'
		: 'border-slate-300 bg-white text-slate-900';
	$: mutedClass = highContrastMode ? 'text-slate-300' : 'text-slate-600';
	$: labelClass = highContrastMode ? 'text-yellow-300' : 'text-slate-500';
	$: showExamStatus = Boolean(activeCheckpoint || nextCheckpoint);
	$: baseShowMeta = Boolean(showDate || showTimezone);
	$: currentPhaseName = activeCheckpoint?.name || 'Awaiting exam start';
	$: currentPhaseTimeLabel = activeCheckpoint ? 'Since' : nextCheckpoint ? 'Next marker' : '';
	$: currentPhaseTimeValue = activeCheckpoint?.time || nextCheckpoint?.time || '';
	$: isTallLayout = viewportHeight >= 1200 || clockHeight >= 1000;
	$: isExtraTallLayout = viewportHeight >= 1400 || clockHeight >= 1150;
	$: stackGapClass = isExtraTallLayout
		? 'gap-12 md:gap-14'
		: isTallLayout
			? 'gap-10 md:gap-12'
			: 'gap-6 md:gap-8';
	$: phaseWrapperClass = isExtraTallLayout
		? 'mt-8 md:mt-10'
		: isTallLayout
			? 'mt-7 md:mt-8'
			: 'mt-5 md:mt-6';
	$: phaseLabelTextClass = isExtraTallLayout
		? 'text-lg md:text-xl'
		: isTallLayout
			? 'text-base md:text-lg'
			: 'text-sm';
	$: phaseNameTextClass = isExtraTallLayout
		? 'mt-3 text-4xl md:text-6xl'
		: isTallLayout
			? 'mt-3 text-3xl md:text-4xl'
			: 'mt-2 text-xl md:text-2xl';
	$: phaseMetaTextClass = isExtraTallLayout
		? 'mt-2 text-lg md:text-2xl'
		: isTallLayout
			? 'mt-2 text-base md:text-xl'
			: 'mt-1 text-sm md:text-base';
	$: progressWrapperClass = isExtraTallLayout ? 'pt-8' : isTallLayout ? 'pt-6' : 'pt-4';
	$: progressHeaderTextClass = isExtraTallLayout
		? 'text-lg md:text-2xl'
		: isTallLayout
			? 'text-base md:text-xl'
			: 'text-sm md:text-base';
	$: progressTrackClass = isExtraTallLayout
		? 'h-6 md:h-8'
		: isTallLayout
			? 'h-5 md:h-6'
			: 'h-3 md:h-4';

	function getViewportMinFontSize() {
		if (typeof window === 'undefined') return MIN_FONT_SIZE;
		return Math.max(MIN_FONT_SIZE, Math.floor(window.innerHeight * MIN_TIME_VIEWPORT_SHARE));
	}

	function getViewportMaxFontSize() {
		if (typeof window === 'undefined') return BASE_MAX_FONT_SIZE;
		return Math.max(BASE_MAX_FONT_SIZE, Math.floor(window.innerHeight * MAX_TIME_VIEWPORT_SHARE));
	}

	function estimateSupplementHeight(
		showMetaSection: boolean,
		showPhaseSection: boolean,
		showProgressSection: boolean
	) {
		if (typeof window === 'undefined') return 0;

		const isDesktop = window.innerWidth >= 768;
		const isTall = window.innerHeight >= 1200;

		return (
			(showMetaSection ? (isDesktop ? (isTall ? 88 : 72) : 56) : 0) +
			(showPhaseSection ? (isDesktop ? (isTall ? 128 : 84) : 66) : 0) +
			(showProgressSection ? (isDesktop ? (isTall ? 92 : 58) : 48) : 0) +
			(showMetaSection ? 24 : 0) +
			(showPhaseSection ? 20 : 0) +
			(showProgressSection ? 24 : 0)
		);
	}

	function syncLayoutPriority() {
		if (!clockCanvas || typeof window === 'undefined') return;

		const width = clockCanvas.clientWidth;
		const height = clockCanvas.clientHeight;
		clockHeight = height;
		viewportHeight = window.innerHeight;
		const computedStyles = window.getComputedStyle(clockCanvas);
		const horizontalPadding =
			parseFloat(computedStyles.paddingLeft) + parseFloat(computedStyles.paddingRight);
		const verticalPadding =
			parseFloat(computedStyles.paddingTop) + parseFloat(computedStyles.paddingBottom);
		const minTimeFontSize = Math.min(getViewportMaxFontSize(), getViewportMinFontSize());

		let nextRenderMeta = baseShowMeta;
		let nextRenderPhase = showExamStatus;
		let nextRenderProgress = showExamStatus;

		const fits = (
			showMetaSection: boolean,
			showPhaseSection: boolean,
			showProgressSection: boolean
		) => {
			const reservedHeight =
				verticalPadding +
				estimateSupplementHeight(showMetaSection, showPhaseSection, showProgressSection);
			const availableHeight = Math.max(0, height - reservedHeight) * 0.92;
			return availableHeight >= minTimeFontSize;
		};

		while (!fits(nextRenderMeta, nextRenderPhase, nextRenderProgress)) {
			if (nextRenderMeta) {
				nextRenderMeta = false;
				continue;
			}

			if (nextRenderPhase) {
				nextRenderPhase = false;
				continue;
			}

			if (nextRenderProgress) {
				nextRenderProgress = false;
				continue;
			}

			break;
		}

		const hasChanged =
			renderMeta !== nextRenderMeta ||
			renderPhase !== nextRenderPhase ||
			renderProgress !== nextRenderProgress;

		renderMeta = nextRenderMeta;
		renderPhase = nextRenderPhase;
		renderProgress = nextRenderProgress;

		if (hasChanged) {
			requestAnimationFrame(() => adjustFontSize());
		}
	}

	function adjustFontSize() {
		if (!timeElement || !clockCanvas || typeof window === 'undefined') return;

		const width = clockCanvas.clientWidth;
		const height = clockCanvas.clientHeight;
		const computedStyles = window.getComputedStyle(clockCanvas);
		const horizontalPadding =
			parseFloat(computedStyles.paddingLeft) + parseFloat(computedStyles.paddingRight);
		const verticalPadding =
			parseFloat(computedStyles.paddingTop) + parseFloat(computedStyles.paddingBottom);
		const metaHeight = metaElement?.offsetHeight ?? 0;
		const phaseHeight = phaseElement?.offsetHeight ?? 0;
		const progressHeight = progressElement?.offsetHeight ?? 0;
		const reservedHeight =
			verticalPadding +
			metaHeight +
			phaseHeight +
			progressHeight +
			(metaElement ? 24 : 0) +
			(phaseElement ? 20 : 0) +
			(progressElement ? 24 : 0);
		const heightBound = Math.max(0, height - reservedHeight) * 0.92;
		const maxTimeFontSize = getViewportMaxFontSize();
		const minTimeFontSize = Math.min(maxTimeFontSize, getViewportMinFontSize());
		const nextFontSize = Math.floor(
			Math.min(maxTimeFontSize, Math.max(minTimeFontSize, heightBound))
		);

		timeElement.style.transform = 'scaleX(1)';
		timeElement.style.transformOrigin = 'center center';
		timeElement.style.fontSize = `${nextFontSize}px`;

		const availableWidth = Math.max(0, width - horizontalPadding);
		const naturalWidth = timeElement.scrollWidth;
		const horizontalScale = naturalWidth > 0 ? Math.min(1, availableWidth / naturalWidth) : 1;

		timeElement.style.transform = `scaleX(${horizontalScale})`;
	}

	onMount(() => {
		if (typeof window === 'undefined' || !clockCanvas) return;

		resizeObserver = new ResizeObserver(() => {
			syncLayoutPriority();
			requestAnimationFrame(adjustFontSize);
		});
		resizeObserver.observe(clockCanvas);
		if (phaseElement) resizeObserver.observe(phaseElement);
		if (progressElement) resizeObserver.observe(progressElement);
		if (metaElement) resizeObserver.observe(metaElement);
		syncLayoutPriority();
		requestAnimationFrame(adjustFontSize);
	});

	afterUpdate(() => {
		if (typeof window !== 'undefined') {
			syncLayoutPriority();
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
		class={`glass-panel flex min-h-[10rem] flex-1 items-center justify-center overflow-hidden border px-5 py-5 text-center md:px-10 md:py-8 ${
			highContrastMode
				? 'border-white bg-black text-white shadow-none'
				: 'border-slate-300 bg-white text-slate-900'
		}`}
	>
		<div class={`flex w-full flex-col items-center justify-center ${stackGapClass}`}>
			<div
				bind:this={timeElement}
				data-testid="clock-time"
				class="inline-block shrink-0 font-mono leading-none font-semibold tracking-[-0.055em] whitespace-nowrap"
				style:color={highContrastMode ? '#ffffff' : accentColor}
			>
				{serverTime || 'NTP unavailable'}
			</div>

			{#if renderMeta && (showDate || showTimezone)}
				<div
					bind:this={metaElement}
					class={`mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-xl md:text-2xl ${mutedClass}`}
				>
					{#if showDate}
						<p>{serverDate}</p>
					{/if}
					{#if showTimezone && timezone}
						<p>{timezone}</p>
					{/if}
				</div>
			{/if}

			{#if renderPhase && showExamStatus}
				<div bind:this={phaseElement} class={`shrink-0 text-center ${phaseWrapperClass}`}>
					<p
						class={`${phaseLabelTextClass} font-semibold tracking-[0.18em] uppercase ${labelClass}`}
					>
						Current Phase
					</p>
					<p data-testid="current-phase" class={`font-semibold ${phaseNameTextClass}`}>
						{currentPhaseName}
					</p>
					{#if currentPhaseTimeValue}
						<p class={`${phaseMetaTextClass} ${mutedClass}`}>
							{currentPhaseTimeLabel}
							<span class="font-mono"> {currentPhaseTimeValue}</span>
						</p>
					{/if}
				</div>
			{/if}

			{#if renderProgress && showExamStatus}
				<div
					bind:this={progressElement}
					data-testid="exam-progress"
					class={`w-full shrink-0 border-t text-left ${progressWrapperClass} ${
						highContrastMode ? 'border-white/20' : 'border-slate-200'
					}`}
				>
					<div
						class={`mb-2 flex items-center justify-between gap-3 ${progressHeaderTextClass} ${mutedClass}`}
					>
						<span class="font-semibold tracking-[0.12em] uppercase">Exam Progress</span>
						<span class="font-mono">{examProgress}%</span>
					</div>
					<div
						data-testid="exam-progress-track"
						class={`w-full border ${progressTrackClass} ${
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
		</div>
	</section>
</div>
