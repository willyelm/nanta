// Positions of the Sun and Earth seen from a point on the Moon.
// Source: JPL Horizons observer tables, centered on the Moon (body 301).

import { log, since } from "system";

const SOURCE = "https://ssd.jpl.nasa.gov/api/horizons.api";

export type Body = "sun" | "earth";

export type Position = { time: string; azimuth: number; elevation: number };

const ids: Record<Body, string> = { sun: "10", earth: "399" };

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
		SITE_COORD: `'${lon},${lat},0'`,
		MAKE_EPHEM: "'YES'",
		EPHEM_TYPE: "'OBSERVER'",
		START_TIME: `'${from}'`,
		STOP_TIME: `'${to}'`,
		STEP_SIZE: `'${step}'`,
		QUANTITIES: "'4'",
		// The Moon has no air. Earth and Mars use refraction.
		APPARENT: center === "301" ? "'AIRLESS'" : "'REFRACTED'",
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

	// Rows look like: " 2027-Mar-01 00:00 *    42.819898  -0.166509"
	return result
		.slice(start + 5, end)
		.trim()
		.split("\n")
		.map((row) => {
			const cells = row.trim().split(/\s+/);
			const [y, m, d] = cells[0].split("-");
			return {
				time: `${y}-${months[m]}-${d}T${cells[1]}:00Z`,
				azimuth: Number(cells.at(-2)),
				elevation: Number(cells.at(-1)),
			};
		});
}
