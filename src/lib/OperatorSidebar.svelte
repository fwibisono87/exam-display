<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { AnnouncementPosition, Checkpoint, NtpInfo } from '$lib/types';

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
	export let is24Hour: boolean;
	export let activeCheckpoint: Checkpoint | null = null;
	export let nextCheckpoint: Checkpoint | null = null;
	export let timeSource: string;
	export let ntpInfo: NtpInfo;
	export let healthStatus: string = 'checking...';
	export let lastHealthCheck: string = '';
	export let responseTime: number = 0;
	export let showDate: boolean = false;
	export let showTimezone: boolean = false;
	export let bottomDeadZoneVh: number = 0;
	export let showDeadZoneGuide: boolean = false;

	$: drawerClass = highContrastMode
		? 'border-white bg-black text-white'
		: 'border-slate-300 bg-white text-slate-900';
	$: sectionClass = highContrastMode ? 'border-white/10' : 'border-slate-200';
	$: mutedTextClass = highContrastMode ? 'text-slate-400' : 'text-slate-500';
	$: subtleTextClass = highContrastMode ? 'text-slate-300' : 'text-slate-600';
	$: inlineCardClass = highContrastMode ? 'border-white/10' : 'border-slate-200';

	const dispatch = createEventDispatcher<{
		saveSettings: void;
		calculateCheckpoints: void;
		addCustomCheckpoint: void;
		removeCustomCheckpoint: { id: string };
		toggleAnnouncementsEdit: void;
		saveAnnouncements: void;
		close: void;
		clearAllSettings: void;
		syncNow: void;
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

	function syncNow() {
		dispatch('syncNow');
	}

	function clearAllSettings() {
		if (
			confirm('Are you sure you want to clear all exam settings? This action cannot be undone.')
		) {
			dispatch('clearAllSettings');
		}
	}
</script>

<div class="pointer-events-none fixed inset-y-0 right-0 z-40 flex max-w-full items-start justify-end p-3 md:p-5">
	<div
		class={`pointer-events-auto flex h-[calc(100vh-1.5rem)] w-[min(30rem,100vw-1.5rem)] flex-col overflow-hidden border shadow-2xl ${drawerClass}`}
		role="dialog"
		aria-modal="false"
		aria-labelledby="operator-drawer-title"
	>
		<div class={`border-b px-5 py-4 ${sectionClass}`}>
			<div class="flex items-start justify-between gap-4">
				<div>
					<p class={`mb-2 text-[0.72rem] font-semibold uppercase tracking-[0.22em] ${subtleTextClass}`}>
						Operator Console
					</p>
					<h2 id="operator-drawer-title" class="text-lg font-semibold normal-case tracking-[0.04em]">
						Display controls
					</h2>
					<p class={`mt-1 text-sm ${subtleTextClass}`}>
						Carbon-style dense controls, tuned for duplicated projector screens.
					</p>
				</div>
				<button
					on:click={closeSidebar}
					class={`border p-2 transition-colors ${
						highContrastMode
							? 'border-white text-slate-300 hover:bg-white/10'
							: 'border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-900'
					}`}
					aria-label="Close operator controls"
				>
					<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						></path>
					</svg>
				</button>
			</div>
		</div>

		<div class="flex-1 overflow-y-auto px-5 py-5">
			<section class={`mb-5 border p-4 ${sectionClass}`}>
				<div class="mb-3 flex items-center justify-between gap-3">
					<div>
						<h3 class="text-sm font-semibold normal-case tracking-[0.05em]">Status</h3>
						<p class={`mt-1 text-xs ${mutedTextClass}`}>
							Verify sync before the exam starts.
						</p>
					</div>
					<button
						on:click={syncNow}
						class="rounded-none bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700"
					>
						Sync now
					</button>
				</div>
				<div class="grid grid-cols-2 gap-3 text-sm">
					<div class={`rounded-none border p-3 ${inlineCardClass}`}>
						<p class={`text-[0.68rem] font-semibold uppercase tracking-[0.18em] ${mutedTextClass}`}>Health</p>
						<p class="mt-2 font-medium">{healthStatus}</p>
					</div>
					<div class={`rounded-none border p-3 ${inlineCardClass}`}>
						<p class={`text-[0.68rem] font-semibold uppercase tracking-[0.18em] ${mutedTextClass}`}>Time source</p>
						<p class="mt-2 font-medium">{timeSource || 'error'}</p>
					</div>
					<div class={`rounded-none border p-3 ${inlineCardClass}`}>
						<p class={`text-[0.68rem] font-semibold uppercase tracking-[0.18em] ${mutedTextClass}`}>Last check</p>
						<p class="mt-2 font-medium">{lastHealthCheck || 'N/A'}</p>
					</div>
					<div class={`rounded-none border p-3 ${inlineCardClass}`}>
						<p class={`text-[0.68rem] font-semibold uppercase tracking-[0.18em] ${mutedTextClass}`}>Response</p>
						<p class="mt-2 font-medium">{responseTime}ms</p>
					</div>
				</div>
				{#if ntpInfo.errorDetails}
					<p class={`mt-3 text-xs ${highContrastMode ? 'text-red-300' : 'text-red-600'}`}>
						{ntpInfo.errorDetails}
					</p>
				{/if}
			</section>

			<section class={`mb-5 border p-4 ${sectionClass}`}>
				<div class="mb-4">
					<h3 class="text-sm font-semibold normal-case tracking-[0.05em]">Display</h3>
					<p class={`mt-1 text-xs ${mutedTextClass}`}>
						Keep the screen legible first. Decoration is secondary.
					</p>
				</div>
				<div class="space-y-4">
					<div>
						<label for="custom-title" class={`mb-1 block text-xs font-medium uppercase tracking-[0.14em] ${mutedTextClass}`}>Display title</label>
						<input
							id="custom-title"
							type="text"
							bind:value={customTitle}
							on:input={saveExamSettings}
							class="carbon-field w-full px-3 py-3 text-sm"
						/>
					</div>

					<div class="grid grid-cols-2 gap-3">
						<label class={`border p-3 text-sm ${inlineCardClass}`}>
							<div class="flex items-center justify-between gap-2">
								<span>24-hour clock</span>
								<input type="checkbox" bind:checked={is24Hour} on:change={saveExamSettings} />
							</div>
						</label>
						<label class={`border p-3 text-sm ${inlineCardClass}`}>
							<div class="flex items-center justify-between gap-2">
								<span>Projector mode</span>
								<input
									type="checkbox"
									bind:checked={highContrastMode}
									on:change={saveExamSettings}
								/>
							</div>
						</label>
						<label class={`border p-3 text-sm ${inlineCardClass}`}>
							<div class="flex items-center justify-between gap-2">
								<span>Show date</span>
								<input type="checkbox" bind:checked={showDate} on:change={saveExamSettings} />
							</div>
						</label>
						<label class={`border p-3 text-sm ${inlineCardClass}`}>
							<div class="flex items-center justify-between gap-2">
								<span>Show timezone</span>
								<input type="checkbox" bind:checked={showTimezone} on:change={saveExamSettings} />
							</div>
						</label>
					</div>

					<div>
						<div class="mb-2 flex items-center justify-between gap-3">
							<label
								for="dead-zone"
								class={`text-xs font-medium uppercase tracking-[0.14em] ${mutedTextClass}`}
							>
								Bottom safe area
							</label>
							<span class="font-mono text-sm">{bottomDeadZoneVh}vh</span>
						</div>
						<input
							id="dead-zone"
							type="range"
							min="0"
							max="30"
							step="1"
							bind:value={bottomDeadZoneVh}
							on:input={saveExamSettings}
							class="h-2 w-full cursor-pointer appearance-none rounded-none bg-slate-200"
						/>
						<p class={`mt-2 text-xs ${mutedTextClass}`}>
							Lifts the important content above students or desks blocking the lower screen.
						</p>
					</div>

					<label class={`border p-3 text-sm ${inlineCardClass}`}>
						<div class="flex items-center justify-between gap-2">
							<span>Calibration guide</span>
							<input type="checkbox" bind:checked={showDeadZoneGuide} />
						</div>
						<p class={`mt-2 text-xs ${mutedTextClass}`}>
							Shows the blocked region overlay so you can align the cutoff on the projector.
						</p>
					</label>
				</div>
			</section>

			<section class={`mb-5 border p-4 ${sectionClass}`}>
				<div class="mb-4">
					<h3 class="text-sm font-semibold normal-case tracking-[0.05em]">Exam timing</h3>
					<p class={`mt-1 text-xs ${mutedTextClass}`}>
						Start and end times drive the display state.
					</p>
				</div>
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="exam-start" class={`mb-1 block text-xs font-medium uppercase tracking-[0.14em] ${mutedTextClass}`}>Start</label>
						<input
							id="exam-start"
							type="time"
							bind:value={examStartTime}
							on:change={calculateCheckpointTimes}
							class="carbon-field w-full px-3 py-3 text-sm"
						/>
					</div>
					<div>
						<label for="exam-end" class={`mb-1 block text-xs font-medium uppercase tracking-[0.14em] ${mutedTextClass}`}>End</label>
						<input
							id="exam-end"
							type="time"
							bind:value={examEndTime}
							on:change={calculateCheckpointTimes}
							class="carbon-field w-full px-3 py-3 text-sm"
						/>
					</div>
				</div>
				<button
					on:click={calculateCheckpointTimes}
					class={`mt-3 rounded-none px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] transition-colors ${
						highContrastMode
							? 'bg-white text-black hover:bg-slate-100'
							: 'bg-slate-900 text-white hover:bg-black'
					}`}
				>
					Auto-calculate milestones
				</button>

				<div class="mt-4 space-y-3">
					{#each checkpoints as checkpoint (checkpoint.id)}
						<div class={`rounded-none border p-3 ${inlineCardClass}`}>
							<div class="mb-3 flex items-center justify-between gap-3">
								<label class="flex items-center gap-2 text-sm font-medium">
									<input
										type="checkbox"
										bind:checked={checkpoint.enabled}
										on:change={saveExamSettings}
									/>
									<span>{checkpoint.name}</span>
								</label>
								<input
									type="color"
									bind:value={checkpoint.color}
									on:change={saveExamSettings}
									class="h-9 w-11 rounded-none border border-slate-300 bg-transparent"
								/>
							</div>
							<div class="grid grid-cols-[1fr_5rem] gap-3">
								<input
									type="time"
									bind:value={checkpoint.time}
									on:change={saveExamSettings}
									class="carbon-field w-full px-3 py-3 text-sm"
								/>
								<input
									type="text"
									bind:value={checkpoint.emoji}
									on:change={saveExamSettings}
									class="carbon-field w-full px-3 py-3 text-center text-sm"
									maxlength="4"
									aria-label={`Emoji for ${checkpoint.name}`}
								/>
							</div>
						</div>
					{/each}
				</div>

				<div class="mt-4">
					<div class="mb-2 flex items-center justify-between">
						<h4 class={`text-xs font-medium uppercase tracking-[0.14em] ${mutedTextClass}`}>Custom milestones</h4>
						<button
							on:click={addCustomCheckpoint}
							class={`rounded-none border px-3 py-2 text-xs font-semibold transition-colors ${
								highContrastMode
									? 'border-blue-300 text-blue-200 hover:bg-white/10'
									: 'border-blue-600 text-blue-600 hover:bg-blue-50'
							}`}
						>
							Add
						</button>
					</div>
					<div class="space-y-3">
						{#if customCheckpoints.length === 0}
							<p class={`text-xs ${mutedTextClass}`}>No custom milestones yet.</p>
						{/if}
						{#each customCheckpoints as checkpoint (checkpoint.id)}
							<div class={`rounded-none border p-3 ${inlineCardClass}`}>
								<div class="mb-3 flex items-center justify-between gap-3">
									<input
										type="text"
										bind:value={checkpoint.name}
										on:change={saveExamSettings}
										class="carbon-field w-full px-3 py-3 text-sm"
										placeholder="Milestone name"
									/>
									<button
										on:click={() => removeCustomCheckpoint(checkpoint.id)}
										class="text-xs font-semibold uppercase tracking-[0.12em] text-red-600"
									>
										Remove
									</button>
								</div>
								<div class="mb-3 flex items-center justify-between gap-3">
									<label class="flex items-center gap-2 text-sm">
										<input
											type="checkbox"
											bind:checked={checkpoint.enabled}
											on:change={saveExamSettings}
										/>
										<span>Enabled</span>
									</label>
									<input
										type="color"
										bind:value={checkpoint.color}
										on:change={saveExamSettings}
										class="h-9 w-11 rounded-none border border-slate-300 bg-transparent"
									/>
								</div>
								<div class="grid grid-cols-[1fr_5rem] gap-3">
									<input
										type="time"
										bind:value={checkpoint.time}
										on:change={saveExamSettings}
										class="carbon-field w-full px-3 py-3 text-sm"
									/>
									<input
										type="text"
										bind:value={checkpoint.emoji}
										on:change={saveExamSettings}
										class="carbon-field w-full px-3 py-3 text-center text-sm"
										maxlength="4"
										aria-label={`Emoji for ${checkpoint.name}`}
									/>
								</div>
							</div>
						{/each}
					</div>
				</div>
			</section>

			<section class={`mb-5 border p-4 ${sectionClass}`}>
				<div class="mb-4 flex items-start justify-between gap-3">
					<div>
						<h3 class="text-sm font-semibold normal-case tracking-[0.05em]">Student notice</h3>
						<p class={`mt-1 text-xs ${mutedTextClass}`}>
							Keep this short. Long copy hurts distance readability.
						</p>
					</div>
					<button
						on:click={toggleAnnouncementsEdit}
						class={`border px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] ${
							highContrastMode ? 'border-white' : 'border-slate-300'
						}`}
					>
						{isEditingAnnouncements ? 'Cancel' : 'Edit'}
					</button>
				</div>

				<div class="mb-3 grid grid-cols-2 gap-3">
					<label class={`border p-3 text-sm ${inlineCardClass}`}>
						<div class="flex items-center justify-between gap-2">
							<span>Show notice</span>
							<input type="checkbox" bind:checked={showAnnouncements} on:change={saveExamSettings} />
						</div>
					</label>
					<div>
						<label for="notice-position" class={`mb-1 block text-xs font-medium uppercase tracking-[0.14em] ${mutedTextClass}`}>Placement</label>
						<select
							id="notice-position"
							bind:value={announcementPosition}
							on:change={saveExamSettings}
							class="carbon-field w-full px-3 py-3 text-sm"
						>
							<option value="top">Top</option>
							<option value="left">Left rail</option>
						</select>
					</div>
				</div>

				<div class="mb-3">
					<div class="mb-2 flex items-center justify-between gap-3">
							<label
								for="notice-font"
								class={`text-xs font-medium uppercase tracking-[0.14em] ${mutedTextClass}`}
							>
								Notice size
							</label>
						<span class="font-mono text-sm">{announcementFontSize}px</span>
					</div>
					<input
						id="notice-font"
						type="range"
						min="14"
						max="32"
						step="1"
						bind:value={announcementFontSize}
						on:input={saveExamSettings}
						class="h-2 w-full cursor-pointer appearance-none rounded-none bg-slate-200"
					/>
				</div>

				{#if isEditingAnnouncements}
					<textarea
						bind:value={announcements}
						rows="6"
						class="carbon-field w-full px-3 py-3 text-sm"
						placeholder="Use a short note, for example: Pens down at 10:00."
					></textarea>
					<button
						on:click={saveAnnouncements}
						class="mt-3 rounded-none bg-blue-600 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-white transition-colors hover:bg-blue-700"
					>
						Save notice
					</button>
				{:else}
					<div class={`rounded-none border p-3 text-sm ${inlineCardClass} ${
						highContrastMode ? 'text-slate-200' : 'text-slate-700'
					}`}>
						{#if announcements.trim()}
							{announcements}
						{:else}
							No notice configured.
						{/if}
					</div>
				{/if}
			</section>

			<section class={`mb-5 border p-4 ${sectionClass}`}>
				<div class="mb-3">
					<h3 class="text-sm font-semibold normal-case tracking-[0.05em]">Live phase</h3>
				</div>
				<div class="space-y-3 text-sm">
					<div class={`rounded-none border p-3 ${inlineCardClass}`}>
						<p class={`text-[0.68rem] font-semibold uppercase tracking-[0.18em] ${mutedTextClass}`}>Active</p>
						<p class="mt-2 font-medium">{activeCheckpoint ? `${activeCheckpoint.name} (${activeCheckpoint.time})` : 'No active milestone'}</p>
					</div>
					<div class={`rounded-none border p-3 ${inlineCardClass}`}>
						<p class={`text-[0.68rem] font-semibold uppercase tracking-[0.18em] ${mutedTextClass}`}>Next</p>
						<p class="mt-2 font-medium">{nextCheckpoint ? `${nextCheckpoint.name} (${nextCheckpoint.time})` : 'No upcoming milestone'}</p>
					</div>
				</div>
			</section>

			<section class={`border p-4 ${highContrastMode ? 'border-red-300' : 'border-red-300'}`}>
				<h3 class={`text-sm font-semibold normal-case tracking-[0.05em] ${highContrastMode ? 'text-red-300' : 'text-red-700'}`}>
					Reset
				</h3>
				<p class={`mt-2 text-xs ${highContrastMode ? 'text-red-200' : 'text-red-700'}`}>
					Clears title, timings, notices, custom milestones, display preferences, and the safe area.
				</p>
				<button
					on:click={clearAllSettings}
					class="mt-3 rounded-none bg-red-600 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-white transition-colors hover:bg-red-700"
				>
					Clear all settings
				</button>
			</section>
		</div>
	</div>
</div>
