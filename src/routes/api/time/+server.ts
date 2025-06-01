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
					// Log all returned values for debugging
					console.log(`NTP client returned: date=${date}, offset=${offset}, delay=${delay}, types: date=${typeof date}, offset=${typeof offset}, delay=${typeof delay}`);
					
					// Validate that we received proper values
					if (!date || typeof offset !== 'number' || typeof delay !== 'number' || isNaN(offset) || isNaN(delay)) {
						console.warn(`NTP sync returned invalid data from ${server}: date=${date}, offset=${offset}, delay=${delay}`);
						resolve({ 
							error: 'invalid_response', 
							details: `Server returned invalid data: date=${date}, offset=${offset} (${typeof offset}), delay=${delay} (${typeof delay})` 
						});
					} else {
						console.log(`NTP sync successful with ${server}: offset=${offset}ms, delay=${delay}ms`);
						resolve({ time: date, offset, delay });
					}
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
		console.log(`Attempting NTP sync with server: ${ntpServer}`);
		const ntpResult = await getNTPTime(ntpServer);
		
		console.log(`NTP result:`, ntpResult);
		
		if (ntpResult && 'time' in ntpResult && ntpResult.time) {
			// Successful NTP sync
			console.log(`Using NTP time from ${ntpServer}`);
			serverTime = ntpResult.time;
			timeSource = 'ntp';
			ntpInfo = {
				server: ntpServer,
				offset: Math.round(ntpResult.offset),
				delay: Math.round(ntpResult.delay)
			};
		} else if (ntpResult && 'error' in ntpResult) {
			// NTP failed with error information
			console.warn(`NTP sync failed, falling back to local time. Error: ${ntpResult.error}, Details: ${ntpResult.details}`);
			serverTime = new Date();
			timeSource = 'local_fallback';
			ntpInfo = { 
				server: ntpServer,
				error: ntpResult.error,
				errorDetails: ntpResult.details
			};
		} else {
			// Unexpected result
			console.warn(`NTP sync returned unexpected result:`, ntpResult);
			serverTime = new Date();
			timeSource = 'local_fallback';
			ntpInfo = { 
				server: ntpServer,
				error: 'unexpected_result',
				errorDetails: `NTP client returned unexpected result: ${JSON.stringify(ntpResult)}`
			};
		}
	} else {
		// Use application server time
		console.log('No NTP server configured, using local time');
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
		status: 'healthy',
		debug: {
			ntpServerConfigured: !!ntpServer,
			ntpServerValue: ntpServer || null,
			serverTimeSource: serverTime.constructor.name
		}
	});
};
