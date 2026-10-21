<script lang="ts">
	import {
		ASPECT_OPTIONS,
		ENtpProvider,
		NTP_PROVIDER_OPTIONS,
		examWindow,
		extendExam,
		fillText,
		formatHM,
		hasSchedule,
		isBuiltinMilestone,
		resolvePhase,
		respaceMilestones,
		toSeconds,
		visibilityNotice
	} from '$lib/projector-model';
	import type { IMilestone, IPhase, IProjectorConfig, IRehearsal } from '$lib/projector-model';
	import type { INtpInfo, TTimeSource } from '$lib/types';

	export let cfg: IProjectorConfig;
	export let rehearsal: IRehearsal;
	export let now: number;
	export let consoleOnly = false;
	export let timeSource: TTimeSource;
	export let ntpInfo: INtpInfo;
	export let healthStatus: string;
	export let timezone: string;
	export let onConfig: (cfg: IProjectorConfig) => void;
	export let onRehearsal: (r: IRehearsal) => void;
	export let onClose: () => void;
	export let onPopOut: () => void;
	export let onSync: () => void;
	export let onReset: () => void;
	export let calibration = false;
	export let onCalibration: (value: boolean) => void = () => {};
	export let noticeOverflow = false;

	type TConsoleTab = 'exam' | 'milestones' | 'notice' | 'screen';

	interface IConsoleTabOption {
		id: TConsoleTab;
		label: string;
	}

	interface ISwatchOption {
		name: string;
		color: string;
	}

	interface INoticePreset {
		label: string;
		text: string;
	}

	const CONSOLE_TABS: readonly IConsoleTabOption[] = [
		{ id: 'exam', label: 'Exam' },
		{ id: 'milestones', label: 'Milestones' },
		{ id: 'notice', label: 'Notice' },
		{ id: 'screen', label: 'Screen' }
	];
	const COLOR_SWATCHES: readonly ISwatchOption[] = [
		{ name: 'Ink', color: '#15171b' },
		{ name: 'Blue', color: '#1f5fbf' },
		{ name: 'Green', color: '#1d7a4a' },
		{ name: 'Amber', color: '#b5640d' },
		{ name: 'Red', color: '#c4262e' },
		{ name: 'Purple', color: '#6b3fb0' }
	];
	const NOTICE_PRESETS: readonly INoticePreset[] = [
		{ label: 'Phones', text: 'Phones off and in your bag. Raise your hand to leave the room.' },
		{ label: 'ID card', text: 'Put your student ID card on the desk.' },
		{
			label: 'Exam rules',
			text: "- Phones off and in your bag.\n- Closed book. One A4 cheat sheet allowed, handwritten.\n- Write your NPM on every page.\n- Raise your hand to go to the toilet. One person at a time.\n- You can't leave in the last 15 minutes."
		},
		{ label: 'Clear', text: '' }
	];
	let activeTab: TConsoleTab = 'exam';
	let openPhaseId = 'before';
	let tabButtons: HTMLButtonElement[] = [];

	$: shownNow = now;
	$: resolved = resolvePhase(cfg, shownNow);
	$: exam = examWindow(cfg, shownNow);
	$: scheduled = hasSchedule(cfg);
	$: sortedMilestones = [...cfg.milestones].sort((a, b) => {
		const timeA =
			toSeconds(a.time) + (exam.end > 86400 && toSeconds(a.time) < exam.start ? 86400 : 0);
		const timeB =
			toSeconds(b.time) + (exam.end > 86400 && toSeconds(b.time) < exam.start ? 86400 : 0);
		return timeA - timeB;
	});
	$: noticeLength = cfg.notice.length;
	$: highNoticeWarning =
		cfg.highVisibility && cfg.showNotice && (noticeOverflow || visibilityNotice(cfg).shortened);
	$: statusLabel =
		timeSource === 'error'
			? 'Local machine clock'
			: timeSource === 'ntp_partial'
				? 'Partial NTP'
				: 'NTP';
	$: selectedNtpOption =
		NTP_PROVIDER_OPTIONS.find((option) => option.id === cfg.ntpServer) ?? NTP_PROVIDER_OPTIONS[0];

	function patchConfig(patch: Partial<IProjectorConfig>) {
		onConfig({ ...cfg, ...patch });
	}

	function patchSchedule(patch: Pick<Partial<IProjectorConfig>, 'start' | 'end'>) {
		onConfig(respaceMilestones({ ...cfg, ...patch }));
	}

	function patchPhase(id: string, patch: Partial<IPhase>) {
		if (id === 'before') {
			onConfig({ ...cfg, before: { ...cfg.before, ...patch } });
			return;
		}
		onConfig({
			...cfg,
			milestones: cfg.milestones.map((milestone) =>
				milestone.id === id ? { ...milestone, ...patch } : milestone
			)
		});
	}

	function patchMilestone(id: string, patch: Partial<IMilestone>) {
		onConfig({
			...cfg,
			milestones: cfg.milestones.map((milestone) =>
				milestone.id === id ? { ...milestone, ...patch } : milestone
			)
		});
	}

	function chooseTab(index: number) {
		const next = (index + CONSOLE_TABS.length) % CONSOLE_TABS.length;
		activeTab = CONSOLE_TABS[next].id;
		tabButtons[next]?.focus();
	}

	function handleTabKeydown(event: KeyboardEvent, index: number) {
		if (event.key === 'ArrowRight') {
			event.preventDefault();
			chooseTab(index + 1);
		} else if (event.key === 'ArrowLeft') {
			event.preventDefault();
			chooseTab(index - 1);
		} else if (event.key === 'Home') {
			event.preventDefault();
			chooseTab(0);
		} else if (event.key === 'End') {
			event.preventDefault();
			chooseTab(CONSOLE_TABS.length - 1);
		}
	}

	function setRehearsal(enabled: boolean) {
		const base = shownNow;
		onRehearsal({
			enabled,
			base: enabled ? base : rehearsal.base,
			at: Date.now(),
			fail: enabled ? rehearsal.fail : false
		});
	}

	function scrub(event: Event) {
		const value = Number((event.currentTarget as HTMLInputElement).value);
		onRehearsal({ enabled: true, base: value, at: Date.now(), fail: rehearsal.fail });
	}

	function addMilestone() {
		const id = `milestone-${globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36)}`;
		const time = scheduled
			? Math.min(resolved.end - 60, Math.max(resolved.now + 300, resolved.start))
			: resolved.now + 300;
		const milestone: IMilestone = {
			id,
			time: formatHM(time),
			title: 'New milestone',
			prompt: '',
			color: '#6b3fb0',
			enabled: true
		};
		onConfig({ ...cfg, milestones: [...cfg.milestones, milestone] });
		openPhaseId = id;
	}

	function deleteMilestone(id: string) {
		onConfig({ ...cfg, milestones: cfg.milestones.filter((milestone) => milestone.id !== id) });
		if (openPhaseId === id) openPhaseId = 'before';
	}

	function extend(minutes: number) {
		onConfig(extendExam(cfg, shownNow, minutes));
	}

	function confirmReset() {
		if (confirm('Reset title, times, milestones, notice and screen settings?')) onReset();
	}
