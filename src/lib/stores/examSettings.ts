/**
 * Svelte stores for exam display settings
 * Handles persistent storage and state management
 */

import { writable, derived, get } from 'svelte/store';
import type { Writable, Readable } from 'svelte/store';
import type { Checkpoint } from '$lib/utils/checkpointManager';
import { findActiveCheckpoint, findNextCheckpoint, getAllCheckpoints } from '$lib/utils/checkpointManager';

// Type definitions
export interface ExamSettings {
	customTitle: string;
	examStartTime: string;
	examEndTime: string;
	showDate: boolean;
	showTimezone: boolean;
	is24Hour: boolean;
	highContrastMode: boolean;
}

export interface AnnouncementSettings {
	content: string;
	show: boolean;
	position: 'top' | 'left' | 'bottom' | 'overlay';
	fontSize: number;
	priority: 'info' | 'warning' | 'critical';
}

export interface NTPInfo {
	server?: string;
	offset?: number;
	delay?: number;
	error?: string;
	errorDetails?: string;
	hasValidMetrics?: boolean;
}

// Exam settings store
function createExamSettingsStore() {
	const defaultSettings: ExamSettings = {
		customTitle: 'Exam Time Display',
		examStartTime: '',
		examEndTime: '',
		showDate: false,
		showTimezone: false,
		is24Hour: true,
		highContrastMode: false
	};

	const { subscribe, set, update } = writable<ExamSettings>(defaultSettings);

	return {
		subscribe,
		set,
		update,
		load: () => {
			if (typeof window === 'undefined') return;

			const saved = localStorage.getItem('examSettings');
			if (saved) {
				try {
					const parsed = JSON.parse(saved);
					update((current) => ({ ...current, ...parsed }));
				} catch (error) {
					console.error('Error loading exam settings:', error);
				}
			}
		},
		save: () => {
			if (typeof window === 'undefined') return;

			const current = get({ subscribe });
			localStorage.setItem('examSettings', JSON.stringify(current));
		},
		reset: () => {
			set(defaultSettings);
			if (typeof window !== 'undefined') {
				localStorage.removeItem('examSettings');
			}
		}
	};
}

// Announcement settings store
function createAnnouncementStore() {
	const defaultSettings: AnnouncementSettings = {
		content: '',
		show: true,
		position: 'top',
		fontSize: 16,
		priority: 'info'
	};

	const { subscribe, set, update } = writable<AnnouncementSettings>(defaultSettings);

	return {
		subscribe,
		set,
		update,
		load: () => {
			if (typeof window === 'undefined') return;

			const content = localStorage.getItem('examAnnouncements') || '';
			const position = (localStorage.getItem('announcementPosition') || 'top') as 'top' | 'left' | 'bottom' | 'overlay';
			const fontSize = parseInt(localStorage.getItem('announcementFontSize') || '16', 10);
			const show = localStorage.getItem('showAnnouncements') !== 'false';
			const priority = (localStorage.getItem('announcementPriority') || 'info') as 'info' | 'warning' | 'critical';

			update((current) => ({
				...current,
				content,
				position,
				fontSize,
				show,
				priority
			}));
		},
		save: () => {
			if (typeof window === 'undefined') return;

			const current = get({ subscribe });
			localStorage.setItem('examAnnouncements', current.content);
			localStorage.setItem('announcementPosition', current.position);
			localStorage.setItem('announcementFontSize', current.fontSize.toString());
			localStorage.setItem('showAnnouncements', current.show.toString());
			localStorage.setItem('announcementPriority', current.priority);
		},
		reset: () => {
			set(defaultSettings);
			if (typeof window !== 'undefined') {
				localStorage.removeItem('examAnnouncements');
				localStorage.removeItem('announcementPosition');
				localStorage.removeItem('announcementFontSize');
				localStorage.removeItem('showAnnouncements');
				localStorage.removeItem('announcementPriority');
			}
		}
	};
}

