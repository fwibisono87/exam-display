import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
	await page.route('**/api/time', (route) =>
		route.fulfill({
			json: {
				time: '2026-10-12T03:12:04.000Z',
				timezone: 'Asia/Jakarta',
				timeSource: 'ntp',
				status: 'healthy'
			}
		})
	);
	await page.route('**/api/health', (route) => route.fulfill({ json: { status: 'healthy' } }));
});

test('built-in milestones follow the schedule, empty times show only the clock', async ({
	page
}) => {
	await page.goto('/');
	await expect(page.getByTestId('clock-time')).toHaveText(/10:12\s*:\d{2}/);
	await expect(page.getByTestId('current-phase')).toContainText('Halfway');
	await page.getByRole('button', { name: 'Toggle operator controls' }).click();
	const panel = page.getByTestId('operator-console');
	const start = panel.getByLabel('Start', { exact: true });
	const end = panel.getByLabel('End', { exact: true });
	await expect(start).toHaveValue('09:00');
	await expect(end).toHaveValue('11:00');
	await expect(panel.getByRole('button', { name: 'Re-space milestones' })).toHaveCount(0);

	await end.fill('12:00');
	await expect(page.getByTestId('current-phase')).toContainText('In progress');
	await panel.getByRole('tab', { name: 'Milestones' }).click();
	await panel.getByRole('button', { name: /Halfway/ }).click();
	const halfway = panel.getByLabel('Time for Halfway', { exact: true });
	await expect(halfway).toHaveValue('10:30');
	await expect(halfway).toHaveAttribute('readonly', '');
	await panel.getByRole('button', { name: /Final 30 minutes/ }).click();
	await expect(panel.getByLabel('Time for Final 30 minutes', { exact: true })).toHaveValue('11:30');

	await panel.getByRole('button', { name: '+ Add milestone' }).click();
	const custom = panel.getByLabel('Time for New milestone', { exact: true });
	await expect(custom).toBeEditable();
	await custom.fill('10:40');
	await expect(custom).toHaveValue('10:40');

	await panel.getByRole('tab', { name: 'Exam', exact: true }).click();
	await end.fill('');
	await expect(page.getByTestId('clock-time')).toHaveText(/10:12\s*:\d{2}/);
	await expect(page.getByTestId('current-phase')).toHaveCount(0);
	await expect(page.getByTestId('exam-progress-track')).toHaveCount(0);
	await expect(panel.getByRole('button', { name: '+5 min', exact: true })).toBeDisabled();
	const stored = await page.evaluate(() =>
		JSON.parse(localStorage.getItem('examDisplay.v2') ?? 'null')
	);
	expect(stored.cfg.start).toBe('09:00');
	expect(stored.cfg.end).toBeNull();
	expect(stored.cfg.milestones.find((item: { id: string }) => item.id === 'm2').time).toBe('10:30');

	await page.reload();
	await expect(page.getByTestId('clock-time')).toHaveText(/10:12\s*:\d{2}/);
	await expect(page.getByTestId('current-phase')).toHaveCount(0);
	await page.getByRole('button', { name: 'Toggle operator controls' }).click();
	await expect(end).toHaveValue('');
	await panel.getByRole('tab', { name: 'Milestones' }).click();
	await panel.getByRole('button', { name: /Halfway/ }).click();
	await expect(panel.getByLabel('Time for Halfway', { exact: true })).toHaveValue('');

	await panel.getByRole('tab', { name: 'Exam', exact: true }).click();
	await end.fill('11:00');
	await expect(page.getByTestId('current-phase')).toContainText('Halfway');
	await expect(panel.getByRole('button', { name: '+5 min', exact: true })).toBeEnabled();
});

test('saved built-in milestone times are rebuilt from the schedule', async ({ page }) => {
	await page.addInitScript(() => {
		localStorage.setItem(
			'examDisplay.v2',
			JSON.stringify({
				cfg: {
					start: '09:00',
					end: '12:00',
					milestones: [
						{ id: 'm2', time: '01:00', title: 'Edited halfway', enabled: false },
						{ id: 'custom-1', time: '09:45', title: 'Own time', enabled: true }
					]
				}
			})
		);
	});
	await page.goto('/');
	await expect(page.getByTestId('clock-time')).toHaveText(/10:12\s*:\d{2}/);
	await page.getByRole('button', { name: 'Toggle operator controls' }).click();
	const panel = page.getByTestId('operator-console');
	await panel.getByRole('tab', { name: 'Milestones' }).click();
	await panel.getByRole('button', { name: /Edited halfway/ }).click();
	await expect(panel.getByLabel('Time for Edited halfway', { exact: true })).toHaveValue('10:30');
	await panel.getByRole('button', { name: /Own time/ }).click();
	await expect(panel.getByLabel('Time for Own time', { exact: true })).toHaveValue('09:45');
});
