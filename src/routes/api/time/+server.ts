import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

export const GET: RequestHandler = async () => {
	// Get timezone from environment variable, fallback to system timezone
	const configuredTimezone = env.TIMEZONE || Intl.DateTimeFormat().resolvedOptions().timeZone;
	
	// Create date in the configured timezone
	const now = new Date();
	const serverTime = now.toISOString();
	
	// Format time in the configured timezone for display
	const timeInTimezone = now.toLocaleString('en-US', {
		timeZone: configuredTimezone,
		hour12: false,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit'
	});
	
	return json({
		time: serverTime,
		timestamp: Date.now(),
		timezone: configuredTimezone,
		localTime: timeInTimezone,
		status: 'healthy'
	});
};