// Checkpoints store
function createCheckpointsStore() {
	const defaultCheckpoints: Checkpoint[] = [
		{
			id: 'midpoint',
			name: 'Exam Midpoint',
			time: '',
			enabled: true,
			emoji: '⏰',
			color: '#3B82F6',
			isCustom: false
		},
		{
			id: 'final30',
			name: 'Final 30 Minutes',
			time: '',
			enabled: true,
			emoji: '⚠️',
			color: '#F59E0B',
			isCustom: false
		},
		{
			id: 'final15',
			name: 'Final 15 Minutes',
			time: '',
			enabled: true,
			emoji: '🔔',
			color: '#EF4444',
			isCustom: false
		},
		{
			id: 'final5',
			name: 'Final 5 Minutes',
			time: '',
			enabled: true,
			emoji: '🚨',
			color: '#DC2626',
			isCustom: false
		}
	];

	const builtIn = writable<Checkpoint[]>(defaultCheckpoints);
	const custom = writable<Checkpoint[]>([]);

	// Derived store for all checkpoints combined
	const all = derived([builtIn, custom], ([$builtIn, $custom]) => {
		return getAllCheckpoints($builtIn, $custom);
	});

	return {
		builtIn: {
			subscribe: builtIn.subscribe,
			set: builtIn.set,
			update: builtIn.update
		},
		custom: {
			subscribe: custom.subscribe,
			set: custom.set,
			update: custom.update,
			add: (checkpoint: Checkpoint) => {
				custom.update((checkpoints) => [...checkpoints, checkpoint]);
			},
			remove: (id: string) => {
				custom.update((checkpoints) => checkpoints.filter((cp) => cp.id !== id));
			}
		},
		all: {
			subscribe: all.subscribe
		},
		load: () => {
			if (typeof window === 'undefined') return;

			// Load built-in checkpoints
			const savedBuiltIn = localStorage.getItem('checkpoints');
			if (savedBuiltIn) {
				try {
					const parsed = JSON.parse(savedBuiltIn);
					builtIn.set(parsed);
				} catch (error) {
					console.error('Error loading checkpoints:', error);
				}
			}

			// Load custom checkpoints
			const savedCustom = localStorage.getItem('customCheckpoints');
			if (savedCustom) {
				try {
					const parsed = JSON.parse(savedCustom);
					custom.set(parsed);
				} catch (error) {
					console.error('Error loading custom checkpoints:', error);
				}
			}
		},
		save: () => {
			if (typeof window === 'undefined') return;

			const builtInCheckpoints = get(builtIn);
			const customCheckpoints = get(custom);

			localStorage.setItem('checkpoints', JSON.stringify(builtInCheckpoints));
			localStorage.setItem('customCheckpoints', JSON.stringify(customCheckpoints));
		},
		reset: () => {
			builtIn.set(defaultCheckpoints);
			custom.set([]);
			if (typeof window !== 'undefined') {
				localStorage.removeItem('checkpoints');
				localStorage.removeItem('customCheckpoints');
			}
		}
	};
}

// Current time store
export const currentTime = writable<Date | null>(null);

// Server time offset store
export const serverTimeOffset = writable<number>(0);

// NTP info store
export const ntpInfo = writable<NTPInfo>({});

// Time source store
export const timeSource = writable<string>('local');

// Force NTP setting
export const forceNTP = writable<boolean>(false);

// Health status stores
export const healthStatus = writable<string>('checking...');
export const lastHealthCheck = writable<string>('');
export const responseTime = writable<number>(0);

// UI state stores
export const showOperatorSidebar = writable<boolean>(false);
export const isEditingAnnouncements = writable<boolean>(false);

// Create store instances
export const examSettings = createExamSettingsStore();
export const announcementSettings = createAnnouncementStore();
export const checkpoints = createCheckpointsStore();

// Derived stores for active and next checkpoints
export const activeCheckpoint = derived(
	[checkpoints.all, currentTime],
	([$checkpoints, $currentTime]) => {
		if (!$currentTime) return null;
		return findActiveCheckpoint($checkpoints, $currentTime);
	}
);

export const nextCheckpoint = derived(
	[checkpoints.all, currentTime],
	([$checkpoints, $currentTime]) => {
		if (!$currentTime) return null;
		return findNextCheckpoint($checkpoints, $currentTime);
	}
);

// Export/Import functionality
export function exportSettings(): string {
	const settings = {
		exam: get(examSettings),
		announcements: get(announcementSettings),
		checkpoints: {
			builtIn: get(checkpoints.builtIn),
			custom: get(checkpoints.custom)
		},
		exportedAt: new Date().toISOString(),
		version: '1.0'
	};

	return JSON.stringify(settings, null, 2);
}

export function importSettings(jsonString: string): { success: boolean; error?: string } {
	try {
		const settings = JSON.parse(jsonString);

		if (settings.exam) {
			examSettings.set(settings.exam);
			examSettings.save();
		}

		if (settings.announcements) {
			announcementSettings.set(settings.announcements);
			announcementSettings.save();
		}

		if (settings.checkpoints) {
			if (settings.checkpoints.builtIn) {
				checkpoints.builtIn.set(settings.checkpoints.builtIn);
			}
			if (settings.checkpoints.custom) {
				checkpoints.custom.set(settings.checkpoints.custom);
			}
			checkpoints.save();
		}

		return { success: true };
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Failed to import settings'
		};
	}
}

export function resetAllSettings(): void {
	examSettings.reset();
	announcementSettings.reset();
	checkpoints.reset();
}
