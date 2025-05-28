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
		// Load saved announcements
		loadAnnouncements();
		
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
	
	onDestroy(() => {
		if (interval) clearInterval(interval);
		if (healthInterval) clearInterval(healthInterval);
		if (clockInterval) clearInterval(clockInterval);
	});
</script>

<div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
	<div class="max-w-6xl mx-auto">
		<!-- Header for Exam Context -->
		<header class="text-center mb-8">
			<h1 class="text-3xl font-bold text-gray-900 mb-2">Exam Time Display</h1>
		</header>

		<!-- Announcements Section - Prominent for Exam Setting -->
		<div class="bg-yellow-50 border-l-4 border-yellow-400 rounded-lg shadow-lg p-6 mb-8">
			<div class="flex items-start justify-between">
				<div class="flex-1">
					<h2 class="text-xl font-semibold text-yellow-800 mb-3 flex items-center">
						<svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
							<path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
						</svg>
						Announcements
					</h2>
					
					{#if isEditingAnnouncements}
						<textarea
							bind:value={announcements}
							placeholder="Enter announcements for students (e.g., 'Phones must be placed in the front of the room', 'You have 2 hours to complete the exam', etc.)"
							class="w-full p-3 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent resize-none text-gray-800"
							rows="4"
						></textarea>
						<div class="flex space-x-2 mt-3">
							<button
								on:click={saveAnnouncements}
								class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
							>
								Save
							</button>
							<button
								on:click={toggleAnnouncementsEdit}
								class="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
							>
								Cancel
							</button>
						</div>
					{:else}
						{#if announcements.trim()}
							<div class="text-lg text-yellow-800 whitespace-pre-line leading-relaxed">
								{announcements}
							</div>
						{:else}
							<div class="text-yellow-700 italic">
								No announcements - Click "Edit" to add exam instructions or announcements
							</div>
						{/if}
					{/if}
				</div>
				
				{#if !isEditingAnnouncements}
					<button
						on:click={toggleAnnouncementsEdit}
						class="ml-4 bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg text-sm transition-colors flex-shrink-0"
					>
						Edit
					</button>
				{/if}
			</div>
		</div>
		<!-- Prominent Time Display for Exam -->
		<div class="bg-white rounded-lg shadow-xl p-8 mb-6">
			<div class="text-center">
				<div class="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl p-8 mb-4">
					<!-- Exam Time Display -->
					<div class="text-7xl md:text-8xl font-mono font-bold text-indigo-600 mb-4 leading-none">
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
