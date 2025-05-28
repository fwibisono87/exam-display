<script lang="ts">
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
	export let activeCheckpoint: any;
	export let nextCheckpoint: any;

	// Event dispatchers for parent component communication
	import { createEventDispatcher } from 'svelte';
	const dispatch = createEventDispatcher();

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

<div class="fixed top-0 right-0 h-full w-96 bg-white shadow-2xl z-40 overflow-y-auto border-l border-gray-200">
	<div class="p-6">
		<div class="flex items-center justify-between mb-6">
			<h2 class="text-xl font-bold text-gray-900">Operator Controls</h2>
			<button 
				on:click={closeSidebar}
				class="text-gray-500 hover:text-gray-700"
				aria-label="Close operator controls"
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
				<label for="custom-title" class="block text-sm font-medium text-gray-700 mb-1">Custom Title</label>
				<input
					id="custom-title"
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
					<label for="exam-start" class="block text-sm font-medium text-gray-700 mb-1">Exam Start Time</label>
					<input
						id="exam-start"
						type="time"
						bind:value={examStartTime}
						on:change={calculateCheckpointTimes}
						class="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					/>
				</div>
				
				<div>
					<label for="exam-end" class="block text-sm font-medium text-gray-700 mb-1">Exam End Time</label>
					<input
						id="exam-end"
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
							<label for="checkpoint-time-{index}" class="block text-xs text-gray-600 mb-1">Time</label>
							<input
								id="checkpoint-time-{index}"
								type="time"
								bind:value={checkpoint.time}
								on:change={saveExamSettings}
								class="w-full p-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
							/>
						</div>
						<div>
							<label for="checkpoint-emoji-{index}" class="block text-xs text-gray-600 mb-1">Emoji</label>
							<input
								id="checkpoint-emoji-{index}"
								type="text"
								bind:value={checkpoint.emoji}
								on:change={saveExamSettings}
								class="w-full p-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
								maxlength="4"
							/>
						</div>
					</div>
					
					<div>
						<label for="checkpoint-color-{index}" class="block text-xs text-gray-600 mb-1">Color</label>
						<input
							id="checkpoint-color-{index}"
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
			
			{#each customCheckpoints as checkpoint, index}
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
							<label for="custom-checkpoint-time-{index}" class="block text-xs text-gray-600 mb-1">Time</label>
							<input
								id="custom-checkpoint-time-{index}"
								type="time"
								bind:value={checkpoint.time}
								on:change={saveExamSettings}
								class="w-full p-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
							/>
						</div>
						<div>
							<label for="custom-checkpoint-emoji-{index}" class="block text-xs text-gray-600 mb-1">Emoji</label>
							<input
								id="custom-checkpoint-emoji-{index}"
								type="text"
								bind:value={checkpoint.emoji}
								on:change={saveExamSettings}
								class="w-full p-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
								maxlength="4"
							/>
						</div>
					</div>
					
					<div>
						<label for="custom-checkpoint-color-{index}" class="block text-xs text-gray-600 mb-1">Color</label>
						<input
							id="custom-checkpoint-color-{index}"
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
				
				<div>
					<label for="announcement-position" class="block text-sm font-medium text-gray-700 mb-2">Position</label>
					<select
						id="announcement-position"
						bind:value={announcementPosition}
						on:change={saveExamSettings}
						class="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
					>
						<option value="top">Above Clock (Traditional)</option>
						<option value="left">Left Side (For Long Announcements)</option>
					</select>
					<p class="text-xs text-gray-500 mt-1">Choose where announcements appear on the display</p>
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

		<!-- Clear All Settings Section -->
		<div class="border-t pt-6 mt-8">
			<h3 class="text-lg font-semibold text-gray-800 mb-4">Reset for Next Exam</h3>
			<div class="bg-red-50 border border-red-200 rounded-lg p-4">
				<div class="mb-3">
					<p class="text-sm text-red-800 mb-2">
						<strong>Warning:</strong> This will clear all exam settings including:
					</p>
					<ul class="text-xs text-red-700 ml-4 list-disc space-y-1">
						<li>Exam start and end times</li>
						<li>All custom checkpoints</li>
						<li>Announcements</li>
						<li>Custom title</li>
						<li>Announcement position settings</li>
					</ul>
				</div>
				<button
					on:click={clearAllSettings}
					class="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
				>
					Clear All Settings
				</button>
			</div>
		</div>
	</div>
</div>
