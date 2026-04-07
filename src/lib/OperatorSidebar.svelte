<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { fly, fade } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import type { AnnouncementPosition, Checkpoint, NtpInfo } from '$lib/types';

	// Export props for parent component communication
	export let customTitle: string;
	export let examStartTime: string;
	export let examEndTime: string;
	export let checkpoints: Checkpoint[];
	export let customCheckpoints: Checkpoint[];
	export let announcements: string;
	export let isEditingAnnouncements: boolean;
	export let showAnnouncements: boolean;
	export let announcementPosition: AnnouncementPosition;
	export let announcementFontSize: number;
	export let highContrastMode: boolean;
	export let activeCheckpoint: Checkpoint | null = null;
	export let nextCheckpoint: Checkpoint | null = null;
	export let timeSource: string;
	export let ntpInfo: NtpInfo;
	export let healthStatus: string = 'checking...';
	export let lastHealthCheck: string = '';
	export let responseTime: number = 0;
	export let showDate: boolean = false;
	export let showTimezone: boolean = false;

	// Accordion state management - organized by logical groups
	let accordionStates: Record<string, boolean> = {
		examSetup: true, // Open by default - most important
		timing: false, // Exam timing and checkpoints
		announcements: false, // Announcements and display settings
		system: false, // System status and NTP settings
		advanced: false // Advanced settings and reset
	};

	const dispatch = createEventDispatcher<{
		saveSettings: void;
		calculateCheckpoints: void;
		addCustomCheckpoint: void;
		removeCustomCheckpoint: { id: string };
		toggleAnnouncementsEdit: void;
		saveAnnouncements: void;
		close: void;
		clearAllSettings: void;
	}>();

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
		if (
			confirm('Are you sure you want to clear all exam settings? This action cannot be undone.')
		) {
			dispatch('clearAllSettings');
		}
	}
</script>

<!-- Modal structure with proper accessibility -->
<div
	class="bg-opacity-10 fixed inset-0 z-40 flex items-center justify-center bg-black p-4"
	transition:fade={{ duration: 200 }}
	role="dialog"
	aria-modal="true"
	aria-labelledby="modal-title"
	on:keydown={(event) => {
		if (event.key === 'Escape') closeSidebar();
	}}
	tabindex="-1"
