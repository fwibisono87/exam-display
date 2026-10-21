<script lang="ts">
	import { onMount } from 'svelte';
	import type { ProjectorConfig } from '$lib/projector-model';
	import {
		fillText,
		formatDuration,
		formatHM,
		resolvePhase,
		visibilityNotice
	} from '$lib/projector-model';

	export let cfg: ProjectorConfig;
	export let now: number;
	export let error: boolean;
	export let ntpUnavailable = false;
	export let rehearsal = false;
	export let controlsOpen = false;
	export let calibration = false;
	export let onNoticeOverflow: (value: boolean) => void = () => {};

	const CANVAS_HEIGHT = 1080;
	let canvasWidth = 1920;
	let scale = 1;
	let viewportWidth = 0;
	let viewportHeight = 0;
	let phaseElement: HTMLElement;
	let phaseTextElement: HTMLElement;
	let promptElement: HTMLElement;
	let noticeElement: HTMLElement;
	let noticeCopyElement: HTMLElement;
	let clockElement: HTMLElement;
	let remainingElement: HTMLElement;
	let errorPanel: HTMLElement;
	let errorTitleElement: HTMLElement;
	let errorCopyElement: HTMLElement;
	let visibilityNoticeElement: HTMLElement;
	let calibrationOverlayElement: HTMLElement;
	let calibrationDirectionsElement: HTMLElement;
	let noticeOverflow = false;
	let reportedNoticeOverflow = false;
	let noticeClampLines = 1;
	let mounted = false;
	let phaseTitlePx = 104;
	let promptPx = 48;
	let noticePx = 58;
	let clockPx = 320;
	let remainingPx = 88;
	let observer: ResizeObserver | undefined;
	let frame = 0;

	function computeCanvasWidth(
		aspect: ProjectorConfig['aspect'],
		width: number,
		height: number
	): number {
		if (aspect === '16:10') return 1728;
		if (aspect === '4:3') return 1440;
		if (aspect === '16:9') return 1920;
		if (width <= 0 || height <= 0) return 1920;
		return Math.round(Math.max(1280, Math.min(2880, (width / height) * CANVAS_HEIGHT)));
	}

	$: canvasWidth = computeCanvasWidth(cfg.aspect, viewportWidth, viewportHeight);
	$: railWidth =
		canvasWidth >= 1900 ? 620 : canvasWidth >= 1700 ? 580 : canvasWidth >= 1400 ? 520 : 480;
	$: safePx = Math.round((CANVAS_HEIGHT * Math.max(0, Math.min(30, cfg.safe))) / 100);
	$: phaseState = resolvePhase(cfg, now);
	$: phase = phaseState.phase;
	$: phaseTitle = fillText(phase.title, cfg, now);
	$: phasePrompt = fillText(phase.prompt, cfg, now);
	$: remaining = formatDuration(phaseState.remaining);
	$: timeLabel = formatHM(now);
	$: secondsLabel = String(((Math.floor(now) % 60) + 60) % 60).padStart(2, '0');
	$: noticeLines = parseNotice(cfg.notice);
	$: hasNotice = cfg.showNotice && noticeLines.length > 0;
	$: visibilityNoticeState = visibilityNotice(cfg, canvasWidth);
	$: visibilityNoticeText = visibilityNoticeState.text;
	$: highVisibility = cfg.highVisibility;
	$: inverted = cfg.inverted;
	$: activeNtpServer = cfg.ntpServer || 'ntp.ui.ac.id';
	$: columnScale = railWidth / 620;
	$: railEmpty = (error || !phaseState.scheduled) && !hasNotice;
	$: layoutRailWidth = railEmpty ? 0 : railWidth;
	$: phaseFlex = hasNotice ? '0 1 auto' : '1 1 auto';
	$: phaseLimit = hasNotice
		? `${Math.max(30, (highVisibility ? 35 : 55) - cfg.safe * 0.5)}%`
		: '100%';
	$: ticks = (() => {
		const resolvedTime = resolvePhase(cfg, now);
		const duration = Math.max(1, resolvedTime.end - resolvedTime.start);
		const positioned = cfg.milestones
			.filter((item) => item.enabled)
			.map((item) => {
				let milestoneTime = toClockSeconds(item.time);
				if (resolvedTime.end > 86400 && milestoneTime < resolvedTime.start) milestoneTime += 86400;
				const position = Math.max(
					0,
					Math.min(100, ((milestoneTime - resolvedTime.start) / duration) * 100)
				);
				return {
					...item,
					label: fillText(item.title, cfg, now),
					position
				};
			})
			.sort((a, b) => a.position - b.position);
		let lastTime = -100;
		let lastLabel = -100;
		return positioned.map((item) => {
			const showTime = item.position - lastTime >= 9500 / (canvasWidth - railWidth - 232);
			const showLabel = item.position - lastLabel >= 17000 / (canvasWidth - railWidth - 232);
			if (showTime) lastTime = item.position;
			if (showLabel) lastLabel = item.position;
			return { ...item, showTime, showLabel };
		});
	})();
	$: progress = Math.max(0, Math.min(100, phaseState.progress));
	$: fitKey = `${JSON.stringify(cfg)}|${canvasWidth}|${now}|${error}|${rehearsal}|${controlsOpen}|${calibration}`;
	$: if (mounted && fitKey) scheduleFit();

	function toClockSeconds(value: string): number {
		const [hours = '0', minutes = '0'] = value.split(':');
		return Number(hours) * 3600 + Number(minutes) * 60;
	}

	function parseNotice(value: string) {
		return value
			.split('\n')
			.filter((line) => line.trim())
			.map((line) => {
				const bullet = /^\s*[-*•]\s+/.test(line);
				return { bullet, text: line.replace(/^\s*[-*•]\s+/, '') };
			});
	}

	function updateGeometry(open = controlsOpen, aspect = cfg.aspect) {
		if (typeof window === 'undefined') return;
		viewportWidth = window.innerWidth;
		viewportHeight = window.innerHeight;
		const available = Math.max(0, window.innerWidth - (open && window.innerWidth > 1100 ? 460 : 0));
		const width = computeCanvasWidth(aspect, viewportWidth, viewportHeight);
		canvasWidth = width;
		scale = Math.max(0.01, Math.min(available / width, viewportHeight / CANVAS_HEIGHT));
	}

	function handleResize() {
		updateGeometry(controlsOpen, cfg.aspect);
		scheduleFit();
	}

	function fitText() {
		updateGeometry(controlsOpen, cfg.aspect);
		if (!highVisibility || calibration || !hasNotice) reportNoticeOverflow(false);
		const nk = columnScale;
		const titleBase = phaseTitle.length <= 12 ? 104 : phaseTitle.length <= 22 ? 84 : 66;
		let nextPhaseTitlePx = Math.max(
			highVisibility && phaseTitle.length <= 22 ? 56 : 28,
			Math.round(titleBase * nk)
		);
		let nextPromptPx = Math.max(20, Math.round(48 * nk));
		const score = cfg.notice.length + noticeLines.length * 24;
		let nextNoticePx = highVisibility
			? 48
			: Math.round((score < 90 ? 58 : score < 180 ? 46 : score < 300 ? 36 : 30) * nk);
		let nextClockPx = Math.max(
			72,
			Math.min(380, (canvasWidth - layoutRailWidth - 128) / 3.55, (1080 - safePx - 520) * 1.1)
		);
		let nextRemainingPx = highVisibility ? 112 : 88;

		// Let the browser wrap each text block, then reduce its type until all content fits.
		if (phaseTextElement) {
			const minPhaseTitlePx = highVisibility ? (phaseTitle.length <= 22 ? 56 : 36) : 28;
			for (let i = 0; i < 40; i += 1) {
				phaseTextElement.style.fontSize = `${nextPhaseTitlePx}px`;
				if (
					phaseTextElement.scrollHeight <=
						phaseTextElement.clientHeight + Math.ceil(nextPhaseTitlePx * 0.12) ||
					nextPhaseTitlePx <= minPhaseTitlePx
				)
					break;
				nextPhaseTitlePx -= 2;
			}
		}
		if (promptElement) {
			for (let i = 0; i < 40; i += 1) {
				promptElement.style.fontSize = `${nextPromptPx}px`;
				if (promptElement.scrollHeight <= promptElement.clientHeight + 1 || nextPromptPx <= 20)
					break;
				nextPromptPx -= 1;
			}
		}
		if (highVisibility && visibilityNoticeElement && noticeElement && !calibration && hasNotice) {
			const styles = getComputedStyle(noticeElement);
			const heading = noticeElement.querySelector<HTMLElement>('.notice-heading');
			const availableHeight = Math.max(
				0,
				noticeElement.clientHeight -
					parseFloat(styles.paddingTop) -
					parseFloat(styles.paddingBottom) -
					(heading?.offsetHeight || 0) -
					parseFloat(styles.rowGap)
			);
			// Measure against the panel, not the previous clamped copy's height.
			visibilityNoticeElement.style.display = 'block';
			visibilityNoticeElement.style.webkitLineClamp = 'unset';
			visibilityNoticeElement.style.maxHeight = `${availableHeight}px`;
			for (let size = 64; size >= 48; size--) {
				nextNoticePx = size;
				visibilityNoticeElement.style.fontSize = `${size}px`;
				if (visibilityNoticeElement.scrollHeight <= availableHeight + 1) break;
			}
			const overflow = visibilityNoticeElement.scrollHeight > availableHeight + 1;
			noticeClampLines = Math.max(1, Math.floor(availableHeight / (nextNoticePx * 1.22)));
			visibilityNoticeElement.style.display = overflow ? '-webkit-box' : 'block';
			visibilityNoticeElement.style.webkitLineClamp = overflow ? String(noticeClampLines) : 'unset';
			reportNoticeOverflow(visibilityNoticeState.shortened || overflow);
		} else if (noticeCopyElement && !highVisibility) {
			for (let i = 0; i < 48; i += 1) {
				noticeCopyElement.style.fontSize = `${nextNoticePx}px`;
				if (
					noticeCopyElement.scrollHeight <= noticeCopyElement.clientHeight + 1 ||
					nextNoticePx <= 12
				)
					break;
				nextNoticePx -= 1;
			}
		}
		if (clockElement) {
			const main = clockElement.querySelector<HTMLElement>('.clock-main');
			const seconds = clockElement.querySelector<HTMLElement>('.clock-seconds');
			for (let i = 0; i < 50; i += 1) {
				if (main) main.style.fontSize = `${nextClockPx}px`;
				if (seconds)
					seconds.style.fontSize = `${Math.round(nextClockPx * (highVisibility ? 0.45 : 0.34))}px`;
				if (clockElement.scrollWidth <= clockElement.clientWidth + 1 || nextClockPx <= 72) break;
				nextClockPx -= 4;
			}
		}
		if (remainingElement) {
			const time = remainingElement.querySelector<HTMLElement>('.remaining-time');
			const words = remainingElement.querySelectorAll<HTMLElement>('.remaining-word');
			let wordPx = highVisibility ? 56 : 48;
			for (let i = 0; i < 36; i += 1) {
				for (const word of words) word.style.fontSize = `${wordPx}px`;
				if (time) time.style.fontSize = `${nextRemainingPx}px`;
				if (
					remainingElement.scrollWidth <= remainingElement.clientWidth + 1 ||
					nextRemainingPx <= (highVisibility ? 72 : 48)
				)
					break;
				if (highVisibility && wordPx > 48) wordPx -= 2;
				else nextRemainingPx -= 2;
			}
		}
		if (errorPanel) {
			let titleSize = 128;
			let copySize = 44;
			for (let i = 0; i < 84; i += 1) {
				if (errorTitleElement) errorTitleElement.style.fontSize = `${titleSize}px`;
				if (errorCopyElement) errorCopyElement.style.fontSize = `${copySize}px`;
				if (
					errorPanel.scrollHeight <= errorPanel.clientHeight + 1 ||
					(titleSize <= 44 && copySize <= 20)
				)
					break;
				if (copySize > 20) copySize -= 2;
				else titleSize -= 2;
			}
		}
		if (calibration && calibrationOverlayElement && calibrationDirectionsElement) {
			let directionsSize = 48;
			for (let i = 0; i < 34; i += 1) {
				calibrationDirectionsElement.style.fontSize = `${directionsSize}px`;
				if (
					calibrationOverlayElement.scrollHeight <= calibrationOverlayElement.clientHeight + 1 ||
					directionsSize <= 14
				)
					break;
				directionsSize -= 1;
			}
		}
		if (nextPhaseTitlePx !== phaseTitlePx) phaseTitlePx = nextPhaseTitlePx;
		if (nextPromptPx !== promptPx) promptPx = nextPromptPx;
		if (nextNoticePx !== noticePx) noticePx = nextNoticePx;
		if (nextClockPx !== clockPx) clockPx = nextClockPx;
		if (nextRemainingPx !== remainingPx) remainingPx = nextRemainingPx;
	}

	function reportNoticeOverflow(value: boolean) {
		noticeOverflow = value;
		if (value !== reportedNoticeOverflow) {
			reportedNoticeOverflow = value;
			onNoticeOverflow(value);
		}
	}

	function scheduleFit() {
		if (typeof window === 'undefined') return;
		cancelAnimationFrame(frame);
		frame = requestAnimationFrame(fitText);
	}

	onMount(() => {
		updateGeometry(controlsOpen, cfg.aspect);
		observer = new ResizeObserver(() => {
			updateGeometry();
			scheduleFit();
		});
		if (phaseElement) observer.observe(phaseElement);
		if (noticeElement) observer.observe(noticeElement);
		if (clockElement) observer.observe(clockElement);
		window.addEventListener('resize', handleResize);
		mounted = true;
		scheduleFit();
		return () => {
			observer?.disconnect();
			window.removeEventListener('resize', handleResize);
			cancelAnimationFrame(frame);
		};
	});
