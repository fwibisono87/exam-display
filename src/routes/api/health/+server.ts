import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { HealthResponse } from '$lib/types';

export const GET: RequestHandler = async () => {
	const startTime = Date.now();

	const processLike = (
		globalThis as typeof globalThis & {
			process?: {
				memoryUsage?: () => unknown;
				uptime?: () => number;
			};
		}
	).process;

	// Simulate basic health checks
	const healthChecks: HealthResponse['checks'] = {
		server: 'healthy',
		database: 'not_applicable', // No database in this simple setup
		memory: typeof processLike?.memoryUsage === 'function' ? 'healthy' : 'unknown',
		uptime: typeof processLike?.uptime === 'function' ? processLike.uptime() : 'unknown',
		responseTime: 0
	};

	const endTime = Date.now();
	healthChecks.responseTime = endTime - startTime;

	const response: HealthResponse = {
		status: 'healthy',
		timestamp: new Date().toISOString(),
		checks: healthChecks,
		version: '1.0.0'
	};

	return json(response);
};
