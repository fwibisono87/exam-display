<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	
	let serverTime = '';
	let serverDate = '';
	let timezone = '';
	let healthStatus = 'checking...';
	let lastHealthCheck = '';
	let responseTime = 0;
	let is24Hour = false; // Default to 12-hour format
	let interval: NodeJS.Timeout;
	let healthInterval: NodeJS.Timeout;
	let clockInterval: NodeJS.Timeout; // For client-side clock ticking
	let isHealthCheckInRecoveryMode = false; // Track if we're in rapid health check mode
	let currentTime: Date | null = null; // Store the current time object for client-side updates
	let serverTimeOffset = 0; // Offset between server time and client time
	
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
	
	
	// Manual health check function
	function manualHealthCheck() {
		checkServerHealth();
	}
	
	// Force update both time and health check
	function forceUpdate() {
		fetchServerTime();
		checkServerHealth();
	}
	
	onDestroy(() => {
		if (interval) clearInterval(interval);
		if (healthInterval) clearInterval(healthInterval);
		if (clockInterval) clearInterval(clockInterval);
	});
</script>

<div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
	<div class="max-w-4xl mx-auto">
		<header class="text-center mb-12">
			<h1 class="text-4xl font-bold text-gray-900 mb-4">Server Time Display</h1>
			<p class="text-lg text-gray-600">Real-time server clock with health monitoring</p>
		</header>
		
		<!-- Prominent Time Display -->
		<div class="bg-white rounded-lg shadow-xl p-12 mb-8">
			<div class="text-center">
				<div class="flex justify-between items-center mb-8">
					<h2 class="text-3xl font-semibold text-gray-800">Current Server Time</h2>
					
					<!-- Time Format Toggle -->
					<button 
						on:click={toggleTimeFormat}
						class="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors text-sm font-medium border"
						title="Toggle between 12-hour and 24-hour format"
					>
						{is24Hour ? '24H' : '12H'}
					</button>
				</div>
				
				<div class="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl p-12 mb-6">
					<!-- Prominent Time Display -->
					<div class="text-8xl md:text-9xl font-mono font-bold text-indigo-600 mb-6 leading-none">
						{serverTime || 'Loading...'}
					</div>
					
					<!-- Smaller Date Display -->
					<div class="text-2xl md:text-3xl text-gray-700 mb-4 font-medium">
						{serverDate || ''}
					</div>
					
					{#if timezone}
						<div class="text-lg text-gray-600">
							Timezone: {timezone}
						</div>
					{/if}
				</div>
				
				<div class="text-sm text-gray-500 flex items-center justify-center space-x-2">
					<span class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
					<span>Live clock • Syncs with server every 5 minutes</span>
				</div>
				
				<!-- Force Update Button -->
				<div class="mt-4">
					<button 
						on:click={forceUpdate}
						class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors text-sm font-medium shadow-md hover:shadow-lg"
					>
						Force Update All
					</button>
				</div>
			</div>
		</div>
		
		<!-- Compact Health Status -->
		<div class="bg-white rounded-lg shadow-lg p-6">
			<div class="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
				<div class="flex items-center space-x-3">
					<h3 class="text-lg font-semibold text-gray-800">Server Health</h3>
					<div class="flex items-center space-x-2">
						<div class="w-2.5 h-2.5 rounded-full {healthStatus === 'healthy' ? 'bg-green-500' : 'bg-red-500'}"></div>
						<span class="text-sm font-medium capitalize {healthStatus === 'healthy' ? 'text-green-700' : 'text-red-700'}">
							{healthStatus}
						</span>
					</div>
				</div>
				
				<div class="flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-6 text-sm text-gray-600">
					<div class="flex justify-between md:block">
						<span class="text-gray-500">Last Check:</span>
						<span class="font-mono md:ml-2">{lastHealthCheck}</span>
					</div>
					<div class="flex justify-between md:block">
						<span class="text-gray-500">Response:</span>
						<span class="font-mono md:ml-2">{responseTime}ms</span>
					</div>
				</div>
				
				<button 
					on:click={manualHealthCheck}
					class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
				>
					Check Now
				</button>
			</div>
		</div>
	</div>
</div>
