import { sites } from "site";
import { get, type Handler } from "system";
import { type Body, ephemeris, type Position } from "./ephemeris";

export type { Position };

export type Positions = {
	body: Body;
	site: string | null;
	center: string;
	lat: number;
	lon: number;
	from: string;
	to: string;
	step: string;
	positions: Position[];
};

const BODIES = new Set<Body>(["sun", "earth"]);
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const STEPS = new Set(["10m", "30m", "1h", "6h", "1d"]);
const MAX_DAYS = 31;
const DAY = 86_400_000;

const fail = (status: number, error: string) =>
	Response.json({ error }, { status, headers: { "cache-control": "no-store" } });

// Positions for a site and time never change, so repeat requests come from the edge cache.
// Cloudflare-specific: caches.default; elsewhere use caches.open(name) or drop this wrapper.
const cached =
	(handler: Handler): Handler =>
	async (request, params) => {
		const cache = (globalThis as unknown as { caches: { default: Cache } }).caches.default;
		const hit = await cache.match(request);
		if (hit) return hit;
		const response = await handler(request, params);
		if (response.ok) await cache.put(request, response.clone());
		return response;
	};

// GET /api/positions/:body?site=&from=&to=&step=
// GET /api/positions/:body?lat=&lon=&from=&to=&step=
// :body is sun or earth.
export default [
	get(
		"/api/positions/:body",
		cached(async (request, params) => {
			const body = params.body as Body;
			if (!BODIES.has(body)) return fail(404, "body must be sun or earth");
			const q = new URL(request.url).searchParams;

			// Where: a catalog site, or coordinates.
			const id = q.get("site");
			const site = id ? sites.find((s) => s.id === id) : null;
			if (id && !site) return fail(404, `unknown site ${id}`);
			const lat = site ? site.lat : Number(q.get("lat"));
			const lon = site ? site.lon : Number(q.get("lon"));
			if (!(lat >= -90 && lat <= 90)) return fail(400, "lat must be -90 to 90");
			if (!(lon >= 0 && lon <= 360)) return fail(400, "lon must be 0 to 360 east");

			// When: a date range and a step.
			const from = q.get("from") ?? "";
			const to = q.get("to") ?? "";
			const step = q.get("step") ?? "1h";
			const center = q.get("center") ?? "301";
			if (center !== "301" && center !== "399" && center !== "499")
				return fail(400, "center must be 301, 399, or 499");
			if (!DATE.test(from) || !DATE.test(to)) {
				return fail(400, "from and to must be YYYY-MM-DD");
			}
			if (!STEPS.has(step)) {
				return fail(400, `step must be one of ${[...STEPS].join(", ")}`);
			}
			const days = (Date.parse(to) - Date.parse(from)) / DAY;
			if (!(days > 0 && days <= MAX_DAYS)) {
				return fail(400, `to must be 1 to ${MAX_DAYS} days after from`);
			}

			try {
				const result: Positions = {
					body,
					site: site?.id ?? null,
					center,
					lat,
					lon,
					from,
					to,
					step,
					positions: await ephemeris(body, lat, lon, from, to, step, center),
				};
				return Response.json(result, {
					headers: { "cache-control": "public, max-age=86400" },
				});
			} catch (e) {
				return fail(502, (e as Error).message);
			}
		}),
	),
];
