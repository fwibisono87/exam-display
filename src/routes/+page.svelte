<script lang="ts">
	import { onMount } from 'svelte';
	import ProjectorDisplay from '$lib/ProjectorDisplay.svelte';
	import OperatorConsole from '$lib/OperatorConsole.svelte';
	import {
		STORAGE_KEY,
		defaultConfig,
		loadState,
		toSeconds,
		type ProjectorConfig,
		type Rehearsal
	} from '$lib/projector-model';
	import type { NtpInfo, TimeResponse, TimeSource } from '$lib/types';
	import { DEFAULT_NTP_PROVIDER } from '../constants/enums/ntp_providers';

	let cfg = defaultConfig();
	let rehearsal: Rehearsal = { enabled: false, base: 0, at: 0, fail: false };
	let now = 0;
	let timeSource: TimeSource = 'error';
	let ntpInfo: NtpInfo = { server: DEFAULT_NTP_PROVIDER };
	let timezone = 'Asia/Jakarta';
	let healthStatus = 'checking…';
	let open = false;
	let calibration = false;
	let noticeOverflow = false;
	let controlsChannel: BroadcastChannel | undefined;
	let consoleOnly = false;
	let chrome = true;
	let storageWarning = '';
	let mounted = false;
	let liveTimestamp: number | null = null;
	let liveAnchor = 0;
	let syncTimer: ReturnType<typeof setTimeout>;
	let hideTimer: ReturnType<typeof setTimeout>;
	let stopped = false;
	let syncing = false;
	let timeController: AbortController | null = null;
	const pendingRequests = new Set<AbortController>();

	$: clockError = rehearsal.enabled && rehearsal.fail;
	$: ntpUnavailable = !rehearsal.enabled && timeSource === 'error';

	function secondsInTimezone(timestamp: number) {
		const parts = new Intl.DateTimeFormat('en-GB', {
			timeZone: timezone,
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			hourCycle: 'h23'
		}).formatToParts(timestamp);
		const part = (type: string) => Number(parts.find((p) => p.type === type)?.value || 0);
		return part('hour') * 3600 + part('minute') * 60 + part('second');
	}

	function tick() {
		if (rehearsal.enabled) {
			now = rehearsal.base + Math.max(0, Math.floor((Date.now() - rehearsal.at) / 1000));
		} else if (liveTimestamp !== null && timeSource !== 'error') {
			now = secondsInTimezone(liveTimestamp + performance.now() - liveAnchor);
		} else {
			now = secondsInTimezone(Date.now());
		}
	}

	async function syncTime(force = false) {
		if (stopped) return;
		if (syncing) {
			if (!force) return;
			timeController?.abort();
		}
		syncing = true;
		clearTimeout(syncTimer);
		const requestedServer = cfg.ntpServer;
		const controller = new AbortController();
		timeController = controller;
		pendingRequests.add(controller);
		const timeout = setTimeout(() => controller.abort(), 10000);
		try {
			const response = await fetch(`/api/time?server=${encodeURIComponent(requestedServer)}`, {
				signal: controller.signal
			});
			const data: TimeResponse = await response.json();
			const timestamp = Date.parse(data.time || '');
			if (
				!response.ok ||
				!Number.isFinite(timestamp) ||
				!['ntp', 'ntp_partial'].includes(data.timeSource || '')
			) {
				throw new Error(data.ntp?.errorDetails || data.ntp?.error || 'NTP time unavailable');
			}
			if (stopped || controller.signal.aborted) return;
			// Validate the server timezone before accepting this sample.
			new Intl.DateTimeFormat('en-GB', { timeZone: data.timezone }).format(timestamp);
			timezone = data.timezone;
			liveTimestamp = timestamp;
			liveAnchor = performance.now();
			timeSource = data.timeSource as TimeSource;
			ntpInfo = data.ntp || { server: requestedServer };
			tick();
		} catch (error) {
			if (stopped || controller.signal.aborted) return;
			liveTimestamp = null;
			timeSource = 'error';
			ntpInfo = {
				server: requestedServer,
				error: 'time_unavailable',
				errorDetails: error instanceof Error ? error.message : 'NTP unavailable'
			};
			tick();
		} finally {
			clearTimeout(timeout);
			pendingRequests.delete(controller);
			if (timeController === controller) {
				timeController = null;
				syncing = false;
				if (!stopped) syncTimer = setTimeout(syncTime, timeSource === 'error' ? 30000 : 300000);
			}
		}
	}

	async function checkHealth() {
		const controller = new AbortController();
		pendingRequests.add(controller);
		const timeout = setTimeout(() => controller.abort(), 10000);
		try {
			const response = await fetch('/api/health', { signal: controller.signal });
			const data = await response.json();
			if (!stopped) healthStatus = response.ok ? data.status : 'unhealthy';
		} catch {
			if (!stopped) healthStatus = 'unhealthy';
		} finally {
			clearTimeout(timeout);
			pendingRequests.delete(controller);
		}
	}

	function persist() {
		if (!mounted) return;
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify({ cfg, rehearsal }));
			storageWarning = '';
		} catch {
			storageWarning = 'Changes could not be saved on this device. Pop-out sync is unavailable.';
		}
	}

	function updateConfig(value: ProjectorConfig) {
		const serverChanged = value.ntpServer !== cfg.ntpServer;
		cfg = value;
		persist();
		tick();
		if (serverChanged) void syncTime(true);
	}
	function updateRehearsal(value: Rehearsal) {
		rehearsal = value;
		persist();
		tick();
	}
	function setCalibration(value: boolean) {
		calibration = value;
		controlsChannel?.postMessage({ type: 'calibration', value });
	}
	function updateNoticeOverflow(value: boolean) {
		if (noticeOverflow === value) return;
		noticeOverflow = value;
		controlsChannel?.postMessage({ type: 'notice-overflow', value });
	}
	function reset() {
		const previousServer = cfg.ntpServer;
		setCalibration(false);
		cfg = defaultConfig();
		rehearsal = { enabled: false, base: toSeconds(cfg.start), at: Date.now(), fail: false };
		persist();
		tick();
		if (cfg.ntpServer !== previousServer) void syncTime(true);
	}
	function revealControls() {
		chrome = true;
		clearTimeout(hideTimer);
		hideTimer = setTimeout(() => {
			chrome = false;
		}, 2500);
	}
	function popOut() {
		const popup = window.open(
			`${location.href.split('#')[0]}#console`,
			'examConsole',
			'width=560,height=900'
		);
		if (popup) {
			open = false;
			popup.focus();
		}
	}
	function syncNow() {
		void syncTime(true);
		void checkHealth();
	}
	function fullscreen() {
		const action = document.fullscreenElement
			? document.exitFullscreen()
			: document.documentElement.requestFullscreen?.();
		void action?.catch(() => {
			/* Browser may decline fullscreen. */
		});
	}

	onMount(() => {
		mounted = true;
		try {
			({ cfg, rehearsal } = loadState(localStorage));
		} catch {
			storageWarning = 'Changes could not be saved on this device. Pop-out sync is unavailable.';
		}
		consoleOnly = location.hash === '#console';
		if (typeof BroadcastChannel !== 'undefined') {
			controlsChannel = new BroadcastChannel('examDisplay.controls');
			controlsChannel.onmessage = ({ data }) => {
				if (data?.type === 'calibration' && typeof data.value === 'boolean')
					calibration = data.value;
				if (data?.type === 'notice-overflow' && typeof data.value === 'boolean')
					noticeOverflow = data.value;
				if (data?.type === 'state-request' && !consoleOnly) {
					controlsChannel?.postMessage({ type: 'calibration', value: calibration });
					controlsChannel?.postMessage({ type: 'notice-overflow', value: noticeOverflow });
				}
			};
			if (consoleOnly) controlsChannel.postMessage({ type: 'state-request' });
			else controlsChannel.postMessage({ type: 'calibration', value: false });
		}
		persist();
		tick();
		syncNow();
		revealControls();
		const ticker = setInterval(tick, 1000);
		const healthTicker = setInterval(checkHealth, 600000);
		const onStorage = (event: StorageEvent) => {
			if (event.key !== STORAGE_KEY && event.key !== null) return;
			const previousServer = cfg.ntpServer;
			({ cfg, rehearsal } = loadState(localStorage));
			tick();
			if (cfg.ntpServer !== previousServer) void syncTime(true);
		};
		const onHash = () => {
			consoleOnly = location.hash === '#console';
		};
		const onKey = (event: KeyboardEvent) => {
			if (event.ctrlKey || event.metaKey || event.altKey) return;
			const target = event.target;
			if (
				target instanceof HTMLElement &&
				target.closest('input,textarea,select,[contenteditable="true"]')
			) {
				if (event.key === 'Escape') target.blur();
				return;
			}
			if (event.key.toLowerCase() === 'c' && !consoleOnly) {
				open = !open;
				event.preventDefault();
			}
			if (event.key === 'Escape') open = false;
			if (event.key.toLowerCase() === 'f') fullscreen();
		};
		window.addEventListener('storage', onStorage);
		window.addEventListener('hashchange', onHash);
		window.addEventListener('keydown', onKey);
		window.addEventListener('pointermove', revealControls);
		return () => {
			stopped = true;
			controlsChannel?.close();
			clearInterval(ticker);
			clearInterval(healthTicker);
			clearTimeout(syncTimer);
			clearTimeout(hideTimer);
			pendingRequests.forEach((request) => request.abort());
			window.removeEventListener('storage', onStorage);
			window.removeEventListener('hashchange', onHash);
			window.removeEventListener('keydown', onKey);
			window.removeEventListener('pointermove', revealControls);
		};
	});
