import { expect, test } from '@playwright/test';

const viewports = [
	{ width: 2000, height: 1500 },
	{ width: 1920, height: 1080 },
	{ width: 2880, height: 1080 },
	{ width: 1920, height: 900 },
	{ width: 1680, height: 1050 },
	{ width: 1600, height: 1200 },
	{ width: 1440, height: 900 },
	{ width: 1366, height: 768 },
	{ width: 1400, height: 1050 },
	{ width: 1280, height: 800 },
	{ width: 1280, height: 1024 },
	{ width: 1024, height: 768 }
];

async function mockTime(page: import('@playwright/test').Page, failed = false) {
	await page.route('**/api/time', (route) =>
		route.fulfill({
			status: failed ? 503 : 200,
			json: failed
				? { timeSource: 'error', timezone: 'Asia/Jakarta', ntp: { error: 'timeout' } }
				: {
						time: '2026-10-12T03:12:04.000Z',
						timezone: 'Asia/Jakarta',
						timeSource: 'ntp',
						ntp: { server: 'ntp.ui.ac.id', offset: 2, delay: 45, hasValidMetrics: true },
						status: 'healthy'
					}
		})
	);
	await page.route('**/api/health', (route) => route.fulfill({ json: { status: 'healthy' } }));
}

test.beforeEach(async ({ page }) => {
	await mockTime(page);
});

for (const aspect of ['16:9', '16:10', '4:3']) {
	for (const viewport of viewports) {
		test(`${aspect} projector fits at ${viewport.width}x${viewport.height}`, async ({ page }) => {
			await page.setViewportSize(viewport);
			await page.goto('/');
			await expect(page.getByTestId('clock-time')).toHaveText(/10:12\s*:\d{2}/);
			await page.keyboard.press('c');
			await page.getByRole('tab', { name: 'Screen', exact: true }).click();
			await page.getByRole('button', { name: aspect, exact: true }).click();
			await page.getByTestId('safe-area-slider').fill('30');
			await page.getByLabel('Show blocked-area guide').check();
			await page.getByRole('tab', { name: 'Notice', exact: true }).click();
			await page.getByRole('button', { name: 'Exam rules', exact: true }).click();
			await page.keyboard.press('Escape');
			await expect(page.getByTestId('operator-console')).toHaveCount(0);
			await expect(page.getByTestId('safe-area-guide')).toBeVisible();
			await expect(page.getByTestId('notice-copy')).toContainText("You can't leave");
			await page.evaluate(() => document.fonts.ready);
			await expect
				.poll(async () =>
					page.evaluate(() => {
						const canvas = document.querySelector(
							'[data-testid="projector-display"]'
						) as HTMLElement;
						const bounds = canvas.getBoundingClientRect();
						const fit = (id: string) => {
							const el = document.querySelector(`[data-testid="${id}"]`) as HTMLElement;
							if (!el) return false;
							const box = el.getBoundingClientRect();
							return (
								box.left >= bounds.left - 1 &&
								box.right <= bounds.right + 1 &&
								box.top >= bounds.top - 1 &&
								box.bottom <= bounds.bottom + 1 &&
								(id === 'clock-time' ||
									el.scrollHeight <=
										el.clientHeight +
											(id === 'current-phase'
												? Math.ceil(parseFloat(getComputedStyle(el).fontSize) * 0.12)
												: 1)) &&
								el.scrollWidth <= el.clientWidth + 1
							);
						};
						return (
							bounds.left >= -1 &&
							bounds.top >= -1 &&
							bounds.right <= innerWidth + 1 &&
							bounds.bottom <= innerHeight + 1 &&
							fit('clock-time') &&
							fit('notice-copy') &&
							fit('current-phase')
						);
					})
				)
				.toBe(true);
		});
	}
}

