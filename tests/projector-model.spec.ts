import { expect, test } from '@playwright/test';
import {
	AspectRatio,
	NtpProvider,
	defaultConfig,
	examWindow,
	extendExam,
	fillText,
	loadState,
	resolvePhase,
	respaceMilestones,
	visibilityNotice
} from '../src/lib/projector-model';

function memoryStorage(entries: Record<string, string>): Storage {
	return {
		get length() {
			return Object.keys(entries).length;
		},
		clear() {
			for (const key of Object.keys(entries)) delete entries[key];
		},
		getItem(key: string) {
			return entries[key] ?? null;
		},
		key(index: number) {
			return Object.keys(entries)[index] ?? null;
		},
		removeItem(key: string) {
			delete entries[key];
		},
		setItem(key: string, value: string) {
			entries[key] = String(value);
		}
	};
}

test('aligns an overnight exam clock with its window', () => {
	const defaults = defaultConfig();
	const cfg = {
		...defaults,
		start: '23:00',
		end: '01:00',
		milestones: defaults.milestones.map((milestone) =>
			milestone.id === 'm1' ? { ...milestone, time: '23:00' } : milestone
		)
	};
	expect(examWindow(cfg, 30 * 60).now).toBe(24.5 * 60 * 60);
	const phase = resolvePhase(cfg, 30 * 60);
	expect(phase.activeId).toBe('m1');
	expect(phase.progress).toBe(75);
});

test('keeps ordinary same-day clocks on the same day and equal endpoints short', () => {
	const cfg = defaultConfig();
	expect(examWindow(cfg, 23 * 60 * 60).now).toBe(23 * 60 * 60);
	const equal = { ...cfg, start: '09:00', end: '09:00' };
	expect(examWindow(equal, 9 * 60 * 60)).toMatchObject({
		start: 9 * 60 * 60,
		end: 9 * 60 * 60 + 60,
		now: 9 * 60 * 60
	});
});

test('respaces built-in milestones inside short exam windows and preserves custom times', () => {
	const cfg = {
		...defaultConfig(),
		start: '09:00',
		end: '09:10',
		milestones: [
			...defaultConfig().milestones,
			{
				id: 'custom-one',
				time: '09:07',
				title: 'Custom',
				prompt: '',
				color: '#6b3fb0',
				enabled: true
			}
		]
	};
	const result = respaceMilestones(cfg);
	for (const milestone of result.milestones.filter((item) => /^m[1-6]$/.test(item.id))) {
		expect(milestone.time >= cfg.start && milestone.time <= cfg.end).toBe(true);
	}
	expect(result.milestones.find((item) => item.id === 'custom-one')?.time).toBe('09:07');
});

test('migrates old exam settings and announcements without enabling rehearsal', () => {
	const storage = memoryStorage({
		examSettings: JSON.stringify({
			customTitle: 'Saved title',
			examStartTime: '08:30',
			examEndTime: '10:30',
			final30Time: '10:00',
			showAnnouncements: false,
			bottomDeadZoneVh: 18,
			checkpoints: [
				{
					id: 'final30',
					name: 'Saved warning',
					time: '10:01',
					enabled: false,
					color: '#123456'
				}
			],
			customCheckpoints: [
				{
					id: 'custom-7',
					name: 'Saved custom',
					time: '09:40',
					enabled: true,
					color: '#654321'
				}
			]
		}),
		examAnnouncements: 'Saved notice'
	});
	const state = loadState(storage);
	expect(state.cfg.title).toBe('Saved title');
	expect(state.cfg.start).toBe('08:30');
	expect(state.cfg.notice).toBe('Saved notice');
	expect(state.cfg.showNotice).toBe(false);
	expect(state.cfg.safe).toBe(18);
	expect(state.cfg.milestones.find((item) => item.id === 'm3')).toMatchObject({
		time: '10:00',
		title: 'Saved warning',
		enabled: false,
		color: '#123456'
	});
	expect(state.cfg.milestones.find((item) => item.id === 'custom-7')).toMatchObject({
		time: '09:40',
		title: 'Saved custom',
		color: '#654321'
	});
	expect(state.rehearsal.enabled).toBe(false);
	expect(storage.getItem('examSettings')).not.toBeNull();
});

