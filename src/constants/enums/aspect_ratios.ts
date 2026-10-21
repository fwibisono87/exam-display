export enum EAspectRatio {
	AUTO = 'auto',
	WIDESCREEN_16_9 = '16:9',
	WIDESCREEN_16_10 = '16:10',
	STANDARD_4_3 = '4:3'
}

export { EAspectRatio as AspectRatio };

export type TAspectRatioValue = EAspectRatio | `${EAspectRatio}`;

export interface IAspectOption {
	id: EAspectRatio;
	label: string;
}

export const DEFAULT_ASPECT_RATIO: EAspectRatio = EAspectRatio.AUTO;

export const ASPECT_RATIOS: readonly EAspectRatio[] = [
	EAspectRatio.AUTO,
	EAspectRatio.WIDESCREEN_16_9,
	EAspectRatio.WIDESCREEN_16_10,
	EAspectRatio.STANDARD_4_3
];

export const ASPECT_OPTIONS: readonly IAspectOption[] = [
	{ id: EAspectRatio.AUTO, label: 'Auto' },
	{ id: EAspectRatio.WIDESCREEN_16_9, label: EAspectRatio.WIDESCREEN_16_9 },
	{ id: EAspectRatio.WIDESCREEN_16_10, label: EAspectRatio.WIDESCREEN_16_10 },
	{ id: EAspectRatio.STANDARD_4_3, label: EAspectRatio.STANDARD_4_3 }
];

export const CANVAS_HEIGHT_PX = 1080;
export const CANVAS_WIDTH_16_9_PX = 1920;
export const CANVAS_WIDTH_16_10_PX = 1728;
export const CANVAS_WIDTH_4_3_PX = 1440;
export const MIN_DYNAMIC_CANVAS_WIDTH_PX = 1280;
export const MAX_DYNAMIC_CANVAS_WIDTH_PX = 2880;
export const NARROW_CANVAS_MAX_WIDTH_PX = 1560;

export function isAllowedAspectRatio(value: unknown): value is EAspectRatio {
	return typeof value === 'string' && (ASPECT_RATIOS as readonly string[]).includes(value);
}
