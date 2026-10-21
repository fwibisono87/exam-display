export type TAnnouncementPosition = 'top' | 'left';
export type AnnouncementPosition = TAnnouncementPosition;

export type TTimeSource = 'error' | 'ntp' | 'ntp_partial';
export type TimeSource = TTimeSource;

export interface ICheckpoint {
	id: string;
	name: string;
	time: string;
	enabled: boolean;
	emoji: string;
	color: string;
	isCustom: boolean;
}
export type Checkpoint = ICheckpoint;

export interface INtpInfo {
	server?: string;
	offset?: number;
	delay?: number;
	error?: string;
	errorDetails?: string;
	hasValidMetrics?: boolean;
}
export type NtpInfo = INtpInfo;

export interface ITimeResponse {
	time?: string;
	timestamp?: number;
	timezone: string;
	localTime?: string;
	timeSource?: TTimeSource;
	ntp?: INtpInfo;
	status: string;
	debug?: {
		ntpServerConfigured: boolean;
		ntpServerValue: string | null;
		serverTimeSource: string;
	};
}
export type TimeResponse = ITimeResponse;

export interface IHealthResponse {
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
export type HealthResponse = IHealthResponse;

export interface IPersistedSettings {
	examStartTime: string;
	examEndTime: string;
	examMidpointTime: string;
	final30Time: string;
	final15Time: string;
	final5Time: string;
	checkpoints: ICheckpoint[];
	customCheckpoints: ICheckpoint[];
	customTitle: string;
	showTitle: boolean;
	announcementPosition: TAnnouncementPosition;
	announcementFontSize: number;
	is24Hour: boolean;
	highContrastMode: boolean;
	showAnnouncements: boolean;
	showDate: boolean;
	showTimezone: boolean;
	bottomDeadZoneVh: number;
}
export type PersistedSettings = IPersistedSettings;
