<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import AnnouncementsBanner from '$lib/AnnouncementsBanner.svelte';
	import ExamClock from '$lib/ExamClock.svelte';
	import OperatorSidebar from '$lib/OperatorSidebar.svelte';
	import SystemStatus from '$lib/SystemStatus.svelte';
	import type {
		AnnouncementPosition,
		Checkpoint,
		HealthResponse,
		NtpInfo,
		PersistedSettings,
		TimeResponse,
		TimeSource
	} from '$lib/types';

	const DEFAULT_TITLE = 'Exam Time Display';
	const DEFAULT_ANNOUNCEMENT_POSITION: AnnouncementPosition = 'top';
	const DEFAULT_ANNOUNCEMENT_FONT_SIZE = 32;

	function createDefaultCheckpoints(): Checkpoint[] {
		return [
			{
				id: 'midpoint',
				name: 'Exam Midpoint',
				time: '',
				enabled: true,
				emoji: '⏰',
				color: '#0F62FE',
				isCustom: false
			},
			{
				id: 'final30',
				name: 'Final 30 Minutes',
				time: '',
				enabled: true,
				emoji: '⚠️',
				color: '#FF832B',
				isCustom: false
			},
			{
				id: 'final15',
				name: 'Final 15 Minutes',
				time: '',
				enabled: true,
				emoji: '🔔',
				color: '#DA1E28',
				isCustom: false
			},
			{
				id: 'final5',
				name: 'Final 5 Minutes',
				time: '',
				enabled: true,
				emoji: '🚨',
				color: '#A2191F',
				isCustom: false
			}
		];
	}

	let serverTime = '';
	let serverDate = '';
	let timezone = '';
	let healthStatus = 'checking...';
	let lastHealthCheck = '';
	let responseTime = 0;
	let timeSource: TimeSource = 'error';
	let ntpInfo: NtpInfo = {};
	let is24Hour = true;
	let interval: ReturnType<typeof setInterval>;
	let healthInterval: ReturnType<typeof setInterval>;
	let clockInterval: ReturnType<typeof setInterval>;
	let isHealthCheckInRecoveryMode = false;
	let currentTime: Date | null = null;
	let serverTimeOffset = 0;
	let announcements = '';
	let isEditingAnnouncements = false;
	let showAnnouncements = true;
	let announcementPosition: AnnouncementPosition = DEFAULT_ANNOUNCEMENT_POSITION;
	let announcementFontSize = DEFAULT_ANNOUNCEMENT_FONT_SIZE;
	let highContrastMode = false;
	let showOperatorSidebar = false;
	let customTitle = DEFAULT_TITLE;
	let showDate = false;
	let showTimezone = false;
	let bottomDeadZoneVh = 0;
	let showDeadZoneGuide = false;

	let examStartTime = '';
	let examEndTime = '';
	let examMidpointTime = '';
	let final30Time = '';
	let final15Time = '';
	let final5Time = '';

	let checkpoints: Checkpoint[] = createDefaultCheckpoints();
	let customCheckpoints: Checkpoint[] = [];
	let activeCheckpoint: Checkpoint | null = null;
	let nextCheckpoint: Checkpoint | null = null;
	let examProgress = 0;
	let nextCheckpointProgress = 0;

	async function fetchServerTime() {
		try {
			const response = await fetch('/api/time');
			const data: TimeResponse = await response.json();

			if (!response.ok || !data.time) {
				throw new Error(data.ntp?.errorDetails || data.ntp?.error || 'NTP time unavailable');
			}

			const serverDateValue = new Date(data.time);
			const clientDate = new Date();

			serverTimeOffset = serverDateValue.getTime() - clientDate.getTime();
			timeSource = data.timeSource || 'error';
			ntpInfo = data.ntp || {};
			updateTimeDisplay();

			const timezoneAbbr = serverDateValue
				.toLocaleString('en-US', {
					timeZoneName: 'short'
				})
				.split(' ')
				.pop();

			timezone = `${data.timezone} (${timezoneAbbr})`;
		} catch (error) {
			console.error('Error fetching server time:', error);
			serverTime = 'NTP unavailable';
			serverDate = 'Unable to obtain ntp.ui.ac.id time';
			timezone = '';
			timeSource = 'error';
			ntpInfo = {
				server: 'ntp.ui.ac.id',
				error: 'time_unavailable',
				errorDetails: error instanceof Error ? error.message : 'Unknown error fetching time'
			};
			currentTime = null;
			serverTimeOffset = 0;
			examProgress = 0;
			nextCheckpointProgress = 0;
		}
	}

	function updateTimeDisplay() {
		if (timeSource === 'error') {
			currentTime = null;
			return;
		}

		const now = new Date();
		currentTime = new Date(now.getTime() + serverTimeOffset);
		updateCheckpointStatus();
		calculateProgressValues();

		serverTime = currentTime.toLocaleString('en-US', {
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			hour12: !is24Hour
		});

		serverDate = currentTime.toLocaleString('en-US', {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}

	function calculateProgressValues() {
		if (!currentTime || !examStartTime || !examEndTime) {
			examProgress = 0;
			nextCheckpointProgress = 0;
			return;
		}

		const today = currentTime.toISOString().split('T')[0];
		const start = new Date(`${today}T${examStartTime}`);
		let end = new Date(`${today}T${examEndTime}`);

		if (end < start) {
			end = new Date(`${today}T${examEndTime}`);
			end.setDate(end.getDate() + 1);
		}

		const totalExamDuration = end.getTime() - start.getTime();
		const elapsedTime = currentTime.getTime() - start.getTime();
		examProgress = Math.min(100, Math.max(0, Math.floor((elapsedTime / totalExamDuration) * 100)));

		if (nextCheckpoint && nextCheckpoint.time) {
			const nextCheckpointDate = new Date(`${today}T${nextCheckpoint.time}`);

			if (nextCheckpointDate < currentTime) {
				nextCheckpointDate.setDate(nextCheckpointDate.getDate() + 1);
			}

			if (activeCheckpoint) {
				const activeCheckpointDate = new Date(`${today}T${activeCheckpoint.time}`);

				if (activeCheckpointDate > currentTime) {
					activeCheckpointDate.setDate(activeCheckpointDate.getDate() - 1);
				}

				const segmentDuration = nextCheckpointDate.getTime() - activeCheckpointDate.getTime();
				const elapsedSegmentTime = currentTime.getTime() - activeCheckpointDate.getTime();

				nextCheckpointProgress = Math.min(
					100,
					Math.max(0, Math.floor((elapsedSegmentTime / segmentDuration) * 100))
				);
			} else {
				const segmentDuration = nextCheckpointDate.getTime() - start.getTime();
				const elapsedSegmentTime = currentTime.getTime() - start.getTime();

				nextCheckpointProgress = Math.min(
					100,
					Math.max(0, Math.floor((elapsedSegmentTime / segmentDuration) * 100))
				);
			}
		} else {
			nextCheckpointProgress = 0;
		}
	}

	async function checkServerHealth() {
		try {
			const startTime = Date.now();
			const response = await fetch('/api/health');
			const endTime = Date.now();
			const data: HealthResponse = await response.json();

			healthStatus = data.status;
			lastHealthCheck = new Date(data.timestamp).toLocaleTimeString();
			responseTime = endTime - startTime;

			if (healthStatus === 'healthy' && isHealthCheckInRecoveryMode) {
				isHealthCheckInRecoveryMode = false;
				setHealthCheckInterval(600000);
			} else if (healthStatus !== 'healthy' && !isHealthCheckInRecoveryMode) {
				isHealthCheckInRecoveryMode = true;
				setHealthCheckInterval(30000);
			}
		} catch (error) {
			console.error('Error checking server health:', error);
			healthStatus = 'unhealthy';
			lastHealthCheck = new Date().toLocaleTimeString();

			if (!isHealthCheckInRecoveryMode) {
				isHealthCheckInRecoveryMode = true;
				setHealthCheckInterval(30000);
			}
		}
	}

	function setHealthCheckInterval(intervalMs: number) {
		if (healthInterval) {
			clearInterval(healthInterval);
		}

		healthInterval = setInterval(checkServerHealth, intervalMs);
	}

	function manualHealthCheck() {
		fetchServerTime();
		checkServerHealth();
	}

	function toggleAnnouncementsEdit() {
		isEditingAnnouncements = !isEditingAnnouncements;
	}

	function saveAnnouncements() {
		isEditingAnnouncements = false;

		if (typeof localStorage === 'undefined') {
			return;
		}

		localStorage.setItem('examAnnouncements', announcements);
	}

	function loadAnnouncements() {
		if (typeof localStorage === 'undefined') {
			return;
		}

		const saved = localStorage.getItem('examAnnouncements');
		if (saved) {
			announcements = saved;
		}
	}

	function calculateCheckpointTimes() {
		if (!examStartTime || !examEndTime) return;

		const start = new Date(`1970-01-01T${examStartTime}`);
		const end = new Date(`1970-01-01T${examEndTime}`);

		if (end < start) {
			end.setDate(end.getDate() + 1);
		}

		const duration = end.getTime() - start.getTime();
		const midpoint = new Date(start.getTime() + duration / 2);

		examMidpointTime = midpoint.toTimeString().slice(0, 5);
		final30Time = new Date(end.getTime() - 30 * 60000).toTimeString().slice(0, 5);
		final15Time = new Date(end.getTime() - 15 * 60000).toTimeString().slice(0, 5);
		final5Time = new Date(end.getTime() - 5 * 60000).toTimeString().slice(0, 5);

		updateCheckpointObjects();
		saveExamSettings();
		updateTimeDisplay();
	}

	function updateCheckpointObjects() {
		checkpoints[0].time = examMidpointTime;
		checkpoints[1].time = final30Time;
		checkpoints[2].time = final15Time;
		checkpoints[3].time = final5Time;
	}

	function updateCheckpointStatus() {
		if (!currentTime) return;

		const currentTimeStr = currentTime.toTimeString().slice(0, 5);
		const allCheckpoints: Checkpoint[] = [];

		if (examStartTime) {
			allCheckpoints.push({
				id: 'exam-start',
				name: 'Exam Start',
				time: examStartTime,
				enabled: true,
				emoji: '🟢',
				color: '#198038',
				isCustom: false
			});
		}

		allCheckpoints.push(...checkpoints.filter((cp) => cp.enabled && cp.time));
		allCheckpoints.push(...customCheckpoints.filter((cp) => cp.enabled && cp.time));

		if (examEndTime) {
			allCheckpoints.push({
				id: 'exam-end',
				name: 'Exam End',
				time: examEndTime,
				enabled: true,
				emoji: '🔴',
				color: '#DA1E28',
				isCustom: false
			});
		}

		allCheckpoints.sort((a, b) => a.time.localeCompare(b.time));

		let newActiveCheckpoint: Checkpoint | null = null;
		let newNextCheckpoint: Checkpoint | null = null;

		for (const checkpoint of allCheckpoints) {
			if (currentTimeStr >= checkpoint.time) {
				newActiveCheckpoint = checkpoint;
			} else if (!newNextCheckpoint && currentTimeStr < checkpoint.time) {
				newNextCheckpoint = checkpoint;
				break;
			}
		}

		activeCheckpoint = newActiveCheckpoint;
		nextCheckpoint = newNextCheckpoint;
	}

	function addCustomCheckpoint() {
		const newCheckpoint: Checkpoint = {
			id: `custom-${Date.now()}`,
			name: 'Custom Milestone',
			time: '',
			enabled: true,
			emoji: '📝',
			color: '#4589FF',
			isCustom: true
		};

		customCheckpoints = [...customCheckpoints, newCheckpoint];
		saveExamSettings();
	}

	function removeCustomCheckpoint(id: string) {
		customCheckpoints = customCheckpoints.filter((cp) => cp.id !== id);
		saveExamSettings();
		updateTimeDisplay();
	}

	function saveExamSettings() {
		if (typeof localStorage === 'undefined') {
			return;
		}

		const settings: PersistedSettings = {
			examStartTime,
			examEndTime,
			examMidpointTime,
			final30Time,
			final15Time,
			final5Time,
			checkpoints,
			customCheckpoints,
			customTitle,
			announcementPosition,
			announcementFontSize,
			is24Hour,
			highContrastMode,
			showAnnouncements,
			showDate,
			showTimezone,
			bottomDeadZoneVh
		};

		localStorage.setItem('examSettings', JSON.stringify(settings));
	}

	function handleSettingsSave() {
		saveExamSettings();
		updateTimeDisplay();
	}

	function clearAllSettings() {
		examStartTime = '';
		examEndTime = '';
		examMidpointTime = '';
		final30Time = '';
		final15Time = '';
		final5Time = '';
		customTitle = DEFAULT_TITLE;
		announcementPosition = DEFAULT_ANNOUNCEMENT_POSITION;
		announcementFontSize = DEFAULT_ANNOUNCEMENT_FONT_SIZE;
		is24Hour = true;
		highContrastMode = false;
		announcements = '';
		showAnnouncements = true;
		showDate = false;
		showTimezone = false;
		bottomDeadZoneVh = 0;
		isEditingAnnouncements = false;
		checkpoints = createDefaultCheckpoints();
		customCheckpoints = [];
		activeCheckpoint = null;
		nextCheckpoint = null;

		if (typeof localStorage !== 'undefined') {
			localStorage.removeItem('examSettings');
			localStorage.removeItem('examAnnouncements');
		}

		updateTimeDisplay();
	}

	function loadExamSettings() {
		if (typeof localStorage === 'undefined') {
			return;
		}

		const saved = localStorage.getItem('examSettings');
		if (!saved) return;

		const settings = JSON.parse(saved) as Partial<PersistedSettings>;
		examStartTime = settings.examStartTime || '';
		examEndTime = settings.examEndTime || '';
		examMidpointTime = settings.examMidpointTime || '';
		final30Time = settings.final30Time || '';
		final15Time = settings.final15Time || '';
		final5Time = settings.final5Time || '';
		customTitle = settings.customTitle || DEFAULT_TITLE;
		announcementPosition = settings.announcementPosition || DEFAULT_ANNOUNCEMENT_POSITION;
		announcementFontSize = settings.announcementFontSize || DEFAULT_ANNOUNCEMENT_FONT_SIZE;
		is24Hour = settings.is24Hour ?? true;
		highContrastMode = settings.highContrastMode || false;
		showAnnouncements = settings.showAnnouncements ?? true;
		showDate = settings.showDate ?? false;
		showTimezone = settings.showTimezone ?? false;
		bottomDeadZoneVh = settings.bottomDeadZoneVh ?? 0;

		if (settings.checkpoints) checkpoints = settings.checkpoints;
		if (settings.customCheckpoints) customCheckpoints = settings.customCheckpoints;
	}

	onMount(() => {
		loadAnnouncements();
		loadExamSettings();
		fetchServerTime();
		checkServerHealth();

		clockInterval = setInterval(updateTimeDisplay, 1000);
		interval = setInterval(fetchServerTime, 300000);
		healthInterval = setInterval(checkServerHealth, 600000);
	});

	onDestroy(() => {
		if (interval) clearInterval(interval);
		if (healthInterval) clearInterval(healthInterval);
		if (clockInterval) clearInterval(clockInterval);
	});

	$: if (typeof document !== 'undefined') {
		if (highContrastMode) {
			document.body.classList.add('high-contrast');
		} else {
			document.body.classList.remove('high-contrast');
		}
	}
</script>

<svelte:head>
	<title>{customTitle}</title>
</svelte:head>

<div
	class={`relative h-screen overflow-hidden px-4 py-4 md:px-6 md:py-6 ${
		highContrastMode ? 'bg-black text-white' : 'bg-slate-100 text-slate-900'
	}`}
	style={`--dead-zone-size: ${bottomDeadZoneVh}vh; --safe-zone-size: calc(100vh - ${bottomDeadZoneVh}vh);`}
>
	<button
		on:click={() => (showOperatorSidebar = !showOperatorSidebar)}
		class={`fixed right-4 top-4 z-50 inline-flex items-center gap-2 border px-4 py-3 text-sm font-semibold transition-colors ${
			highContrastMode
				? 'border-white bg-black text-white'
				: 'border-slate-300 bg-white text-slate-900'
		}`}
		aria-label="Toggle operator controls"
	>
		<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"
			></path>
		</svg>
		<span>{showOperatorSidebar ? 'Hide controls' : 'Show controls'}</span>
	</button>

	{#if showOperatorSidebar}
		<OperatorSidebar
			bind:customTitle
			bind:examStartTime
			bind:examEndTime
			bind:checkpoints
			bind:customCheckpoints
			bind:announcements
			bind:isEditingAnnouncements
			bind:showAnnouncements
			bind:announcementPosition
			bind:announcementFontSize
			bind:is24Hour
			bind:highContrastMode
			bind:showDate
			bind:showTimezone
			bind:bottomDeadZoneVh
			bind:showDeadZoneGuide
			{activeCheckpoint}
			{nextCheckpoint}
			{timeSource}
			{ntpInfo}
			{healthStatus}
			{lastHealthCheck}
			{responseTime}
			on:saveSettings={handleSettingsSave}
			on:calculateCheckpoints={calculateCheckpointTimes}
			on:addCustomCheckpoint={addCustomCheckpoint}
			on:removeCustomCheckpoint={(event) => removeCustomCheckpoint(event.detail.id)}
			on:toggleAnnouncementsEdit={toggleAnnouncementsEdit}
			on:saveAnnouncements={saveAnnouncements}
			on:clearAllSettings={clearAllSettings}
			on:syncNow={manualHealthCheck}
			on:close={() => (showOperatorSidebar = false)}
		/>
	{/if}

	{#if showDeadZoneGuide && bottomDeadZoneVh > 0}
		<div
			class="safe-guide-pattern pointer-events-none fixed inset-x-0 bottom-0 z-30 border-t-4 border-dashed border-amber-400"
			style:height={`calc(${bottomDeadZoneVh}vh)`}
		>
			<div class="px-4 py-2 text-right text-xs font-semibold uppercase tracking-[0.18em] text-amber-100">
				Blocked by room sightline
			</div>
		</div>
	{/if}

	<div class="mx-auto flex h-full max-w-[1600px] flex-col overflow-hidden">
		<section
			class="flex min-h-0 flex-1 flex-col gap-6"
			style="height: calc(var(--safe-zone-size) - 2rem);"
		>
		<header class="flex flex-col gap-4 pt-16 lg:flex-row lg:items-start lg:justify-between">
			<div class="max-w-4xl">
				<h1 class="text-4xl leading-tight md:text-6xl lg:text-7xl">{customTitle}</h1>
			</div>
			<div class="flex flex-wrap items-center gap-3">
				<SystemStatus {healthStatus} {highContrastMode} />
				{#if bottomDeadZoneVh > 0}
					<div
						class={`inline-flex items-center gap-2 border px-4 py-3 text-base font-semibold ${
							highContrastMode
								? 'border-white bg-black'
								: 'border-slate-300 bg-white'
						}`}
					>
						<span>Reserved bottom zone</span>
						<span class="font-mono">{bottomDeadZoneVh}vh</span>
					</div>
				{/if}
			</div>
		</header>

		{#if announcementPosition === 'top'}
			<AnnouncementsBanner
				{announcements}
				{showAnnouncements}
				position="top"
				fontSize={announcementFontSize}
				{highContrastMode}
			/>
		{/if}

		<main
			class={`grid min-h-0 flex-1 gap-6 ${
				announcementPosition === 'left' && showAnnouncements && announcements.trim()
					? 'xl:grid-cols-[minmax(18rem,24rem)_minmax(0,1fr)]'
					: ''
			}`}
		>
			{#if announcementPosition === 'left' && showAnnouncements && announcements.trim()}
				<div class="self-start overflow-hidden">
					<AnnouncementsBanner
						{announcements}
						{showAnnouncements}
						position="left"
						fontSize={announcementFontSize}
						{highContrastMode}
					/>
				</div>
			{/if}

			<div class="min-w-0 overflow-hidden">
				<ExamClock
					{serverTime}
					{serverDate}
					{timezone}
					{activeCheckpoint}
					{nextCheckpoint}
					{highContrastMode}
					{examProgress}
					{nextCheckpointProgress}
					{showDate}
					{showTimezone}
				/>
			</div>
		</main>
		</section>

		{#if bottomDeadZoneVh > 0}
			<div
				class={`mt-4 border-t ${
					highContrastMode ? 'border-white bg-black' : 'border-slate-300 bg-slate-200'
				}`}
				style:height={`calc(${bottomDeadZoneVh}vh)`}
				aria-hidden="true"
			></div>
		{/if}
	</div>
</div>
