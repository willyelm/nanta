// Server logs: one line per event, `[scope] parts`, through console so the same lines show in
// wrangler dev and in production (wrangler tail, Workers Logs). No color: production keeps it raw.

export function log(scope: string, ...parts: unknown[]) {
	console.log(`[${scope}]`, ...parts);
}

log.error = (scope: string, ...parts: unknown[]) => {
	console.error(`[${scope}]`, ...parts);
};

// Milliseconds since `start` (from performance.now()). Workers advance the clock on I/O only,
// which is what these timings measure.
export const since = (start: number) => `${Math.round(performance.now() - start)}ms`;
