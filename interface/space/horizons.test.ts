import assert from "node:assert/strict";
import { test } from "node:test";
import type { Body, Position, State } from "position";
import { codes, direction, eclipticOver, frame, radius, seen, toRad } from "./geometry.ts";
import recorded from "./horizons.json" with { type: "json" };
import { helio } from "./orbit.ts";

// The model against recorded Horizons answers (scripts/record-horizons.ts). From every catalog
// site, each other body is placed in the scene as Space places it (the day's states, advanced,
// turned into the site's body frame, set out from the site) and, looked at from the site, must be
// where Horizons says.
const { days, sites } = recorded as unknown as {
	days: Record<string, Record<string, State>>;
	sites: { code: string; body: string; lat: number; lon: number; sky: Record<Body, Position[]> }[];
};

// Allowed: the IAU turn models (~0.3°), refraction on Earth (~0.5° at the horizon), and the Moon
// seen from Earth's center rather than its surface (up to 1°).
const LIMIT = 1.5;

for (const site of sites) {
	const home = codes[site.body] as Exclude<Body, "sun">;
	const f = frame(site.lat, site.lon);
	for (const [body, rows] of Object.entries(site.sky) as [Body, Position[]][]) {
		test(`${body} from ${site.code} matches Horizons`, () => {
			for (const row of rows) {
				const when = Date.parse(row.time);
				const states = days[row.time.slice(0, 10)];
				const center = helio(states, home, when);
				const to = helio(states, body, when);
				assert.ok(center && to);
				const toward = eclipticOver(
					home,
					[0, 1, 2].map((i) => to[i] - center[i]),
					when,
				);
				const mesh = seen(f.up, toward, toward.length(), radius[home]);
				const looking = mesh.sub(f.up).normalize();
				const off = Math.acos(Math.min(1, looking.dot(direction(f, row)))) / toRad;
				assert.ok(off < LIMIT, `${row.time}: ${off.toFixed(2)}° from Horizons`);
			}
		});
	}
}
