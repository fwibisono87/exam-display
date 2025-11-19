/**
 * Color utility functions for WCAG-compliant contrast calculations
 * Based on WCAG 2.1 guidelines for accessible color contrast
 */

/**
 * Parse a color string (hex, rgb, rgba) and return RGB values
 */
function parseColor(color: string): { r: number; g: number; b: number } | null {
	// Handle rgba format
	if (color.startsWith('rgba') || color.startsWith('rgb')) {
		const matches = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
		if (!matches) return null;

		return {
			r: parseInt(matches[1]),
			g: parseInt(matches[2]),
			b: parseInt(matches[3])
		};
	}

	// Handle hex format
	let hexColor = color.replace(/^#/, '');

	// Convert 3-digit hex to 6-digit
	if (hexColor.length === 3) {
		hexColor = hexColor[0] + hexColor[0] + hexColor[1] + hexColor[1] + hexColor[2] + hexColor[2];
	}

	if (hexColor.length !== 6) return null;

	return {
		r: parseInt(hexColor.substring(0, 2), 16),
		g: parseInt(hexColor.substring(2, 4), 16),
		b: parseInt(hexColor.substring(4, 6), 16)
	};
}

/**
 * Calculate relative luminance using WCAG 2.1 formula
 * https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */
function getRelativeLuminance(r: number, g: number, b: number): number {
	// Convert to 0-1 range
	const rsRGB = r / 255;
	const gsRGB = g / 255;
	const bsRGB = b / 255;

	// Apply gamma correction
	const rLinear = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
	const gLinear = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
	const bLinear = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);

	// Calculate relative luminance
	return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

/**
 * Calculate contrast ratio between two colors
 * https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio
 */
export function getContrastRatio(color1: string, color2: string): number {
	const rgb1 = parseColor(color1);
	const rgb2 = parseColor(color2);

	if (!rgb1 || !rgb2) return 1;

	const l1 = getRelativeLuminance(rgb1.r, rgb1.g, rgb1.b);
	const l2 = getRelativeLuminance(rgb2.r, rgb2.g, rgb2.b);

	const lighter = Math.max(l1, l2);
	const darker = Math.min(l1, l2);

	return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Get the best text color (black or white) for a given background color
 * Ensures WCAG AA compliance (minimum 4.5:1 for normal text, 3:1 for large text)
 */
export function getTextColorForBackground(
	bgColor: string,
	options: {
		preferWhite?: boolean;
		largeText?: boolean;
		defaultColor?: string;
	} = {}
): string {
	const { preferWhite = false, largeText = false, defaultColor = '#FFFFFF' } = options;

	const rgb = parseColor(bgColor);
	if (!rgb) return defaultColor;

	const whiteContrast = getContrastRatio(bgColor, '#FFFFFF');
	const blackContrast = getContrastRatio(bgColor, '#000000');

	// WCAG AA requires 4.5:1 for normal text, 3:1 for large text
	const minContrast = largeText ? 3 : 4.5;

	// If both meet the requirement, use preference or choose the higher contrast
	if (whiteContrast >= minContrast && blackContrast >= minContrast) {
		if (preferWhite) return '#FFFFFF';
		return whiteContrast > blackContrast ? '#FFFFFF' : '#000000';
	}

	// Return the one with better contrast
	return whiteContrast > blackContrast ? '#FFFFFF' : '#000000';
}

/**
 * Check if a color combination meets WCAG standards
 */
export function meetsWCAGStandard(
	foreground: string,
	background: string,
	level: 'AA' | 'AAA' = 'AA',
	largeText: boolean = false
): boolean {
	const ratio = getContrastRatio(foreground, background);

	if (level === 'AAA') {
		return largeText ? ratio >= 4.5 : ratio >= 7;
	}

	// AA level
	return largeText ? ratio >= 3 : ratio >= 4.5;
}

/**
 * Get a readable text color with optimal contrast
 * Returns an object with color and optional text shadow for enhanced readability
 */
export function getReadableTextColor(
	bgColor: string,
	options: {
		largeText?: boolean;
		addShadow?: boolean;
	} = {}
): { color: string; textShadow: string } {
	const { largeText = false, addShadow = false } = options;

	const textColor = getTextColorForBackground(bgColor, { largeText });

	// Add a subtle shadow only if requested and it improves readability
	let textShadow = 'none';
	if (addShadow) {
		// Use opposite color with very low opacity for subtle depth
		const shadowColor = textColor === '#FFFFFF' ? '0, 0, 0' : '255, 255, 255';
		textShadow = `0 1px 2px rgba(${shadowColor}, 0.3)`;
	}

	return { color: textColor, textShadow };
}

/**
 * Convert hex color to RGB object
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
	return parseColor(hex);
}

/**
 * Convert RGB to hex color
 */
export function rgbToHex(r: number, g: number, b: number): string {
	const toHex = (n: number) => {
		const hex = Math.round(Math.max(0, Math.min(255, n))).toString(16);
		return hex.length === 1 ? '0' + hex : hex;
	};

	return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Lighten or darken a color by a percentage
 */
export function adjustColorBrightness(color: string, percent: number): string {
	const rgb = parseColor(color);
	if (!rgb) return color;

	const adjust = (value: number) => {
		const adjusted = value + (value * percent) / 100;
		return Math.max(0, Math.min(255, adjusted));
	};

	return rgbToHex(adjust(rgb.r), adjust(rgb.g), adjust(rgb.b));
}
