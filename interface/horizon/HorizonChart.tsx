import type { Position, Sky } from "position";
import { type PointerEvent, useMemo } from "react";
import type { Condition } from "site";
import { conditions, samples } from "./catalog";

// The compass's box, in SVG units: the site at the center, north up, east right.
const SIZE = 220;
const C = SIZE / 2;
const R = 90;
const SUN = 0.2665; // the Sun's angular radius, in degrees

type Track = {
	condition: Condition;
	positions: Position[];
	d: string;
	stroke: string;
	dashed: boolean;
	sun: boolean;
};

// Geometry that only depends on the samples: rebuilt when the sky or conditions change, kept
// across time picks so a dragged scrub doesn't rebuild every path string.
function prepare(list: Condition[], sky: Sky) {
	const tracks: Track[] = list.map((condition) => {
		const style = conditions[condition];
		const positions = samples(sky, condition);
		return {
			condition,
			positions,
			d: "",
			stroke: `var(--chart-color-${style.color})`,
			dashed: style.dashed,
			sun: style.body === "sun",
		};
	});
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
	for (const track of tracks) {
		track.d = track.positions
			.map((p, i) => {
				const { x, y } = point(p);
				return `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
			})
			.join("");
	}
	return { tracks, low, high, r, point, horizon: r(0) };
}

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
	onFlush,
	onDragStart,
}: {
	list: Condition[];
	sky: Sky;
	at: number;
	onPick: (at: number) => void;
	// Start/end of a drag: local time ignores URL echoes while the pointer is down.
	onDragStart?: () => void;
	onFlush?: () => void;
}) {
	const prepared = useMemo(() => prepare(list, sky), [list, sky]);
	if (!prepared) return null;
	const { tracks, low, high, r, point, horizon } = prepared;

	// The sample nearest the pointer, on any path.
	const pick = (event: PointerEvent<SVGSVGElement>) => {
		if (event.type === "pointermove" && event.buttons === 0) return;
		if (event.type === "pointerdown") onDragStart?.();
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

	return (
		<svg
			viewBox={`0 0 ${SIZE} ${SIZE}`}
			className="w-full h-full touch-none cursor-crosshair"
			role="img"
			aria-label="Compass from the site: bearing around, north up; elevation from the center out. The ring is the horizon: inside, the site sees the body (sunlight is power, the Earth a direct link); outside, the ground is in the way. The table has the numbers."
			onPointerDown={pick}
			onPointerMove={pick}
			onPointerUp={onFlush}
			onPointerCancel={onFlush}
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
			{tracks.map(({ condition, positions, d, stroke, dashed, sun }) => {
				const now = positions[Math.min(at, positions.length - 1)];
				const here = now ? point(now) : null;
				return (
					<g key={condition}>
						<path
							d={d}
							fill="none"
							stroke={stroke}
							strokeWidth={1}
							opacity={0.6}
							strokeDasharray={dashed ? "4 3" : undefined}
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
									strokeDasharray={dashed ? "4 3" : undefined}
								/>
								<circle
									cx={here.x}
									cy={here.y}
									r={sun ? Math.max(r(0) - r(SUN), 2.5) : 3.5}
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
