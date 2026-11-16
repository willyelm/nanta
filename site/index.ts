import { get } from "system";

// What a site is judged on, as flags: sunlight is power, earth_visibility a direct link home.
// Each one set decides which body the page asks Horizons about and what it draws.
export type Condition = "sunlight" | "earth_visibility";

export type Site = {
	code: string; // a short code name, the site's id in URLs and panels
	name: string;
	body: string; // Horizons code of the body it stands on
	sunlight: boolean;
	earth_visibility: boolean;
	lat: number; // degrees, north positive
	lon: number; // degrees east, 0 to 360
};

// The site catalog, from public sources, each cited above its entry. Coordinates are rounded to
// 0.001° (about 30 m on the Moon); sources differ in the last digits by reference frame.
const moon = { sunlight: true, earth_visibility: true };
const sun = { sunlight: true, earth_visibility: false };
export const sites: Site[] = [
	// Apollo 11 lunar module, Tranquility Base: 0.67408°N, 23.47297°E.
	// NASA NSSDC, Apollo Landing Site Coordinates, nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html
	{
		code: "APL11",
		name: "Apollo 11, Tranquility Base",
		body: "301",
		...moon,
		lat: 0.674,
		lon: 23.473,
	},
	// Apollo 17 lunar module, Taurus-Littrow: 20.19080°N, 30.77168°E (NSSDC, same table); LROC
	// measured 20.1911°N, 30.7723°E (2016 LROC Coordinates of Human Features).
	{
		code: "APL17",
		name: "Apollo 17, Taurus-Littrow",
		body: "301",
		...moon,
		lat: 20.191,
		lon: 30.772,
	},
	// Chandrayaan-3 Vikram lander, Statio Shiv Shakti (IAU, 2024): 69.373°S, 32.319°E, within
	// about 350 m of the target (ISRO; Current Science).
	{
		code: "CY3",
		name: "Chandrayaan-3, Statio Shiv Shakti",
		body: "301",
		...moon,
		lat: -69.373,
		lon: 32.319,
	},
	// Blue Moon MK1 (Pathfinder Mission 1, NET Q1 2027) targets the Shackleton connecting ridge
	// (NASA CLPS, nasa.gov/event/clps-flight-blue-origins-blue-moon-mark-1). No landing point is
	// published; this is a point on the ridge, to replace when one is.
	{
		code: "SCR",
		name: "Shackleton connecting ridge",
		body: "301",
		...moon,
		lat: -89.45,
		lon: 222.69,
	},
	// Kennedy Space Center, Florida: an approximate point at the center, for an Earth site.
	{
		code: "KSC",
		name: "Kennedy Space Center",
		body: "399",
		...sun,
		lat: 28.573,
		lon: 279.351,
	},
	// Perseverance, Octavia E. Butler Landing in Jezero Crater: about 18.44°N, 77.45°E (NASA named
	// the site in March 2021). The third decimal isn't confirmed from a NASA page.
	{
		code: "JZR",
		name: "Jezero Crater, Octavia E. Butler Landing",
		body: "499",
		...sun,
		lat: 18.445,
		lon: 77.451,
	},
];

export type SitePage = {
	q: string;
	page: number; // 1-based
	pages: number;
	total: number;
	items: Site[];
};

const headers = { "cache-control": "public, max-age=3600" };

// GET /api/sites?body=&q=&page=&limit=  body is a Horizons code; q matches name or code; page is
// 1-based; limit is 1-100 (20)
// GET /api/sites/:code
export default [
	get("/api/sites", (request) => {
		const params = new URL(request.url).searchParams;
		const q = (params.get("q") ?? "").trim();
		const limit = Math.min(Math.max(Number(params.get("limit")) || 20, 1), 100);
		const on = params.get("body");
		const needle = q.toLowerCase();
		const matches = sites.filter(
			(s) =>
				(!on || s.body === on) &&
				(!needle || s.name.toLowerCase().includes(needle) || s.code.toLowerCase().includes(needle)),
		);
		const pages = Math.max(Math.ceil(matches.length / limit), 1);
		const page = Math.min(Math.max(Number(params.get("page")) || 1, 1), pages);
		const body: SitePage = {
			q,
			page,
			pages,
			total: matches.length,
			items: matches.slice((page - 1) * limit, page * limit),
		};
		return Response.json(body, { headers });
	}),
	get("/api/sites/:code", (_request, { code }) => {
		const found = sites.find((s) => s.code === code);
		return found
			? Response.json(found, { headers })
			: Response.json({ error: `unknown site ${code}` }, { status: 404 });
	}),
];
