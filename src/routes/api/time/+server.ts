import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

interface NTPResult {
	time: Date;
	offset: number;
	delay: number;
}

async function getNTPTime(server: string): Promise<NTPResult | null> {
	try {
		// @ts-ignore - ntp-client is not typed
		const ntpClient = await import('ntp-client');
		
		return new Promise((resolve) => {
			// Set a timeout for the NTP request
			const timeout = setTimeout(() => {
				resolve(null);
			}, 5000); // 5 second timeout
			
			ntpClient.getNetworkTime(server, 123, (err: Error | null, date: Date, offset: number, delay: number) => {
				clearTimeout(timeout);
				if (err) {
					console.warn(`NTP sync failed with ${server}:`, err.message);
					resolve(null);
				} else {
					resolve({ time: date, offset, delay });
				}
			});
		});
	} catch (error) {
		console.warn('NTP client not available:', error);
		return null;
	}
}

export const GET: RequestHandler = async () => {
	// Get configuration from environment variables
	const configuredTimezone = env.TIMEZONE || Intl.DateTimeFormat().resolvedOptions().timeZone;
	const ntpServer = env.NTP_SERVER?.trim();
	
	let serverTime: Date;
	let timeSource = 'local';
	let ntpInfo: { server?: string; offset?: number; delay?: number } = {};
	
	// Try to get time from NTP server if configured
	if (ntpServer) {
		const ntpResult = await getNTPTime(ntpServer);
		if (ntpResult) {
			serverTime = ntpResult.time;
			timeSource = 'ntp';
			ntpInfo = {
				server: ntpServer,
				offset: Math.round(ntpResult.offset),
				delay: Math.round(ntpResult.delay)
			};
		} else {
			// Fallback to local time if NTP fails
			serverTime = new Date();
			timeSource = 'local_fallback';
			ntpInfo = { server: ntpServer };
		}
	} else {
		// Use local server time
		serverTime = new Date();
	}
	
	// Format time in the configured timezone for display
	const timeInTimezone = serverTime.toLocaleString('en-US', {
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
		time: serverTime.toISOString(),
		timestamp: serverTime.getTime(),
		timezone: configuredTimezone,
		localTime: timeInTimezone,
		timeSource,
		ntp: ntpInfo,
		status: 'healthy'
	});
};
