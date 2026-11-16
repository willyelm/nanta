import type { Position, Sky } from "position";
import type { PointerEvent } from "react";
import type { Condition } from "site";
import { conditions, samples } from "./catalog";

// The compass's box, in SVG units: the site at the center, north up, east right.
const SIZE = 220;
const C = SIZE / 2;
const R = 90;
const SUN = 0.2665; // the Sun's angular radius, in degrees

// The sky from the site as a compass, seen from above: bearing around (north up), elevation from
// the center outward, zoomed to the window so a degree reads. The ring is the horizon; beyond it
// is ground, which blocks the view. Each condition's body traces its path, and a line runs from
// the site to where it is at sample `at`; the Sun is a disc at its true size. Pointing at a path
// picks that time.
export function HorizonChart({
	list,
	sky,
	at,
	onPick,
}: {
	list: Condition[];
	sky: Sky;
	at: number;
	onPick: (at: number) => void;
}) {
	const tracks = list.map((condition) => ({ condition, positions: samples(sky, condition) }));
	const all = tracks.flatMap((t) => t.positions.map((p) => p.elevation));
	if (all.length === 0) return null;
	// The center is the window's highest elevation, the edge its lowest; the horizon sits between.
	const low = Math.min(-2, Math.floor(Math.min(...all) - 1));
	const high = Math.max(2, Math.ceil(Math.max(...all) + 1));
	const r = (elevation: number) => (R * (high - elevation)) / (high - low);
	const point = (p: Position) => {
		const a = (p.azimuth * Math.PI) / 180;
		return { x: C + r(p.elevation) * Math.sin(a), y: C - r(p.elevation) * Math.cos(a) };
	};
	const path = (positions: Position[]) =>
		positions
			.map((p, i) => {
				const { x, y } = point(p);
				return `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
			})
			.join("");

	// The sample nearest the pointer, on any path.
	const pick = (event: PointerEvent<SVGSVGElement>) => {
		if (event.type === "pointermove" && event.buttons === 0) return;
		const box = event.currentTarget.getBoundingClientRect();
		const px = ((event.clientX - box.left) / box.width) * SIZE;
		const py = ((event.clientY - box.top) / box.height) * SIZE;
		let best = { at, distance: Number.POSITIVE_INFINITY };
		for (const { positions } of tracks) {
			positions.forEach((p, i) => {
				const { x, y } = point(p);
				const distance = Math.hypot(x - px, y - py);
				if (distance < best.distance) best = { at: i, distance };
			});
		}
		onPick(best.at);
	};

	const horizon = r(0);
	return (
		<svg
			viewBox={`0 0 ${SIZE} ${SIZE}`}
			className="w-full h-full touch-none cursor-crosshair"
			role="img"
			aria-label="Compass from the site: bearing around, north up; elevation from the center out. The ring is the horizon: inside, the site sees the body (sunlight is power, the Earth a direct link); outside, the ground is in the way. The table has the numbers."
			onPointerDown={pick}
			onPointerMove={pick}
		>
			{/* Ground: everything beyond the horizon ring. */}
			<circle cx={C} cy={C} r={R} fill="var(--chart-color-horizon)" opacity={0.18} />
			<circle cx={C} cy={C} r={horizon} fill="var(--background-color-neutral)" />
			<circle cx={C} cy={C} r={horizon} fill="none" stroke="var(--chart-color-horizon)" />
			{(
				[
					["N", 0],
					["E", 90],
					["S", 180],
					["W", 270],
				] as const
			).map(([label, bearing]) => {
				const a = (bearing * Math.PI) / 180;
				return (
					<text
						key={label}
						x={C + (R + 10) * Math.sin(a)}
						y={C - (R + 10) * Math.cos(a) + 3}
						textAnchor="middle"
						fontSize={9}
						fill="var(--text-color-secondary)"
					>
						{label}
					</text>
				);
			})}
			{/* The elevation scale along the north-east diagonal: the window's highest at the center,
			    0° on the horizon ring, its lowest at the edge. */}
			{[high, 0, low].map((elevation) => (
				<text
					key={elevation}
					x={C + r(elevation) * Math.SQRT1_2 + 2}
					y={C - r(elevation) * Math.SQRT1_2 - 2}
					fontSize={8}
					fill="var(--text-color-secondary)"
				>
					{elevation}°
				</text>
			))}
			{tracks.map(({ condition, positions }) => {
				const style = conditions[condition];
				const now = positions[Math.min(at, positions.length - 1)];
				const stroke = `var(--chart-color-${style.color})`;
				const here = now ? point(now) : null;
				return (
					<g key={condition}>
						<path
							d={path(positions)}
							fill="none"
							stroke={stroke}
							strokeWidth={1}
							opacity={0.6}
							strokeDasharray={style.dashed ? "4 3" : undefined}
						/>
						{here ? (
							<>
								{/* From the site to the body: its bearing, and inside or outside the ring. */}
								<line
									x1={C}
									y1={C}
									x2={here.x}
									y2={here.y}
									stroke={stroke}
									strokeWidth={2}
									strokeDasharray={style.dashed ? "4 3" : undefined}
								/>
								<circle
									cx={here.x}
									cy={here.y}
									r={style.body === "sun" ? Math.max(r(0) - r(SUN), 2.5) : 3.5}
									fill={stroke}
								/>
							</>
						) : null}
					</g>
				);
			})}
			<circle cx={C} cy={C} r={2} fill="var(--text-color-default)" />
		</svg>
	);
}

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
