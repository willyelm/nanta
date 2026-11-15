import type { Body, Position, Sky } from "position";
import type { Condition, Site } from "site";

// What each condition needs and how it reads: the body Horizons is asked about, its name, its
// two states and changes, and its line in the charts (fixed chart colors; Earth dashed).
export const conditions: Record<
	Condition,
	{
		body: Body;
		name: string;
		label: string;
		states: [string, string];
		changes: [string, string];
		color: "sun" | "earth";
		dashed: boolean;
	}
> = {
	sunlight: {
		body: "sun",
		name: "Sunlight",
		label: "Sun",
		states: ["Sun up", "Sun down"],
		changes: ["sets", "rises"],
		color: "sun",
		dashed: false,
	},
	earth_visibility: {
		body: "earth",
		name: "Earth visibility",
		label: "Earth",
		states: ["Earth up", "Earth down"],
		changes: ["sets", "rises"],
		color: "earth",
		dashed: true,
	},
};

// The samples for one condition, or none.
export const samples = (sky: Sky, condition: Condition): Position[] =>
	sky[conditions[condition].body] ?? [];

// The conditions a site has set, in catalog order.
export const flagged = (site: Pick<Site, Condition>): Condition[] =>
	(Object.keys(conditions) as Condition[]).filter((condition) => site[condition]);
