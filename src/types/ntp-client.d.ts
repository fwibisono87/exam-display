declare module 'ntp-client' {
	export function getNetworkTime(
		server: string,
		port: number,
		callback: (err: Error | null, date: Date, offset: number, delay: number) => void
	): void;
}
