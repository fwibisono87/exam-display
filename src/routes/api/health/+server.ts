import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const startTime = Date.now();
	
	// Simulate basic health checks
	const healthChecks = {
		server: 'healthy',
		database: 'not_applicable', // No database in this simple setup
		memory: process.memoryUsage ? 'healthy' : 'unknown',
		uptime: process.uptime ? process.uptime() : 'unknown',
		responseTime: 0
	};
	
	const endTime = Date.now();
	healthChecks.responseTime = endTime - startTime;
	
	return json({
		status: 'healthy',
		timestamp: new Date().toISOString(),
		checks: healthChecks,
		version: '1.0.0'
	});
};
