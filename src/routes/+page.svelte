<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	
	let serverTime = '';
	let serverDate = '';
	let timezone = '';
	let healthStatus = 'checking...';
	let lastHealthCheck = '';
	let responseTime = 0;
	let is24Hour = true; // Default to 24-hour format
	let interval: NodeJS.Timeout;
	let healthInterval: NodeJS.Timeout;
	let clockInterval: NodeJS.Timeout; // For client-side clock ticking
	let isHealthCheckInRecoveryMode = false; // Track if we're in rapid health check mode
	let currentTime: Date | null = null; // Store the current time object for client-side updates
	let serverTimeOffset = 0; // Offset between server time and client time
	let announcements = ''; // Announcements text for exam setting
	let isEditingAnnouncements = false; // Toggle for editing mode
	let showAnnouncements = true; // Toggle for showing/hiding announcements
	let showOperatorSidebar = false; // Toggle for operator controls
	let customTitle = 'Exam Time Display'; // Customizable title text
	
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
			customTitle
		};
		localStorage.setItem('examSettings', JSON.stringify(settings));
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
			if (settings.checkpoints) checkpoints = settings.checkpoints;
			if (settings.customCheckpoints) customCheckpoints = settings.customCheckpoints;
		}
	}
	
	onDestroy(() => {
		if (interval) clearInterval(interval);
		if (healthInterval) clearInterval(healthInterval);
		if (clockInterval) clearInterval(clockInterval);
	});
</script>

