import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { time as getSntpTime } from '@hapi/sntp';
import type { NtpInfo, TimeResponse, TimeSource } from '$lib/types';

const ENFORCED_NTP_SERVER = 'ntp.ui.ac.id';
const NTP_TIMEOUT_MS = 5000;

interface NTPResult {
	time: Date;
	offset: number;
	delay: number;
	hasValidMetrics: boolean;
}

interface NTPError {
	error: string;
	details?: string;
}

async function getNTPTime(server: string): Promise<NTPResult | NTPError> {
	try {
		const result = await getSntpTime({
			host: server,
			port: 123,
			timeout: NTP_TIMEOUT_MS
		});

		if (!result.isValid || !Number.isFinite(result.transmitTimestamp)) {
			return {
				error: 'invalid_response',
				details: 'SNTP server returned an invalid response'
			};
		}

		return {
			time: new Date(result.transmitTimestamp),
			offset: result.t,
			delay: result.d,
			hasValidMetrics: Number.isFinite(result.t) && Number.isFinite(result.d)
		};
	} catch (error) {
		const details = error instanceof Error ? error.message : 'Unknown SNTP error';

		if (details.toLowerCase().includes('timeout')) {
			return {
				error: 'timeout',
				details
			};
		}

		return {
			error: 'connection_failed',
			details
		};
	}
}

export const GET: RequestHandler = async () => {
	const configuredTimezone = env.TIMEZONE || Intl.DateTimeFormat().resolvedOptions().timeZone;
	const ntpServer = ENFORCED_NTP_SERVER;

	let serverTime: Date | null = null;
	let timeSource: TimeSource = 'error';
	let ntpInfo: NtpInfo = { server: ntpServer };

	const ntpResult = await getNTPTime(ntpServer);

	if ('time' in ntpResult && ntpResult.time) {
		serverTime = ntpResult.time;
		timeSource = ntpResult.hasValidMetrics ? 'ntp' : 'ntp_partial';
		ntpInfo = {
			server: ntpServer,
			hasValidMetrics: ntpResult.hasValidMetrics
		};

		if (Number.isFinite(ntpResult.offset)) {
			ntpInfo.offset = Math.round(ntpResult.offset);
		}

		if (Number.isFinite(ntpResult.delay)) {
			ntpInfo.delay = Math.round(ntpResult.delay);
		}
	} else {
		const ntpError = ntpResult as NTPError;

		ntpInfo = {
			server: ntpServer,
			error: ntpError.error,
			errorDetails: ntpError.details
		};

		const response: TimeResponse = {
			timezone: configuredTimezone,
			timeSource,
			ntp: ntpInfo,
			status: 'unhealthy',
			debug: {
				ntpServerConfigured: true,
				ntpServerValue: ntpServer,
				serverTimeSource: 'unavailable'
			}
		};

		return json(response, { status: 503 });
	}

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

	const response: TimeResponse = {
		time: serverTime.toISOString(),
		timestamp: serverTime.getTime(),
		timezone: configuredTimezone,
		localTime: timeInTimezone,
		timeSource,
		ntp: ntpInfo,
		status: 'healthy',
		debug: {
			ntpServerConfigured: true,
			ntpServerValue: ntpServer,
			serverTimeSource: serverTime.constructor.name
		}
	};

	return json(response);
};