>
	<!-- Invisible backdrop button for accessibility -->
	<div class="absolute inset-0" aria-hidden="true">
		<button
			class="h-full w-full border-0 bg-transparent"
			on:click={closeSidebar}
			aria-label="Close modal"
		></button>
	</div>

	<!-- Modal Content -->
	<div
		class="relative z-50 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-2xl {highContrastMode
			? 'high-contrast-form'
			: ''}"
		transition:fly={{ y: 20, duration: 300, easing: quintOut }}
		role="document"
	>
		<div class="p-6">
			<div class="mb-6 flex items-center justify-between">
				<h2 id="modal-title" class="text-xl font-bold text-gray-900">Operator Controls</h2>
				<button
					on:click={closeSidebar}
					class="rounded-lg p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
					aria-label="Close operator controls"
				>
					<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						></path>
					</svg>
				</button>
			</div>

			<!-- Accordions Start -->

			<!-- Exam Setup Accordion -->
			<div class="mb-4 rounded-lg border">
				<button
					class="flex w-full items-center justify-between px-4 py-3 text-left font-semibold text-gray-800 focus:outline-none"
					on:click={() => (accordionStates.examSetup = !accordionStates.examSetup)}
					aria-expanded={accordionStates.examSetup}
					aria-controls="examSetupContent"
				>
					<span>Exam Setup</span>
					<svg
						class="h-5 w-5 transform transition-transform duration-200"
						style:rotate={accordionStates.examSetup ? '90deg' : '0deg'}
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						aria-hidden="true"
						><path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 5l7 7-7 7"
						/></svg
					>
				</button>
				{#if accordionStates.examSetup}
					<div id="examSetupContent" class="px-4 pb-4">
						<label for="custom-title" class="mb-1 block text-sm font-medium text-gray-700"
							>Custom Title</label
						>
						<input
							id="custom-title"
							type="text"
							bind:value={customTitle}
							on:input={saveExamSettings}
							placeholder="Enter custom title (e.g., 'Final Exam', 'Quiz Time')"
							class="w-full rounded-lg border border-gray-300 p-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
						/>
						<p class="mt-1 text-xs text-gray-500">
							This will replace "Exam Time Display" in the header
						</p>
					</div>
				{/if}
			</div>

			<!-- Timing & Checkpoints Accordion -->
			<div class="mb-4 rounded-lg border">
				<button
					class="flex w-full items-center justify-between px-4 py-3 text-left font-semibold text-gray-800 focus:outline-none"
					on:click={() => (accordionStates.timing = !accordionStates.timing)}
					aria-expanded={accordionStates.timing}
					aria-controls="timingContent"
				>
					<span>Timing & Checkpoints</span>
					<svg
						class="h-5 w-5 transform transition-transform duration-200"
						style:rotate={accordionStates.timing ? '90deg' : '0deg'}
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						aria-hidden="true"
						><path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 5l7 7-7 7"
						/></svg
					>
				</button>
				{#if accordionStates.timing}
					<div id="timingContent" class="px-4 pb-4">
						<!-- Exam Timing Section -->
						<div class="mb-4">
							<label for="exam-start" class="mb-1 block text-sm font-medium text-gray-700"
								>Exam Start Time</label
							>
							<input
								id="exam-start"
								type="time"
								bind:value={examStartTime}
								on:change={calculateCheckpointTimes}
								class="w-full rounded-lg border border-gray-300 p-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
							/>
						</div>
						<div class="mb-4">
							<label for="exam-end" class="mb-1 block text-sm font-medium text-gray-700"
								>Exam End Time</label
							>
							<input
								id="exam-end"
								type="time"
								bind:value={examEndTime}
								on:change={calculateCheckpointTimes}
								class="w-full rounded-lg border border-gray-300 p-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
							/>
						</div>
						{#if examStartTime && examEndTime}
							<button
								on:click={calculateCheckpointTimes}
								class="mb-4 w-full rounded-lg bg-blue-600 px-4 py-2 text-sm text-white transition-colors hover:bg-blue-700"
								>Auto-Calculate Checkpoints</button
							>
						{/if}
						<!-- Predefined Checkpoints -->
						<div class="mb-4">
							<h4 class="mb-2 font-semibold">Checkpoints</h4>
							{#if examStartTime || examEndTime}
								<div class="mb-2 rounded-lg border border-blue-200 bg-blue-50 p-2">
									<div class="text-xs text-blue-800">
										{#if examStartTime}<div class="mb-1 flex items-center">
												<span class="mr-2">🟢</span><span>Exam Start at {examStartTime}</span>
											</div>{/if}
										{#if examEndTime}<div class="flex items-center">
												<span class="mr-2">🔴</span><span>Exam End at {examEndTime}</span>
											</div>{/if}
									</div>
								</div>
							{/if}
							{#each checkpoints as checkpoint, index (checkpoint.id)}
								<div class="mb-2 rounded-lg border border-gray-200 p-3">
									<div class="mb-2 flex items-center justify-between">
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
									<div class="mb-2 grid grid-cols-2 gap-2">
										<div>
											<label for="checkpoint-time-{index}" class="mb-1 block text-xs text-gray-600"
												>Time</label
											>
											<input
												id="checkpoint-time-{index}"
												type="time"
												bind:value={checkpoint.time}
												on:change={saveExamSettings}
												class="w-full rounded border border-gray-300 p-1 text-sm focus:ring-1 focus:ring-blue-500"
											/>
										</div>
										<div>
											<label for="checkpoint-emoji-{index}" class="mb-1 block text-xs text-gray-600"
												>Emoji</label
											>
											<input
												id="checkpoint-emoji-{index}"
												type="text"
												bind:value={checkpoint.emoji}
												on:change={saveExamSettings}
												class="w-full rounded border border-gray-300 p-1 text-sm focus:ring-1 focus:ring-blue-500"
												maxlength="4"
											/>
										</div>
									</div>
									<div>
										<label for="checkpoint-color-{index}" class="mb-1 block text-xs text-gray-600"
											>Color</label
										>
										<input
											id="checkpoint-color-{index}"
											type="color"
											bind:value={checkpoint.color}
											on:change={saveExamSettings}
											class="h-8 w-full rounded border border-gray-300"
										/>
									</div>
								</div>
							{/each}
						</div>
						<!-- Custom Checkpoints -->
						<div class="mb-2">
							<div class="mb-2 flex items-center justify-between">
								<h4 class="font-semibold">Custom Checkpoints</h4>
								<button
									on:click={addCustomCheckpoint}
									class="rounded bg-green-600 px-2 py-1 text-xs text-white transition-colors hover:bg-green-700"
									>+ Add</button
								>
							</div>
							{#each customCheckpoints as checkpoint, index (checkpoint.id)}
								<div class="mb-2 rounded-lg border border-gray-200 p-3">
									<div class="mb-2 flex items-center justify-between">
										<input
											type="text"
											bind:value={checkpoint.name}
											on:change={saveExamSettings}
											class="flex-1 border-0 border-b border-gray-300 p-1 text-sm font-medium focus:border-blue-500 focus:ring-0"
											placeholder="Checkpoint name"
										/>
										<button
											on:click={() => removeCustomCheckpoint(checkpoint.id)}
											class="ml-2 text-xs text-red-500 hover:text-red-700">Remove</button
										>
									</div>
									<div class="mb-2 flex items-center">
										<input
											type="checkbox"
											bind:checked={checkpoint.enabled}
											on:change={saveExamSettings}
											class="mr-2"
										/>
										<span class="text-xs text-gray-600">Enabled</span>
									</div>
									<div class="mb-2 grid grid-cols-2 gap-2">
										<div>
											<label
												for="custom-checkpoint-time-{index}"
												class="mb-1 block text-xs text-gray-600">Time</label
											>
											<input
												id="custom-checkpoint-time-{index}"
												type="time"
												bind:value={checkpoint.time}
												on:change={saveExamSettings}
												class="w-full rounded border border-gray-300 p-1 text-sm focus:ring-1 focus:ring-blue-500"
											/>
										</div>
										<div>
											<label
												for="custom-checkpoint-emoji-{index}"
												class="mb-1 block text-xs text-gray-600">Emoji</label
											>
											<input
												id="custom-checkpoint-emoji-{index}"
												type="text"
												bind:value={checkpoint.emoji}
												on:change={saveExamSettings}
												class="w-full rounded border border-gray-300 p-1 text-sm focus:ring-1 focus:ring-blue-500"
												maxlength="4"
											/>
										</div>
									</div>
									<div>
										<label
											for="custom-checkpoint-color-{index}"
											class="mb-1 block text-xs text-gray-600">Color</label
										>
										<input
											id="custom-checkpoint-color-{index}"
											type="color"
											bind:value={checkpoint.color}
											on:change={saveExamSettings}
											class="h-8 w-full rounded border border-gray-300"
										/>
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
			<div class="mb-4 rounded-lg border">
				<button
					class="flex w-full items-center justify-between px-4 py-3 text-left font-semibold text-gray-800 focus:outline-none"
					on:click={() => (accordionStates.announcements = !accordionStates.announcements)}
					aria-expanded={accordionStates.announcements}
					aria-controls="announcementsContent"
				>
					<span>Announcements & Display</span>
					<svg
						class="h-5 w-5 transform transition-transform duration-200"
						style:rotate={accordionStates.announcements ? '90deg' : '0deg'}
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						aria-hidden="true"
						><path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 5l7 7-7 7"
						/></svg
					>
				</button>
				{#if accordionStates.announcements}
					<div id="announcementsContent" class="px-4 pb-4">
						<div class="mb-2 flex items-center justify-between">
							<label class="flex items-center">
								<input type="checkbox" bind:checked={showAnnouncements} class="mr-2" />
								<span class="text-sm font-medium text-gray-700">Show Announcements</span>
							</label>
							<button
								on:click={toggleAnnouncementsEdit}
								class="rounded bg-blue-600 px-3 py-1 text-xs text-white transition-colors hover:bg-blue-700"
								>{isEditingAnnouncements ? 'Cancel' : 'Edit'}</button
							>
						</div>
						<div class="mb-2">
							<label
								for="announcement-position"
								class="mb-1 block text-xs font-medium text-gray-700">Position</label
							>
							<select
								id="announcement-position"
								bind:value={announcementPosition}
								on:change={saveExamSettings}
								class="w-full rounded-lg border border-gray-300 p-1 text-xs focus:border-transparent focus:ring-2 focus:ring-blue-500"
							>
								<option value="top">Above Clock (Traditional)</option>
								<option value="left">Left Side (For Long Announcements)</option>
							</select>
							<p class="mt-1 text-xs text-gray-500">
								Choose where announcements appear on the display
							</p>
						</div>
						<div class="mb-2">
							<label
								for="announcement-font-size"
								class="mb-1 block text-xs font-medium text-gray-700">Font Size</label
							>
							<input
								id="announcement-font-size"
								type="range"
								min="12"
								max="28"
								step="1"
								bind:value={announcementFontSize}
								on:input={saveExamSettings}
								class="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200"
							/>
							<div class="mt-1 flex justify-between text-xs text-gray-500">
								<span>Small (12px)</span>
								<span class="font-medium">{announcementFontSize}px</span>
								<span>Large (28px)</span>
							</div>
							<p class="mt-1 text-xs text-gray-500">Adjust the size of announcement text</p>
						</div>
						<div class="mb-2">
							<label class="flex items-center">
								<input
									type="checkbox"
									bind:checked={highContrastMode}
									on:change={saveExamSettings}
									class="mr-2"
								/>
								<span class="text-sm font-medium text-gray-700">High Contrast Mode</span>
							</label>
							<p class="mt-1 text-xs text-gray-500">
								Enhanced visibility for damaged projectors and low contrast displays
							</p>
						</div>
						<div class="mt-2 mb-2 flex items-center gap-4">
							<label class="flex cursor-pointer items-center">
								<input type="checkbox" bind:checked={showDate} class="mr-2" />
								<span class="text-xs">Show Date</span>
							</label>
							<label class="flex cursor-pointer items-center">
								<input type="checkbox" bind:checked={showTimezone} class="mr-2" />
								<span class="text-xs">Show Timezone</span>
							</label>
						</div>
						{#if isEditingAnnouncements}
							<div class="mb-2">
								<textarea
									bind:value={announcements}
									placeholder="Enter announcements for students... Markdown syntax is supported."
									class="w-full resize-none rounded-lg border border-gray-300 p-2 text-xs text-gray-800 focus:border-transparent focus:ring-2 focus:ring-blue-500"
									rows="6"
									aria-label="Announcement text editor with markdown support"
									id="announcement-editor"
								></textarea>
								<div class="mt-1 mb-2 text-xs text-gray-500">
									<p>Markdown syntax supported:</p>
									<code class="rounded bg-gray-100 px-1 text-xs">**bold**</code>,
									<code class="rounded bg-gray-100 px-1 text-xs">*italic*</code>,
									<code class="rounded bg-gray-100 px-1 text-xs"># Heading</code>,
									<code class="rounded bg-gray-100 px-1 text-xs">- List item</code>,
									<code class="rounded bg-gray-100 px-1 text-xs">[Link](url)</code>
								</div>
								<button
									on:click={saveAnnouncements}
									class="mt-2 w-full rounded-lg bg-green-600 px-4 py-2 text-xs text-white transition-colors hover:bg-green-700"
									>Save Announcements</button
								>
							</div>
						{:else}
							<div class="rounded-lg border bg-gray-50 p-2">
								{#if announcements.trim()}
									<div class="text-xs whitespace-pre-line text-gray-800">
										<div class="mb-1 flex items-center">
											<p class="text-xs text-gray-500">
												{announcements.length} characters |
												<span class="italic">Markdown will be rendered on display</span>
											</p>
										</div>
										{announcements}
									</div>
								{:else}
									<div class="text-xs text-gray-500 italic">No announcements set</div>
								{/if}
							</div>
						{/if}
					</div>
				{/if}
			</div>

			<!-- System/NTP Accordion -->
			<div class="mb-4 rounded-lg border">
				<button
					class="flex w-full items-center justify-between px-4 py-3 text-left font-semibold text-gray-800 focus:outline-none"
					on:click={() => (accordionStates.system = !accordionStates.system)}
					aria-expanded={accordionStates.system}
					aria-controls="systemContent"
				>
					<span>System & NTP</span>
					<div class="flex items-center">
						<span
							class="mr-2 h-3 w-3 animate-pulse rounded-full"
							class:bg-green-500={healthStatus === 'healthy'}
							class:bg-yellow-400={healthStatus === 'syncing' || healthStatus === 'checking...'}
							class:bg-red-500={healthStatus === 'unhealthy'}
							aria-hidden="true"
						></span>
						<svg
							class="h-5 w-5 transform transition-transform duration-200"
							style:rotate={accordionStates.system ? '90deg' : '0deg'}
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							aria-hidden="true"
							><path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9 5l7 7-7 7"
							/></svg
						>
					</div>
				</button>
				{#if accordionStates.system}
					<div id="systemContent" class="px-4 pb-4">
						<!-- System Status Details -->
						<div class="mb-4 rounded-lg border bg-gray-50 p-3">
							<h4 class="mb-2 flex items-center font-semibold">
								<span class="mr-2">📊</span>System Status
							</h4>
							<div class="mb-2 text-xs">
								<div class="mb-1 flex items-center">
									<span
										class="mr-2 h-3 w-3 rounded-full"
										class:bg-green-500={healthStatus === 'healthy'}
										class:bg-yellow-400={healthStatus === 'syncing' ||
											healthStatus === 'checking...'}
										class:bg-red-500={healthStatus === 'unhealthy'}
									></span>
									<span class="font-medium">Status:</span>
									<span class="ml-1">{healthStatus}</span>
								</div>
								<div class="mb-1 flex">
									<span class="font-medium">Last Check:</span>
									<span class="ml-1">{lastHealthCheck || 'N/A'}</span>
								</div>
								<div class="mb-1 flex">
									<span class="font-medium">Time Source:</span>
									<span class="ml-1">{timeSource || 'error'}</span>
								</div>
								<div class="flex">
									<span class="font-medium">Response Time:</span>
									<span class="ml-1">{responseTime || 0}ms</span>
								</div>
							</div>
						</div>

						{#if timeSource === 'ntp_partial'}
							<div class="mb-4 rounded-lg border border-indigo-200 bg-indigo-50 p-3">
								<h4 class="mb-2 flex items-center font-semibold">
									<span class="mr-2">ℹ️</span>NTP Status
								</h4>
								<div
									class="flex items-center justify-between rounded-lg border border-indigo-200 bg-white p-2"
								>
									<div class="flex items-center">
										<div class="mr-2 h-3 w-3 animate-pulse rounded-full bg-indigo-500"></div>
										<div>
											<div class="text-xs font-medium text-gray-800">
												NTP time is being used with estimated metrics
											</div>
											<div class="text-xs text-gray-600">
												Server: {ntpInfo.server || 'Unknown'}
												{#if ntpInfo.offset !== undefined}• Offset: {ntpInfo.offset}ms (estimated){/if}
											</div>
										</div>
									</div>
								</div>
								<p class="mt-2 text-xs text-gray-600">
									The display stays locked to `ntp.ui.ac.id`. Partial sync is shown as partial instead
									of being overridden in the UI.
								</p>
							</div>
						{/if}
						<!-- Current Status -->
						{#if activeCheckpoint || nextCheckpoint}
							<div class="mt-2 border-t pt-4">
								<h4 class="mb-2 font-semibold">Checkpoint Status</h4>
								{#if activeCheckpoint}
									<div
										class="mb-2 rounded-lg p-2"
										style="background-color: {activeCheckpoint.color}20; border-left: 4px solid {activeCheckpoint.color};"
									>
										<div class="flex items-center">
											<span class="mr-2 text-lg">{activeCheckpoint.emoji}</span>
											<div>
												<div class="text-xs font-medium text-gray-800">
													Active: {activeCheckpoint.name}
												</div>
												<div class="text-xs text-gray-600">Since {activeCheckpoint.time}</div>
											</div>
										</div>
									</div>
								{/if}
								{#if nextCheckpoint}
									<div class="rounded-lg bg-gray-50 p-2">
										<div class="flex items-center">
											<span class="mr-2 text-lg">{nextCheckpoint.emoji}</span>
											<div>
												<div class="text-xs font-medium text-gray-800">
													Next: {nextCheckpoint.name}
												</div>
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
			<div class="mb-2 rounded-lg border">
				<button
					class="flex w-full items-center justify-between px-4 py-3 text-left font-semibold text-gray-800 focus:outline-none"
					on:click={() => (accordionStates.advanced = !accordionStates.advanced)}
					aria-expanded={accordionStates.advanced}
					aria-controls="advancedContent"
				>
					<span>Advanced & Reset</span>
					<svg
						class="h-5 w-5 transform transition-transform duration-200"
						style:rotate={accordionStates.advanced ? '90deg' : '0deg'}
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						aria-hidden="true"
						><path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 5l7 7-7 7"
						/></svg
					>
				</button>
				{#if accordionStates.advanced}
					<div id="advancedContent" class="px-4 pb-4">
						<h4 class="mb-2 font-semibold">Reset for Next Exam</h4>
						<div class="mb-2 rounded-lg border border-red-200 bg-red-50 p-3">
							<p class="mb-1 text-xs text-red-800">
								<strong>Warning:</strong> This will clear all exam settings including:
							</p>
							<ul class="ml-4 list-disc space-y-1 text-xs text-red-700">
								<li>Exam start and end times</li>
								<li>All custom checkpoints</li>
								<li>Announcements</li>
								<li>Custom title</li>
								<li>Announcement position settings</li>
							</ul>
						</div>
						<button
							on:click={clearAllSettings}
							class="w-full rounded-lg bg-red-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-red-700"
							>Clear All Settings</button
						>
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

	:global(.high-contrast-form input[type='text']),
	:global(.high-contrast-form input[type='time']),
	:global(.high-contrast-form select),
	:global(.high-contrast-form textarea) {
		border-color: var(--input-border-color);
		border-width: 2px;
		color: var(--input-text-color);
		background-color: var(--input-bg-color);
	}

	:global(.high-contrast-form input[type='text']:focus),
	:global(.high-contrast-form input[type='time']:focus),
	:global(.high-contrast-form select:focus),
	:global(.high-contrast-form textarea:focus) {
		border-color: var(--input-focus-border-color);
		box-shadow: 0 0 0 3px var(--input-focus-ring-color);
		outline: none;
	}

	/* Ensure color inputs have a visible border in high contrast mode */
	:global(.high-contrast-form input[type='color']) {
		border: 2px solid #000;
		outline: 1px solid white;
	}

	/* Ensure checkbox labels are visible */
	:global(.high-contrast-form input[type='checkbox'] + span) {
		color: #000;
	}

	/* Improve visibility of range sliders */
	:global(.high-contrast-form input[type='range']) {
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
