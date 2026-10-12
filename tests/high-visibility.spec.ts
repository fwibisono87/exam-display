import { expect, test } from '@playwright/test';
import { defaultConfig, type ProjectorConfig } from '../src/lib/projector-model';

async function seed(page: import('@playwright/test').Page, patch: Partial<ProjectorConfig> = {}) {
	await page.addInitScript(
		(cfg) => {
			localStorage.setItem(
				'examDisplay.v2',
				JSON.stringify({ cfg, rehearsal: { enabled: false, base: 0, at: 0, fail: false } })
			);
		},
		{ ...defaultConfig(), highVisibility: true, notice: 'Keep your ID on the desk.', ...patch }
	);
}

test.beforeEach(async ({ context }) => {
	await context.route('**/api/time', (route) =>
		route.fulfill({
			json: {
				time: '2026-10-12T03:12:04.000Z',
				timezone: 'Asia/Jakarta',
				timeSource: 'ntp',
				ntp: { server: 'ntp.ui.ac.id' }
			}
		})
	);
	await context.route('**/api/health', (route) => route.fulfill({ json: { status: 'healthy' } }));
});

for (const aspect of ['16:9', '16:10', '4:3'] as const) {
	for (const inverted of [false, true]) {
		for (const safe of [0, 30]) {
			test(`high visibility fits ${aspect}, inverted=${inverted}, safe=${safe}`, async ({
				page
			}) => {
				await page.setViewportSize({ width: 1024, height: 768 });
				await seed(page, { aspect, inverted, safe });
				await page.goto('/');
				await expect(page.getByTestId('clock-time')).toHaveText(/10:12\s*:\d{2}/);
				await expect(page.getByTestId('phase-prompt')).toHaveCount(0);
				await expect(page.locator('.milestone')).toHaveCount(0);
				const ink = inverted ? 'rgb(255, 255, 255)' : 'rgb(0, 0, 0)';
				const paper = inverted ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 255)';
				for (const selector of [
					'.clock-main',
					'.clock-seconds',
					'.remaining-time',
					'.remaining-word',
					'.phase-copy',
					'.notice-copy'
				]) {
					await expect(page.locator(selector)).toHaveCSS('color', ink);
				}
				await expect(page.locator('.phase-panel')).toHaveCSS('background-color', paper);
				await expect(page.getByTestId('ntp-status')).toContainText('NTP');
				await expect
					.poll(() =>
						page.evaluate(() => {
							const canvas = document
								.querySelector('[data-testid=projector-display]')!
								.getBoundingClientRect();
							return ['clock-time', 'current-phase', 'notice-copy'].every((id) => {
								const el = document.querySelector(`[data-testid="${id}"]`) as HTMLElement;
								const box = el.getBoundingClientRect();
								return (
									box.left >= canvas.left - 1 &&
									box.right <= canvas.right + 1 &&
									box.bottom <= canvas.bottom + 1 &&
									el.scrollWidth <= el.clientWidth + 1 &&
									(id !== 'notice-copy' ||
										(parseFloat(getComputedStyle(el).fontSize) >= 48 &&
											el.scrollHeight <= el.clientHeight + 1))
								);
							});
						})
					)
					.toBe(true);
			});
		}
	}
}

test('screen controls persist high visibility and inversion, warn on long notices, and restore normal display', async ({
	page
}) => {
	await page.goto('/');
	await expect(page.getByTestId('clock-time')).toHaveText(/10:12\s*:\d{2}/);
	await page.keyboard.press('c');
	await page.getByRole('tab', { name: 'Screen', exact: true }).click();
	await page.getByLabel('High visibility mode', { exact: true }).check();
	await page.getByLabel('White text on black', { exact: true }).check();
	await page.reload();
	await expect(page.locator('.clock-seconds')).toHaveCSS('color', 'rgb(255, 255, 255)');
	await page.keyboard.press('c');
	await page.getByRole('tab', { name: 'Notice', exact: true }).click();
	await page
		.getByLabel('Notice text', { exact: true })
		.fill('First short rule.\n' + 'Second rule. '.repeat(30));
	await expect(page.getByRole('status')).toContainText(
		'Notice is too long for High visibility mode'
	);
	await expect(page.getByTestId('notice-copy')).toContainText('First short rule.');
	await expect(page.getByTestId('notice-copy')).toContainText('Second rule');
	await page.getByRole('tab', { name: 'Screen', exact: true }).click();
	await page.getByLabel('High visibility mode', { exact: true }).uncheck();
	await expect(page.getByTestId('phase-prompt')).toBeVisible();
	await expect(page.getByTestId('notice-copy')).toContainText('Second rule');
});