test('uses legacy schedule times when old settings have no checkpoint times', () => {
	const storage = memoryStorage({
		examSettings: JSON.stringify({ examStartTime: '08:30', examEndTime: '10:30' })
	});
	const state = loadState(storage);
	expect(state.cfg.milestones.find((item) => item.id === 'm1')?.time).toBe('08:30');
	expect(state.cfg.milestones.find((item) => item.id === 'm2')?.time).toBe('09:30');
	expect(state.cfg.milestones.find((item) => item.id === 'm3')?.time).toBe('10:00');
	expect(state.cfg.milestones.find((item) => item.id === 'm6')?.time).toBe('10:30');
});

test('legacy settings without a schedule migrate to clock-only', () => {
	const state = loadState(
		memoryStorage({ examSettings: JSON.stringify({ examStartTime: '', customTitle: 'Saved' }) })
	);
	expect(state.cfg.start).toBeNull();
	expect(state.cfg.end).toBeNull();
	expect(resolvePhase(state.cfg, 10 * 3600).scheduled).toBe(false);
});

test('an empty schedule shows no phase and persists across loads', () => {
	const cfg = { ...defaultConfig(), end: null };
	const resolved = resolvePhase(cfg, 10 * 3600);
	expect(resolved).toMatchObject({ scheduled: false, activeId: null, progress: 0, remaining: 0 });
	expect(fillText('Ends at {end}, {left} left', cfg, 10 * 3600)).toBe('Ends at --:--, -- left');
	expect(extendExam(cfg, 10 * 3600, 5)).toBe(cfg);
	expect(respaceMilestones(cfg)).toBe(cfg);
	const state = loadState(
		memoryStorage({ 'examDisplay.v2': JSON.stringify({ cfg: { ...cfg, start: '' } }) })
	);
	expect(state.cfg.start).toBeNull();
	expect(state.cfg.end).toBeNull();
});

test('built-in milestone times are locked to the schedule on load and on extend', () => {
	const defaults = defaultConfig();
	const cfg = {
		...defaults,
		milestones: defaults.milestones.map((milestone) =>
			milestone.id === 'm2' ? { ...milestone, time: '09:05' } : milestone
		)
	};
	const loaded = loadState(memoryStorage({ 'examDisplay.v2': JSON.stringify({ cfg }) }));
	expect(loaded.cfg.milestones.find((item) => item.id === 'm2')?.time).toBe('10:00');
	const extended = extendExam(loaded.cfg, 10.5 * 3600, 10);
	expect(extended.end).toBe('11:10');
	expect(extended.milestones.find((item) => item.id === 'm2')?.time).toBe('10:05');
	expect(extended.milestones.find((item) => item.id === 'm3')?.time).toBe('10:40');
	expect(extended.milestones.find((item) => item.id === 'm6')?.time).toBe('11:10');
});

test('copies announcements when that is the only legacy value', () => {
	const state = loadState(memoryStorage({ examAnnouncements: 'Notice only' }));
	expect(state.cfg.notice).toBe('Notice only');
});

test('preserves deleted milestones across load and storage sync normalization', () => {
	const cfg = defaultConfig();
	cfg.milestones = cfg.milestones.filter((item) => item.id !== 'm2');
	cfg.milestones.push({
		id: 'before',
		time: '09:15',
		title: 'Custom using reserved id',
		prompt: '',
		color: '#654321',
		enabled: true
	});
	const serialized = JSON.stringify({ cfg, rehearsal: { enabled: false } });
	const once = loadState(memoryStorage({ 'examDisplay.v2': serialized }));
	expect(once.cfg.milestones.some((item) => item.id === 'm2')).toBe(false);
	expect(once.cfg.milestones.some((item) => item.id === 'before')).toBe(false);
	expect(new Set(once.cfg.milestones.map((item) => item.id)).size).toBe(once.cfg.milestones.length);
	const twice = loadState(
		memoryStorage({
			'examDisplay.v2': JSON.stringify({ cfg: once.cfg, rehearsal: once.rehearsal })
		})
	);
	expect(twice.cfg.milestones.some((item) => item.id === 'm2')).toBe(false);
	expect(twice.cfg.milestones).toHaveLength(once.cfg.milestones.length);
});

