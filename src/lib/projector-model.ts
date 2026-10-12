export interface Phase {
	title: string;
	prompt: string;
	color: string;
}

export interface Milestone extends Phase {
	id: string;
	time: string;
	enabled: boolean;
}

export interface ProjectorConfig {
	title: string;
	start: string;
	end: string;
	notice: string;
	showNotice: boolean;
	safe: number;
	guide: boolean;
	aspect: '16:9' | '16:10' | '4:3';
	highVisibility: boolean;
	inverted: boolean;
	before: Phase;
	milestones: Milestone[];
}

export interface Rehearsal {
	enabled: boolean;
	base: number;
	at: number;
	fail: boolean;
}

export interface ProjectorState {
	cfg: ProjectorConfig;
	rehearsal: Rehearsal;
}

export const STORAGE_KEY = 'examDisplay.v2';

const LEGACY_SETTINGS_KEY = 'examSettings';
const LEGACY_NOTICE_KEY = 'examAnnouncements';
const ASPECTS = ['16:9', '16:10', '4:3'] as const;
const HEX_COLOR = /^#[\da-f]{6}$/i;
const BUILTIN_DEFAULTS: Milestone[] = [
	{
		id: 'm1',
		time: '09:00',
		title: 'In progress',
		prompt: 'Ends at {end}',
		color: '#1f5fbf',
		enabled: true
	},
	{
		id: 'm2',
		time: '10:00',
		title: 'Halfway',
		prompt: '{left} minutes left',
		color: '#1f5fbf',
		enabled: true
	},
	{
		id: 'm3',
		time: '10:30',
		title: 'Final 30 minutes',
		prompt: 'Check your name and NPM on every page',
		color: '#b5640d',
		enabled: true
	},
	{
		id: 'm4',
		time: '10:45',
		title: 'Final 15 minutes',
		prompt: 'No more leaving the room',
		color: '#b5640d',
		enabled: true
	},
	{
		id: 'm5',
		time: '10:55',
		title: 'Final 5 minutes',
		prompt: 'Pens down at {end}',
		color: '#c4262e',
		enabled: true
	},
	{
		id: 'm6',
		time: '11:00',
		title: "Time's up",
		prompt: 'Pens down. Stay seated until papers are collected.',
		color: '#15171b',
		enabled: true
	}
];

export function defaultConfig(): ProjectorConfig {
	return {
		title: 'Computer Networks · Final Exam',
		start: '09:00',
		end: '11:00',
		notice: 'Phones off and in your bag. Raise your hand to leave the room.',
		showNotice: true,
		safe: 12,
		guide: false,
		aspect: '16:9',
		highVisibility: false,
		inverted: false,
		before: { title: 'Not started', prompt: 'Starts at {start}', color: '#15171b' },
		milestones: BUILTIN_DEFAULTS.map((milestone) => ({ ...milestone }))
	};
}

