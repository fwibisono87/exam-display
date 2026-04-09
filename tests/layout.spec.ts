import { expect, test } from '@playwright/test';

type PersistedCheckpoint = {
	id: string;
	name: string;
	time: string;
	enabled: boolean;
	emoji: string;
	color: string;
	isCustom: boolean;
};

type PersistedSettings = {
	examStartTime?: string;
	examEndTime?: string;
	examMidpointTime?: string;
	final30Time?: string;
	final15Time?: string;
	final5Time?: string;
	checkpoints?: PersistedCheckpoint[];
	customCheckpoints?: PersistedCheckpoint[];
	customTitle: string;
	announcementPosition: 'top' | 'left';
	announcementFontSize: number;
	is24Hour: boolean;
	highContrastMode: boolean;
	showAnnouncements: boolean;
	showDate: boolean;
	showTimezone: boolean;
	bottomDeadZoneVh: number;
};

const ANNOUNCEMENT = 'EXIT: SHOWMEALLYOURLOVE#ED';

const defaultCheckpoints: PersistedCheckpoint[] = [
	{
		id: 'midpoint',
		name: 'Exam Midpoint',
		time: '10:30',
		enabled: true,
		emoji: '⏰',
		color: '#0F62FE',
		isCustom: false
	},
	{
		id: 'final30',
		name: 'Final 30 Minutes',
		time: '11:30',
		enabled: true,
		emoji: '⚠️',
		color: '#FF832B',
		isCustom: false
	},
	{
		id: 'final15',
		name: 'Final 15 Minutes',
		time: '11:45',
		enabled: true,
		emoji: '🔔',
		color: '#DA1E28',
		isCustom: false
	},
	{
		id: 'final5',
		name: 'Final 5 Minutes',
		time: '11:55',
		enabled: true,
		emoji: '🚨',
		color: '#A2191F',
		isCustom: false
	}
];

const sparseState: PersistedSettings = {
	customTitle: 'Exam Time Display',
	announcementPosition: 'top',
	announcementFontSize: 32,
	is24Hour: true,
	highContrastMode: false,
	showAnnouncements: true,
	showDate: false,
	showTimezone: false,
	bottomDeadZoneVh: 0
};

const denseState: PersistedSettings = {
	examStartTime: '09:00',
	examEndTime: '12:00',
	examMidpointTime: '10:30',
	final30Time: '11:30',
	final15Time: '11:45',
	final5Time: '11:55',
	checkpoints: defaultCheckpoints,
	customCheckpoints: [],
	customTitle: 'Exam Time Display',
	announcementPosition: 'top',
	announcementFontSize: 32,
	is24Hour: true,
	highContrastMode: false,
	showAnnouncements: true,
	showDate: true,
	showTimezone: true,
	bottomDeadZoneVh: 0
};

const scenarios = [
	{ name: 'announcement only', settings: sparseState },
	{ name: 'announcement with active and next checkpoints', settings: denseState }
] as const;

const viewports = [
	{ width: 1920, height: 1080 },
	{ width: 2880, height: 1080 },
	{ width: 1920, height: 900 }
] as const;

for (const scenario of scenarios) {
	for (const viewport of viewports) {
		test(`${scenario.name} fits at ${viewport.width}x${viewport.height}`, async ({ page }) => {
			await page.setViewportSize(viewport);
			await page.addInitScript(
				({ settings, announcement }) => {
					window.localStorage.setItem('examSettings', JSON.stringify(settings));
					window.localStorage.setItem('examAnnouncements', announcement);
				},
				{ settings: scenario.settings, announcement: ANNOUNCEMENT }
			);

			await page.goto('/');
			await expect(page.getByTestId('clock-panel')).toBeVisible();
			await expect(page.getByTestId('clock-time')).toHaveText(/\d{2}:\d{2}:\d{2}/);
			await expect(page.getByText('Student Notice')).toHaveCount(0);
			await expect(page.getByTestId('exam-progress')).toHaveCount(
				scenario.name.includes('active and next checkpoints') ? 1 : 0
			);
			await expect(page.getByTestId('current-phase')).toHaveCount(
				scenario.name.includes('active and next checkpoints') ? 1 : 0
			);

			const layout = await page.evaluate(() => {
				const panel = document.querySelector('[data-testid="clock-panel"]');
				const time = document.querySelector('[data-testid="clock-time"]');
				const notice = document.querySelector('.announcement-copy');
				const currentPhase = document.querySelector('[data-testid="current-phase"]');
				const progressTrack = document.querySelector('[data-testid="exam-progress-track"]');

				if (!(panel instanceof HTMLElement) || !(time instanceof HTMLElement)) {
					throw new Error('Clock panel elements not found');
				}

				const panelBounds = panel.getBoundingClientRect();
				const timeBounds = time.getBoundingClientRect();
				const progressTrackBounds =
					progressTrack instanceof HTMLElement ? progressTrack.getBoundingClientRect() : null;
				const noticeFontSize =
					notice instanceof HTMLElement ? parseFloat(getComputedStyle(notice).fontSize) : 0;
				const currentPhaseFontSize =
					currentPhase instanceof HTMLElement
						? parseFloat(getComputedStyle(currentPhase).fontSize)
						: 0;

				return {
					clockFontSize: parseFloat(getComputedStyle(time).fontSize),
					currentPhaseFontSize,
					noticeFontSize,
					progressTrackWidth: progressTrackBounds?.width ?? 0,
					viewportHeight: window.innerHeight,
					panelWidth: panelBounds.width,
					panelBottom: panelBounds.bottom,
					panelTop: panelBounds.top,
					timeHeight: timeBounds.height,
					timeBottom: timeBounds.bottom,
					timeTop: timeBounds.top
				};
			});

			expect(layout.panelBottom).toBeLessThanOrEqual(layout.viewportHeight);
			expect(layout.timeTop).toBeGreaterThanOrEqual(layout.panelTop);
			expect(layout.timeBottom).toBeLessThanOrEqual(layout.panelBottom);
			expect(layout.timeHeight).toBeGreaterThan(0);
			expect(layout.clockFontSize).toBeGreaterThan(layout.noticeFontSize);
			if (layout.currentPhaseFontSize > 0) {
				expect(layout.clockFontSize).toBeGreaterThan(layout.currentPhaseFontSize);
				expect(layout.progressTrackWidth).toBeGreaterThan(layout.panelWidth * 0.7);
			}
		});
	}
}