</script>

<div class="projector-root" aria-label="Exam display">
	<div
		class="projector-canvas"
		class:high-visibility={highVisibility || calibration}
		class:inverted
		data-testid="projector-display"
		style={`--canvas-width:${canvasWidth}px;--canvas-scale:${scale};--canvas-center:${controlsOpen && viewportWidth > 1100 ? 'calc(50% - 230px)' : '50%'};--rail-width:${layoutRailWidth}px;--safe-px:${safePx}px;--hv-bg:${inverted ? '#000' : '#fff'};--hv-fg:${inverted ? '#fff' : '#000'};`}
	>
		{#if calibration}
			<section
				class="calibration-overlay"
				bind:this={calibrationOverlayElement}
				data-testid="calibration-screen"
				aria-label="Calibration screen"
			>
				<div class="calibration-heading">CALIBRATION · NOT EXAM TIME</div>
				<div
					class="calibration-digits"
					data-testid="calibration-digits"
					style={`--calibration-digits-size:${180 - cfg.safe * 2}px`}
				>
					0123456789
				</div>
				<div class="calibration-samples">
					<div class="sample-72">72 px · LARGE CLOCK</div>
					<div class="sample-56">56 px · COUNTDOWN</div>
					<div class="sample-48">48 px · NOTICE</div>
				</div>
				<div class="calibration-bands" aria-label="Black and white contrast bands">
					<span></span><span></span><span></span><span></span>
				</div>
				<div class="calibration-directions" bind:this={calibrationDirectionsElement}>
					Check every digit from the back row with exam lighting. <br />
					Kami TIDAK bertanggung-jawab atas KEAKURATAN mau pun KERUGIAN yang mungkin terjadi akibat memanfaatkan
					situs ini. HARAP MENANGGUNG SENDIRI SEGALA RISIKO! Jangan lupa mengungkapkan/ menuliskan penghargaan
					(acknowledgement) jika anda menggunakan bahan karya dari pihak lain. Situs ini berbasis “Google
					Sana, Google Sini, Coba Itu, Coba Ini, Lalu Tanya-tanyi” (GSGSCICILTT). Entah ini PLAGIAT,
					entah ini RISET, yang jelas tidak pernah ada klaim bahwa ini merupakan karya asli, serta belum
					tentu pula merupakan solusi terbaik, serta bukan untuk konsumsi Scopus :). Mohon kiranya memberikan
					tanggapan, terutama jika memiliki solusi alternatif. Semoga catatan ini akan bermanfaat di
					masa mendatang, saat sudah lupa cara menyelesaikan masalah trivia ini.
				</div>
				<div class="calibration-exit">Exit with the Screen controls.</div>
				{#if safePx > 0}
					<div class="calibration-safe" style={`height:${safePx}px`}>
						BLOCKED SIGHTLINE · SAFE AREA {cfg.safe}%
					</div>
				{/if}
			</section>
		{:else}
			<div class="display-content">
				<div class="left-panel">
					<header class="display-header">
						<div class="display-title" title={cfg.title}>{cfg.title}</div>
						<div
							class="ntp-status"
							class:error={error || ntpUnavailable}
							data-testid="ntp-status"
							title={ntpUnavailable
								? `${activeNtpServer} unreachable · using local machine time`
								: `Synchronized with ${activeNtpServer}`}
							class:rehearsal
							aria-label={rehearsal
								? 'Rehearsal preview'
								: ntpUnavailable
									? 'NTP unavailable · local machine clock'
									: error
										? 'Clock unavailable'
										: `Clock synchronized · ${activeNtpServer}`}
						>
							<span class="ntp-dot"></span>{rehearsal
								? 'REHEARSAL'
								: ntpUnavailable
									? 'LOCAL CLOCK'
									: highVisibility
										? `NTP SYNCED · ${activeNtpServer}`
										: `NTP · ${activeNtpServer}`}
						</div>
					</header>

					{#if error}
						<section
							class="error-panel"
							bind:this={errorPanel}
							data-testid="clock-error"
							aria-live="assertive"
						>
							<div class="error-kicker">Clock not synced</div>
							<div class="error-title" bind:this={errorTitleElement}>Time unavailable</div>
							<div class="error-copy" bind:this={errorCopyElement}>
								Don't use this screen for timing. The invigilator will announce the time.
							</div>
							<div class="error-detail">
								{rehearsal
									? 'Simulated clock failure · rehearsal'
									: `${activeNtpServer} · no response · retrying in 30 s`}
							</div>
						</section>
					{:else}
						<section class="clock-content" data-testid="clock-panel">
							<div class="time-stack">
								<div
									class="clock-line"
									bind:this={clockElement}
									data-testid="clock-time"
									aria-label={`${timeLabel}:${secondsLabel}`}
								>
									<span class="clock-main" style:font-size={`${clockPx}px`}>{timeLabel}</span>
									<span
										class="clock-seconds"
										style:font-size={`${Math.round(clockPx * (highVisibility ? 0.45 : 0.34))}px`}
										>:{secondsLabel}</span
									>
								</div>
								{#if phaseState.scheduled}
									<div class="remaining-line" bind:this={remainingElement}>
										{#if phaseState.beforeStart}<span class="remaining-word">starts in</span>{/if}
										<span
											class="remaining-time"
											style:color={phase.color}
											style:font-size={`${remainingPx}px`}>{remaining}</span
										>
										{#if !phaseState.beforeStart}<span class="remaining-word">remaining</span>{/if}
									</div>
								{/if}
							</div>
							{#if phaseState.scheduled}<div
									class:visibility-timeline={highVisibility}
									class="timeline"
									aria-label="Exam milestones"
								>
									<div class="track"></div>
									<div
										data-testid="exam-progress-track"
										class="track-progress"
										style={`width:${progress}%`}
									></div>
									{#if !highVisibility}{#each ticks as tick (tick.id)}
											<div class="milestone" style={`left:${tick.position}%`}>
												<span class:muted={!tick.showTime} class="milestone-time">{tick.time}</span>
												<span class="milestone-tick" style:background={tick.color}></span>
												<span class:muted={!tick.showLabel} class="milestone-label"
													>{tick.label}</span
												>
											</div>
										{/each}{/if}
									{#if !highVisibility}<div
											class="current-marker"
											style={`left:${progress}%`}
											style:background={phase.color}
										></div>{/if}
								</div>{/if}
						</section>
					{/if}
				</div>

				{#if !railEmpty}<aside class="right-rail">
						{#if !error && phaseState.scheduled}
							<section
								class="phase-panel"
								bind:this={phaseElement}
								style={`--phase-color:${phase.color};--phase-flex:${phaseFlex};--phase-limit:${phaseLimit};--phase-title-size:${phaseTitlePx}px;--prompt-size:${promptPx}px;`}
							>
								<div class="phase-label">{phaseState.beforeStart ? 'Before start' : 'Now'}</div>
								<div class="phase-copy" bind:this={phaseTextElement} data-testid="current-phase">
									{phaseTitle}
								</div>
								{#if phasePrompt && !highVisibility}
									<div class="phase-prompt" bind:this={promptElement} data-testid="phase-prompt">
										{phasePrompt}
									</div>
								{/if}
							</section>
						{/if}
						{#if hasNotice && highVisibility}
							<section class="notice-panel visibility-notice-panel" bind:this={noticeElement}>
								<div class="notice-heading">Notice</div>
								<div
									class:notice-overflow={noticeOverflow}
									class="notice-copy visibility-notice-copy"
									bind:this={visibilityNoticeElement}
									data-testid="notice-copy"
									style:font-size={`${noticePx}px`}
									style={`--notice-lines:${noticeClampLines}`}
								>
									{visibilityNoticeText}
								</div>
							</section>
						{:else if hasNotice}
							<section class="notice-panel" bind:this={noticeElement}>
								<div class="notice-heading">Notice</div>
								<div
									class="notice-copy"
									bind:this={noticeCopyElement}
									data-testid="notice-copy"
									style:font-size={`${noticePx}px`}
								>
									{#each noticeLines as line, i (i)}
										<div class="notice-line">
											{#if line.bullet}<span class="bullet">•</span>{/if}<span class="notice-text"
												>{line.text}</span
											>
										</div>
									{/each}
								</div>
							</section>
						{/if}
					</aside>{/if}
			</div>

			{#if cfg.guide && safePx > 0}
				<div class="safe-guide" data-testid="safe-area-guide" aria-hidden="true">
					<span>Blocked by audience · {cfg.safe}%</span>
				</div>
			{/if}
		{/if}
	</div>
</div>

<style>
	.projector-root {
		position: fixed;
		inset: 0;
		overflow: hidden;
		background: #0b0c0e;
		color: #15171b;
		font-family: 'IBM Plex Sans', 'Segoe UI', sans-serif;
	}
	.projector-canvas {
		position: absolute;
		left: var(--canvas-center);
		top: 50%;
		width: var(--canvas-width);
		height: 1080px;
		transform: translate(-50%, -50%) scale(var(--canvas-scale));
		transform-origin: center center;
		display: grid;
		grid-template-columns: minmax(0, 1fr) var(--rail-width);
		overflow: hidden;
		background: #f4f5f7;
		font-family: 'Plus Jakarta Sans', 'IBM Plex Sans', sans-serif;
	}
	.display-content {
		position: absolute;
		inset: 0;
		display: grid;
		grid-template-columns: minmax(0, 1fr) var(--rail-width);
		min-width: 0;
		min-height: 0;
	}
	.left-panel {
		display: flex;
		flex-direction: column;
		min-width: 0;
		min-height: 0;
		padding: 56px 56px calc(48px + var(--safe-px)) 72px;
		gap: 24px;
	}
	.display-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 24px;
		flex: none;
		min-width: 0;
	}
	.display-title {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 40px;
		font-weight: 700;
		letter-spacing: -0.01em;
	}
	.ntp-status {
		display: flex;
		flex: none;
		align-items: center;
		gap: 12px;
		color: #555;
		font:
			500 24px 'IBM Plex Mono',
			monospace;
	}
	.ntp-dot {
		width: 16px;
		height: 16px;
		border-radius: 50%;
		background: #1d7a4a;
	}
	.ntp-status.error .ntp-dot {
		background: #c4262e;
	}
	.ntp-status.rehearsal .ntp-dot {
		background: #b5640d;
	}
	.clock-content {
		display: flex;
		flex: 1;
		min-height: 0;
		flex-direction: column;
		justify-content: center;
	}
	.time-stack {
		display: flex;
		min-height: 0;
		flex: 1;
		flex-direction: column;
		justify-content: center;
		gap: 32px;
	}
	.clock-line {
		display: flex;
		align-items: baseline;
		justify-content: flex-start;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		line-height: 0.8;
		white-space: nowrap;
	}
	.clock-main {
		letter-spacing: -0.04em;
	}
	.clock-seconds {
		margin-left: 18px;
		color: #666;
		letter-spacing: -0.02em;
	}
	.remaining-line {
		display: flex;
		align-items: baseline;
		justify-content: flex-start;
		gap: 24px;
		white-space: nowrap;
	}
	.remaining-word {
		color: #333;
		font-size: 48px;
		font-weight: 500;
	}
	.remaining-time {
		font:
			600 88px 'IBM Plex Mono',
			monospace;
		letter-spacing: -0.02em;
	}
	.timeline {
		position: relative;
		height: 140px;
		flex: none;
		margin: 0 52px;
	}
	.track,
	.track-progress {
		position: absolute;
		top: 47px;
		left: 0;
		height: 30px;
	}
	.track {
		right: 0;
		background: #d3d6dc;
	}
	.track-progress {
		background: #15171b;
	}
	.milestone {
		position: absolute;
		top: 0;
		display: flex;
		max-width: 170px;
		transform: translateX(-50%);
		flex-direction: column;
		align-items: center;
		gap: 6px;
	}
	.milestone-time {
		color: #15171b;
		font:
			500 24px 'IBM Plex Mono',
			monospace;
		white-space: nowrap;
	}
	.milestone-time.muted,
	.milestone-label.muted {
		visibility: hidden;
	}
	.milestone-tick {
		width: 4px;
		height: 40px;
		flex: none;
	}
	.milestone-label {
		max-width: 170px;
		overflow: hidden;
		color: #15171b;
		font:
			600 22px 'IBM Plex Sans',
			sans-serif;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.current-marker {
		position: absolute;
		top: 36px;
		width: 12px;
		height: 52px;
		margin-left: -6px;
	}
	.right-rail {
		display: flex;
		min-width: 0;
		min-height: 0;
		flex-direction: column;
		background: #15171b;
	}
	.phase-panel {
		position: relative;
		display: flex;
		min-height: 0;
		max-height: var(--phase-limit);
		box-sizing: border-box;
		overflow: hidden;
		flex: var(--phase-flex);
		flex-direction: column;
		gap: 24px;
		padding: 56px 52px 48px;
		background: var(--phase-color);
		color: #fff;
	}
	.phase-label,
	.notice-heading {
		flex: none;
		font:
			600 22px 'IBM Plex Mono',
			monospace;
		letter-spacing: 0.16em;
		text-transform: uppercase;
	}
	.phase-label {
		opacity: 0.85;
	}
	.phase-copy {
		min-height: 0;
		font-size: var(--phase-title-size);
		font-weight: 800;
		line-height: 1.12;
		letter-spacing: -0.015em;
		text-wrap: balance;
		overflow-wrap: anywhere;
	}
	.phase-prompt {
		min-height: 0;
		font-size: var(--prompt-size);
		font-weight: 600;
		line-height: 1.2;
		text-wrap: pretty;
		overflow-wrap: anywhere;
	}
	.notice-panel {
		display: flex;
		min-height: 0;
		box-sizing: border-box;
		flex: 1;
		flex-direction: column;
		gap: 24px;
		overflow: hidden;
		border-top: 3px solid rgba(255, 255, 255, 0.18);
		padding: 48px 52px calc(48px + var(--safe-px));
		color: #f4f5f7;
	}
	.notice-heading {
		color: #a9aeb8;
	}
	.notice-copy {
		min-height: 0;
		overflow: hidden;
		font-weight: 600;
		line-height: 1.22;
		text-wrap: pretty;
		overflow-wrap: anywhere;
	}
	.notice-line {
		display: flex;
		align-items: flex-start;
		gap: 0.45em;
	}
	.notice-line + .notice-line {
		margin-top: 0.4em;
	}
	.bullet {
		flex: none;
	}
	.notice-text {
		min-width: 0;
	}
	.error-panel {
		display: flex;
		flex: 1;
		min-height: 0;
		flex-direction: column;
		justify-content: center;
		gap: 32px;
		padding: 56px 60px;
		background: #e8c547;
	}
	.error-kicker,
	.error-detail {
		font:
			600 24px 'IBM Plex Mono',
			monospace;
	}
	.error-kicker {
		letter-spacing: 0.14em;
		text-transform: uppercase;
	}
	.error-title {
		font-size: clamp(56px, 6.67vw, 128px);
		font-weight: 800;
		line-height: 1;
		letter-spacing: -0.02em;
		overflow-wrap: anywhere;
	}
	.error-copy {
		max-width: 1100px;
		font-size: 44px;
		font-weight: 500;
		line-height: 1.3;
		text-wrap: pretty;
		overflow-wrap: anywhere;
	}
	.error-detail {
		font-weight: 500;
	}
	.safe-guide {
		position: absolute;
		right: 0;
		bottom: 0;
		left: 0;
		height: var(--safe-px);
		box-sizing: border-box;
		display: flex;
		align-items: flex-end;
		justify-content: flex-end;
		border-top: 6px dashed #b5640d;
		padding: 20px 28px;
		background: repeating-linear-gradient(
			135deg,
			rgba(181, 100, 13, 0.34) 0 20px,
			rgba(181, 100, 13, 0.14) 20px 40px
		);
		color: #3a2200;
		font:
			600 24px 'IBM Plex Mono',
			monospace;
	}

	.projector-canvas.high-visibility {
		background: var(--hv-bg);
		color: var(--hv-fg);
	}
	.high-visibility .left-panel,
	.high-visibility .right-rail {
		background: var(--hv-bg);
		color: var(--hv-fg);
	}
	.high-visibility .display-title,
	.high-visibility .ntp-status,
	.high-visibility .clock-line,
	.high-visibility .remaining-line,
	.high-visibility .phase-label,
	.high-visibility .phase-copy,
	.high-visibility .notice-heading,
	.high-visibility .visibility-notice-copy,
	.high-visibility .error-panel,
	.high-visibility .safe-guide {
		color: var(--hv-fg);
	}
	.high-visibility .phase-panel,
	.high-visibility .notice-panel,
	.high-visibility .error-panel {
		background: var(--hv-bg);
		color: var(--hv-fg);
	}
	.high-visibility .phase-label {
		opacity: 1;
	}
	.high-visibility .phase-panel {
		border-left: 12px solid var(--phase-color);
		border-top-color: var(--hv-fg);
		border-right-color: var(--hv-fg);
		border-bottom-color: var(--hv-fg);
		padding-left: 40px;
	}
	.high-visibility .phase-prompt {
		color: var(--hv-fg);
	}
	.high-visibility .notice-panel {
		border-top-color: var(--hv-fg);
	}
	.high-visibility .clock-line {
		font-weight: 800;
	}
	.high-visibility .clock-seconds {
		color: var(--hv-fg);
		font-weight: 800;
	}
	.high-visibility .remaining-word {
		color: var(--hv-fg);
		font-size: 56px;
		font-weight: 800;
	}
	.high-visibility .remaining-time {
		color: var(--hv-fg) !important;
		font-weight: 800;
	}
	.high-visibility .visibility-timeline .track {
		top: 31px;
		height: 60px;
		box-sizing: border-box;
		border: 6px solid var(--hv-fg);
		background: var(--hv-bg);
	}
	.high-visibility .visibility-timeline .track-progress {
		max-width: calc(100% - 16px);
		top: 39px;
		left: 8px;
		height: 44px;
		background: var(--hv-fg);
	}
	.high-visibility .milestone,
	.high-visibility .current-marker {
		display: none;
	}
	.visibility-notice-copy {
		min-height: 0;
		overflow: hidden;
		color: var(--hv-fg);
		font-weight: 800;
		line-height: 1.22;
		white-space: pre-line;
		overflow-wrap: anywhere;
	}
	.visibility-notice-copy.notice-overflow {
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: var(--notice-lines);
		line-clamp: var(--notice-lines);
	}
	.high-visibility .safe-guide {
		border-color: var(--hv-fg);
		background: var(--hv-bg);
		color: var(--hv-fg);
	}
	.high-visibility .error-panel {
		gap: 24px;
		padding: 36px 40px;
	}
	.high-visibility .error-title,
	.high-visibility .error-copy,
	.high-visibility .error-detail,
	.high-visibility .error-kicker {
		color: var(--hv-fg);
	}
	.high-visibility .error-copy {
		font-weight: 700;
	}
	.calibration-overlay {
		position: absolute;
		inset: 0;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		gap: 14px;
		overflow: hidden;
		padding: 40px 72px calc(48px + var(--safe-px));
		background: var(--hv-bg);
		color: var(--hv-fg);
		font-family: 'IBM Plex Sans', sans-serif;
		font-weight: 800;
	}
	.calibration-heading {
		font:
			700 32px 'IBM Plex Mono',
			monospace;
		letter-spacing: 0.14em;
	}
	.calibration-digits {
		font:
			800 var(--calibration-digits-size) / 1 'IBM Plex Mono',
			monospace;
		font-variant-numeric: tabular-nums;
		letter-spacing: -0.04em;
		white-space: nowrap;
	}
	.calibration-samples {
		display: flex;
		flex-direction: column;
		gap: 4px;
		font-weight: 800;
		line-height: 1.05;
	}
	.sample-72 {
		font-size: 72px;
	}
	.sample-56 {
		font-size: 56px;
	}
	.sample-48 {
		font-size: 48px;
	}
	.calibration-bands {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		height: 64px;
		flex: none;
		border: 3px solid var(--hv-fg);
	}
	.calibration-bands span:nth-child(odd) {
		background: var(--hv-fg);
	}
	.calibration-bands span:nth-child(even) {
		background: var(--hv-bg);
	}
	.calibration-directions {
		max-width: 1400px;
		font-size: 48px;
		line-height: 1.1;
	}
	.calibration-exit {
		margin-top: auto;
		font-size: 32px;
	}
	.calibration-safe {
		position: absolute;
		right: 0;
		bottom: 0;
		left: 0;
		box-sizing: border-box;
		display: flex;
		align-items: flex-end;
		justify-content: flex-end;
		border-top: 6px dashed var(--hv-fg);
		padding: 20px 28px;
		background: var(--hv-bg);
		font:
			700 24px 'IBM Plex Mono',
			monospace;
	}
</style>
