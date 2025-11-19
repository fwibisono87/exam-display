/**
 * Time calculation utilities for exam display
 * Handles time formatting, progress calculations, and checkpoint logic
 */

/**
 * Format time in 12-hour or 24-hour format
 */
export function formatTime(date: Date, is24Hour: boolean): string {
	if (is24Hour) {
		const hours = date.getHours().toString().padStart(2, '0');
		const minutes = date.getMinutes().toString().padStart(2, '0');
		const seconds = date.getSeconds().toString().padStart(2, '0');
		return `${hours}:${minutes}:${seconds}`;
	} else {
		let hours = date.getHours();
		const minutes = date.getMinutes().toString().padStart(2, '0');
		const seconds = date.getSeconds().toString().padStart(2, '0');
		const ampm = hours >= 12 ? 'PM' : 'AM';
		hours = hours % 12 || 12;
		return `${hours}:${minutes}:${seconds} ${ampm}`;
	}
}

/**
 * Format date for display
 */
export function formatDate(date: Date): string {
	const options: Intl.DateTimeFormatOptions = {
		weekday: 'long',
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	};
	return date.toLocaleDateString('en-US', options);
}

/**
 * Parse a time string (HH:MM format) and create a Date object for today
 */
export function parseTimeToDate(timeString: string, referenceDate: Date = new Date()): Date | null {
	if (!timeString || !timeString.includes(':')) return null;

	const [hours, minutes] = timeString.split(':').map((s) => parseInt(s.trim(), 10));
	if (isNaN(hours) || isNaN(minutes)) return null;

	const date = new Date(referenceDate);
	date.setHours(hours, minutes, 0, 0);
	return date;
}

/**
 * Calculate progress percentage between two times
 */
export function calculateProgress(
	startTime: Date,
	endTime: Date,
	currentTime: Date
): number {
	const totalDuration = endTime.getTime() - startTime.getTime();
	const elapsed = currentTime.getTime() - startTime.getTime();

	if (totalDuration <= 0) return 0;

	const progress = (elapsed / totalDuration) * 100;
	return Math.min(100, Math.max(0, Math.floor(progress)));
}

/**
 * Calculate time remaining between current time and target time
 */
export function getTimeRemaining(
	targetTime: Date,
	currentTime: Date
): { hours: number; minutes: number; seconds: number; total: number } {
	const total = targetTime.getTime() - currentTime.getTime();

	if (total <= 0) {
		return { hours: 0, minutes: 0, seconds: 0, total: 0 };
	}

	const seconds = Math.floor((total / 1000) % 60);
	const minutes = Math.floor((total / 1000 / 60) % 60);
	const hours = Math.floor(total / (1000 * 60 * 60));

	return { hours, minutes, seconds, total };
}

/**
 * Format time remaining as a readable string
 */
export function formatTimeRemaining(
	targetTime: Date,
	currentTime: Date,
	options: { showHours?: boolean; showSeconds?: boolean } = {}
): string {
	const { showHours = true, showSeconds = true } = options;
	const { hours, minutes, seconds } = getTimeRemaining(targetTime, currentTime);

	const parts: string[] = [];

	if (showHours && hours > 0) {
		parts.push(`${hours}h`);
	}

	if (minutes > 0 || (hours > 0 && seconds > 0)) {
		parts.push(`${minutes}m`);
	}

	if (showSeconds && (parts.length === 0 || seconds > 0)) {
		parts.push(`${seconds}s`);
	}

	return parts.join(' ') || '0s';
}

/**
 * Check if current time is within a time range
 */
export function isWithinTimeRange(
	currentTime: Date,
	startTime: Date,
	endTime: Date
): boolean {
	return currentTime >= startTime && currentTime <= endTime;
}

/**
 * Adjust date for times that might span midnight
 * If the time appears to be in the past but should be in the future, add a day
 * If the time appears to be in the future but should be in the past, subtract a day
 */
export function adjustDateForMidnight(
	targetDate: Date,
	currentDate: Date,
	expectInFuture: boolean = true
): Date {
	const adjusted = new Date(targetDate);

	if (expectInFuture && adjusted < currentDate) {
		// Time is in the past but should be in the future - add a day
		adjusted.setDate(adjusted.getDate() + 1);
	} else if (!expectInFuture && adjusted > currentDate) {
		// Time is in the future but should be in the past - subtract a day
		adjusted.setDate(adjusted.getDate() - 1);
	}

	return adjusted;
}

/**
 * Calculate progress between two checkpoints
 */
export function calculateCheckpointProgress(
	activeCheckpointTime: string,
	nextCheckpointTime: string,
	currentTime: Date,
	referenceDate: Date = new Date()
): number {
	const activeDate = parseTimeToDate(activeCheckpointTime, referenceDate);
	const nextDate = parseTimeToDate(nextCheckpointTime, referenceDate);

	if (!activeDate || !nextDate) return 0;

	// Adjust for midnight crossing
	const adjustedActiveDate = adjustDateForMidnight(activeDate, currentTime, false);
	const adjustedNextDate = adjustDateForMidnight(nextDate, currentTime, true);

	return calculateProgress(adjustedActiveDate, adjustedNextDate, currentTime);
}

/**
 * Get a formatted timezone string
 */
export function getTimezoneString(date: Date = new Date()): string {
	const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
	const offset = -date.getTimezoneOffset();
	const sign = offset >= 0 ? '+' : '-';
	const hours = Math.floor(Math.abs(offset) / 60)
		.toString()
		.padStart(2, '0');
	const minutes = (Math.abs(offset) % 60).toString().padStart(2, '0');

	return `${timezone} (UTC${sign}${hours}:${minutes})`;
}

/**
 * Create a Date object with server time offset applied
 */
export function getServerTime(clientTime: Date, serverOffset: number): Date {
	return new Date(clientTime.getTime() + serverOffset);
}

/**
 * Calculate the offset between server and client time
 */
export function calculateTimeOffset(serverTimestamp: number, clientTimestamp: number): number {
	return serverTimestamp - clientTimestamp;
}
