<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { fly, scale } from 'svelte/transition';
	import { quintOut, backOut } from 'svelte/easing';

	export let healthStatus: string;
	export let lastHealthCheck: string;
	export let responseTime: number;
	export let timeSource: string = 'local';
	export let ntpInfo: { 
		server?: string; 
		offset?: number; 
		delay?: number; 
		error?: string; 
		errorDetails?: string; 
		hasValidMetrics?: boolean;
	} = {};
	export let forceNTP: boolean = false;
	export let highContrastMode: boolean = false;

	const dispatch = createEventDispatcher();

	function updateNow() {
		dispatch('updateNow');
	}
	
	function getTimeSourceDisplay() {
		if (highContrastMode) {
			switch(timeSource) {
				case 'ntp':
					return { text: 'NTP Sync', color: 'text-black', bgColor: 'bg-yellow-400' };
				case 'ntp_partial':
					return { text: 'NTP Time (Est. Metrics)', color: 'text-black', bgColor: 'bg-yellow-400' };
				case 'local_fallback':
					return { text: 'Application Server (NTP Failed)', color: 'text-black', bgColor: 'bg-red-400' };
				default:
					return { text: 'Application Server', color: 'text-black', bgColor: 'bg-white' };
			}
		} else {
			switch(timeSource) {
				case 'ntp':
					return { text: 'NTP Sync', color: 'text-blue-700', bgColor: 'bg-blue-100' };
				case 'ntp_partial':
					return { text: 'NTP Time (Est. Metrics)', color: 'text-indigo-700', bgColor: 'bg-indigo-100' };
				case 'local_fallback':
					return { text: 'Application Server (NTP Failed)', color: 'text-orange-700', bgColor: 'bg-orange-100' };
				default:
					return { text: 'Application Server', color: 'text-gray-700', bgColor: 'bg-gray-100' };
			}
		}
	}
	
	function getTimeSourceTooltip() {
		switch(timeSource) {
			case 'ntp':
				const baseTooltip = ntpInfo.server ? `Synced with ${ntpInfo.server}` : 'Using NTP synchronization';
				if (forceNTP && ntpInfo.hasValidMetrics === false) {
					return `${baseTooltip} (Force NTP enabled - treating partial sync as full sync)`;
				}
				return baseTooltip;
			case 'ntp_partial':
				return ntpInfo.server ? `Time from ${ntpInfo.server} (offset/delay metrics unavailable)` : 'Using NTP time with estimated metrics';
			case 'local_fallback':
				if (ntpInfo.server) {
					const errorInfo = ntpInfo.errorDetails ? ` (${ntpInfo.errorDetails})` : '';
					return `NTP sync failed with ${ntpInfo.server}${errorInfo}, using local time`;
				}
				return 'NTP sync failed, using local time';
			default:
				return 'Using application server time';
		}
	}
	
	$: timeSourceDisplay = getTimeSourceDisplay();
	$: timeSourceTooltip = getTimeSourceTooltip();
</script>

<div 
	class="rounded-lg shadow-md p-4 transition-all duration-500 ease-out transform hover:shadow-lg hover:scale-102 {highContrastMode ? 'bg-white border-4 border-yellow-400' : 'bg-white'}"
	in:fly="{{ y: 30, duration: 500, delay: 200, easing: quintOut }}"