test('calibration works from a pop-out, hides exam timing, and is temporary', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByTestId('clock-time')).toHaveText(/10:12\s*:\d{2}/);
	await page.keyboard.press('c');
	const popupPromise = page.waitForEvent('popup');
	await page.getByRole('button', { name: 'Pop out', exact: true }).click();
	const popup = await popupPromise;
	await popup.getByRole('tab', { name: 'Screen', exact: true }).click();
	await popup.getByLabel('High visibility mode', { exact: true }).check();
	await popup.getByRole('button', { name: 'Show calibration screen', exact: true }).click();
	await expect(page.getByTestId('calibration-screen')).toBeVisible();
	await expect(page.getByTestId('calibration-digits')).toContainText('0123456789');
	await expect(page.getByTestId('clock-time')).not.toBeVisible();
	await popup.getByRole('button', { name: 'Return to exam display', exact: true }).click();
	await expect(page.getByTestId('calibration-screen')).toHaveCount(0);
	await expect(page.getByTestId('clock-time')).toBeVisible();
	await popup.getByRole('button', { name: 'Show calibration screen', exact: true }).click();
	await expect(page.getByTestId('calibration-screen')).toBeVisible();
	await page.reload();
	await expect(page.getByTestId('calibration-screen')).toHaveCount(0);
	await expect(page.getByTestId('clock-time')).toBeVisible();
	await popup.close();
});

for (const aspect of ['16:9', '16:10', '4:3'] as const) {
	test(`calibration content stays above the blocked area at ${aspect}`, async ({ page }) => {
		await page.setViewportSize({ width: 1024, height: 768 });
		await seed(page, { aspect, safe: 30 });
		await page.goto('/');
		await expect(page.getByTestId('clock-time')).toHaveText(/10:12\s*:\d{2}/);
		await page.keyboard.press('c');
		await page.getByRole('tab', { name: 'Screen', exact: true }).click();
		await page.getByRole('button', { name: 'Show calibration screen', exact: true }).click();
		await page.keyboard.press('Escape');
		await expect(page.getByTestId('calibration-screen')).toBeVisible();
		const fit = await page.evaluate(() => {
			const calibration = document
				.querySelector('[data-testid=calibration-screen]')!
				.getBoundingClientRect();
			const blocked = document.querySelector('.calibration-safe')!.getBoundingClientRect();
			return [
				'.calibration-heading',
				'.calibration-digits',
				'.calibration-samples',
				'.calibration-bands',
				'.calibration-directions',
				'.calibration-exit'
			].map((selector) => {
				const el = document.querySelector(selector) as HTMLElement;
				const box = el.getBoundingClientRect();
				return {
					selector,
					fits:
						box.left >= calibration.left &&
						box.right <= calibration.right &&
						box.bottom <= blocked.top &&
						el.scrollWidth <= el.clientWidth + 1
				};
			});
		});
		for (const item of fit) expect(item.fits, item.selector).toBe(true);
	});
}

test('high visibility shows two 60-character notice lines in full', async ({ page }) => {
	const line = 'Keep your phones in your bag. Remain seated during the exam!';
	expect(line.length).toBe(60);
	await seed(page, { notice: line + '\n' + line });
	await page.goto('/');
	await expect(page.getByTestId('clock-time')).toHaveText(/10:12\s*:\d{2}/);
	await expect(page.getByTestId('notice-copy')).toHaveText(line + '\n' + line);
	await expect
		.poll(() =>
			page.getByTestId('notice-copy').evaluate((el) => el.scrollHeight <= el.clientHeight + 1)
		)
		.toBe(true);
	await page.keyboard.press('c');
	await page.getByRole('tab', { name: 'Notice', exact: true }).click();
	await expect(page.getByRole('status')).toHaveCount(0);
});
