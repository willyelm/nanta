import { duration, until } from "interface/horizon/Conditions";
import { conditions, samples } from "interface/horizon/catalog";
import type { Sky } from "position";
import type { Condition } from "site";

// One reading to compare: its conditions, its samples, and the sample in view.
export type Side = { list: Condition[]; sky: Sky; at: number };

// One fact for both readings. `change` is the candidate minus the current reading, when both have
// a number; `trend` is whether the candidate has more of the condition, or less. `up`, on
// the elevation row, is whether the body is above the horizon on each side, named by `state`.
export type Row = {
	fact: string;
	current: string;
	candidate: string;
	change?: string;
	trend?: "more" | "less";
	up?: { current?: State; candidate?: State };
};
export type State = { up: boolean; name: string };
export type Group = { condition: string; rows: Row[] };

const trendOf = (change: number) => (change > 0 ? "more" : change < 0 ? "less" : undefined);
const sign = (value: number) => (value > 0 ? "+" : value < 0 ? "−" : "±");
const degrees = (value: number) => `${sign(value)}${Math.abs(value).toFixed(1)}°`;
const hours = (value: number) => `${sign(value)}${Math.abs(Math.round(value))} h`;

// The numbers a planner weighs per condition, at the same sample offset in the window.
function facts(side: Side, condition: Condition) {
	const positions = samples(side.sky, condition);
	if (!positions.length) return null;
	const at = Math.min(side.at, positions.length - 1);
	const now = until(positions, at);
	const meta = conditions[condition];
	return {
		elevation: positions[at].elevation,
		hours: duration(positions),
		next: now.hours,
		change: meta.changes[now.up ? 0 : 1],
		up: now.up,
		state: meta.states[now.up ? 0 : 1],
	};
}

type Facts = NonNullable<ReturnType<typeof facts>>;

// The current reading against a candidate, condition by condition, at the same hour into each
// window: elevation, hours above the horizon, and time to the next change.
export function compare(current: Side, candidate: Side): Group[] {
	return [...new Set([...current.list, ...candidate.list])].map((condition) => {
		const [a, b] = [facts(current, condition), facts(candidate, condition)];
		// One fact on both sides; `by` is the candidate minus the current, and `more` turns it into
		// more or less of the condition.
		const row = (
			fact: string,
			text: (f: Facts) => string,
			by?: (a: Facts, b: Facts) => number | null,
			format = hours,
			more = 1,
		): Row => {
			const change = a && b && by ? by(a, b) : null;
			return {
				fact,
				current: a ? text(a) : "—",
				candidate: b ? text(b) : "—",
				...(change === null ? {} : { change: format(change), trend: trendOf(change * more) }),
			};
		};
		// Longer until a set is more of the condition; longer until a rise is less.
		const setting = a?.change === conditions[condition].changes[0] ? 1 : -1;
		return {
			condition: conditions[condition].name,
			rows: [
				{
					...row(
						"Elevation",
						(f) => degrees(f.elevation),
						(a, b) => b.elevation - a.elevation,
						degrees,
					),
					up: {
						current: a ? { up: a.up, name: a.state } : undefined,
						candidate: b ? { up: b.up, name: b.state } : undefined,
					},
				},
				row(
					"Above horizon",
					(f) => `${Math.round(f.hours)} h`,
					(a, b) => b.hours - a.hours,
				),
				row(
					"Next change",
					(f) => (f.next === null ? "none" : `${f.change} in ${Math.round(f.next)} h`),
					(a, b) =>
						a.next === null || b.next === null || a.state !== b.state ? null : b.next - a.next,
					hours,
					setting,
				),
			],
		};
	});
}
