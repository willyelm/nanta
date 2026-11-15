import type { Position, Sky } from "position";
import type { PointerEvent } from "react";
import type { Condition } from "site";
import { conditions, samples } from "./catalog";

// The chart's box, in SVG units: compass bearing across, elevation up.
const W = 360;
const H = 150;
const PAD = { top: 8, bottom: 22, left: 30, right: 6 };
const SUN = 0.2665; // the Sun's angular radius, in degrees

// The sky from the site, flattened: compass bearing across (N, E, S, W), elevation up, zoomed to
// the window so a degree reads. The line at 0° is the horizon; below it is ground, which blocks
// the view. Each condition's body traces its path over the window; at sample `at` the Sun is a
// disc at its true size, so a Sun half below the horizon shows as half a disc. Pointing at a
// path picks that time.
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
	const low = Math.min(-2, Math.floor(Math.min(...all) - 1));
	const high = Math.max(2, Math.ceil(Math.max(...all) + 1));
	const x = (azimuth: number) => PAD.left + (azimuth / 360) * (W - PAD.left - PAD.right);
	const y = (elevation: number) =>
		PAD.top + ((high - elevation) / (high - low)) * (H - PAD.top - PAD.bottom);

	// A path through the samples, broken where the bearing wraps past north.
	const path = (positions: Position[]) =>
		positions
			.map((p, i) => {
				const jump = i > 0 && Math.abs(p.azimuth - positions[i - 1].azimuth) > 180;
				return `${i === 0 || jump ? "M" : "L"}${x(p.azimuth).toFixed(1)},${y(p.elevation).toFixed(2)}`;
			})
			.join("");

	// The sample nearest the pointer, on any path.
	const pick = (event: PointerEvent<SVGSVGElement>) => {
		if (event.type === "pointermove" && event.buttons === 0) return;
		const box = event.currentTarget.getBoundingClientRect();
		const px = ((event.clientX - box.left) / box.width) * W;
		const py = ((event.clientY - box.top) / box.height) * H;
		let best = { at, distance: Number.POSITIVE_INFINITY };
		for (const { positions } of tracks) {
			positions.forEach((p, i) => {
				const distance = Math.hypot(x(p.azimuth) - px, y(p.elevation) - py);
				if (distance < best.distance) best = { at: i, distance };
			});
		}
		onPick(best.at);
	};

	const zero = y(0);
	const ticks = [low, 0, high];
	return (
		<figure className="flex flex-col gap-xs">
			<figcaption className="text-label">Horizon from the site</figcaption>
			<svg
				viewBox={`0 0 ${W} ${H}`}
				className="w-full h-auto touch-none cursor-crosshair"
				role="img"
				aria-label="Sun and Earth against the horizon, by compass bearing and elevation. The table below has the numbers."
				onPointerDown={pick}
				onPointerMove={pick}
			>
				{/* Ground: below the horizon the view is blocked. */}
				<rect
					x={x(0)}
					y={zero}
					width={x(360) - x(0)}
					height={y(low) - zero}
					fill="var(--chart-color-horizon)"
					opacity={0.18}
				/>
				<line x1={x(0)} x2={x(360)} y1={zero} y2={zero} stroke="var(--chart-color-horizon)" />
				{ticks.map((tick) => (
					<text
						key={tick}
						x={PAD.left - 4}
						y={y(tick) + 3}
						textAnchor="end"
						fontSize={9}
						fill="var(--text-color-secondary)"
					>
						{tick}°
					</text>
				))}
				{(
					[
						["N", 0],
						["E", 90],
						["S", 180],
						["W", 270],
						["N", 360],
					] as const
				).map(([label, bearing]) => (
					<text
						key={bearing}
						x={x(bearing)}
						y={H - 6}
						textAnchor="middle"
						fontSize={9}
						fill="var(--text-color-secondary)"
					>
						{label}
					</text>
				))}
				{tracks.map(({ condition, positions }) => {
					const style = conditions[condition];
					const now = positions[Math.min(at, positions.length - 1)];
					const stroke = `var(--chart-color-${style.color})`;
					return (
						<g key={condition}>
							<path
								d={path(positions)}
								fill="none"
								stroke={stroke}
								strokeWidth={1.5}
								strokeDasharray={style.dashed ? "4 3" : undefined}
							/>
							{now ? (
								style.body === "sun" ? (
									<ellipse
										cx={x(now.azimuth)}
										cy={y(now.elevation)}
										rx={Math.max(x(SUN) - x(0), 2)}
										ry={y(0) - y(SUN)}
										fill={stroke}
									/>
								) : (
									<circle cx={x(now.azimuth)} cy={y(now.elevation)} r={3.5} fill={stroke} />
								)
							) : null}
						</g>
					);
				})}
			</svg>
			<p className="text-caption">
				Above the line the site sees it: sunlight is power, the Earth is a direct link. Below the
				line the ground is in the way. Point at a path to pick a time.
			</p>
		</figure>
	);
}
