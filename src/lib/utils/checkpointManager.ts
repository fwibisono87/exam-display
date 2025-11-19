/**
 * Checkpoint management utilities
 * Handles checkpoint logic, sorting, and active checkpoint determination
 */

export interface Checkpoint {
	id: string;
	name: string;
	time: string;
	enabled: boolean;
	emoji: string;
	color: string;
	isCustom: boolean;
}

/**
 * Sort checkpoints by time
 */
export function sortCheckpointsByTime(checkpoints: Checkpoint[]): Checkpoint[] {
	return [...checkpoints]
		.filter((cp) => cp.enabled && cp.time)
		.sort((a, b) => {
			const [hoursA, minutesA] = a.time.split(':').map(Number);
			const [hoursB, minutesB] = b.time.split(':').map(Number);
			const timeA = hoursA * 60 + minutesA;
			const timeB = hoursB * 60 + minutesB;
			return timeA - timeB;
		});
}

/**
 * Find the active checkpoint (most recent checkpoint that has passed)
 */
export function findActiveCheckpoint(
	checkpoints: Checkpoint[],
	currentTime: Date
): Checkpoint | null {
	const sortedCheckpoints = sortCheckpointsByTime(checkpoints);
	const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();

	let activeCheckpoint: Checkpoint | null = null;

	for (const checkpoint of sortedCheckpoints) {
		const [hours, minutes] = checkpoint.time.split(':').map(Number);
		const checkpointMinutes = hours * 60 + minutes;

		if (checkpointMinutes <= currentMinutes) {
			activeCheckpoint = checkpoint;
		} else {
			break;
		}
	}

	return activeCheckpoint;
}

/**
 * Find the next upcoming checkpoint
 */
export function findNextCheckpoint(
	checkpoints: Checkpoint[],
	currentTime: Date
): Checkpoint | null {
	const sortedCheckpoints = sortCheckpointsByTime(checkpoints);
	const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();

	for (const checkpoint of sortedCheckpoints) {
		const [hours, minutes] = checkpoint.time.split(':').map(Number);
		const checkpointMinutes = hours * 60 + minutes;

		if (checkpointMinutes > currentMinutes) {
			return checkpoint;
		}
	}

	return null;
}

/**
 * Get all enabled checkpoints combined (built-in + custom)
 */
export function getAllCheckpoints(
	builtInCheckpoints: Checkpoint[],
	customCheckpoints: Checkpoint[]
): Checkpoint[] {
	return [...builtInCheckpoints, ...customCheckpoints].filter((cp) => cp.enabled);
}

/**
 * Create a new custom checkpoint
 */
export function createCustomCheckpoint(
	name: string,
	time: string,
	emoji: string = '📌',
	color: string = '#6366F1'
): Checkpoint {
	return {
		id: `custom-${Date.now()}`,
		name,
		time,
		enabled: true,
		emoji,
		color,
		isCustom: true
	};
}

/**
 * Validate checkpoint time format (HH:MM)
 */
export function isValidTimeFormat(time: string): boolean {
	const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
	return timeRegex.test(time);
}

/**
 * Validate that checkpoint times are in logical order
 */
export function validateCheckpointOrder(
	checkpoints: Checkpoint[],
	examStartTime: string,
	examEndTime: string
): { valid: boolean; errors: string[] } {
	const errors: string[] = [];

	if (!examStartTime || !examEndTime) {
		errors.push('Exam start and end times must be set');
		return { valid: false, errors };
	}

	const [startHours, startMinutes] = examStartTime.split(':').map(Number);
	const [endHours, endMinutes] = examEndTime.split(':').map(Number);
	const startMinutesTotal = startHours * 60 + startMinutes;
	const endMinutesTotal = endHours * 60 + endMinutes;

	if (startMinutesTotal >= endMinutesTotal) {
		errors.push('Exam end time must be after start time');
	}

	const sortedCheckpoints = sortCheckpointsByTime(checkpoints);

	for (const checkpoint of sortedCheckpoints) {
		const [hours, minutes] = checkpoint.time.split(':').map(Number);
		const checkpointMinutes = hours * 60 + minutes;

		if (checkpointMinutes < startMinutesTotal) {
			errors.push(`${checkpoint.name} is before exam start time`);
		}

		if (checkpointMinutes > endMinutesTotal) {
			errors.push(`${checkpoint.name} is after exam end time`);
		}
	}

	return { valid: errors.length === 0, errors };
}

/**
 * Get default checkpoint colors
 */
export const DEFAULT_CHECKPOINT_COLORS = {
	midpoint: '#3B82F6', // blue
	warning: '#F59E0B', // amber
	alert: '#EF4444', // red
	critical: '#DC2626', // dark red
	custom: '#6366F1' // indigo
};

/**
 * Get default checkpoint emojis
 */
export const DEFAULT_CHECKPOINT_EMOJIS = {
	midpoint: '⏰',
	warning: '⚠️',
	alert: '🔔',
	critical: '🚨',
	custom: '📌'
};

/**
 * Calculate automatic checkpoint times based on exam duration
 */
export function calculateAutoCheckpoints(
	examStartTime: string,
	examEndTime: string
): {
	midpoint: string;
	final30: string;
	final15: string;
	final5: string;
} {
	const [startHours, startMinutes] = examStartTime.split(':').map(Number);
	const [endHours, endMinutes] = examEndTime.split(':').map(Number);

	const startTotalMinutes = startHours * 60 + startMinutes;
	const endTotalMinutes = endHours * 60 + endMinutes;
	const durationMinutes = endTotalMinutes - startTotalMinutes;

	const formatTime = (totalMinutes: number): string => {
		const hours = Math.floor(totalMinutes / 60);
		const minutes = totalMinutes % 60;
		return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
	};

	return {
		midpoint: formatTime(startTotalMinutes + Math.floor(durationMinutes / 2)),
		final30: formatTime(endTotalMinutes - 30),
		final15: formatTime(endTotalMinutes - 15),
		final5: formatTime(endTotalMinutes - 5)
	};
}
