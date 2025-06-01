// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

declare module 'ntp-client' {
	export function getNetworkTime(
		server: string,
		port: number,
		callback: (err: Error | null, date: Date, offset: number, delay: number) => void
	): void;
}

export {};
