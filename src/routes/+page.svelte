<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import OperatorSidebar from '$lib/OperatorSidebar.svelte';
	import AnnouncementsBanner from '$lib/AnnouncementsBanner.svelte';
	import ExamClock from '$lib/ExamClock.svelte';
	import SystemStatus from '$lib/SystemStatus.svelte';
	
	let serverTime = '';
	let serverDate = '';
	let timezone = '';
	let healthStatus = 'checking...';
	let lastHealthCheck = '';
	let responseTime = 0;
	let timeSource = 'local';
	let ntpInfo: { 
		serve	<div class="max-w-7xl mx-auto px-2 xl:px-4 {showOperatorSidebar ? 'mr-96' : ''}">{<div class="max-w-7xl mx-auto px-2 xl:px-4 {showOperatorSidebar ? 'mr-96' : ''}">?: string; 
		offset?: number; 
		delay?: number; 
		error?: string; 
		errorDetails?: string; 
	} = {};
	let is24Hour = true; // Default to 24-hour format
	let interval: ReturnType<typeof setInterval>;
	let healthInterval: ReturnType<typeof setInterval>;
	let clockInterval: ReturnType<typeof setInterval>; // For client-side clock ticking
	let isHealthCheckInRecoveryMode = false; // Track if we're in rapid health check mode
	let currentTime: Date | null = null; // Store the current time object for client-side updates
	let serverTimeOffset = 0; // Offset between server time and client time
	let announcements = ''; // Announcements text for exam setting
	let isEditingAnnouncements = false; // Toggle for editing mode
	let showAnnouncements = true; // Toggle for showing/hiding announcements
	let announcementPosition = 'top'; // 'top' or 'left' - position of announcements
	let showOperatorSidebar = false; // Toggle for operator controls
	let customTitle = 'Exam Time Display'; // Customizable title text
	let forceNTP = false; // Force accept NTP even with invalid metrics
	
	// Exam timing settings
	let examStartTime = '';
	let examEndTime = '';
	let examMidpointTime = '';
	let final30Time = '';
	let final15Time = '';
	let final5Time = '';
	
	// Checkpoint settings
	interface Checkpoint {
		id: string;
		name: string;
		time: string;
		enabled: boolean;
		emoji: string;
		color: string;
		isCustom: boolean;
	}
	
	let checkpoints: Checkpoint[] = [
		{ id: 'midpoint', name: 'Exam Midpoint', time: '', enabled: true, emoji: '⏰', color: '#3B82F6', isCustom: false },
		{ id: 'final30', name: 'Final 30 Minutes', time: '', enabled: true, emoji: '⚠️', color: '#F59E0B', isCustom: false },
		{ id: 'final15', name: 'Final 15 Minutes', time: '', enabled: true, emoji: '🔔', color: '#EF4444', isCustom: false },
		{ id: 'final5', name: 'Final 5 Minutes', time: '', enabled: true, emoji: '🚨', color: '#DC2626', isCustom: false }
	];
	
	let customCheckpoints: Checkpoint[] = [];
	let activeCheckpoint: Checkpoint | null = null;
	let nextCheckpoint: Checkpoint | null = null;
	
	interface TimeResponse {
		time: string;
		timestamp: number;
		timezone: string;
		localTime?: string;
		timeSource?: string;
		ntp?: {
			server?: string;
			offset?: number;
			delay?: number;
			error?: string;
			errorDetails?: string;
			hasValidMetrics?: boolean;
		};
		status: string;
	}
	
	interface HealthResponse {
		status: string;
		timestamp: string;
		checks: {
			server: string;
			database: string;
			memory: string;
			uptime: number | string;
			responseTime: number;
		};
		version: string;
	}
	
	async function fetchServerTime() {
		try {
			const response = await fetch('/api/time');
			const data: TimeResponse = await response.json();
			
			const serverDate = new Date(data.time);
			const clientDate = new Date();
			
			// Calculate the offset between server time and client time
			serverTimeOffset = serverDate.getTime() - clientDate.getTime();
			
			// Update time source and NTP info
			timeSource = data.timeSource || 'local';
			ntpInfo = data.ntp || {};
			
			// Apply force NTP override if enabled
			if (forceNTP && timeSource === 'ntp_partial') {
				timeSource = 'ntp';
			}
			
			// Update the current time and display
			updateTimeDisplay();
			
			// Extract timezone info
			const timezoneAbbr = serverDate.toLocaleString('en-US', {
				timeZoneName: 'short'
			}).split(' ').pop();
			
			timezone = `${data.timezone} (${timezoneAbbr})`;
		} catch (error) {
			console.error('Error fetching server time:', error);
			serverTime = 'Error loading time';
			serverDate = 'Error loading date';
			timeSource = 'error';
			ntpInfo = {};
		}
	}
	
	// Update the time display using current client time + server offset
	function updateTimeDisplay() {
		const now = new Date();
		currentTime = new Date(now.getTime() + serverTimeOffset);
		
		// Check for active checkpoints
		updateCheckpointStatus();
		
		// Format time
		const timeOnly = currentTime.toLocaleString('en-US', {
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			hour12: !is24Hour
		});
		
		// Format date
		const dateOnly = currentTime.toLocaleString('en-US', {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
		
		serverTime = timeOnly;
		serverDate = dateOnly;
	}
	
	async function checkServerHealth() {
		try {
			const startTime = Date.now();
			const response = await fetch('/api/health');
			const endTime = Date.now();
			const data: HealthResponse = await response.json();
			
			const previousHealthStatus = healthStatus;
			healthStatus = data.status;
			lastHealthCheck = new Date(data.timestamp).toLocaleTimeString();
			responseTime = endTime - startTime;
			
			// Handle health status changes
			if (healthStatus === 'healthy' && isHealthCheckInRecoveryMode) {
				// Server recovered, switch back to normal interval
				isHealthCheckInRecoveryMode = false;
				setHealthCheckInterval(600000); // 10 minutes
			} else if (healthStatus !== 'healthy' && !isHealthCheckInRecoveryMode) {
				// Server became unhealthy, switch to recovery mode
				isHealthCheckInRecoveryMode = true;
				setHealthCheckInterval(30000); // 30 seconds
			}
		} catch (error) {
			console.error('Error checking server health:', error);
			const previousHealthStatus = healthStatus;
			healthStatus = 'unhealthy';
			lastHealthCheck = new Date().toLocaleTimeString();
			
			// Switch to recovery mode if not already
			if (!isHealthCheckInRecoveryMode) {
				isHealthCheckInRecoveryMode = true;
				setHealthCheckInterval(30000); // 30 seconds
			}
		}
	}
	
	function setHealthCheckInterval(intervalMs: number) {
		if (healthInterval) {
			clearInterval(healthInterval);
		}
		healthInterval = setInterval(checkServerHealth, intervalMs);
	}
	
	onMount(() => {
		// Load saved settings
		loadAnnouncements();
		loadExamSettings();
		
		// Fetch initial data
		fetchServerTime();
		checkServerHealth();
		
		// Start client-side clock that updates every second
		clockInterval = setInterval(updateTimeDisplay, 1000);
		
		// Sync with server time every 5 minutes (300000ms)
		interval = setInterval(fetchServerTime, 300000);
		
		// Check health every 10 minutes initially (600000ms)
		healthInterval = setInterval(checkServerHealth, 600000);
	});
	
	// Function to toggle time format
	function toggleTimeFormat() {
		is24Hour = !is24Hour;
		updateTimeDisplay(); // Immediately update the display with new format
	}
	
	
	// Manual health check function - now also updates time
	function manualHealthCheck() {
		fetchServerTime();
		checkServerHealth();
	}
	
	// Toggle announcements editing mode
	function toggleAnnouncementsEdit() {
		isEditingAnnouncements = !isEditingAnnouncements;
	}
	
	// Save announcements (could be extended to persist to localStorage or server)
	function saveAnnouncements() {
		isEditingAnnouncements = false;
		// For now, just store in localStorage for persistence across page reloads
		localStorage.setItem('examAnnouncements', announcements);
	}
	
	// Load announcements from localStorage on mount
	function loadAnnouncements() {
		const saved = localStorage.getItem('examAnnouncements');
		if (saved) {
			announcements = saved;
		}
	}
	
	// Calculate automatic checkpoint times based on exam start and end
	function calculateCheckpointTimes() {
		if (!examStartTime || !examEndTime) return;
		
		const start = new Date(`1970-01-01T${examStartTime}`);
		const end = new Date(`1970-01-01T${examEndTime}`);
		
		// Handle next day scenarios
		if (end < start) {
			end.setDate(end.getDate() + 1);
		}
		
		const duration = end.getTime() - start.getTime();
		const midpoint = new Date(start.getTime() + duration / 2);
		
		// Calculate checkpoint times
		examMidpointTime = midpoint.toTimeString().slice(0, 5);
		final30Time = new Date(end.getTime() - 30 * 60000).toTimeString().slice(0, 5);
		final15Time = new Date(end.getTime() - 15 * 60000).toTimeString().slice(0, 5);
		final5Time = new Date(end.getTime() - 5 * 60000).toTimeString().slice(0, 5);
		
		// Update checkpoint objects
		updateCheckpointObjects();
		saveExamSettings();
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
		
		// Create a comprehensive list of all checkpoints including start and end times
		const allCheckpoints = [];
		
		// Add exam start checkpoint if defined
		if (examStartTime) {
			allCheckpoints.push({
				id: 'exam-start',
				name: 'Exam Start',
				time: examStartTime,
				enabled: true,
				emoji: '🟢',
				color: '#10B981',
				isCustom: false
			});
		}
		
		// Add regular checkpoints
		allCheckpoints.push(...checkpoints.filter(cp => cp.enabled && cp.time));
		
		// Add custom checkpoints
		allCheckpoints.push(...customCheckpoints.filter(cp => cp.enabled && cp.time));
		
		// Add exam end checkpoint if defined
		if (examEndTime) {
			allCheckpoints.push({
				id: 'exam-end',
				name: 'Exam End',
				time: examEndTime,
				enabled: true,
				emoji: '🔴',
				color: '#EF4444',
				isCustom: false
			});
		}
		
		// Sort all checkpoints by time
		allCheckpoints.sort((a, b) => a.time.localeCompare(b.time));
		
		// Find active checkpoint (current time has passed this checkpoint)
		let newActiveCheckpoint = null;
		let newNextCheckpoint = null;
		
		for (const checkpoint of allCheckpoints) {
			if (currentTimeStr >= checkpoint.time) {
				newActiveCheckpoint = checkpoint;
			} else if (!newNextCheckpoint && currentTimeStr < checkpoint.time) {
				newNextCheckpoint = checkpoint;
				break; // We found the next one, no need to continue
			}
		}
		
		activeCheckpoint = newActiveCheckpoint;
		nextCheckpoint = newNextCheckpoint;
	}
	
	function addCustomCheckpoint() {
		const newCheckpoint: Checkpoint = {
			id: `custom-${Date.now()}`,
			name: 'Custom Checkpoint',
			time: '',
			enabled: true,
			emoji: '📝',
			color: '#6366F1',
			isCustom: true
		};
		customCheckpoints = [...customCheckpoints, newCheckpoint];
		saveExamSettings();
	}
	
	function removeCustomCheckpoint(id: string) {
		customCheckpoints = customCheckpoints.filter(cp => cp.id !== id);
		saveExamSettings();
	}
	
	function saveExamSettings() {
		const settings = {
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
			forceNTP
		};
		localStorage.setItem('examSettings', JSON.stringify(settings));
	}
	
	function clearAllSettings() {
		// Reset all exam settings to defaults
		examStartTime = '';
		examEndTime = '';
		examMidpointTime = '';
		final30Time = '';
		final15Time = '';
		final5Time = '';
		customTitle = 'Exam Time Display';
		announcementPosition = 'top';
		announcements = '';
		showAnnouncements = true;
		isEditingAnnouncements = false;
		forceNTP = false;
		
		// Reset checkpoints to defaults
		checkpoints = [
			{ id: 'midpoint', name: 'Exam Midpoint', time: '', enabled: true, emoji: '⏰', color: '#3B82F6', isCustom: false },
			{ id: 'final30', name: 'Final 30 Minutes', time: '', enabled: true, emoji: '⚠️', color: '#F59E0B', isCustom: false },
			{ id: 'final15', name: 'Final 15 Minutes', time: '', enabled: true, emoji: '🔔', color: '#EF4444', isCustom: false },
			{ id: 'final5', name: 'Final 5 Minutes', time: '', enabled: true, emoji: '🚨', color: '#DC2626', isCustom: false }
		];
		
		// Clear custom checkpoints
		customCheckpoints = [];
		
		// Clear active/next checkpoint states
		activeCheckpoint = null;
		nextCheckpoint = null;
		
		// Clear localStorage
		localStorage.removeItem('examSettings');
		localStorage.removeItem('examAnnouncements');
	}
	
	function loadExamSettings() {
		const saved = localStorage.getItem('examSettings');
		if (saved) {
			const settings = JSON.parse(saved);
			examStartTime = settings.examStartTime || '';
			examEndTime = settings.examEndTime || '';
			examMidpointTime = settings.examMidpointTime || '';
			final30Time = settings.final30Time || '';
			final15Time = settings.final15Time || '';
			final5Time = settings.final5Time || '';
			customTitle = settings.customTitle || 'Exam Time Display';
			announcementPosition = settings.announcementPosition || 'top';
			forceNTP = settings.forceNTP || false;
			if (settings.checkpoints) checkpoints = settings.checkpoints;
			if (settings.customCheckpoints) customCheckpoints = settings.customCheckpoints;
		}
	}
	
	onDestroy(() => {
		if (interval) clearInterval(interval);
		if (healthInterval) clearInterval(healthInterval);
		if (clockInterval) clearInterval(clockInterval);
	});
	
	// Reactive statement to update time source when forceNTP changes
	$: if (timeSource === 'ntp_partial' && forceNTP) {
		timeSource = 'ntp';
		saveExamSettings();
	} else if (timeSource === 'ntp' && !forceNTP && ntpInfo.hasValidMetrics === false) {
		// Only revert to ntp_partial if the metrics are actually invalid
		timeSource = 'ntp_partial';
		saveExamSettings();
	}
</script>

<div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4 relative">
	<!-- Operator Controls Toggle -->
	<button
		on:click={() => showOperatorSidebar = !showOperatorSidebar}
		class="fixed top-4 right-4 z-50 bg-gray-800 hover:bg-gray-900 text-white p-3 rounded-full shadow-lg transition-colors"
		title="Toggle Operator Controls"
		aria-label="Toggle Operator Controls"
	>
		<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"></path>
		</svg>
	</button>

	<!-- Operator Sidebar -->
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
			bind:forceNTP
			{activeCheckpoint}
			{nextCheckpoint}
			{timeSource}
			{ntpInfo}
			on:saveSettings={saveExamSettings}
			on:calculateCheckpoints={calculateCheckpointTimes}
			on:addCustomCheckpoint={addCustomCheckpoint}
			on:removeCustomCheckpoint={(event) => removeCustomCheckpoint(event.detail.id)}
			on:toggleAnnouncementsEdit={toggleAnnouncementsEdit}
			on:saveAnnouncements={saveAnnouncements}
			on:clearAllSettings={clearAllSettings}
			on:close={() => showOperatorSidebar = false}
		/>
	{/if}

	<div class="max-w-6xl mx-auto {showOperatorSidebar ? 'mr-96' : ''}">
		<!-- Header for Exam Context -->
		<header class="text-center mb-8">
			<h1 class="text-3xl font-bold text-gray-900 mb-2">{customTitle}</h1>
		</header>

		<!-- Announcements Section - Top Position -->
		{#if announcementPosition === 'top'}
			<AnnouncementsBanner 
				{announcements} 
				{showAnnouncements} 
				position="top" 
			/>
		{/if}

		<!-- Main Content Area - Flexible layout for left announcements -->
		<div class="flex flex-col {announcementPosition === 'left' && showAnnouncements && announcements.trim() ? 'xl:flex-row xl:gap-6' : ''}">
			<!-- Announcements Section - Left Position -->
			{#if announcementPosition === 'left'}
				<div class="xl:w-80 xl:max-w-80 mb-6 xl:mb-0 xl:flex-shrink-0">
					<AnnouncementsBanner 
						{announcements} 
						{showAnnouncements} 
						position="left" 
					/>
				</div>
			{/if}

			<!-- Clock and Status Section -->
			<div class="flex-1 xl:min-w-0">
				<ExamClock 
					{serverTime}
					{serverDate}
					{timezone}
					{activeCheckpoint}
					{nextCheckpoint}
					{is24Hour}
					on:toggleTimeFormat={toggleTimeFormat}
				/>
				
				<SystemStatus 
					{healthStatus}
					{lastHealthCheck}
					{responseTime}
					{timeSource}
					{ntpInfo}
					{forceNTP}
					on:updateNow={manualHealthCheck}
				/>
			</div>
		</div>
	</div>
</div>
