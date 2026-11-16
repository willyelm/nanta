// Where a body is in the sky from a point on another body: azimuth, elevation, and range.
// Source: JPL Horizons observer tables, centered on the site's body.

import { log, since } from "system";

const SOURCE = "https://ssd.jpl.nasa.gov/api/horizons.api";

export type Body = "sun" | "mercury" | "earth" | "moon" | "mars";

// azimuth and elevation in degrees, range in km.
export type Position = { time: string; azimuth: number; elevation: number; range: number };

const AU = 149_597_870.7;
const WEST = new Set(["199", "499"]);

export const ids: Record<Body, string> = {
	sun: "10",
	mercury: "199",
	earth: "399",
	moon: "301",
	mars: "499",
};

const months: Record<string, string> = {
	Jan: "01",
	Feb: "02",
	Mar: "03",
	Apr: "04",
	May: "05",
	Jun: "06",
	Jul: "07",
	Aug: "08",
	Sep: "09",
	Oct: "10",
	Nov: "11",
	Dec: "12",
};

export async function ephemeris(
	body: Body,
	lat: number,
	lon: number,
	from: string,
	to: string,
	step: string,
	center = "301",
): Promise<Position[]> {
	const params = new URLSearchParams({
		format: "json",
		COMMAND: `'${ids[body]}'`,
		CENTER: `'coord@${center}'`,
		COORD_TYPE: "'GEODETIC'",
		// Mercury and Mars are IAU west-positive: Horizons wants east longitude as a negative number.
		SITE_COORD: `'${WEST.has(center) ? -lon : lon},${lat},0'`,
		MAKE_EPHEM: "'YES'",
		EPHEM_TYPE: "'OBSERVER'",
		START_TIME: `'${from}'`,
		STOP_TIME: `'${to}'`,
		STEP_SIZE: `'${step}'`,
		// 4: apparent azimuth and elevation. 20: range from the site, in AU.
		QUANTITIES: "'4,20'",
		// Horizons refracts only for sites on Earth; the Moon and Mars horizons are geometric.
		APPARENT: center === "399" ? "'REFRACTED'" : "'AIRLESS'",
	});
	const query = `${body} from ${center} at ${lat},${lon} ${from}..${to} every ${step}`;
	const started = performance.now();
	try {
		const positions = parse(await request(`${SOURCE}?${params}`));
		log("horizons", query, `${positions.length} rows`, since(started));
		return positions;
	} catch (error) {
		log.error("horizons", query, "failed", since(started), String(error));
		throw error;
	}
}

// A body's state around its center at one time: position in km and velocity in km/s, on the
// ecliptic (x toward the equinox, z north).
export type State = {
	code: string;
	center: string;
	time: string;
	position: [number, number, number];
	velocity: [number, number, number];
};

export async function state(code: string, center: string, time: string): Promise<State> {
	const stop = new Date(Date.parse(`${time}Z`) + 3_600_000).toISOString().slice(0, 16);
	const params = new URLSearchParams({
		format: "json",
		COMMAND: `'${code}'`,
		CENTER: `'500@${center}'`,
		MAKE_EPHEM: "'YES'",
		EPHEM_TYPE: "'VECTORS'",
		START_TIME: `'${time.replace("T", " ")}'`,
		STOP_TIME: `'${stop.replace("T", " ")}'`,
		STEP_SIZE: "'1h'",
		REF_PLANE: "'ECLIPTIC'",
		OUT_UNITS: "'KM-S'",
		VEC_TABLE: "'2'",
		CSV_FORMAT: "'YES'",
	});
	const query = `${code} from ${center} at ${time}`;
	const started = performance.now();
	const result = await request(`${SOURCE}?${params}`);
	const start = result.indexOf("$$SOE");
	if (start < 0) throw new Error("source returned no vectors");
	// The first row: "2461360.25, A.D. 2026-Nov-15 18:00:00.0000, X, Y, Z, VX, VY, VZ,"
	const cells = result
		.slice(start + 5)
		.trim()
		.split("\n")[0]
		.split(",")
		.map((c) => c.trim());
	const [x, y, z, vx, vy, vz] = cells.slice(2, 8).map(Number);
	log("horizons", query, since(started));
	return { code, center, time: `${time}:00Z`, position: [x, y, z], velocity: [vx, vy, vz] };
}

async function request(url: string): Promise<string> {
	const response = await fetch(url);
	if (!response.ok) throw new Error(`source returned ${response.status}`);
	const { result = "", error } = (await response.json()) as {
		result?: string;
		error?: string;
	};
	if (error) throw new Error(error);
	return result;
}

function parse(result: string): Position[] {
	const start = result.indexOf("$$SOE");
	const end = result.indexOf("$$EOE");
	if (start < 0 || end < 0) throw new Error("source returned no positions");

	// Rows look like: " 2027-Jun-01 00:00  i    0.718596  -0.841807  1.01230223903940  -0.4060925"
	// Read from the end: a flag column may sit between the time and the azimuth.
	return result
		.slice(start + 5, end)
		.trim()
		.split("\n")
		.map((row) => {
			const cells = row.trim().split(/\s+/);
			const [y, m, d] = cells[0].split("-");
			return {
				time: `${y}-${months[m]}-${d}T${cells[1]}:00Z`,
				azimuth: Number(cells.at(-4)),
				elevation: Number(cells.at(-3)),
				range: Number(cells.at(-2)) * AU,
			};
		});
}
