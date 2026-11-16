import { get } from "system";

// A body in the model, by its JPL Horizons code (stars by Hipparcos number). Planets and
// satellites can hold sites; stars are reference only, the Sun among them as the light.
//   orbits: the code of the body it goes around
//   air: has an atmosphere; refraction: Horizons bends the horizon for it (Earth sites only)
//   day: mean solar day, in seconds; radius: mean radius, in km (IAU)
//   ra, dec: a fixed star's J2000 right ascension and declination, in degrees
//   magnitude: visual brightness, lower is brighter; distance: in light years
export type Body = {
	code: string;
	name: string;
	type: "star" | "planet" | "satellite";
	orbits?: string;
	air?: boolean;
	refraction?: boolean;
	day?: number;
	radius?: number;
	ra?: number;
	dec?: number;
	magnitude?: number;
	distance?: number;
};

export const bodies: Body[] = [
	// Habitable: available for mission planning.
	{
		code: "301",
		name: "Moon",
		type: "satellite",
		orbits: "399",
		air: false,
		refraction: false,
		day: 2_551_443, // 29.530589 days, the synodic month
		radius: 1_737.4,
	},

	{
		code: "399",
		name: "Earth",
		type: "planet",
		orbits: "10",
		air: true,
		refraction: true,
		day: 86_400,
		radius: 6_371.0,
	},
	{
		code: "499",
		name: "Mars",
		type: "planet",
		orbits: "10",
		air: true,
		refraction: false,
		day: 88_775, // the sol
		radius: 3_389.5,
	},
	{
		code: "199",
		name: "Mercury",
		type: "planet",
		orbits: "10",
		air: false,
		refraction: false,
		day: 15_201_000, // 175.94 days: three turns for every two years
		radius: 2_439.7,
	},

	// Reference: the Sun, the brightest stars, the four on the ecliptic that mark where the
	// planets move (Aldebaran, Regulus, Spica, Antares), and Polaris for north. Stars lie far
	// beyond the model; only their direction is drawn.
	{
		code: "10",
		name: "Sun",
		type: "star",
		radius: 695_700,
	},
	{
		code: "HIP 32349",
		name: "Sirius",
		type: "star",
		ra: 101.287,
		dec: -16.716,
		magnitude: -1.46,
		distance: 8.6,
	},
	{
		code: "HIP 30438",
		name: "Canopus",
		type: "star",
		ra: 95.988,
		dec: -52.696,
		magnitude: -0.74,
		distance: 310,
	},
	{
		code: "HIP 69673",
		name: "Arcturus",
		type: "star",
		ra: 213.915,
		dec: 19.182,
		magnitude: -0.05,
		distance: 36.7,
	},
	{
		code: "HIP 91262",
		name: "Vega",
		type: "star",
		ra: 279.234,
		dec: 38.784,
		magnitude: 0.03,
		distance: 25,
	},
	{
		code: "HIP 24608",
		name: "Capella",
		type: "star",
		ra: 79.172,
		dec: 45.998,
		magnitude: 0.08,
		distance: 42.9,
	},
	{
		code: "HIP 24436",
		name: "Rigel",
		type: "star",
		ra: 78.634,
		dec: -8.202,
		magnitude: 0.13,
		distance: 860,
	},
	{
		code: "HIP 27989",
		name: "Betelgeuse",
		type: "star",
		ra: 88.793,
		dec: 7.407,
		magnitude: 0.5,
		distance: 550,
	},
	{
		code: "HIP 21421",
		name: "Aldebaran",
		type: "star",
		ra: 68.98,
		dec: 16.509,
		magnitude: 0.86,
		distance: 65,
	},
	{
		code: "HIP 80763",
		name: "Antares",
		type: "star",
		ra: 247.352,
		dec: -26.432,
		magnitude: 0.96,
		distance: 550,
	},
	{
		code: "HIP 65474",
		name: "Spica",
		type: "star",
		ra: 201.298,
		dec: -11.161,
		magnitude: 0.97,
		distance: 250,
	},
	{
		code: "HIP 49669",
		name: "Regulus",
		type: "star",
		ra: 152.093,
		dec: 11.967,
		magnitude: 1.35,
		distance: 79,
	},
	{
		code: "HIP 11767",
		name: "Polaris",
		type: "star",
		ra: 37.955,
		dec: 89.264,
		magnitude: 1.98,
		distance: 433,
	},
];

const headers = { "cache-control": "public, max-age=3600" };

// GET /api/bodies  The habitable bodies, then the reference ones.
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
