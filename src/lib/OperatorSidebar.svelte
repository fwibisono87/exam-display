<script lang="ts">
	// Export props for parent component communication
	export let customTitle: string;
	export let examStartTime: string;
	export let examEndTime: string;
	export let checkpoints: Array<{
		id: string;
		name: string;
		time: string;
		enabled: boolean;
		emoji: string;
		color: string;
		isCustom: boolean;
	}>;
	export let customCheckpoints: Array<{
		id: string;
		name: string;
		time: string;
		enabled: boolean;
		emoji: string;
		color: string;
		isCustom: boolean;
	}>;
	export let announcements: string;
	export let isEditingAnnouncements: boolean;
	export let showAnnouncements: boolean;
	export let announcementPosition: string;
	export let announcementFontSize: number;
	export let highContrastMode: boolean;
	export let forceNTP: boolean;
	export let activeCheckpoint: any;
	export let nextCheckpoint: any;
	export let timeSource: string;
	export let ntpInfo: { 
		server?: string; 
		offset?: number; 
		delay?: number; 
		error?: string; 
		errorDetails?: string; 
		hasValidMetrics?: boolean;
	};
	export let healthStatus: string = 'checking...';
	export let lastHealthCheck: string = '';
	export let responseTime: number = 0;
	export let showDate: boolean = false;
	export let showTimezone: boolean = false;

	// Event dispatchers for parent component communication
	import { createEventDispatcher } from 'svelte';
	import { fly, slide, fade } from 'svelte/transition';
	import { quintOut, backOut } from 'svelte/easing';
	
	// Accordion state management - organized by logical groups
	let accordionStates: Record<string, boolean> = {
		examSetup: true,      // Open by default - most important
		timing: false,        // Exam timing and checkpoints
		announcements: false, // Announcements and display settings
		system: false,        // System status and NTP settings
		advanced: false       // Advanced settings and reset
	};
	
	const dispatch = createEventDispatcher();

	// Toggle accordion sections
	function toggleAccordion(section: string) {
		if (section in accordionStates) {
			accordionStates[section] = !accordionStates[section];
		}
	}

	function saveExamSettings() {
		dispatch('saveSettings');
	}

	function calculateCheckpointTimes() {
		dispatch('calculateCheckpoints');
	}

	function addCustomCheckpoint() {
		dispatch('addCustomCheckpoint');
	}

	function removeCustomCheckpoint(id: string) {
		dispatch('removeCustomCheckpoint', { id });
	}

	function toggleAnnouncementsEdit() {
		dispatch('toggleAnnouncementsEdit');
	}

	function saveAnnouncements() {
		dispatch('saveAnnouncements');
	}

	function closeSidebar() {
		dispatch('close');
	}

	function clearAllSettings() {
		if (confirm('Are you sure you want to clear all exam settings? This action cannot be undone.')) {
			dispatch('clearAllSettings');
		}
	}

</script>

<!-- Modal Backdrop -->
<div 
	class="fixed inset-0 bg-black bg-opacity-10 z-40 flex items-center justify-center p-4"
	on:click={() => closeSidebar()}
	transition:fade={{ duration: 200 }}
