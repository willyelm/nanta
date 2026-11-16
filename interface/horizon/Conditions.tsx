import type { Position, Sky } from "position";
import type { Condition } from "site";
import { conditions, samples } from "./catalog";

const HOUR = 3_600_000;
const hours = (a: Position, b: Position) => (Date.parse(b.time) - Date.parse(a.time)) / HOUR;

// "Sun 0.8° below the horizon, bearing 12°. Earth 5.4° above, bearing 131°."
export function summarize(list: Condition[], sky: Sky, at: number) {
	return list
		.map((condition, i) => {
			const positions = samples(sky, condition);
			const p = positions[Math.min(at, positions.length - 1)];
			if (!p) return "";
			const side = p.elevation >= 0 ? "above" : "below";
			const where = i === 0 ? `${side} the horizon` : side;
			return `${conditions[condition].label} ${Math.abs(p.elevation).toFixed(1)}° ${where}, bearing ${Math.round(p.azimuth)}°.`;
		})
		.join(" ");
}

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

// Each flagged condition as a group: live numbers large, supporting detail as captions, curve under.
export function Conditions({ list, sky, at }: { list: Condition[]; sky: Sky; at: number }) {
	const first = list.length ? samples(sky, list[0]) : [];
	const total = first.length > 1 ? hours(first[0], first[first.length - 1]) : 0;
	return (
		<section className="flex flex-col gap-md" aria-label="Conditions">
			<p className="text-caption text-secondary">{summarize(list, sky, at)}</p>
			{list.map((condition) => {
				const meta = conditions[condition];
				return (
					<article key={condition} className="flex flex-col gap-sm">
						<Row
							name={meta.name}
							positions={samples(sky, condition)}
							at={at}
							total={total}
							states={meta.states}
							changes={meta.changes}
						/>
						<Curve
							positions={samples(sky, condition)}
							at={at}
							color={meta.color}
							dashed={meta.dashed}
						/>
					</article>
				);
			})}
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
	const sample = positions[Math.min(at, Math.max(positions.length - 1, 0))];
	const elevation = sample
		? `${sample.elevation >= 0 ? "+" : ""}${sample.elevation.toFixed(1)}°`
		: "—";
	const next =
		now.hours === null
			? "no change in the window"
			: `${changes[now.up ? 0 : 1]} in ${format(now.hours)}`;
	return (
		<header className="flex flex-col gap-xs">
			<h3 className="text-caption text-secondary uppercase">{name}</h3>
			<p className="text-subheading text-default tabular-nums">
				<span>{elevation}</span>
				<span className="text-secondary"> · </span>
				<span>{states[now.up ? 0 : 1]}</span>
			</p>
			<p className="text-caption text-secondary tabular-nums">
				{format(lasting)} of {format(total)} above the horizon · {next}
			</p>
		</header>
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