>
	<div class="flex flex-col gap-2">
		<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
			<div class="flex items-center space-x-3">
				<h3 
					class="text-sm font-medium transition-all duration-300 ease-out {highContrastMode ? 'text-black font-bold' : 'text-gray-700'}"
					in:fly="{{ x: -20, duration: 400, delay: 100, easing: quintOut }}"
				>
					System Status
				</h3>
				<div 
					class="flex items-center space-x-2"
					in:scale="{{ delay: 200, duration: 400, easing: backOut }}"
				>
					<div class="w-2 h-2 rounded-full transition-all duration-500 ease-out {healthStatus === 'healthy' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}"></div>
					<span class="text-xs font-medium capitalize transition-all duration-300 ease-out {healthStatus === 'healthy' ? (highContrastMode ? 'text-black font-bold' : 'text-green-700') : (highContrastMode ? 'text-black font-bold' : 'text-red-700')}">
						{healthStatus}
					</span>
				</div>
				<!-- Time Source Indicator -->
				<div 
					class="flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium transition-all duration-300 ease-out {timeSourceDisplay.bgColor} {timeSourceDisplay.color} {highContrastMode ? 'border-2 border-black' : ''}"
					in:scale="{{ delay: 250, duration: 400, easing: backOut }}"
					title={timeSourceTooltip}
				>
					{#if timeSource === 'ntp'}
						<span class="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></span>
					{:else if timeSource === 'ntp_partial'}
						<span class="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></span>
					{:else if timeSource === 'local_fallback'}
						<span class="w-1.5 h-1.5 bg-orange-500 rounded-full"></span>
					{:else}
						<span class="w-1.5 h-1.5 bg-gray-500 rounded-full"></span>
					{/if}
					<span>{timeSourceDisplay.text}</span>
				</div>
			</div>
			
			<div 
				class="flex items-center space-x-4 text-xs transition-all duration-300 ease-out {highContrastMode ? 'text-black' : 'text-gray-500'}"
				in:fly="{{ x: 20, duration: 400, delay: 300, easing: quintOut }}"
			>
				<div class="transition-all duration-300 ease-out {highContrastMode ? 'hover:text-black font-bold' : 'hover:text-gray-700'}">
					<span class="{highContrastMode ? 'text-black font-bold' : 'text-gray-400'}">Last Check:</span>
					<span class="font-mono ml-1 {highContrastMode ? 'font-bold' : ''}">{lastHealthCheck}</span>
				</div>
				<div class="transition-all duration-300 ease-out {highContrastMode ? 'hover:text-black font-bold' : 'hover:text-gray-700'}">
					<span class="{highContrastMode ? 'text-black font-bold' : 'text-gray-400'}">Response:</span>
					<span class="font-mono ml-1 {highContrastMode ? 'font-bold' : ''}">{responseTime}ms</span>
				</div>
				{#if (timeSource === 'ntp' || timeSource === 'ntp_partial') && ntpInfo.offset !== undefined}
					<div 
						class="transition-all duration-300 ease-out {highContrastMode ? 'hover:text-black font-bold' : 'hover:text-gray-700'}"
						title="NTP offset and delay in milliseconds{timeSource === 'ntp_partial' ? ' (estimated values)' : ''}"
					>
						<span class="{highContrastMode ? 'text-black font-bold' : 'text-gray-400'}">NTP:</span>
						<span class="font-mono ml-1 {highContrastMode ? 'font-bold' : ''}">{ntpInfo.offset}ms/{ntpInfo.delay}ms{timeSource === 'ntp_partial' ? '*' : ''}</span>
					</div>
				{/if}
				{#if timeSource === 'local_fallback' && ntpInfo.error}
					<div 
						class="transition-all duration-300 ease-out {highContrastMode ? 'hover:text-black font-bold' : 'hover:text-red-600'}"
						title={ntpInfo.errorDetails || 'NTP synchronization failed'}
					>
						<span class="{highContrastMode ? 'text-black font-bold' : 'text-red-400'}">NTP Error:</span>
						<span class="font-mono ml-1 {highContrastMode ? 'text-red-700 font-bold' : 'text-red-500'}">{ntpInfo.error}</span>
					</div>
				{/if}
				<button 
					on:click={updateNow}
					class="px-3 py-1 rounded text-xs transition-all duration-200 ease-out transform hover:scale-105 active:scale-95 hover:shadow-md {highContrastMode ? 'bg-yellow-400 hover:bg-yellow-300 text-black border-2 border-black font-bold' : 'bg-gray-600 hover:bg-gray-700 text-white'}"
					title={timeSource === 'local_fallback' ? 'Update time and retry NTP sync' : 'Update time from server'}
				>
					{timeSource === 'local_fallback' ? 'Retry NTP' : 'Update Now'}
				</button>
			</div>
		</div>
		<div class="text-xs mx-auto text-center {highContrastMode ? 'text-black font-bold' : ''}">
			Built by <a href="https://www.franciswibisono.com" target="_blank" class="transition-colors duration-300 {highContrastMode ? 'text-black underline hover:text-gray-700' : 'text-blue-600 hover:text-blue-800'}">fwibisono87</a>
			at <a href="https://csl.cs.ui.ac.id" target="_blank" class="transition-colors duration-300 {highContrastMode ? 'text-black underline hover:text-gray-700' : 'text-blue-600 hover:text-blue-800'}">Computer Science Lab, Faculty of Computer Science, University of Indonesia</a>
		</div>
	</div>
</div>
