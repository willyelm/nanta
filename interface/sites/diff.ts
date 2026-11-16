import { duration, until } from "interface/horizon/Conditions";
import { conditions, samples } from "interface/horizon/catalog";
import type { Sky } from "position";
import type { Condition } from "site";

const meta = (condition: Condition) => conditions[condition];

// One reading to compare: its conditions, its samples, and the sample in view.
export type Side = { list: Condition[]; sky: Sky; at: number };

// A unified diff line: " " the same on both, "-" the candidate (before), "+" the reading in view
// (after). `delta` is after minus before, when it's a number.
// `trend` is whether the reading in view has more of the condition than the candidate, or less.
export type Line = {
	sign: " " | "-" | "+";
	text: string;
	delta?: string;
	trend?: "more" | "less";
	heading?: boolean; // a condition's name, over its lines
};

const trendOf = (change: number) => (change > 0 ? "more" : change < 0 ? "less" : undefined);

const signed = (value: number, unit: string) =>
	`${value > 0 ? "+" : value < 0 ? "−" : "±"}${Math.abs(value).toFixed(unit === "°" ? 1 : 0)}${unit === "°" ? "°" : ` ${unit}`}`;

// The numbers a planner weighs per condition, at the same sample offset in both windows.
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
		state: meta.states[now.up ? 0 : 1],
	};
}

// The candidate (b) against the reading in view (a), like `git diff b a`: equal facts are one
// line, changed ones a - and + pair with the change on the + line.
export function diff(a: Side, b: Side): Line[] {
	const lines: Line[] = [];
	const pair = (
		text: (f: NonNullable<ReturnType<typeof facts>>) => string,
		before: ReturnType<typeof facts>,
		after: ReturnType<typeof facts>,
		delta?: string,
		trend?: "more" | "less",
	) => {
		const [x, y] = [before ? text(before) : "—", after ? text(after) : "—"];
		if (x === y) lines.push({ sign: " ", text: x });
		else lines.push({ sign: "-", text: x }, { sign: "+", text: y, delta, trend });
	};
	for (const condition of [...new Set([...a.list, ...b.list])]) {
		const [before, after] = [facts(b, condition), facts(a, condition)];
		lines.push({ sign: " ", text: conditions[condition].name, heading: true });
		const both = before && after;
		pair(
			(f) => `${f.elevation >= 0 ? "+" : "−"}${Math.abs(f.elevation).toFixed(1)}° ${f.state}`,
			before,
			after,
			both ? signed(after.elevation - before.elevation, "°") : undefined,
			both ? trendOf(after.elevation - before.elevation) : undefined,
		);
		pair(
			(f) => `${Math.round(f.hours)} h above the horizon`,
			before,
			after,
			both ? signed(after.hours - before.hours, "h") : undefined,
			both ? trendOf(after.hours - before.hours) : undefined,
		);
		pair(
			(f) =>
				f.next === null ? "no change in the window" : `${f.change} in ${Math.round(f.next)} h`,
			before,
			after,
			both && before.next !== null && after.next !== null
				? signed(after.next - before.next, "h")
				: undefined,
			// Longer until a set is more of the condition; longer until a rise is less.
			both && before.next !== null && after.next !== null && before.state === after.state
				? trendOf(
						(after.next - before.next) * (after.change === meta(condition).changes[0] ? 1 : -1),
					)
				: undefined,
		);
	}
	return lines;
}

// The diff as plain text, to paste anywhere.
export const text = (lines: Line[]) =>
	lines.map((l) => `${l.sign} ${l.text}${l.delta ? `  ${l.delta}` : ""}`).join("\n");
