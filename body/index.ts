import { get } from "system";

// A body the planner can stand on, by its JPL Horizons code.
export type Body = {
	code: string;
	name: string;
	latin: string;
	air: string;
	day: string; // solar day
	radius: string;
};

export const bodies: Body[] = [
	{
		code: "301",
		name: "Moon",
		latin: "Luna",
		air: "None. The horizon is airless.",
		day: "29.5 Earth days",
		radius: "1,737 km",
	},
	{
		code: "499",
		name: "Mars",
		latin: "",
		air: "Thin. The horizon uses refraction.",
		day: "24 h 40 min",
		radius: "3,390 km",
	},
	{
		code: "399",
		name: "Earth",
		latin: "Terra",
		air: "Yes. The horizon uses refraction.",
		day: "24 h",
		radius: "6,371 km",
	},
];

const headers = { "cache-control": "public, max-age=3600" };

// GET /api/bodies
// GET /api/bodies/:code
export default [
	get("/api/bodies", () => Response.json(bodies, { headers })),
	get("/api/bodies/:code", (_request, { code }) => {
		const found = bodies.find((b) => b.code === code);
		return found
			? Response.json(found, { headers })
			: Response.json({ error: `unknown body ${code}` }, { status: 404 });
	}),
];
