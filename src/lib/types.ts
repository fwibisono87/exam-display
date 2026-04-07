export type AnnouncementPosition = 'top' | 'left';

export type TimeSource = 'error' | 'ntp' | 'ntp_partial';

export interface Checkpoint {
	id: string;
	name: string;
	time: string;
	enabled: boolean;
	emoji: string;
	color: string;
	isCustom: boolean;
}

export interface NtpInfo {
	server?: string;
	offset?: number;
	delay?: number;
	error?: string;
	errorDetails?: string;
	hasValidMetrics?: boolean;
}

export interface TimeResponse {
	time?: string;
	timestamp?: number;
	timezone: string;
	localTime?: string;
	timeSource?: TimeSource;
	ntp?: NtpInfo;
	status: string;
	debug?: {
		ntpServerConfigured: boolean;
		ntpServerValue: string | null;
		serverTimeSource: string;
	};
}

export interface HealthResponse {
	status: string;
	timestamp: string;
	checks: {
		server: string;
		database: string;
		memory: string;
		uptime: number | string;
		responseTime: number;
	};
	version: string;
}

export interface PersistedSettings {
	examStartTime: string;
	examEndTime: string;
	examMidpointTime: string;
	final30Time: string;
	final15Time: string;
	final5Time: string;
	checkpoints: Checkpoint[];
	customCheckpoints: Checkpoint[];
	customTitle: string;
	announcementPosition: AnnouncementPosition;
	announcementFontSize: number;
	is24Hour: boolean;
	highContrastMode: boolean;
	showAnnouncements: boolean;
	showDate: boolean;
	showTimezone: boolean;
	bottomDeadZoneVh: number;
}
