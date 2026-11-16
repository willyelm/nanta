// Records Horizons answers for interface/space/horizons.test.ts: each day's states, and where every
// other body is in the sky from each catalog site, every 6 hours of that day.
// Run with: node --import ./scripts/test.ts scripts/record-horizons.ts
import { writeFileSync } from "node:fs";
import { type Body, ephemeris, ids, state } from "position/ephemeris";
import { sites } from "site";

const DAYS = ["2026-06-27", "2026-11-16"];
const BODIES: Body[] = ["sun", "mercury", "earth", "moon", "mars"];
// What each body's state is around: the Moon the Earth, the others the Sun.
const CENTERS: Record<string, string> = { "399": "10", "301": "399", "499": "10", "199": "10" };

const days: Record<string, Record<string, unknown>> = {};
for (const day of DAYS) {
	days[day] = {};
	for (const [code, center] of Object.entries(CENTERS))
		days[day][code] = await state(code, center, `${day}T00:00`);
}

const recorded = [];
for (const site of sites) {
	const sky: Record<string, unknown[]> = {};
	for (const body of BODIES) {
		if (ids[body] === site.body) continue;
		sky[body] = [];
		for (const day of DAYS)
			sky[body].push(
				...(await ephemeris(body, site.lat, site.lon, day, `${day} 18:00`, "6h", site.body)),
			);
	}
	recorded.push({ ...site, sky });
}

const file = new URL("../interface/space/horizons.json", import.meta.url);
writeFileSync(file, `${JSON.stringify({ days, sites: recorded }, null, "\t")}\n`);
