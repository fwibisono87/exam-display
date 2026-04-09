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

			const layout = await page.evaluate(() => {
				const panel = document.querySelector('[data-testid="clock-panel"]');
				const time = document.querySelector('[data-testid="clock-time"]');

				if (!(panel instanceof HTMLElement) || !(time instanceof HTMLElement)) {
					throw new Error('Clock panel elements not found');
				}

				const panelBounds = panel.getBoundingClientRect();
				const timeBounds = time.getBoundingClientRect();

				return {
					viewportHeight: window.innerHeight,
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
		});
	}
}
