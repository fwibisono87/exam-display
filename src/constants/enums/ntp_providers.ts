/**
 * Centralized NTP provider definitions and metadata.
 *
 * Indonesian National Time Standard & Stratum Hierarchy References:
 * - SNSU-BSN (`ntp.bsn.go.id` / `103.164.45.50`): Operated by Badan Standardisasi Nasional
 *   (Direktorat Standar Nasional Satuan Ukuran Termoelektrik dan Kimia, Serpong).
 *   Mandated by UU No. 20 Tahun 2014 and PP No. 102 Tahun 2000 as Indonesia's official
 *   national metrology institute maintaining `UTC(IDN)` via Cesium atomic clocks.
 *   Responds on UDP/123 as **Stratum 1** (`refId: '1PPS'`).
 *   Source: https://snsu.bsn.go.id / https://jam.bsn.go.id
 *
 * - BMKG (`ntp.bmkg.go.id` / `103.169.3.57`): Operated by Badan Meteorologi, Klimatologi,
 *   dan Geofisika. Responds on UDP/123 as **Stratum 2** (`refId: '103.164.45.50'`),
 *   synchronizing upstream directly from SNSU-BSN (`ntp.bsn.go.id`).
 *   Source: https://jam.bmkg.go.id
 *
 * - Google Public NTP (`time.google.com`): Global fleet of atomic clocks.
 *   Responds on UDP/123 as **Stratum 1** (`refId: 'GOOG'`).
 *   Source: https://developers.google.com/time
 *
 * - Cloudflare NTP (`time.cloudflare.com`): Global anycast time service with Jakarta edge nodes,
 *   synchronized to Cloudflare's Stratum 1 GPS/atomic reference clocks.
 *   Source: https://developers.cloudflare.com/time-services/ntp/
 */
export enum NtpProvider {
	UI_CAMPUS = 'ntp.ui.ac.id',
	BSN_STRATUM_1 = 'ntp.bsn.go.id',
	BMKG = 'ntp.bmkg.go.id',
	CLOUDFLARE = 'time.cloudflare.com',
	GOOGLE_STRATUM_1 = 'time.google.com'
}

export const DEFAULT_NTP_PROVIDER: NtpProvider = NtpProvider.UI_CAMPUS;

export const NTP_PROVIDERS: readonly NtpProvider[] = [
	NtpProvider.UI_CAMPUS,
	NtpProvider.BSN_STRATUM_1,
	NtpProvider.BMKG,
	NtpProvider.CLOUDFLARE,
	NtpProvider.GOOGLE_STRATUM_1
];

export interface NtpProviderOption {
	id: NtpProvider;
	label: string;
	description: string;
	sourceUrl: string;
	stratum: 1 | 2 | 3;
	isWarning?: boolean;
}

export const NTP_PROVIDER_OPTIONS: readonly NtpProviderOption[] = [
	{
		id: NtpProvider.UI_CAMPUS,
		label: `${NtpProvider.UI_CAMPUS} · UI Campus (Default, Stratum 3)`,
		description:
			'Maintains internal time consistency across UI campus servers and machines, but lags ~5 seconds behind global real clocks. Avoid mixing with external clocks not synced to ntp.ui.ac.id.',
		sourceUrl: 'https://dsti.ui.ac.id',
		stratum: 3,
		isWarning: true
	},
	{
		id: NtpProvider.BSN_STRATUM_1,
		label: `${NtpProvider.BSN_STRATUM_1} · SNSU-BSN Indonesia (Stratum 1)`,
		description:
			'Official Indonesian national time standard UTC(IDN) operated by SNSU-BSN (Stratum 1 Cesium 1PPS primary reference clock). Accurate to global real time.',
		sourceUrl: 'https://snsu.bsn.go.id',
		stratum: 1
	},
	{
		id: NtpProvider.BMKG,
		label: `${NtpProvider.BMKG} · BMKG Indonesia (Stratum 2)`,
		description:
			'BMKG time server (Stratum 2, synchronized upstream to SNSU-BSN 103.164.45.50). Accurate to global real time; ensure all displays in the room use the same source.',
		sourceUrl: 'https://jam.bmkg.go.id',
		stratum: 2
	},
	{
		id: NtpProvider.CLOUDFLARE,
		label: `${NtpProvider.CLOUDFLARE} · Cloudflare Anycast (Stratum 3 Edge)`,
		description:
			'Global anycast time service with local Jakarta edge nodes synchronized to Stratum 1 atomic references. Accurate to global real time.',
		sourceUrl: 'https://developers.cloudflare.com/time-services/ntp/',
		stratum: 3
	},
	{
		id: NtpProvider.GOOGLE_STRATUM_1,
		label: `${NtpProvider.GOOGLE_STRATUM_1} · Google Public NTP (Stratum 1)`,
		description: 'Global Stratum 1 atomic clock fleet (refId: GOOG). Accurate to global real time.',
		sourceUrl: 'https://developers.google.com/time',
		stratum: 1
	}
];

export function isAllowedNtpProvider(value: unknown): value is NtpProvider {
	return typeof value === 'string' && (NTP_PROVIDERS as readonly string[]).includes(value);
}