</script>

<svelte:head><title>{cfg.title || 'Exam Display'}</title></svelte:head>
<div class:console-only={consoleOnly} class="projector-app">
	{#if !consoleOnly}
		<ProjectorDisplay
			{cfg}
			{now}
			error={clockError}
			{ntpUnavailable}
			{calibration}
			onNoticeOverflow={updateNoticeOverflow}
			rehearsal={rehearsal.enabled}
			controlsOpen={open}
		/>
		<button
			class="controls-toggle"
			class:concealed={!chrome || open}
			onclick={() => (open = !open)}
			onfocus={revealControls}
			aria-label="Toggle operator controls">Controls <kbd>C</kbd></button
		>
	{/if}
	{#if open || consoleOnly}
		<OperatorConsole
			{cfg}
			{rehearsal}
			{now}
			{consoleOnly}
			{calibration}
			{noticeOverflow}
			onCalibration={setCalibration}
			{timeSource}
			{ntpInfo}
			{healthStatus}
			{timezone}
			onConfig={updateConfig}
			onRehearsal={updateRehearsal}
			onClose={() => (open = false)}
			onPopOut={popOut}
			onSync={syncNow}
			onReset={reset}
		/>
		{#if storageWarning}<div class="storage-warning" role="status">{storageWarning}</div>{/if}
	{/if}
</div>

<style>
	.projector-app {
		position: fixed;
		inset: 0;
		overflow: hidden;
		background: #0b0c0e;
		font-family: 'IBM Plex Sans', sans-serif;
	}
	.console-only {
		background: #e9e8e4;
	}
	.controls-toggle {
		position: absolute;
		top: 16px;
		right: 16px;
		z-index: 5;
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 10px 14px;
		background: rgba(21, 23, 27, 0.88);
		color: white;
		border: 0;
		font:
			600 13px 'IBM Plex Sans',
			sans-serif;
		cursor: pointer;
		transition: opacity 0.3s;
	}
	.controls-toggle kbd {
		font:
			500 11px 'IBM Plex Mono',
			monospace;
		padding: 2px 6px;
		border: 1px solid #ffffff66;
	}
	.concealed {
		opacity: 0;
		pointer-events: none;
	}
	.controls-toggle:focus-visible {
		opacity: 1;
		pointer-events: auto;
		outline: 2px solid #e8c547;
	}
	.storage-warning {
		position: fixed;
		bottom: 0;
		right: 0;
		z-index: 60;
		max-width: 460px;
		padding: 12px;
		background: #e8c547;
		color: #15171b;
	}
</style>
