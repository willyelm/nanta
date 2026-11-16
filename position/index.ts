import { sites } from "site";
import { get, type Handler, log } from "system";
import { type Body, ephemeris, ids, type Position, type State, state } from "./ephemeris";

export type { Body, Position, State };

// What each body goes around: Earth and Mars the Sun, the Moon the Earth.
const ORBITS: Record<string, string> = { "199": "10", "399": "10", "301": "399", "499": "10" };
const HOUR = /^\d{4}-\d{2}-\d{2}T\d{2}:00$/;

// Positions of each other body from one site, over one window.
export type Sky = Partial<Record<Body, Position[]>>;

export type Positions = {
	body: Body;
	site: string | null;
	center: string;
	lat: number;
	lon: number;
	from: string;
	to: string;
	step: string;
	fetched: string; // when Horizons was asked, ISO UTC; cached answers keep it
	positions: Position[];
};

const BODIES = new Set<Body>(["sun", "mercury", "earth", "moon", "mars"]);
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
		const { pathname, search } = new URL(request.url);
		log("cache", hit ? "hit" : "miss", pathname + search);
		if (hit) return hit;
		const response = await handler(request, params);
		if (response.ok) await cache.put(request, response.clone());
		return response;
	};

// GET /api/positions/:body?site=&from=&to=&step=
// GET /api/positions/:body?lat=&lon=&from=&to=&step=
// :body is sun, mercury, earth, moon, or mars, and not the body the site stands on (center).
export default [
	// GET /api/space?time=YYYY-MM-DDTHH:00&body=399  One body's state around what it orbits, at
	// one time. The client asks for each body in turn and advances them from there.
	get(
		"/api/space",
		cached(async (request) => {
			const q = new URL(request.url).searchParams;
			const time = q.get("time") ?? "";
			const body = q.get("body") ?? "";
			if (!HOUR.test(time)) return fail(400, "time must be YYYY-MM-DDTHH:00");
			const center = ORBITS[body];
			if (!center) return fail(404, `body must be one of ${Object.keys(ORBITS).join(", ")}`);
			try {
				const result: State = await state(body, center, time);
				return Response.json(result, { headers: { "cache-control": "public, max-age=86400" } });
			} catch (e) {
				return fail(502, (e as Error).message);
			}
		}),
	),
	get(
		"/api/positions/:body",
		cached(async (request, params) => {
			const body = params.body as Body;
			if (!BODIES.has(body)) return fail(404, "body must be sun, mercury, earth, moon, or mars");
			const q = new URL(request.url).searchParams;

			// Where: a catalog site, or coordinates.
			const id = q.get("site");
			const site = id ? sites.find((s) => s.code === id) : null;
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
			if (!["199", "301", "399", "499"].includes(center))
				return fail(400, "center must be 199, 301, 399, or 499");
			if (ids[body] === center) return fail(400, "body is the one the site stands on");
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
					site: site?.code ?? null,
					center,
					lat,
					lon,
					from,
					to,
					step,
					fetched: new Date().toISOString(),
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
