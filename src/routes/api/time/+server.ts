import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const serverTime = new Date().toISOString();
	
	return json({
		time: serverTime,
		timestamp: Date.now(),
		timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
		status: 'healthy'
	});
};