</script>

<aside
	class:console-only={consoleOnly}
	class="operator-console"
	data-testid="operator-console"
	aria-label="Operator console"
>
	{#if !consoleOnly}
		<div class="mirror-warning">
			<span>If this screen is mirrored, students can see this panel.</span>
			<button class="dark-button compact" type="button" on:click={onPopOut}>Pop out</button>
		</div>
	{/if}

	<header class="console-header">
		<h1>Operator console</h1>
		{#if !consoleOnly}
			<button
				class="quiet-button"
				type="button"
				aria-label="Close operator console"
				on:click={onClose}
			>
				Close · Esc
			</button>
		{/if}
	</header>

	<div class="tabs" role="tablist" aria-label="Console sections">
		{#each CONSOLE_TABS as tab, index (tab.id)}
			<button
				bind:this={tabButtons[index]}
				id={`console-tab-${tab.id}`}
				class:active={activeTab === tab.id}
				class="tab"
				role="tab"
				aria-selected={activeTab === tab.id}
				aria-controls={`console-panel-${tab.id}`}
				tabindex={activeTab === tab.id ? 0 : -1}
				on:click={() => (activeTab = tab.id)}
				on:keydown={(event) => handleTabKeydown(event, index)}
			>
				{tab.label}
			</button>
		{/each}
	</div>

	<div
		id={`console-panel-${activeTab}`}
		class="console-body"
		role="tabpanel"
		aria-labelledby={`console-tab-${activeTab}`}
		tabindex="0"
	>
		{#if activeTab === 'exam'}
			<section class="field-stack">
				<label class="field">
					<span class="eyebrow">Title</span>
					<input
						value={cfg.title}
						on:input={(event) => patchConfig({ title: event.currentTarget.value })}
					/>
				</label>
				<div class="two-columns">
					<label class="field">
						<span class="eyebrow">Start</span>
						<input
							type="time"
							value={cfg.start ?? ''}
							on:change={(event) => patchSchedule({ start: event.currentTarget.value || null })}
						/>
					</label>
					<label class="field">
						<span class="eyebrow">End</span>
						<input
							type="time"
							value={cfg.end ?? ''}
							on:change={(event) => patchSchedule({ end: event.currentTarget.value || null })}
						/>
					</label>
				</div>
				<div class="two-columns">
					<button
						class="outline-button"
						type="button"
						disabled={!scheduled}
						on:click={() => extend(5)}>+5 min</button
					>
					<button
						class="outline-button"
						type="button"
						disabled={!scheduled}
						on:click={() => extend(10)}>+10 min</button
					>
				</div>
				<p class="hint compact-hint">
					Leave start or end empty to show only the clock. Built-in milestones follow the exam times
					automatically; extending also moves custom milestones after now.
				</p>
			</section>

			<section class="section-block">
				<h2 class="eyebrow">Clock source</h2>
				<div class="segmented" aria-label="Clock source">
					<button
						type="button"
						class:chosen={!rehearsal.enabled}
						aria-pressed={!rehearsal.enabled}
						on:click={() => setRehearsal(false)}>Live (NTP)</button
					>
					<button
						type="button"
						class:chosen={rehearsal.enabled}
						aria-pressed={rehearsal.enabled}
						on:click={() => setRehearsal(true)}>Rehearse</button
					>
				</div>
				{#if rehearsal.enabled}
					<div class="scrub-heading">
						<span>Scrub to preview any moment</span><strong
							>{formatHM(shownNow)}:{String(Math.floor(shownNow % 60)).padStart(2, '0')}</strong
						>
					</div>
					<input
						data-testid="rehearsal-slider"
						class="range"
						type="range"
						min={scheduled ? resolved.start - 1800 : 0}
						max={scheduled ? resolved.end + 600 : 86399}
						step="30"
						value={shownNow}
						aria-label="Rehearsal time"
						on:input={scrub}
					/>
					<label class="toggle-row"
						><span>Simulate NTP failure</span><input
							type="checkbox"
							checked={rehearsal.fail}
							on:change={(event) =>
								onRehearsal({ ...rehearsal, fail: event.currentTarget.checked })}
						/></label
					>
				{/if}
				<label class="field">
					<span class="eyebrow">NTP server</span>
					<select
						data-testid="ntp-server-select"
						value={cfg.ntpServer}
						on:change={(event) =>
							patchConfig({ ntpServer: event.currentTarget.value as ENtpProvider })}
					>
						{#each NTP_PROVIDER_OPTIONS as option (option.id)}
							<option value={option.id}>{option.label}</option>
						{/each}
					</select>
				</label>
				<p
					class="ntp-note"
					class:warning={selectedNtpOption.isWarning}
					data-testid="ntp-disclaimer"
				>
					{selectedNtpOption.description}
				</p>
				<div class="metrics-line">
					<strong>{ntpInfo.server || cfg.ntpServer || 'NTP server unavailable'}</strong>
					<span
						>{ntpInfo.hasValidMetrics && ntpInfo.offset != null
							? `offset ${ntpInfo.offset} ms`
							: 'offset unavailable'}</span
					>
					<span
						>{ntpInfo.hasValidMetrics && ntpInfo.delay != null
							? `delay ${ntpInfo.delay} ms`
							: 'delay unavailable'}</span
					>
				</div>
				{#if ntpInfo.errorDetails || ntpInfo.error}
					<p class="error-copy">{ntpInfo.errorDetails || ntpInfo.error}</p>
				{/if}
				<div class="status-grid">
					<div class="status-cell">
						<span class="eyebrow">Health</span><strong>{healthStatus}</strong>
					</div>
					<div class="status-cell">
						<span class="eyebrow">Time source</span><strong>{statusLabel}</strong>
					</div>
					<div class="status-cell">
						<span class="eyebrow">Timezone</span><strong>{timezone || 'Unavailable'}</strong>
					</div>
					<div class="status-cell">
						<span class="eyebrow">NTP response</span><strong
							>{ntpInfo.hasValidMetrics && ntpInfo.delay != null
								? `${ntpInfo.delay} ms`
								: 'Unavailable'}</strong
						>
					</div>
				</div>
				<button class="outline-button sync-button" type="button" on:click={onSync}>Sync now</button>
			</section>
		{:else if activeTab === 'milestones'}
			<p class="hint">
				Use <code>{'{end}'}</code>, <code>{'{start}'}</code>, and <code>{'{left}'}</code> in titles and
				prompts. They fill in with the exam times and minutes remaining.
			</p>
			<div class="phase-list">
				{#each [{ id: 'before', time: '', title: cfg.before.title, prompt: cfg.before.prompt, color: cfg.before.color, enabled: true }, ...sortedMilestones] as item (item.id)}
					{@const before = item.id === 'before'}
					{@const locked = isBuiltinMilestone(item.id)}
					{@const shownTime = locked && !scheduled ? '' : item.time}
					{@const isOpen = openPhaseId === item.id}
					{@const currentPhase = before ? resolved.beforeStart : resolved.activeId === item.id}
					{@const itemTime = before
						? 0
						: toSeconds(item.time) +
							(resolved.end > 86400 && toSeconds(item.time) < resolved.start ? 86400 : 0)}
					{@const passed = !before && item.enabled && itemTime <= resolved.now && !currentPhase}
					{@const onScreen = currentPhase && !(rehearsal.enabled && rehearsal.fail)}
					<div class:current={currentPhase} class="phase-card">
						<button
							class="phase-summary"
							type="button"
							aria-expanded={isOpen}
							on:click={() => (openPhaseId = isOpen ? '' : item.id)}
						>
							<span class="color-chip" style={`background:${item.color}`}></span>
							<span class="phase-time">{before ? 'before' : shownTime || '--:--'}</span>
							<span class:dim={!before && !item.enabled} class="phase-name">{item.title}</span>
							<span class="phase-status"
								>{onScreen
									? 'ON SCREEN'
									: !before && !item.enabled
										? 'HIDDEN'
										: passed
											? 'PASSED'
											: ''}</span
							>
							<span aria-hidden="true">{isOpen ? '▴' : '▾'}</span>
						</button>
						{#if isOpen}
							<div class="phase-editor">
								{#if !before}
									<div class="two-columns align-bottom">
										<label class="field"
											><span class="eyebrow">{locked ? 'Time · automatic' : 'Time'}</span><input
												type="time"
												value={shownTime}
												readonly={locked}
												aria-label={`Time for ${item.title}`}
												on:change={(event) =>
													event.currentTarget.value &&
													patchMilestone(item.id, { time: event.currentTarget.value })}
											/></label
										>
										<label class="toggle-inline"
											><input
												type="checkbox"
												checked={item.enabled}
												on:change={(event) =>
													patchMilestone(item.id, { enabled: event.currentTarget.checked })}
											/> Show</label
										>
									</div>
								{/if}
								<label class="field"
									><span class="eyebrow">Title</span><input
										value={item.title}
										on:input={(event) => patchPhase(item.id, { title: event.currentTarget.value })}
									/></label
								>
								<label class="field"
									><span class="eyebrow">Prompt</span><input
										value={item.prompt}
										placeholder="e.g. Pens down at &#123;end&#125;"
										on:input={(event) => patchPhase(item.id, { prompt: event.currentTarget.value })}
									/></label
								>
								<div class="field">
									<span class="eyebrow">Screen colour</span>
									<div class="swatches">
										{#each COLOR_SWATCHES as swatch (swatch.name)}
											<button
												class:selected={item.color.toLowerCase() === swatch.color}
												class="swatch"
												type="button"
												aria-label={swatch.name}
												title={swatch.name}
												style={`background:${swatch.color}`}
												on:click={() => patchPhase(item.id, { color: swatch.color })}
											></button>
										{/each}
										<label class="custom-color"
											><input
												type="color"
												aria-label="Custom screen colour"
												value={item.color}
												on:input={(event) =>
													patchPhase(item.id, { color: event.currentTarget.value })}
											/> Custom</label
										>
									</div>
								</div>
								<div class="preview-row">
									<span
										>Shows as: <strong
											>{[fillText(item.title, cfg, shownNow), fillText(item.prompt, cfg, shownNow)]
												.filter(Boolean)
												.join(' — ')}</strong
										></span
									>{#if !before}<button
											class="delete-button"
											type="button"
											on:click={() => deleteMilestone(item.id)}>Delete</button
										>{/if}
								</div>
							</div>
						{/if}
					</div>
				{/each}
			</div>
			<button class="dark-button full-button" type="button" on:click={addMilestone}
				>+ Add milestone</button
			>
		{:else if activeTab === 'notice'}
			{#if highNoticeWarning}
				<p class="mode-warning" role="status">
					Notice is too long for High visibility mode. Shorten the text or reduce the blocked area;
					the projector shows a shortened preview.
				</p>
			{/if}
			<label class="toggle-row bordered"
				><span>Show notice on screen</span><input
					type="checkbox"
					checked={cfg.showNotice}
					on:change={(event) => patchConfig({ showNotice: event.currentTarget.checked })}
				/></label
			>
			<label class="field"
				><span class="eyebrow">Notice text</span><textarea
					rows="9"
					placeholder="Phones off and in your bag."
					value={cfg.notice}
					on:input={(event) => patchConfig({ notice: event.currentTarget.value })}
				></textarea></label
			>
			<div class="notice-meta">
				<span>Start a line with <code>- </code> to make it a bullet</span><span
					>{noticeLength} chars</span
				>
			</div>
			<div class="field-stack">
				<span class="eyebrow">Quick fill</span>
				<div class="preset-list">
					{#each NOTICE_PRESETS as preset (preset.label)}<button
							class="outline-button preset"
							type="button"
							on:click={() => patchConfig({ notice: preset.text })}>{preset.label}</button
						>{/each}
				</div>
			</div>
			{#if cfg.highVisibility}
				<p class="hint">
					High visibility mode preserves line breaks and shares the text limit across all lines.
				</p>
			{:else}
				<p class="hint">
					Text size adjusts on its own: short notes show big, and longer rule lists get smaller so
					they fit the panel.
				</p>
			{/if}
		{:else}
			{#if highNoticeWarning}
				<p class="mode-warning" role="status">
					Notice is too long for High visibility mode. Shorten the text or reduce the blocked area;
					the projector shows a shortened preview.
				</p>
			{/if}
			<label class="toggle-row bordered">
				<span>High visibility mode</span>
				<input
					type="checkbox"
					checked={cfg.highVisibility}
					on:change={(event) => patchConfig({ highVisibility: event.currentTarget.checked })}
				/>
			</label>
			{#if cfg.highVisibility}
				<label class="toggle-row bordered">
					<span>White text on black</span>
					<input
						type="checkbox"
						checked={cfg.inverted}
						on:change={(event) => patchConfig({ inverted: event.currentTarget.checked })}
					/>
				</label>
				<p class="hint">Black and white, bold display with reduced detail.</p>
			{/if}
			<button
				class="outline-button calibration-button"
				type="button"
				on:click={() => onCalibration(!calibration)}
			>
				{calibration ? 'Return to exam display' : 'Show calibration screen'}
			</button>
			<div class="field-stack">
				<span class="eyebrow">Projector shape</span>
				<div class="segmented aspects" aria-label="Projector shape">
					{#each ASPECT_OPTIONS as option (option.id)}<button
							type="button"
							class:chosen={cfg.aspect === option.id}
							aria-pressed={cfg.aspect === option.id}
							on:click={() => patchConfig({ aspect: option.id })}>{option.label}</button
						>{/each}
				</div>
				<span class="hint">Auto adapts dynamically to the screen or window without black bars.</span
				>
			</div>
			<label class="field"
				><span class="range-heading"
					><span class="eyebrow">Blocked area</span><strong>{cfg.safe}%</strong></span
				><input
					data-testid="safe-area-slider"
					class="range"
					type="range"
					min="0"
					max="30"
					step="1"
					value={cfg.safe}
					aria-label="Blocked area percentage"
					on:input={(event) => patchConfig({ safe: Number(event.currentTarget.value) })}
				/><span class="hint"
					>Raises the clock and deadline above the heads in the room. The timeline can sit in the
					blocked area.</span
				></label
			>
			<label class="toggle-row bordered"
				><span>Show blocked-area guide</span><input
					type="checkbox"
					checked={cfg.guide}
					on:change={(event) => patchConfig({ guide: event.currentTarget.checked })}
				/></label
			>
			<section class="section-block">
				<h2 class="eyebrow">Shortcuts</h2>
				<div class="shortcut-grid">
					<code>C</code><span>Open / close controls</span><code>F</code><span>Full screen</span
					><code>Esc</code><span>Close controls</span>
				</div>
			</section>
			<button class="delete-button reset-button" type="button" on:click={confirmReset}
				>Reset everything…</button
			>
		{/if}
	</div>

	<footer class="console-footer">
		<span>Saved on this device</span><span>Pop-out stays in sync</span>
	</footer>
</aside>

<style>
	.operator-console {
		position: fixed;
		z-index: 40;
		inset: 0 0 0 auto;
		display: flex;
		flex-direction: column;
		width: min(460px, 100vw);
		min-height: 0;
		overflow: hidden;
		border: 1px solid #d3d1ca;
		background: #fff;
		color: #15171b;
		box-shadow: 0 20px 60px #0004;
		font-family: 'IBM Plex Sans', sans-serif;
	}
	.operator-console.console-only {
		right: 50%;
		width: min(560px, 100vw);
		transform: translateX(50%);
	}
	.mirror-warning {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 10px 14px;
		background: #e8c547;
		font-size: 13px;
		font-weight: 600;
		line-height: 1.35;
	}
	.console-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 15px 18px 0;
	}
	.console-header h1 {
		margin: 0;
		font-family: 'Plus Jakarta Sans', sans-serif;
		font-size: 20px;
		font-weight: 700;
		letter-spacing: -0.01em;
	}
	.tabs {
		display: flex;
		flex: none;
		margin-top: 10px;
		padding: 0 8px;
		border-bottom: 1px solid #d3d1ca;
	}
	.tab {
		flex: 1;
		padding: 12px 2px 10px;
		border: 0;
		border-bottom: 3px solid transparent;
		background: transparent;
		color: #666;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
	}
	.tab.active {
		border-bottom-color: #15171b;
		color: #15171b;
		font-weight: 600;
	}
	button:focus-visible,
	input:focus-visible,
	select:focus-visible,
	textarea:focus-visible,
	.console-body:focus-visible {
		outline: 3px solid #1f5fbf;
		outline-offset: 2px;
	}
	.console-body {
		display: flex;
		flex: 1;
		min-height: 0;
		flex-direction: column;
		gap: 18px;
		overflow-y: auto;
		padding: 18px 18px 24px;
	}
	.console-footer {
		display: flex;
		flex: none;
		justify-content: space-between;
		gap: 12px;
		padding: 11px 18px;
		border-top: 1px solid #d3d1ca;
		color: #555;
		font-size: 12px;
		white-space: nowrap;
	}
	.field-stack {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.field {
		display: flex;
		min-width: 0;
		flex-direction: column;
		gap: 6px;
	}
	.eyebrow {
		color: #555;
		font-family: 'IBM Plex Mono', monospace;
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}
	.field input:not([type='checkbox']):not([type='color']):not([type='range']),
	.field select,
	textarea {
		width: 100%;
		min-width: 0;
		padding: 10px 11px;
		border: 1.5px solid #bdbab2;
		border-radius: 0;
		background: #fff;
		color: #15171b;
		font:
			500 15px 'IBM Plex Sans',
			sans-serif;
	}
	.field input[type='time'] {
		font:
			500 19px 'IBM Plex Mono',
			monospace;
	}
	.field input[readonly] {
		border-style: dashed;
		background: #f3f2ee;
		color: #5c5a54;
	}
	textarea {
		resize: vertical;
		line-height: 1.45;
	}
	.two-columns {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 10px;
	}
	.outline-button,
	.quiet-button,
	.dark-button {
		border: 1.5px solid #15171b;
		border-radius: 0;
		background: #fff;
		color: #15171b;
		font:
			600 13px 'IBM Plex Sans',
			sans-serif;
		cursor: pointer;
	}
	.outline-button {
		min-height: 40px;
		padding: 9px 7px;
	}
	.outline-button:disabled {
		border-color: #d3d1ca;
		color: #8a877f;
		cursor: not-allowed;
	}
	.quiet-button {
		padding: 7px 10px;
		border-color: #d3d1ca;
		font-weight: 500;
	}
	.dark-button {
		padding: 9px 12px;
		background: #15171b;
		color: #fff;
	}
	.dark-button.compact {
		flex: none;
		white-space: nowrap;
	}
	.full-button {
		width: 100%;
		padding: 12px;
	}
	.hint {
		margin: 0;
		color: #555;
		font-size: 12px;
		line-height: 1.45;
	}
	.compact-hint {
		margin-top: -7px;
	}
	.section-block {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding-top: 16px;
		border-top: 1px solid #e6e4de;
	}
	.section-block h2 {
		margin: 0;
	}
	.segmented {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		border: 1.5px solid #15171b;
	}
	.segmented button {
		min-height: 40px;
		padding: 8px;
		border: 0;
		background: #fff;
		color: #15171b;
		font:
			600 14px 'IBM Plex Sans',
			sans-serif;
		cursor: pointer;
	}
	.segmented button.chosen {
		background: #15171b;
		color: #fff;
	}
	.scrub-heading,
	.range-heading {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 10px;
		color: #555;
		font-size: 13px;
	}
	.scrub-heading strong,
	.range-heading strong {
		color: #15171b;
		font:
			600 15px 'IBM Plex Mono',
			monospace;
	}
	.range {
		width: 100%;
		margin: 4px 0;
		accent-color: #15171b;
	}
	.toggle-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		padding: 11px 12px;
		font-size: 14px;
		cursor: pointer;
	}
	.toggle-row input,
	.toggle-inline input {
		width: 18px;
		height: 18px;
		accent-color: #15171b;
	}
	.toggle-row.bordered {
		border: 1px solid #d3d1ca;
	}
	.metrics-line {
		display: flex;
		flex-wrap: wrap;
		gap: 5px 10px;
		color: #555;
		font-size: 12px;
	}
	.metrics-line strong {
		color: #15171b;
	}
	.error-copy {
		margin: -3px 0 0;
		color: #c4262e;
		font-size: 12px;
	}
	.mode-warning {
		margin: 0;
		padding: 12px;
		border-left: 4px solid #b5640d;
		background: #fff2c2;
		color: #3a2200;
		font-size: 13px;
		font-weight: 600;
		line-height: 1.4;
	}
	.ntp-note {
		margin: 0;
		padding: 10px 12px;
		border-left: 3px solid #1f5fbf;
		background: #f0f4fa;
		color: #1d2b3a;
		font-size: 12px;
		line-height: 1.45;
	}
	.ntp-note.warning {
		border-left-color: #b5640d;
		background: #fff6d6;
		color: #3a2200;
	}
	.status-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 8px;
	}
	.status-cell {
		display: flex;
		min-width: 0;
		flex-direction: column;
		gap: 6px;
		padding: 9px;
		border: 1px solid #d3d1ca;
	}
	.status-cell strong {
		overflow-wrap: anywhere;
		font-size: 13px;
		font-weight: 600;
	}
	.sync-button {
		align-self: flex-start;
	}
	.phase-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.phase-card {
		border: 1.5px solid #d3d1ca;
		background: #fff;
	}
	.phase-card.current {
		border-color: #15171b;
	}
	.phase-summary {
		display: grid;
		width: 100%;
		grid-template-columns: 18px 54px minmax(0, 1fr) auto 14px;
		align-items: center;
		gap: 8px;
		padding: 11px 10px;
		border: 0;
		background: transparent;
		text-align: left;
		cursor: pointer;
	}
	.color-chip {
		width: 18px;
		height: 18px;
	}
	.phase-time {
		color: #555;
		font:
			500 13px 'IBM Plex Mono',
			monospace;
	}
	.phase-name {
		overflow: hidden;
		font-size: 13px;
		font-weight: 600;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.phase-name.dim {
		color: #888;
	}
	.phase-status {
		color: #1d7a4a;
		font:
			600 9px 'IBM Plex Mono',
			monospace;
		white-space: nowrap;
	}
	.phase-editor {
		display: flex;
		flex-direction: column;
		gap: 11px;
		padding: 12px 10px;
		border-top: 1px solid #e6e4de;
		background: #faf9f7;
	}
	.align-bottom {
		align-items: end;
	}
	.toggle-inline {
		display: flex;
		align-items: center;
		gap: 7px;
		padding: 10px 0;
		font-size: 14px;
	}
	.swatches {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 10px;
		padding: 4px;
	}
	.swatch {
		width: 30px;
		height: 30px;
		padding: 0;
		border: 0;
		cursor: pointer;
	}
	.swatch.selected {
		outline: 3px solid #15171b;
		outline-offset: 2px;
	}
	.custom-color {
		display: flex;
		align-items: center;
		gap: 6px;
		margin-left: 2px;
		color: #555;
		font-size: 12px;
		cursor: pointer;
	}
	.custom-color input {
		width: 30px;
		height: 30px;
		padding: 0;
		border: 1.5px solid #bdbab2;
		background: #fff;
	}
	.preview-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		color: #555;
		font-size: 11px;
	}
	.preview-row span {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.preview-row strong {
		color: #15171b;
	}
	.delete-button {
		flex: none;
		padding: 5px 0;
		border: 0;
		background: transparent;
		color: #c4262e;
		font:
			600 13px 'IBM Plex Sans',
			sans-serif;
		cursor: pointer;
	}
	.notice-meta {
		display: flex;
		justify-content: space-between;
		gap: 8px;
		color: #555;
		font-size: 11px;
	}
	code {
		padding: 1px 4px;
		background: #f0efeb;
		font:
			500 12px 'IBM Plex Mono',
			monospace;
	}
	.preset-list {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	.outline-button.preset {
		min-height: 0;
		padding: 7px 10px;
		font-weight: 500;
	}
	.segmented.aspects {
		grid-template-columns: repeat(4, minmax(0, 1fr));
	}
	.segmented.aspects button {
		font-family: 'IBM Plex Mono', monospace;
	}
	.shortcut-grid {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 6px 14px;
		color: #333;
		font-size: 13px;
	}
	.shortcut-grid code {
		justify-self: start;
	}
	.reset-button {
		align-self: flex-start;
	}
	.calibration-button {
		align-self: flex-start;
	}
	@media (max-width: 360px) {
		.console-header {
			padding-right: 12px;
			padding-left: 12px;
		}
		.console-body {
			padding-right: 12px;
			padding-left: 12px;
		}
		.phase-summary {
			grid-template-columns: 16px 44px minmax(0, 1fr) 12px;
		}
		.phase-status {
			display: none;
		}
		.console-footer {
			padding-right: 10px;
			padding-left: 10px;
			font-size: 10px;
		}
	}
</style>
