import { get } from "system";

// A time window to read a site in, by its own code, not tied to any site, so any site can be
// read in any window. Dates are UTC days, from and to inclusive; Horizons allows up to 31 days.
export type Window = {
	code: string;
	label: string;
	from: string; // YYYY-MM-DD
	to: string; // YYYY-MM-DD
};

// One predefined window to start from, read-only; you add the others.
export const windows: Window[] = [
	{ code: "JUN27", label: "2027 Jun 1–3", from: "2027-06-01", to: "2027-06-03" },
];

// TODAY: the current UTC day through the next, so the bodies always have Horizons positions
// for the present, with or without a place. Worked out per request.
export function now(at = Date.now()): Window {
	const day = (ms: number) => new Date(ms).toISOString().slice(0, 10);
	const from = day(at);
	const to = day(Date.parse(`${from}T00:00:00Z`) + 86_400_000);
	return { code: "TODAY", label: "Today", from, to };
}

// GET /api/windows  TODAY, then the predefined windows, read-only; yours stay in your browser.
export default [
	get("/api/windows", () =>
		Response.json([now(), ...windows], { headers: { "cache-control": "public, max-age=300" } }),
	),
];
