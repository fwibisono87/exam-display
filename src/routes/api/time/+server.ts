import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

interface NTPResult {
	time: Date;
	offset: number;
	delay: number;
}

interface NTPError {
	error: string;
	details?: string;
}

async function getNTPTime(server: string): Promise<NTPResult | NTPError | null> {
	try {
		// @ts-ignore - ntp-client is not typed
		const ntpClient = await import('ntp-client');
		
		return new Promise((resolve) => {
			// Set a timeout for the NTP request
			const timeout = setTimeout(() => {
				console.warn(`NTP timeout: No response from ${server} within 5 seconds`);
				resolve({ 
					error: 'timeout', 
					details: `No response from ${server} within 5 seconds` 
				});
			}, 5000); // 5 second timeout
			
			ntpClient.getNetworkTime(server, 123, (err: Error | null, date: Date, offset: number, delay: number) => {
				clearTimeout(timeout);
				if (err) {
					console.warn(`NTP sync failed with ${server}:`, err.message);
					resolve({ 
						error: 'connection_failed', 
						details: err.message 
					});
				} else {
					console.log(`NTP sync successful with ${server}: offset=${offset}ms, delay=${delay}ms`);
					resolve({ time: date, offset, delay });
				}
			});
		});
	} catch (error) {
		console.warn('NTP client not available:', error);
		return { 
			error: 'client_unavailable', 
			details: error instanceof Error ? error.message : 'Unknown error loading NTP client' 
		};
	}
}

export const GET: RequestHandler = async () => {
	// Get configuration from environment variables
	const configuredTimezone = env.TIMEZONE || Intl.DateTimeFormat().resolvedOptions().timeZone;
	const ntpServer = env.NTP_SERVER?.trim();
	
	let serverTime: Date;
	let timeSource = 'local';
	let ntpInfo: { 
		server?: string; 
		offset?: number; 
		delay?: number; 
		error?: string; 
		errorDetails?: string; 
	} = {};
	
	// Try to get time from NTP server if configured
	if (ntpServer) {
		const ntpResult = await getNTPTime(ntpServer);
		if (ntpResult && 'time' in ntpResult) {
			// Successful NTP sync
			serverTime = ntpResult.time;
			timeSource = 'ntp';
			ntpInfo = {
				server: ntpServer,
				offset: Math.round(ntpResult.offset),
				delay: Math.round(ntpResult.delay)
			};
		} else {
			// NTP failed with error information
			serverTime = new Date();
			timeSource = 'local_fallback';
			ntpInfo = { 
				server: ntpServer,
				error: ntpResult?.error || 'unknown',
				errorDetails: ntpResult?.details || 'NTP sync failed'
			};
		}
	} else {
		// Use application server time
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