const defaultRehearsal = (): Rehearsal => ({ enabled: false, base: 0, at: 0, fail: false });

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validTime(value: unknown, fallback: string): string {
	if (typeof value !== 'string' || !/^\d{1,2}:\d{2}$/.test(value)) return fallback;
	const [hour, minute] = value.split(':').map(Number);
	return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59
		? `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
		: fallback;
}

function validColor(value: unknown, fallback: string): string {
	return typeof value === 'string' && HEX_COLOR.test(value) ? value : fallback;
}

function normalizePhase(value: unknown, fallback: Phase): Phase {
	if (!isRecord(value)) return { ...fallback };
	return {
		title: typeof value.title === 'string' ? value.title : fallback.title,
		prompt: typeof value.prompt === 'string' ? value.prompt : fallback.prompt,
		color: validColor(value.color, fallback.color)
	};
}

function normalizeMilestone(value: unknown, fallback: Milestone): Milestone {
	if (!isRecord(value)) return { ...fallback };
	return {
		id: typeof value.id === 'string' && value.id ? value.id : fallback.id,
		time: validTime(value.time, fallback.time),
		title: typeof value.title === 'string' ? value.title : fallback.title,
		prompt: typeof value.prompt === 'string' ? value.prompt : fallback.prompt,
		color: validColor(value.color, fallback.color),
		enabled: typeof value.enabled === 'boolean' ? value.enabled : fallback.enabled
	};
}

function normalizeConfig(value: unknown): ProjectorConfig {
	const fallback = defaultConfig();
	if (!isRecord(value)) return fallback;
	const suppliedMilestones = Array.isArray(value.milestones);
	const candidateMilestones: unknown[] = Array.isArray(value.milestones)
		? value.milestones
		: fallback.milestones;
	const seenIds = new Set<string>();
	const milestones: Milestone[] = [];
	for (const [index, candidate] of candidateMilestones.entries()) {
		if (!isRecord(candidate) || typeof candidate.id !== 'string' || !candidate.id) continue;
		const builtin = fallback.milestones.find((item) => item.id === candidate.id);
		const milestoneFallback = builtin ?? {
			id: `custom-${index + 1}`,
			time: '10:00',
			title: 'Custom milestone',
			prompt: '',
			color: '#6b3fb0',
			enabled: true
		};
		const normalized = normalizeMilestone(candidate, milestoneFallback);
		if (normalized.id === 'before') normalized.id = 'custom-before';
		if (seenIds.has(normalized.id)) continue;
		seenIds.add(normalized.id);
		milestones.push(normalized);
	}
	if (!suppliedMilestones) {
		milestones.splice(0, milestones.length, ...fallback.milestones.map((item) => ({ ...item })));
	}
	const aspect = ASPECTS.includes(value.aspect as (typeof ASPECTS)[number])
		? (value.aspect as ProjectorConfig['aspect'])
		: fallback.aspect;
	return {
		title: typeof value.title === 'string' ? value.title : fallback.title,
		start: validTime(value.start, fallback.start),
		end: validTime(value.end, fallback.end),
		notice: typeof value.notice === 'string' ? value.notice : fallback.notice,
		showNotice: typeof value.showNotice === 'boolean' ? value.showNotice : fallback.showNotice,
		safe:
			typeof value.safe === 'number' && Number.isFinite(value.safe)
				? Math.max(0, Math.min(30, value.safe))
				: fallback.safe,
		guide: typeof value.guide === 'boolean' ? value.guide : fallback.guide,
		aspect,
		highVisibility: value.highVisibility === true,
		inverted: value.inverted === true,
		before: normalizePhase(value.before, fallback.before),
		milestones
	};
}

function normalizeRehearsal(value: unknown): Rehearsal {
	if (!isRecord(value)) return defaultRehearsal();
	return {
		enabled: value.enabled === true,
		base: typeof value.base === 'number' && Number.isFinite(value.base) ? value.base : 0,
		at: typeof value.at === 'number' && Number.isFinite(value.at) ? value.at : 0,
		fail: value.fail === true
	};
}

function getItem(storage: Storage, key: string): string | null {
	try {
		return storage.getItem(key);
	} catch {
		return null;
	}
}

function parseJson(value: string | null): unknown {
	if (!value) return null;
	try {
		return JSON.parse(value) as unknown;
	} catch {
		return null;
	}
}

function legacyCheckpoint(settings: Record<string, unknown>, id: string): unknown {
	const checkpoints = Array.isArray(settings.checkpoints) ? settings.checkpoints : [];
	const aliases: Record<string, string[]> = {
		m1: ['exam-start', 'start'],
		m2: ['midpoint'],
		m3: ['final30'],
		m4: ['final15'],
		m5: ['final5'],
		m6: ['exam-end', 'end']
	};
	const expected = aliases[id] ?? [];
	return checkpoints.find((item) => isRecord(item) && expected.includes(String(item.id)));
}

function checkpointToMilestone(
	value: unknown,
	fallback: Milestone,
	timeFallback: unknown
): Milestone {
	if (!isRecord(value)) {
		return { ...fallback, time: validTime(timeFallback, fallback.time) };
	}
	return {
		...fallback,
		time: validTime(value.time, validTime(timeFallback, fallback.time)),
		title: typeof value.name === 'string' ? value.name : fallback.title,
		prompt: fallback.prompt,
		color: validColor(value.color, fallback.color),
		enabled: typeof value.enabled === 'boolean' ? value.enabled : fallback.enabled
	};
}

function migrateLegacy(storage: Storage): ProjectorConfig | null {
	const settingsValue = parseJson(getItem(storage, LEGACY_SETTINGS_KEY));
	const settings = isRecord(settingsValue) ? settingsValue : null;
	const savedNotice = getItem(storage, LEGACY_NOTICE_KEY);
	if (!settings && savedNotice === null) return null;

	const cfg = defaultConfig();
	cfg.notice = typeof savedNotice === 'string' ? savedNotice : settings ? '' : cfg.notice;
	if (settings) {
		cfg.title =
			typeof settings.customTitle === 'string' && settings.customTitle
				? settings.customTitle
				: cfg.title;
		cfg.start = validTime(settings.examStartTime, cfg.start);
		cfg.end = validTime(settings.examEndTime, cfg.end);
		cfg.showNotice = settings.showAnnouncements !== false;
		cfg.safe =
			typeof settings.bottomDeadZoneVh === 'number' && Number.isFinite(settings.bottomDeadZoneVh)
				? Math.max(0, Math.min(30, settings.bottomDeadZoneVh))
				: cfg.safe;

		const times: Record<string, unknown> = {
			m1: settings.examStartTime,
			m2: settings.examMidpointTime,
			m3: settings.final30Time,
			m4: settings.final15Time,
			m5: settings.final5Time,
			m6: settings.examEndTime
		};
		const explicitTimes = cfg.milestones.map((fallback) => {
			const checkpoint = legacyCheckpoint(settings, fallback.id);
			const explicit = isRecord(checkpoint) && validTime(checkpoint.time, '') !== '';
			return Boolean(explicit || validTime(times[fallback.id], '') !== '');
		});
		const hasSchedule =
			typeof settings.examStartTime === 'string' && typeof settings.examEndTime === 'string';
		const respaced = hasSchedule ? respaceMilestones(cfg) : cfg;
		cfg.milestones = cfg.milestones.map((fallback, index) => {
			const checkpoint = legacyCheckpoint(settings, fallback.id);
			const milestone = checkpointToMilestone(checkpoint, fallback, times[fallback.id]);
			if (!explicitTimes[index] && hasSchedule) {
				milestone.time =
					respaced.milestones.find((item) => item.id === fallback.id)?.time ?? milestone.time;
			}
			return milestone;
		});
		const custom = Array.isArray(settings.customCheckpoints) ? settings.customCheckpoints : [];
		for (const [index, item] of custom.entries()) {
			if (!isRecord(item)) continue;
			cfg.milestones.push({
				id: typeof item.id === 'string' && item.id ? item.id : `legacy-custom-${index + 1}`,
				time: validTime(item.time, cfg.start),
				title: typeof item.name === 'string' ? item.name : 'Custom milestone',
				prompt: '',
				color: validColor(item.color, '#6b3fb0'),
				enabled: typeof item.enabled === 'boolean' ? item.enabled : true
			});
		}
	}
	return cfg;
}

export function loadState(storage: Storage): ProjectorState {
	const stored = parseJson(getItem(storage, STORAGE_KEY));
	if (isRecord(stored)) {
		return {
			cfg: normalizeConfig(stored.cfg),
			rehearsal: normalizeRehearsal(stored.rehearsal)
		};
	}
	return {
		cfg: migrateLegacy(storage) ?? defaultConfig(),
		rehearsal: defaultRehearsal()
	};
}

export function toSeconds(time: string): number {
	const normalized = validTime(time, '00:00');
	const [hours, minutes] = normalized.split(':').map(Number);
	return hours * 3600 + minutes * 60;
}

export function formatHM(seconds: number): string {
	const daySeconds = 86400;
	const normalized = ((Math.floor(seconds) % daySeconds) + daySeconds) % daySeconds;
	return `${String(Math.floor(normalized / 3600)).padStart(2, '0')}:${String(Math.floor(normalized / 60) % 60).padStart(2, '0')}`;
}

export function formatDuration(seconds: number): string {
	const remaining = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
	const hours = Math.floor(remaining / 3600);
	const minutes = Math.floor((remaining % 3600) / 60);
	const secs = remaining % 60;
	return hours > 0
		? `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
		: `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function examWindow(
	cfg: ProjectorConfig,
	now: number
): { start: number; end: number; now: number } {
	const start = toSeconds(cfg.start);
	let end = toSeconds(cfg.end);
	if (end < start) end += 86400;
	else if (end === start) end = start + 60;
	if (end <= 86400) return { start, end, now };
	if (now < 0 || now >= 86400) return { start, end, now };
	const candidates = [now - 86400, now, now + 86400];
	const distance = (value: number) =>
		value < start ? start - value : value > end ? value - end : 0;
	const alignedNow = candidates.sort((a, b) => {
		const diff = distance(a) - distance(b);
		if (diff !== 0) return diff;
		const aAfterStart = a >= start ? 0 : 1;
		const bAfterStart = b >= start ? 0 : 1;
		return aAfterStart - bAfterStart;
	})[0];
	return { start, end, now: alignedNow };
}

export function resolvePhase(
	cfg: ProjectorConfig,
	now: number
): {
	phase: Phase;
	activeId: string | null;
	beforeStart: boolean;
	progress: number;
	remaining: number;
	start: number;
	end: number;
	now: number;
} {
	const window = examWindow(cfg, now);
	const duration = Math.max(60, window.end - window.start);
	const enabled = cfg.milestones
		.filter((milestone) => milestone.enabled)
		.map((milestone) => {
			let time = toSeconds(milestone.time);
			if (window.end > 86400 && time < window.start) time += 86400;
			return { milestone, time };
		})
		.sort((a, b) => a.time - b.time);
	let active: Milestone | undefined;
	for (const item of enabled) {
		if (item.time <= window.now) active = item.milestone;
	}
	const beforeStart = window.now < window.start;
	const phase = active ?? cfg.before;
	return {
		phase,
		activeId: active?.id ?? null,
		beforeStart,
		progress: Math.max(0, Math.min(100, ((window.now - window.start) / duration) * 100)),
		remaining: Math.max(0, (beforeStart ? window.start : window.end) - window.now),
		start: window.start,
		end: window.end,
		now: window.now
	};
}

export function fillText(text: string, cfg: ProjectorConfig, now: number): string {
	const resolved = resolvePhase(cfg, now);
	const minutesLeft = Math.max(0, Math.ceil((resolved.end - resolved.now) / 60));
	return text
		.replace(/\{end\}/g, formatHM(resolved.end))
		.replace(/\{start\}/g, formatHM(resolved.start))
		.replace(/\{left\}/g, String(minutesLeft));
}

export function extendExam(cfg: ProjectorConfig, now: number, minutes: number): ProjectorConfig {
	const amount = Math.max(0, Number.isFinite(minutes) ? minutes : 0) * 60;
	if (amount === 0) return cfg;
	const window = examWindow(cfg, now);
	const newEnd = window.end + amount;
	const shiftIfFuture = (milestone: Milestone): Milestone => {
		let milestoneTime = toSeconds(milestone.time);
		if (window.end > 86400 && milestoneTime < window.start) milestoneTime += 86400;
		return milestoneTime > window.now
			? { ...milestone, time: formatHM(milestoneTime + amount) }
			: milestone;
	};
	return {
		...cfg,
		end: formatHM(newEnd),
		milestones: cfg.milestones.map(shiftIfFuture)
	};
}

export function respaceMilestones(cfg: ProjectorConfig): ProjectorConfig {
	const start = toSeconds(cfg.start);
	let end = toSeconds(cfg.end);
	if (end < start) end += 86400;
	else if (end === start) end = start + 60;
	const duration = end - start;
	const positions: Record<string, number> = {
		m1: start,
		m2: start + duration / 2,
		m3: end - 1800,
		m4: end - 900,
		m5: end - 300,
		m6: end
	};
	const minimum = start;
	const maximum = Math.max(start, end);
	return {
		...cfg,
		milestones: cfg.milestones.map((milestone) => {
			const position = positions[milestone.id];
			if (position === undefined) return milestone;
			return {
				...milestone,
				time: formatHM(Math.max(minimum, Math.min(maximum, Math.round(position / 60) * 60)))
			};
		})
	};
}

/** Share the text budget across lines, preserving breaks without charging for them. */
export function visibilityNotice(cfg: ProjectorConfig): { text: string; shortened: boolean } {
	const lines = cfg.notice
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean);
	const narrow = cfg.aspect === '4:3';
	const blocked = cfg.safe >= 20;
	const limit = narrow && blocked ? 48 : narrow || blocked ? 80 : 120;
	const text = lines.join('\n');
	if (lines.reduce((count, line) => count + line.length, 0) <= limit) {
		return { text, shortened: false };
	}
	let prefix = '';
	let used = 0;
	for (const character of text) {
		if (character !== '\n' && used >= limit - 1) break;
		prefix += character;
		if (character !== '\n') used++;
	}
	const boundary = prefix.lastIndexOf(' ');
	const lineStart = prefix.lastIndexOf('\n') + 1;
	if (boundary >= lineStart + 10) prefix = prefix.slice(0, boundary);
	return { text: prefix.trimEnd() + '…', shortened: true };
}