test('falls back to defaults for malformed persisted state', () => {
	const state = loadState(memoryStorage({ 'examDisplay.v2': '{not-json' }));
	expect(state.cfg.title).toBe(defaultConfig().title);
	expect(state.rehearsal.enabled).toBe(false);
});

test('visibility preferences default off for older settings and persist when enabled', () => {
	const old = loadState(
		memoryStorage({ 'examDisplay.v2': JSON.stringify({ cfg: { title: 'Old exam' } }) })
	);
	expect(old.cfg.highVisibility).toBe(false);
	expect(old.cfg.inverted).toBe(false);
	const saved = loadState(
		memoryStorage({
			'examDisplay.v2': JSON.stringify({
				cfg: { ...defaultConfig(), highVisibility: true, inverted: true }
			})
		})
	);
	expect(saved.cfg.highVisibility).toBe(true);
	expect(saved.cfg.inverted).toBe(true);
});

test('high visibility condenses notices without changing saved text', () => {
	const cfg = { ...defaultConfig(), notice: 'First rule.\nSecond rule.' };
	expect(visibilityNotice(cfg)).toEqual({ text: 'First rule.\nSecond rule.', shortened: false });
	expect(cfg.notice).toBe('First rule.\nSecond rule.');
	const narrow = {
		...cfg,
		aspect: '4:3' as const,
		safe: 30,
		notice: 'Read carefully. '.repeat(30)
	};
	const preview = visibilityNotice(narrow);
	expect(preview.text.length).toBeLessThanOrEqual(48);
	expect(preview.text.endsWith('…')).toBe(true);
});

test('two 60-character lines have the same high visibility budget as one 120-character line', () => {
	const text = 'A'.repeat(60);
	const cfg = defaultConfig();
	for (const notice of [text + text, text + '\n' + text]) {
		expect(visibilityNotice({ ...cfg, notice })).toEqual({ text: notice, shortened: false });
	}
	const over = visibilityNotice({ ...cfg, notice: text + '\n' + text + 'X' });
	expect(over.shortened).toBe(true);
	expect(over.text).toContain('\n');
	expect(over.text.replace(/\n/g, '').length).toBeLessThanOrEqual(120);
});

test('defaults to auto aspect ratio and ntp.ui.ac.id, and normalizes aspect and ntpServer', () => {
	const defaults = defaultConfig();
	expect(defaults.aspect).toBe(AspectRatio.AUTO);
	expect(defaults.ntpServer).toBe(NtpProvider.UI_CAMPUS);

	const validCustom = loadState(
		memoryStorage({
			'examDisplay.v2': JSON.stringify({
				cfg: { aspect: AspectRatio.WIDESCREEN_16_10, ntpServer: NtpProvider.BSN_STRATUM_1 }
			})
		})
	);
	expect(validCustom.cfg.aspect).toBe(AspectRatio.WIDESCREEN_16_10);
	expect(validCustom.cfg.ntpServer).toBe(NtpProvider.BSN_STRATUM_1);

	const invalidCustom = loadState(
		memoryStorage({
			'examDisplay.v2': JSON.stringify({
				cfg: { aspect: '21:9', ntpServer: 'evil.example.com' }
			})
		})
	);
	expect(invalidCustom.cfg.aspect).toBe(AspectRatio.AUTO);
	expect(invalidCustom.cfg.ntpServer).toBe(NtpProvider.UI_CAMPUS);
});

test('visibilityNotice applies narrow budget in auto aspect mode when effectiveCanvasWidth is narrow', () => {
	const cfg = {
		...defaultConfig(),
		aspect: AspectRatio.AUTO,
		safe: 30,
		notice: 'Read carefully. '.repeat(30)
	};
	const narrowPreview = visibilityNotice(cfg, 1440);
	expect(narrowPreview.text.length).toBeLessThanOrEqual(48);
	expect(narrowPreview.shortened).toBe(true);

	const widePreview = visibilityNotice(cfg, 1920);
	expect(widePreview.text.length).toBeGreaterThan(48);
	expect(widePreview.text.length).toBeLessThanOrEqual(80);
});