test('migrates existing title, custom milestones, notice and safe area', async ({ page }) => {
	await page.addInitScript(() => {
		localStorage.setItem(
			'examSettings',
			JSON.stringify({
				customTitle: 'Existing exam',
				examStartTime: '09:00',
				examEndTime: '11:00',
				bottomDeadZoneVh: 18,
				customCheckpoints: [
					{
						id: 'custom-old',
						name: 'Custom break',
						time: '10:10',
						enabled: true,
						color: '#1d7a4a',
						isCustom: true
					}
				]
			})
		);
		localStorage.setItem('examAnnouncements', 'Keep your ID on your desk.');
	});
	await page.goto('/');
	await expect(page.getByText('Existing exam', { exact: true })).toBeVisible();
	await expect(page.getByTestId('current-phase')).toContainText('Custom break');
	await expect(page.getByTestId('notice-copy')).toContainText('Keep your ID');
	await page.keyboard.press('c');
	await page.getByRole('tab', { name: 'Screen' }).click();
	await expect(page.getByTestId('safe-area-slider')).toHaveValue('18');
	await page.reload();
	await expect(page.getByText('Existing exam', { exact: true })).toBeVisible();
});

test('NTP failure keeps local time ticking with a red status and recovers via Sync now', async ({
	page
}) => {
	await page.clock.setFixedTime(new Date('2026-10-12T01:15:00.000Z'));
	await mockTime(page, true);
	await page.goto('/');
	const status = page.getByTestId('ntp-status');
	await expect(status).toHaveAttribute('aria-label', 'NTP unavailable · local machine clock');
	await expect(page.getByTestId('clock-error')).toHaveCount(0);
	await expect(page.getByTestId('clock-time')).toHaveText(/08:15\s*:00/);
	await page.clock.setFixedTime(new Date('2026-10-12T01:15:02.000Z'));
	await expect(page.getByTestId('clock-time')).toHaveText(/08:15\s*:02/);
	await expect(page.getByTestId('exam-progress-track')).toBeAttached();
	for (const id of ['current-phase', 'notice-copy'])
		await expect(page.getByTestId(id)).toBeVisible();
	await expect(status.locator('.ntp-dot')).toHaveCSS('background-color', 'rgb(196, 38, 46)');
	await page.keyboard.press('c');
	await expect(page.getByText('Local machine clock', { exact: true })).toBeVisible();
	await mockTime(page);
	await page.getByRole('button', { name: 'Sync now' }).click();
	await expect(page.getByTestId('clock-time')).toHaveText(/10:12\s*:\d{2}/);
	await expect(status.locator('.ntp-dot')).toHaveCSS('background-color', 'rgb(29, 122, 74)');
});

test('a lost NTP connection switches from synchronized time to the local machine clock', async ({
	page
}) => {
	await page.clock.setFixedTime(new Date('2026-10-12T01:15:00.000Z'));
	await page.goto('/');
	await expect(page.getByTestId('clock-time')).toHaveText(/10:12\s*:\d{2}/);
	await expect(page.getByTestId('exam-progress-track')).toHaveCSS('height', '30px');
	await page.keyboard.press('c');
	await mockTime(page, true);
	await page.getByRole('button', { name: 'Sync now' }).click();
	await expect(page.getByTestId('ntp-status')).toHaveAttribute(
		'aria-label',
		'NTP unavailable · local machine clock'
	);
	await expect(page.getByTestId('clock-time')).toHaveText(/08:15\s*:\d{2}/);
	await expect(page.getByTestId('current-phase')).toContainText('Not started');
	await expect(page.getByTestId('clock-error')).toHaveCount(0);
});

