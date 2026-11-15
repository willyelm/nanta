import type { Position, Sky } from "position";
import type { Condition } from "site";
import { conditions, samples } from "./catalog";

const HOUR = 3_600_000;
const hours = (a: Position, b: Position) => (Date.parse(b.time) - Date.parse(a.time)) / HOUR;

// How long a body is above the horizon in the window, in hours, from the sample spacing.
export function duration(positions: Position[]): number {
	const step = positions.length > 1 ? hours(positions[0], positions[1]) : 0;
	return positions.filter((p) => p.elevation > 0).length * step;
}

// Up or down at sample `at`, and hours until that changes, or null when it doesn't in the window.
export function until(positions: Position[], at: number): { up: boolean; hours: number | null } {
	const now = positions[at];
	if (!now) return { up: false, hours: null };
	const up = now.elevation > 0;
	const next = positions.slice(at + 1).find((p) => p.elevation > 0 !== up);
	return { up, hours: next ? hours(now, next) : null };
}

const format = (value: number) => `${Math.round(value)} h`;

// Each of the site's conditions at sample `at`: hours above the horizon, and the next change.
export function Conditions({ list, sky, at }: { list: Condition[]; sky: Sky; at: number }) {
	const first = list.length ? samples(sky, list[0]) : [];
	const total = first.length > 1 ? hours(first[0], first[first.length - 1]) : 0;
	return (
		<section className="flex flex-col gap-md" aria-label="Conditions">
			{list.map((condition) => (
				<Row
					key={condition}
					name={conditions[condition].name}
					positions={samples(sky, condition)}
					at={at}
					total={total}
					states={conditions[condition].states}
					changes={conditions[condition].changes}
				/>
			))}
		</section>
	);
}

function Row({
	name,
	positions,
	at,
	total,
	states,
	changes,
}: {
	name: string;
	positions: Position[];
	at: number;
	total: number;
	states: [string, string];
	changes: [string, string];
}) {
	const lasting = duration(positions);
	const now = until(positions, at);
	const next =
		now.hours === null
			? `no change in the window`
			: `${changes[now.up ? 0 : 1]} in ${format(now.hours)}`;
	return (
		<div className="flex flex-col gap-xs">
			<h3 className="text-label">{name}</h3>
			<p className="text-default tabular-nums">
				{format(lasting)} of {format(total)} above the horizon
			</p>
			<p className="tabular-nums">
				{states[now.up ? 0 : 1]}, {next}
			</p>
		</div>
	);
}

// Elevation over the window like a forecast, in a 100 by 40 box. The scale fits the window's range, so a Sun
// that grazes the horizon by a degree still reads. 0° is the horizon line.
export function Curve({
	positions,
	at,
	color,
	dashed,
}: {
	positions: Position[];
	at: number;
	color: "sun" | "earth";
	dashed: boolean;
}) {
	if (positions.length < 2) return null;
	const values = positions.map((p) => p.elevation);
	const top = Math.max(...values, 0.5);
	const bottom = Math.min(...values, -0.5);
	const x = (i: number) => (i / (positions.length - 1)) * 100;
	const y = (value: number) => ((top - value) / (top - bottom)) * 40;
	const line = values.map((v, i) => `${x(i)},${y(v)}`).join(" ");
	const zero = y(0);
	// The area between the curve and the horizon, above it only.
	const above = `0,${zero} ${values.map((v, i) => `${x(i)},${y(Math.max(v, 0))}`).join(" ")} 100,${zero}`;
	const stroke = `var(--chart-color-${color})`;
	return (
		<svg
			viewBox="0 0 100 40"
			preserveAspectRatio="none"
			className="w-full h-chart"
			aria-hidden="true"
		>
			<polygon points={above} fill={stroke} opacity={0.25} />
			<line
				x1={0}
				x2={100}
				y1={zero}
				y2={zero}
				stroke="var(--chart-color-horizon)"
				vectorEffect="non-scaling-stroke"
			/>
			<polyline
				points={line}
				fill="none"
				stroke={stroke}
				strokeWidth={2}
				strokeDasharray={dashed ? "4 3" : undefined}
				vectorEffect="non-scaling-stroke"
			/>
			<line
				x1={x(at)}
				x2={x(at)}
				y1={0}
				y2={40}
				stroke="var(--text-color-default)"
				vectorEffect="non-scaling-stroke"
			/>
		</svg>
	);
}