<div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4 relative">
	<!-- Operator Controls Toggle -->
	<button
		on:click={() => showOperatorSidebar = !showOperatorSidebar}
		class="fixed top-4 right-4 z-50 bg-gray-800 hover:bg-gray-900 text-white p-3 rounded-full shadow-lg transition-colors"
		title="Toggle Operator Controls"
	>
		<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"></path>
		</svg>
	</button>

	<!-- Operator Sidebar -->
	{#if showOperatorSidebar}
		<div class="fixed top-0 right-0 h-full w-96 bg-white shadow-2xl z-40 overflow-y-auto border-l border-gray-200">
			<div class="p-6">
				<div class="flex items-center justify-between mb-6">
					<h2 class="text-xl font-bold text-gray-900">Operator Controls</h2>
					<button
						on:click={() => showOperatorSidebar = false}
						class="text-gray-500 hover:text-gray-700"
					>
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
						</svg>
					</button>
				</div>

				<!-- Display Title Section -->
				<div class="mb-8">
					<h3 class="text-lg font-semibold text-gray-800 mb-4">Display Title</h3>
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Custom Title</label>
						<input
							type="text"
							bind:value={customTitle}
							on:input={saveExamSettings}
							placeholder="Enter custom title (e.g., 'Final Exam', 'Quiz Time')"
							class="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						/>
						<p class="text-xs text-gray-500 mt-1">This will replace "Exam Time Display" in the header</p>
					</div>
				</div>

				<!-- Exam Timing Section -->
				<div class="mb-8">
					<h3 class="text-lg font-semibold text-gray-800 mb-4">Exam Timing</h3>
					
					<div class="space-y-4">
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-1">Exam Start Time</label>
							<input
								type="time"
								bind:value={examStartTime}
								on:change={calculateCheckpointTimes}
								class="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
							/>
						</div>
						
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-1">Exam End Time</label>
							<input
								type="time"
								bind:value={examEndTime}
								on:change={calculateCheckpointTimes}
								class="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
							/>
						</div>
						
						{#if examStartTime && examEndTime}
							<button
								on:click={calculateCheckpointTimes}
								class="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
							>
								Auto-Calculate Checkpoints
							</button>
						{/if}
					</div>
				</div>

				<!-- Predefined Checkpoints -->
				<div class="mb-8">
					<h3 class="text-lg font-semibold text-gray-800 mb-4">Checkpoints</h3>
					
					<!-- Note about automatic start/end checkpoints -->
					{#if examStartTime || examEndTime}
						<div class="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
							<div class="text-sm text-blue-800">
								<div class="font-medium mb-1">Automatic Checkpoints:</div>
								{#if examStartTime}
									<div class="flex items-center mb-1">
										<span class="mr-2">🟢</span>
										<span>Exam Start at {examStartTime}</span>
									</div>
								{/if}
								{#if examEndTime}
									<div class="flex items-center">
										<span class="mr-2">🔴</span>
										<span>Exam End at {examEndTime}</span>
									</div>
								{/if}
							</div>
						</div>
					{/if}
					
					{#each checkpoints as checkpoint, index}
						<div class="border border-gray-200 rounded-lg p-4 mb-3">
							<div class="flex items-center justify-between mb-3">
								<label class="flex items-center">
									<input
										type="checkbox"
										bind:checked={checkpoint.enabled}
										on:change={saveExamSettings}
										class="mr-2"
									/>
									<span class="font-medium text-gray-700">{checkpoint.name}</span>
								</label>
							</div>
							
							<div class="grid grid-cols-2 gap-3 mb-3">
								<div>
									<label class="block text-xs text-gray-600 mb-1">Time</label>
									<input
										type="time"
										bind:value={checkpoint.time}
										on:change={saveExamSettings}
										class="w-full p-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
									/>
								</div>
								<div>
									<label class="block text-xs text-gray-600 mb-1">Emoji</label>
									<input
										type="text"
										bind:value={checkpoint.emoji}
										on:change={saveExamSettings}
										class="w-full p-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
										maxlength="4"
									/>
								</div>
							</div>
							
							<div>
								<label class="block text-xs text-gray-600 mb-1">Color</label>
								<input
									type="color"
									bind:value={checkpoint.color}
									on:change={saveExamSettings}
									class="w-full h-8 border border-gray-300 rounded"
								/>
							</div>
						</div>
					{/each}
				</div>

				<!-- Custom Checkpoints -->
				<div class="mb-8">
					<div class="flex items-center justify-between mb-4">
						<h3 class="text-lg font-semibold text-gray-800">Custom Checkpoints</h3>
						<button
							on:click={addCustomCheckpoint}
							class="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm transition-colors"
						>
							+ Add
						</button>
					</div>
					
					{#each customCheckpoints as checkpoint}
						<div class="border border-gray-200 rounded-lg p-4 mb-3">
							<div class="flex items-center justify-between mb-3">
								<input
									type="text"
									bind:value={checkpoint.name}
									on:change={saveExamSettings}
									class="flex-1 p-1 text-sm font-medium border-0 border-b border-gray-300 focus:border-blue-500 focus:ring-0"
									placeholder="Checkpoint name"
								/>
								<button
									on:click={() => removeCustomCheckpoint(checkpoint.id)}
									class="ml-2 text-red-500 hover:text-red-700 text-sm"
								>
									Remove
								</button>
							</div>
							
							<div class="flex items-center mb-3">
								<input
									type="checkbox"
									bind:checked={checkpoint.enabled}
									on:change={saveExamSettings}
									class="mr-2"
								/>
								<span class="text-sm text-gray-600">Enabled</span>
							</div>
							
							<div class="grid grid-cols-2 gap-3 mb-3">
								<div>
									<label class="block text-xs text-gray-600 mb-1">Time</label>
									<input
										type="time"
										bind:value={checkpoint.time}
										on:change={saveExamSettings}
										class="w-full p-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
									/>
								</div>
								<div>
									<label class="block text-xs text-gray-600 mb-1">Emoji</label>
									<input
										type="text"
										bind:value={checkpoint.emoji}
										on:change={saveExamSettings}
										class="w-full p-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
										maxlength="4"
									/>
								</div>
							</div>
							
							<div>
								<label class="block text-xs text-gray-600 mb-1">Color</label>
								<input
									type="color"
									bind:value={checkpoint.color}
									on:change={saveExamSettings}
									class="w-full h-8 border border-gray-300 rounded"
								/>
							</div>
						</div>
					{/each}
					
					{#if customCheckpoints.length === 0}
						<p class="text-sm text-gray-500 italic">No custom checkpoints added</p>
					{/if}
				</div>

				<!-- Announcements Control Section -->
				<div class="border-t pt-6 mb-8">
					<h3 class="text-lg font-semibold text-gray-800 mb-4">Announcements</h3>
					
					<div class="space-y-4">
						<div class="flex items-center justify-between">
							<label class="flex items-center">
								<input
									type="checkbox"
									bind:checked={showAnnouncements}
									class="mr-2"
								/>
								<span class="text-sm font-medium text-gray-700">Show Announcements</span>
							</label>
							<button
								on:click={toggleAnnouncementsEdit}
								class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
							>
								{isEditingAnnouncements ? 'Cancel' : 'Edit'}
							</button>
						</div>
						
						{#if isEditingAnnouncements}
							<div>
								<textarea
									bind:value={announcements}
									placeholder="Enter announcements for students (e.g., 'Phones must be placed in the front of the room', 'You have 2 hours to complete the exam', etc.)"
									class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-gray-800"
									rows="6"
								></textarea>
								<button
									on:click={saveAnnouncements}
									class="mt-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm transition-colors w-full"
								>
									Save Announcements
								</button>
							</div>
						{:else}
							<div class="p-3 bg-gray-50 rounded-lg border">
								{#if announcements.trim()}
									<div class="text-sm text-gray-800 whitespace-pre-line">
										{announcements}
									</div>
								{:else}
									<div class="text-gray-500 italic text-sm">
										No announcements set
									</div>
								{/if}
							</div>
						{/if}
					</div>
				</div>

				<!-- Current Status -->
				{#if activeCheckpoint || nextCheckpoint}
					<div class="border-t pt-6">
						<h3 class="text-lg font-semibold text-gray-800 mb-4">Checkpoint Status</h3>
						
						{#if activeCheckpoint}
							<div class="mb-3 p-3 rounded-lg" style="background-color: {activeCheckpoint.color}20; border-left: 4px solid {activeCheckpoint.color};">
								<div class="flex items-center">
									<span class="text-lg mr-2">{activeCheckpoint.emoji}</span>
									<div>
										<div class="font-medium text-gray-800">Active: {activeCheckpoint.name}</div>
										<div class="text-sm text-gray-600">Since {activeCheckpoint.time}</div>
									</div>
								</div>
							</div>
						{/if}
						
						{#if nextCheckpoint}
							<div class="p-3 bg-gray-50 rounded-lg">
								<div class="flex items-center">
									<span class="text-lg mr-2">{nextCheckpoint.emoji}</span>
									<div>
										<div class="font-medium text-gray-800">Next: {nextCheckpoint.name}</div>
										<div class="text-sm text-gray-600">At {nextCheckpoint.time}</div>
									</div>
								</div>
							</div>
						{/if}
					</div>
				{/if}
			</div>
		</div>
	{/if}

	<div class="max-w-6xl mx-auto {showOperatorSidebar ? 'mr-96' : ''}">
		<!-- Header for Exam Context -->
		<header class="text-center mb-8">
			<h1 class="text-3xl font-bold text-gray-900 mb-2">{customTitle}</h1>
		</header>

		<!-- Announcements Section - Prominent for Exam Setting -->
		{#if showAnnouncements && announcements.trim()}
			<div class="bg-yellow-50 border-l-4 border-yellow-400 rounded-lg shadow-lg p-6 mb-8">
				<div class="flex items-start">
					<div class="flex-1">
						<h2 class="text-xl font-semibold text-yellow-800 mb-3 flex items-center">
							<svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
								<path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
							</svg>
							Announcements
						</h2>
						
						<div class="text-lg text-yellow-800 whitespace-pre-line leading-relaxed">
							{announcements}
						</div>
					</div>
				</div>
			</div>
		{/if}
		<!-- Prominent Time Display for Exam -->
		<div class="bg-white rounded-lg shadow-xl p-8 mb-6">
			<div class="text-center">
				<!-- Active Checkpoint Banner -->
				{#if activeCheckpoint}
					<div class="mb-6 p-4 rounded-lg flex items-center justify-center" style="background-color: {activeCheckpoint.color}20; border: 2px solid {activeCheckpoint.color};">
						<span class="text-3xl mr-3">{activeCheckpoint.emoji}</span>
						<div class="text-left">
							<div class="text-lg font-bold" style="color: {activeCheckpoint.color};">{activeCheckpoint.name}</div>
							<div class="text-sm text-gray-600">Active since {activeCheckpoint.time}</div>
						</div>
					</div>
				{/if}
				
				<div class="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl p-8 mb-4" style="{activeCheckpoint ? `background: linear-gradient(135deg, ${activeCheckpoint.color}10, ${activeCheckpoint.color}20);` : ''}">
					<!-- Exam Time Display -->
					<div class="text-7xl md:text-8xl font-mono font-bold mb-4 leading-none" style="color: {activeCheckpoint ? activeCheckpoint.color : '#4F46E5'};">
						{serverTime || 'Loading...'}
					</div>
					
					<!-- Date Display -->
					<div class="text-xl md:text-2xl text-gray-700 mb-3 font-medium">
						{serverDate || ''}
					</div>
					
					{#if timezone}
						<div class="text-base text-gray-600">
							{timezone}
						</div>
					{/if}
					
					<!-- Next Checkpoint Info -->
					{#if nextCheckpoint}
						<div class="mt-4 p-3 bg-white bg-opacity-70 rounded-lg">
							<div class="flex items-center justify-center">
								<span class="text-lg mr-2">{nextCheckpoint.emoji}</span>
								<div class="text-sm">
									<span class="font-medium">Next: {nextCheckpoint.name}</span>
									<span class="text-gray-600 ml-2">at {nextCheckpoint.time}</span>
								</div>
							</div>
						</div>
					{/if}
				</div>
				
				<div class="flex items-center justify-center space-x-4 text-sm text-gray-500">
					<div class="flex items-center space-x-2">
						<span class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
						<span>Live clock • Syncs with server every 5 minutes</span>
					</div>
					<button 
						on:click={toggleTimeFormat}
						class="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded-lg transition-colors text-sm font-medium border"
						title="Toggle between 12-hour and 24-hour format"
					>
						{is24Hour ? '24H' : '12H'}
					</button>
				</div>
			</div>
		</div>
		
		<!-- Compact System Status (less prominent for exam setting) -->
		<div class="bg-white rounded-lg shadow-md p-4">
			<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
				<div class="flex items-center space-x-3">
					<h3 class="text-sm font-medium text-gray-700">System Status</h3>
					<div class="flex items-center space-x-2">
						<div class="w-2 h-2 rounded-full {healthStatus === 'healthy' ? 'bg-green-500' : 'bg-red-500'}"></div>
						<span class="text-xs font-medium capitalize {healthStatus === 'healthy' ? 'text-green-700' : 'text-red-700'}">
							{healthStatus}
						</span>
					</div>
				</div>
				
				<div class="flex items-center space-x-4 text-xs text-gray-500">
					<div>
						<span class="text-gray-400">Last Check:</span>
						<span class="font-mono ml-1">{lastHealthCheck}</span>
					</div>
					<div>
						<span class="text-gray-400">Response:</span>
						<span class="font-mono ml-1">{responseTime}ms</span>
					</div>
					<button 
						on:click={manualHealthCheck}
						class="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-xs transition-colors"
					>
						Update Now
					</button>
				</div>
			</div>
		</div>
	</div>
</div>
