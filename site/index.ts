import { get } from "system";

// What a site is judged on: sunlight is power, earth_visibility a direct link home. Each one
// decides which body the page asks Horizons about and what it draws.
export type Condition = "sunlight" | "earth_visibility";

export type Site = {
	id: string;
	name: string;
	body: string; // Horizons code of the body it stands on
	conditions: Condition[];
	lat: number; // degrees, north positive
	lon: number; // degrees east, 0 to 360
};

// Sample catalog to test the API. Replace with the curated, cited list.
const moon: Condition[] = ["sunlight", "earth_visibility"];
export const sites: Site[] = [
	{ id: "apollo-11", name: "Apollo 11", body: "301", conditions: moon, lat: 0.674, lon: 23.473 },
	{ id: "apollo-17", name: "Apollo 17", body: "301", conditions: moon, lat: 20.191, lon: 30.772 },
	{
		id: "chandrayaan-3",
		name: "Chandrayaan-3",
		body: "301",
		conditions: moon,
		lat: -69.373,
		lon: 32.319,
	},
	{
		id: "south-pole",
		name: "South pole sample",
		body: "301",
		conditions: moon,
		lat: -89.45,
		lon: 222.69,
	},
	{
		id: "kennedy",
		name: "Kennedy Space Center",
		body: "399",
		conditions: ["sunlight"],
		lat: 28.573,
		lon: 279.351,
	},
	{
		id: "jezero",
		name: "Jezero Crater",
		body: "499",
		conditions: ["sunlight"],
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

// GET /api/sites?body=&q=&page=&limit=  body is a Horizons code; q matches name or id; page is
// 1-based; limit is 1-100 (20)
// GET /api/sites/:id
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
				(!needle || s.name.toLowerCase().includes(needle) || s.id.includes(needle)),
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
	get("/api/sites/:id", (_request, { id }) => {
		const found = sites.find((s) => s.id === id);
		return found
			? Response.json(found, { headers })
			: Response.json({ error: `unknown site ${id}` }, { status: 404 });
	}),
];