test('console edits, rehearsal, milestones and keyboard tabs work', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByTestId('clock-time')).toHaveText(/10:12\s*:\d{2}/);
	await page.keyboard.press('c');
	const panel = page.getByTestId('operator-console');
	await panel.getByLabel('Title', { exact: true }).fill('Networks exam');
	await panel.getByRole('button', { name: '+5 min', exact: true }).click();
	await expect(panel.getByLabel('End', { exact: true })).toHaveValue('11:05');
	await panel.getByRole('button', { name: 'Rehearse', exact: true }).click();
	await panel.getByTestId('rehearsal-slider').fill('39300');
	await expect(page.getByTestId('current-phase')).toContainText('Final 15 minutes');
	await panel.getByLabel('Simulate NTP failure').check();
	await expect(page.getByTestId('clock-error')).toBeVisible();
	await panel.getByRole('button', { name: 'Live (NTP)', exact: true }).click();
	await expect(page.getByTestId('clock-time')).toHaveText(/10:12\s*:\d{2}/);
	await panel.getByRole('tab', { name: 'Milestones' }).click();
	await panel.getByRole('button', { name: '+ Add milestone' }).click();
	await panel.getByLabel('Title', { exact: true }).fill('Custom reminder');
	await panel.getByLabel('Prompt', { exact: true }).fill('Finish by {end}');
	await expect(panel.getByText('Shows as:')).toContainText('Finish by 11:05');
	await panel.getByRole('button', { name: 'Delete', exact: true }).click();
	await expect(panel.getByText('Custom reminder', { exact: true })).toHaveCount(0);
	await panel.getByRole('tab', { name: 'Milestones' }).focus();
	await page.keyboard.press('ArrowRight');
	await expect(panel.getByRole('tab', { name: 'Notice', exact: true })).toHaveAttribute(
		'aria-selected',
		'true'
	);
	await panel.getByLabel('Show notice on screen').uncheck();
	await expect(page.getByTestId('notice-copy')).toHaveCount(0);
});

test('pop-out console synchronizes both directions', async ({ page, context }) => {
	await context.route('**/api/time', (route) =>
		route.fulfill({
			json: { time: '2026-10-12T03:12:04.000Z', timezone: 'Asia/Jakarta', timeSource: 'ntp' }
		})
	);
	await context.route('**/api/health', (route) => route.fulfill({ json: { status: 'healthy' } }));
	await page.goto('/');
	await expect(page.getByTestId('clock-time')).toHaveText(/10:12\s*:\d{2}/);
	await page.keyboard.press('c');
	const popupPromise = page.waitForEvent('popup');
	await page.getByRole('button', { name: 'Pop out', exact: true }).click();
	const popup = await popupPromise;
	await expect(popup.getByTestId('operator-console')).toBeVisible();
	await expect(popup.getByTestId('projector-display')).toHaveCount(0);
	await expect(page.getByTestId('operator-console')).toHaveCount(0);
	await popup.getByLabel('Title', { exact: true }).fill('From the pop-out');
	await expect(page.getByText('From the pop-out', { exact: true })).toBeVisible();
	await page.keyboard.press('c');
	await page.getByLabel('Title', { exact: true }).fill('From the display');
	await expect(popup.getByLabel('Title', { exact: true })).toHaveValue('From the display');
	await popup.close();
});

test('small console scrolls and reset requires confirmation', async ({ page }) => {
	await page.setViewportSize({ width: 360, height: 480 });
	await page.goto('/#console');
	const panel = page.getByTestId('operator-console');
	await panel.getByLabel('Title', { exact: true }).fill('Keep this exam');
	await panel.getByRole('tab', { name: 'Screen' }).click();
	page.once('dialog', (dialog) => dialog.dismiss());
	await panel.getByRole('button', { name: 'Reset everything…' }).click();
	await panel.getByRole('tab', { name: 'Exam', exact: true }).click();
	await expect(panel.getByLabel('Title', { exact: true })).toHaveValue('Keep this exam');
	await panel.getByRole('tab', { name: 'Screen' }).click();
	page.once('dialog', (dialog) => dialog.accept());
	await panel.getByRole('button', { name: 'Reset everything…' }).click();
	await panel.getByRole('tab', { name: 'Exam', exact: true }).click();
	await expect(panel.getByLabel('Title', { exact: true })).toHaveValue(
		'Computer Networks · Final Exam'
	);
});
