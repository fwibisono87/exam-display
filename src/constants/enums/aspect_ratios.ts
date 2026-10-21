export enum AspectRatio {
	AUTO = 'auto',
	WIDESCREEN_16_9 = '16:9',
	WIDESCREEN_16_10 = '16:10',
	STANDARD_4_3 = '4:3'
}

export const DEFAULT_ASPECT_RATIO: AspectRatio = AspectRatio.AUTO;

export const ASPECT_RATIOS: readonly AspectRatio[] = [
	AspectRatio.AUTO,
	AspectRatio.WIDESCREEN_16_9,
	AspectRatio.WIDESCREEN_16_10,
	AspectRatio.STANDARD_4_3
];

export const ASPECT_OPTIONS: readonly { id: AspectRatio; label: string }[] = [
	{ id: AspectRatio.AUTO, label: 'Auto' },
	{ id: AspectRatio.WIDESCREEN_16_9, label: AspectRatio.WIDESCREEN_16_9 },
	{ id: AspectRatio.WIDESCREEN_16_10, label: AspectRatio.WIDESCREEN_16_10 },
	{ id: AspectRatio.STANDARD_4_3, label: AspectRatio.STANDARD_4_3 }
];

export const CANVAS_HEIGHT_PX = 1080;
export const CANVAS_WIDTH_16_9_PX = 1920;
export const CANVAS_WIDTH_16_10_PX = 1728;
export const CANVAS_WIDTH_4_3_PX = 1440;
export const MIN_DYNAMIC_CANVAS_WIDTH_PX = 1280;
export const MAX_DYNAMIC_CANVAS_WIDTH_PX = 2880;
export const NARROW_CANVAS_MAX_WIDTH_PX = 1560;

export function isAllowedAspectRatio(value: unknown): value is AspectRatio {
	return typeof value === 'string' && (ASPECT_RATIOS as readonly string[]).includes(value);
}