>
	<!-- Modal Content -->
	<div 
		class="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto {highContrastMode ? 'high-contrast-form' : ''}"
		on:click|stopPropagation
		transition:fly={{ y: 20, duration: 300, easing: quintOut }}
	>
		<div class="p-6">
			<div class="flex items-center justify-between mb-6">
				<h2 class="text-xl font-bold text-gray-900">Operator Controls</h2>
				<button 
					on:click={closeSidebar}
					class="text-gray-500 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100 transition-colors"
					aria-label="Close operator controls"
				>
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
					</svg>
				</button>
			</div>

			<!-- Accordions Start -->

			<!-- Exam Setup Accordion -->
			<div class="mb-4 border rounded-lg">
				<button class="w-full flex justify-between items-center px-4 py-3 font-semibold text-left text-gray-800 focus:outline-none" on:click={() => accordionStates.examSetup = !accordionStates.examSetup}>
					<span>Exam Setup</span>
					<svg class="w-5 h-5 transform transition-transform duration-200" style:rotate={accordionStates.examSetup ? '90deg' : '0deg'} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
				</button>
				{#if accordionStates.examSetup}
					<div class="px-4 pb-4">
						<label for="custom-title" class="block text-sm font-medium text-gray-700 mb-1">Custom Title</label>
						<input id="custom-title" type="text" bind:value={customTitle} on:input={saveExamSettings} placeholder="Enter custom title (e.g., 'Final Exam', 'Quiz Time')" class="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
						<p class="text-xs text-gray-500 mt-1">This will replace "Exam Time Display" in the header</p>
					</div>
				{/if}
			</div>

			<!-- Timing & Checkpoints Accordion -->
			<div class="mb-4 border rounded-lg">
				<button class="w-full flex justify-between items-center px-4 py-3 font-semibold text-left text-gray-800 focus:outline-none" on:click={() => accordionStates.timing = !accordionStates.timing}>
					<span>Timing & Checkpoints</span>
					<svg class="w-5 h-5 transform transition-transform duration-200" style:rotate={accordionStates.timing ? '90deg' : '0deg'} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
				</button>
				{#if accordionStates.timing}
					<div class="px-4 pb-4">
						<!-- Exam Timing Section -->
						<div class="mb-4">
							<label for="exam-start" class="block text-sm font-medium text-gray-700 mb-1">Exam Start Time</label>
							<input id="exam-start" type="time" bind:value={examStartTime} on:change={calculateCheckpointTimes} class="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
						</div>
						<div class="mb-4">
							<label for="exam-end" class="block text-sm font-medium text-gray-700 mb-1">Exam End Time</label>
							<input id="exam-end" type="time" bind:value={examEndTime} on:change={calculateCheckpointTimes} class="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
						</div>
						{#if examStartTime && examEndTime}
							<button on:click={calculateCheckpointTimes} class="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors mb-4">Auto-Calculate Checkpoints</button>
						{/if}
						<!-- Predefined Checkpoints -->
						<div class="mb-4">
							<h4 class="font-semibold mb-2">Checkpoints</h4>
							{#if examStartTime || examEndTime}
								<div class="mb-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
									<div class="text-xs text-blue-800">
										{#if examStartTime}<div class="flex items-center mb-1"><span class="mr-2">🟢</span><span>Exam Start at {examStartTime}</span></div>{/if}
										{#if examEndTime}<div class="flex items-center"><span class="mr-2">🔴</span><span>Exam End at {examEndTime}</span></div>{/if}
									</div>
								</div>
							{/if}
							{#each checkpoints as checkpoint, index}
								<div class="border border-gray-200 rounded-lg p-3 mb-2">
									<div class="flex items-center justify-between mb-2">
										<label class="flex items-center">
											<input type="checkbox" bind:checked={checkpoint.enabled} on:change={saveExamSettings} class="mr-2" />
											<span class="font-medium text-gray-700">{checkpoint.name}</span>
										</label>
									</div>
									<div class="grid grid-cols-2 gap-2 mb-2">
										<div>
											<label for="checkpoint-time-{index}" class="block text-xs text-gray-600 mb-1">Time</label>
											<input id="checkpoint-time-{index}" type="time" bind:value={checkpoint.time} on:change={saveExamSettings} class="w-full p-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500" />
										</div>
										<div>
											<label for="checkpoint-emoji-{index}" class="block text-xs text-gray-600 mb-1">Emoji</label>
											<input id="checkpoint-emoji-{index}" type="text" bind:value={checkpoint.emoji} on:change={saveExamSettings} class="w-full p-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500" maxlength="4" />
										</div>
									</div>
									<div>
										<label for="checkpoint-color-{index}" class="block text-xs text-gray-600 mb-1">Color</label>
										<input id="checkpoint-color-{index}" type="color" bind:value={checkpoint.color} on:change={saveExamSettings} class="w-full h-8 border border-gray-300 rounded" />
									</div>
								</div>
							{/each}
						</div>
						<!-- Custom Checkpoints -->
						<div class="mb-2">
							<div class="flex items-center justify-between mb-2">
								<h4 class="font-semibold">Custom Checkpoints</h4>
								<button on:click={addCustomCheckpoint} class="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs transition-colors">+ Add</button>
							</div>
							{#each customCheckpoints as checkpoint, index}
								<div class="border border-gray-200 rounded-lg p-3 mb-2">
									<div class="flex items-center justify-between mb-2">
										<input type="text" bind:value={checkpoint.name} on:change={saveExamSettings} class="flex-1 p-1 text-sm font-medium border-0 border-b border-gray-300 focus:border-blue-500 focus:ring-0" placeholder="Checkpoint name" />
										<button on:click={() => removeCustomCheckpoint(checkpoint.id)} class="ml-2 text-red-500 hover:text-red-700 text-xs">Remove</button>
									</div>
									<div class="flex items-center mb-2">
										<input type="checkbox" bind:checked={checkpoint.enabled} on:change={saveExamSettings} class="mr-2" />
										<span class="text-xs text-gray-600">Enabled</span>
									</div>
									<div class="grid grid-cols-2 gap-2 mb-2">
										<div>
											<label for="custom-checkpoint-time-{index}" class="block text-xs text-gray-600 mb-1">Time</label>
											<input id="custom-checkpoint-time-{index}" type="time" bind:value={checkpoint.time} on:change={saveExamSettings} class="w-full p-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500" />
										</div>
										<div>
											<label for="custom-checkpoint-emoji-{index}" class="block text-xs text-gray-600 mb-1">Emoji</label>
											<input id="custom-checkpoint-emoji-{index}" type="text" bind:value={checkpoint.emoji} on:change={saveExamSettings} class="w-full p-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500" maxlength="4" />
										</div>
									</div>
									<div>
										<label for="custom-checkpoint-color-{index}" class="block text-xs text-gray-600 mb-1">Color</label>
										<input id="custom-checkpoint-color-{index}" type="color" bind:value={checkpoint.color} on:change={saveExamSettings} class="w-full h-8 border border-gray-300 rounded" />
									</div>
								</div>
							{/each}
							{#if customCheckpoints.length === 0}
								<p class="text-xs text-gray-500 italic">No custom checkpoints added</p>
							{/if}
						</div>
					</div>
				{/if}
			</div>

			<!-- Announcements & Display Accordion -->
			<div class="mb-4 border rounded-lg">
				<button class="w-full flex justify-between items-center px-4 py-3 font-semibold text-left text-gray-800 focus:outline-none" on:click={() => accordionStates.announcements = !accordionStates.announcements}>
					<span>Announcements & Display</span>
					<svg class="w-5 h-5 transform transition-transform duration-200" style:rotate={accordionStates.announcements ? '90deg' : '0deg'} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
				</button>
				{#if accordionStates.announcements}
					<div class="px-4 pb-4">
						<div class="flex items-center justify-between mb-2">
							<label class="flex items-center">
								<input type="checkbox" bind:checked={showAnnouncements} class="mr-2" />
								<span class="text-sm font-medium text-gray-700">Show Announcements</span>
							</label>
							<button on:click={toggleAnnouncementsEdit} class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs transition-colors">{isEditingAnnouncements ? 'Cancel' : 'Edit'}</button>
						</div>
						<div class="mb-2">
							<label for="announcement-position" class="block text-xs font-medium text-gray-700 mb-1">Position</label>
							<select id="announcement-position" bind:value={announcementPosition} on:change={saveExamSettings} class="w-full p-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs">
								<option value="top">Above Clock (Traditional)</option>
								<option value="left">Left Side (For Long Announcements)</option>
							</select>
							<p class="text-xs text-gray-500 mt-1">Choose where announcements appear on the display</p>
						</div>
						<div class="mb-2">
							<label for="announcement-font-size" class="block text-xs font-medium text-gray-700 mb-1">Font Size</label>
							<input id="announcement-font-size" type="range" min="12" max="28" step="1" bind:value={announcementFontSize} on:input={saveExamSettings} class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
							<div class="flex justify-between text-xs text-gray-500 mt-1">
								<span>Small (12px)</span>
								<span class="font-medium">{announcementFontSize}px</span>
								<span>Large (28px)</span>
							</div>
							<p class="text-xs text-gray-500 mt-1">Adjust the size of announcement text</p>
						</div>
						<div class="mb-2">
							<label class="flex items-center">
								<input type="checkbox" bind:checked={highContrastMode} on:change={saveExamSettings} class="mr-2" />
								<span class="text-sm font-medium text-gray-700">High Contrast Mode</span>
							</label>
							<p class="text-xs text-gray-500 mt-1">Enhanced visibility for damaged projectors and low contrast displays</p>
						</div>
						<div class="flex items-center gap-4 mt-2 mb-2">
							<label class="flex items-center cursor-pointer">
								<input type="checkbox" bind:checked={showDate} class="mr-2" />
								<span class="text-xs">Show Date</span>
							</label>
							<label class="flex items-center cursor-pointer">
								<input type="checkbox" bind:checked={showTimezone} class="mr-2" />
								<span class="text-xs">Show Timezone</span>
							</label>
						</div>
						{#if isEditingAnnouncements}
							<div class="mb-2">
								<textarea 
									bind:value={announcements} 
									placeholder="Enter announcements for students... Markdown syntax is supported." 
									class="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-gray-800 text-xs" 
									rows="6"
								></textarea>
								<div class="text-xs text-gray-500 mt-1 mb-2">
									<p>Markdown syntax supported:</p>
									<code class="bg-gray-100 text-xs px-1 rounded">**bold**</code>,
									<code class="bg-gray-100 text-xs px-1 rounded">*italic*</code>,
									<code class="bg-gray-100 text-xs px-1 rounded"># Heading</code>,
									<code class="bg-gray-100 text-xs px-1 rounded">- List item</code>,
									<code class="bg-gray-100 text-xs px-1 rounded">[Link](url)</code>
								</div>
								<button on:click={saveAnnouncements} class="mt-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-xs transition-colors w-full">Save Announcements</button>
							</div>
						{:else}
							<div class="p-2 bg-gray-50 rounded-lg border">
								{#if announcements.trim()}
									<div class="text-xs text-gray-800 whitespace-pre-line">
										<div class="flex items-center mb-1">
											<p class="text-xs text-gray-500">{announcements.length} characters | <span class="italic">Markdown will be rendered on display</span></p>
										</div>
										{announcements}
									</div>
								{:else}
									<div class="text-gray-500 italic text-xs">No announcements set</div>
								{/if}
							</div>
						{/if}
					</div>
				{/if}
			</div>

			<!-- System/NTP Accordion -->
			<div class="mb-4 border rounded-lg">
				<button class="w-full flex justify-between items-center px-4 py-3 font-semibold text-left text-gray-800 focus:outline-none" on:click={() => accordionStates.system = !accordionStates.system}>
					<span>System & NTP</span>
					<div class="flex items-center">
						<span class="w-3 h-3 rounded-full mr-2 animate-pulse"
							class:bg-green-500={healthStatus === 'healthy'}
							class:bg-yellow-400={healthStatus === 'syncing' || healthStatus === 'checking...'}
							class:bg-red-500={healthStatus === 'unhealthy'}
						></span>
						<svg class="w-5 h-5 transform transition-transform duration-200" style:rotate={accordionStates.system ? '90deg' : '0deg'} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
					</div>
				</button>
				{#if accordionStates.system}
					<div class="px-4 pb-4">
						<!-- System Status Details -->
						<div class="mb-4 border rounded-lg p-3 bg-gray-50">
							<h4 class="font-semibold mb-2 flex items-center"><span class="mr-2">📊</span>System Status</h4>
							<div class="mb-2 text-xs">
								<div class="flex items-center mb-1">
									<span class="w-3 h-3 rounded-full mr-2"
										class:bg-green-500={healthStatus === 'healthy'}
										class:bg-yellow-400={healthStatus === 'syncing' || healthStatus === 'checking...'}
										class:bg-red-500={healthStatus === 'unhealthy'}
									></span>
									<span class="font-medium">Status:</span>
									<span class="ml-1">{healthStatus}</span>
								</div>
								<div class="flex mb-1">
									<span class="font-medium">Last Check:</span>
									<span class="ml-1">{lastHealthCheck || 'N/A'}</span>
								</div>
								<div class="flex mb-1">
									<span class="font-medium">Time Source:</span>
									<span class="ml-1">{timeSource || 'local'}</span>
								</div>
								<div class="flex">
									<span class="font-medium">Response Time:</span>
									<span class="ml-1">{responseTime || 0}ms</span>
								</div>
							</div>
						</div>
						
						{#if timeSource === 'ntp_partial' || (ntpInfo.server && !ntpInfo.hasValidMetrics)}
							<div class="mb-4 border border-indigo-200 rounded-lg p-3 bg-indigo-50">
								<h4 class="font-semibold mb-2 flex items-center"><span class="mr-2">🔧</span>NTP Override</h4>
								<div class="mb-2">
									<div class="flex items-center justify-between p-2 bg-white rounded-lg border border-indigo-200">
										<div class="flex items-center">
											<div class="w-3 h-3 bg-indigo-500 rounded-full animate-pulse mr-2"></div>
											<div>
												<div class="font-medium text-gray-800 text-xs">NTP Time with Estimated Metrics</div>
												<div class="text-xs text-gray-600">Server: {ntpInfo.server || 'Unknown'} {#if ntpInfo.offset !== undefined}• Offset: {ntpInfo.offset}ms (estimated){/if}</div>
											</div>
										</div>
									</div>
								</div>
								<label class="flex items-start mb-2">
									<input type="checkbox" bind:checked={forceNTP} on:change={saveExamSettings} class="mt-1 mr-2" />
									<div>
										<span class="font-medium text-gray-700 text-xs">Force Accept NTP Time</span>
										<p class="text-xs text-gray-600 mt-1">When enabled, treats NTP time as fully trusted even when offset/delay metrics are unavailable. This will display as "NTP Sync" instead of "NTP Time (Est. Metrics)".</p>
									</div>
								</label>
								{#if forceNTP}
									<div class="p-2 bg-green-50 border border-green-200 rounded-lg mb-2">
										<div class="flex items-center text-green-800 text-xs"><span class="mr-2">✅</span><span class="font-medium">Force NTP Active</span></div>
										<p class="text-xs text-green-700 mt-1">The system will treat the current NTP partial sync as a full sync for display purposes.</p>
									</div>
								{/if}
							</div>
						{/if}
						<!-- Current Status -->
						{#if activeCheckpoint || nextCheckpoint}
							<div class="border-t pt-4 mt-2">
								<h4 class="font-semibold mb-2">Checkpoint Status</h4>
								{#if activeCheckpoint}
									<div class="mb-2 p-2 rounded-lg" style="background-color: {activeCheckpoint.color}20; border-left: 4px solid {activeCheckpoint.color};">
										<div class="flex items-center">
											<span class="text-lg mr-2">{activeCheckpoint.emoji}</span>
											<div>
												<div class="font-medium text-gray-800 text-xs">Active: {activeCheckpoint.name}</div>
												<div class="text-xs text-gray-600">Since {activeCheckpoint.time}</div>
											</div>
										</div>
									</div>
								{/if}
								{#if nextCheckpoint}
									<div class="p-2 bg-gray-50 rounded-lg">
										<div class="flex items-center">
											<span class="text-lg mr-2">{nextCheckpoint.emoji}</span>
											<div>
												<div class="font-medium text-gray-800 text-xs">Next: {nextCheckpoint.name}</div>
												<div class="text-xs text-gray-600">At {nextCheckpoint.time}</div>
											</div>
										</div>
									</div>
								{/if}
							</div>
						{/if}
					</div>
				{/if}
			</div>

			<!-- Advanced/Reset Accordion -->
			<div class="mb-2 border rounded-lg">
				<button class="w-full flex justify-between items-center px-4 py-3 font-semibold text-left text-gray-800 focus:outline-none" on:click={() => accordionStates.advanced = !accordionStates.advanced}>
					<span>Advanced & Reset</span>
					<svg class="w-5 h-5 transform transition-transform duration-200" style:rotate={accordionStates.advanced ? '90deg' : '0deg'} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
				</button>
				{#if accordionStates.advanced}
					<div class="px-4 pb-4">
						<h4 class="font-semibold mb-2">Reset for Next Exam</h4>
						<div class="bg-red-50 border border-red-200 rounded-lg p-3 mb-2">
							<p class="text-xs text-red-800 mb-1"><strong>Warning:</strong> This will clear all exam settings including:</p>
							<ul class="text-xs text-red-700 ml-4 list-disc space-y-1">
								<li>Exam start and end times</li>
								<li>All custom checkpoints</li>
								<li>Announcements</li>
								<li>Custom title</li>
								<li>Announcement position settings</li>
							</ul>
						</div>
						<button on:click={clearAllSettings} class="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors">Clear All Settings</button>
					</div>
				{/if}
			</div>

			<!-- Accordions End -->

		</div>
	</div>
</div>

<style>
	/* High Contrast Mode Styles for Form Elements */
	:global(.high-contrast-form) {
		/* Improved visibility for all form elements */
		--input-border-color: #000;
		--input-text-color: #000;
		--input-bg-color: #fff;
		--input-focus-border-color: #2563eb;
		--input-focus-ring-color: rgba(37, 99, 235, 0.5);
	}
	
	:global(.high-contrast-form input[type="text"]),
	:global(.high-contrast-form input[type="time"]),
	:global(.high-contrast-form select),
	:global(.high-contrast-form textarea) {
		border-color: var(--input-border-color);
		border-width: 2px;
		color: var(--input-text-color);
		background-color: var(--input-bg-color);
	}
	
	:global(.high-contrast-form input[type="text"]:focus),
	:global(.high-contrast-form input[type="time"]:focus),
	:global(.high-contrast-form select:focus),
	:global(.high-contrast-form textarea:focus) {
		border-color: var(--input-focus-border-color);
		box-shadow: 0 0 0 3px var(--input-focus-ring-color);
		outline: none;
	}
	
	/* Ensure color inputs have a visible border in high contrast mode */
	:global(.high-contrast-form input[type="color"]) {
		border: 2px solid #000;
		outline: 1px solid white;
	}
	
	/* Ensure checkbox labels are visible */
	:global(.high-contrast-form input[type="checkbox"] + span) {
		color: #000;
	}
	
	/* Improve visibility of range sliders */
	:global(.high-contrast-form input[type="range"]) {
		height: 8px;
		background: #ccc;
		border: 1px solid #000;
	}
	
	/* Ensure text in preview areas is visible */
	:global(.high-contrast-form .text-gray-500),
	:global(.high-contrast-form .text-gray-600),
	:global(.high-contrast-form .text-gray-700),
	:global(.high-contrast-form .text-gray-800) {
		color: #000 !important;
	}
</style>
