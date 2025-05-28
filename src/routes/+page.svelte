<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	
	let serverTime = '';
	let timezone = '';
	let healthStatus = 'checking...';
	let lastHealthCheck = '';
	let responseTime = 0;
	let interval: NodeJS.Timeout;
	let healthInterval: NodeJS.Timeout;
	
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
			
			const date = new Date(data.time);
			serverTime = date.toLocaleString('en-US', {
				weekday: 'long',
				year: 'numeric',
				month: 'long',
				day: 'numeric',
				hour: '2-digit',
				minute: '2-digit',
				second: '2-digit',
				timeZoneName: 'short'
			});
			timezone = data.timezone;
		} catch (error) {
			console.error('Error fetching server time:', error);
			serverTime = 'Error loading time';
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
		} catch (error) {
			console.error('Error checking server health:', error);
			healthStatus = 'unhealthy';
			lastHealthCheck = new Date().toLocaleTimeString();
		}
	}
	
	onMount(() => {
		// Fetch initial data
		fetchServerTime();
		checkServerHealth();
		
		// Update time every second
		interval = setInterval(fetchServerTime, 1000);
		
		// Check health every 30 seconds
		healthInterval = setInterval(checkServerHealth, 30000);
	});
	
	onDestroy(() => {
		if (interval) clearInterval(interval);
		if (healthInterval) clearInterval(healthInterval);
	});
</script>

<div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
	<div class="max-w-4xl mx-auto">
		<header class="text-center mb-12">
			<h1 class="text-4xl font-bold text-gray-900 mb-4">Server Time Display</h1>
			<p class="text-lg text-gray-600">Real-time server clock with health monitoring</p>
		</header>
		
		<div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
			<!-- Time Display Card -->
			<div class="bg-white rounded-lg shadow-lg p-8">
				<div class="text-center">
					<h2 class="text-2xl font-semibold text-gray-800 mb-6">Current Server Time</h2>
					
					<div class="bg-gray-50 rounded-lg p-6 mb-4">
						<div class="text-3xl font-mono font-bold text-indigo-600 mb-2">
							{serverTime || 'Loading...'}
						</div>
						{#if timezone}
							<div class="text-sm text-gray-500">
								Timezone: {timezone}
							</div>
						{/if}
					</div>
					
					<div class="text-xs text-gray-400">
						⚡ Updates every second from server
					</div>
				</div>
			</div>
			
			<!-- Health Status Card -->
			<div class="bg-white rounded-lg shadow-lg p-8">
				<div class="text-center">
					<h2 class="text-2xl font-semibold text-gray-800 mb-6">Server Health</h2>
					
					<div class="space-y-4">
						<div class="flex items-center justify-center space-x-2">
							<div class="w-3 h-3 rounded-full {healthStatus === 'healthy' ? 'bg-green-500' : 'bg-red-500'}"></div>
							<span class="text-lg font-medium capitalize {healthStatus === 'healthy' ? 'text-green-700' : 'text-red-700'}">
								{healthStatus}
							</span>
						</div>
						
						<div class="bg-gray-50 rounded-lg p-4 space-y-2">
							<div class="flex justify-between text-sm">
								<span class="text-gray-600">Last Check:</span>
								<span class="font-mono">{lastHealthCheck}</span>
							</div>
							<div class="flex justify-between text-sm">
								<span class="text-gray-600">Response Time:</span>
								<span class="font-mono">{responseTime}ms</span>
							</div>
						</div>
						
						<button 
							on:click={checkServerHealth}
							class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors"
						>
							Check Now
						</button>
					</div>
					
					<div class="text-xs text-gray-400 mt-4">
						🔄 Auto-checks every 30 seconds
					</div>
				</div>
			</div>
		</div>
		
		<!-- Additional Info -->
		<div class="mt-12 bg-white rounded-lg shadow-lg p-6">
			<h3 class="text-lg font-semibold text-gray-800 mb-4">About This Application</h3>
			<div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
				<div class="flex items-center space-x-2">
					<span class="text-green-500">✓</span>
					<span>Server-side time generation</span>
				</div>
				<div class="flex items-center space-x-2">
					<span class="text-green-500">✓</span>
					<span>Real-time updates</span>
				</div>
				<div class="flex items-center space-x-2">
					<span class="text-green-500">✓</span>
					<span>Health monitoring</span>
				</div>
				<div class="flex items-center space-x-2">
					<span class="text-green-500">✓</span>
					<span>Netlify deployment ready</span>
				</div>
				<div class="flex items-center space-x-2">
					<span class="text-green-500">✓</span>
					<span>No client-side time dependency</span>
				</div>
				<div class="flex items-center space-x-2">
					<span class="text-green-500">✓</span>
					<span>Responsive design</span>
				</div>
			</div>
		</div>
	</div>
</div>
