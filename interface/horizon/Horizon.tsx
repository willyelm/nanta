import type { Position } from "position";
import { useEffect, useRef } from "react";
import {
	BufferAttribute,
	BufferGeometry,
	Line,
	LineBasicMaterial,
	LineDashedMaterial,
	OrthographicCamera,
	Scene,
	WebGLRenderer,
} from "three";

// Elevation over the window. 0 is the horizon. Sun and Earth are separate lines.
export function Horizon({ sun, earth }: { sun: Position[]; earth: Position[] }) {
	const canvas = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const el = canvas.current;
		if (!el) return;
		// Fixed chart colors (style.css), the same in both schemes. The Earth line is dashed, so the
		// two lines differ by more than hue.
		const style = getComputedStyle(el);
		const color = (name: string) => style.getPropertyValue(`--chart-color-${name}`).trim();
		const scene = new Scene();
		scene.add(
			track(
				sun.map((p) => p.elevation),
				color("sun"),
			),
		);
		scene.add(
			track(
				earth.map((p) => p.elevation),
				color("earth"),
				{ dashed: true },
			),
		);
		scene.add(track([0, 0], color("horizon"), { flat: true }));
		const renderer = new WebGLRenderer({ canvas: el, antialias: true, alpha: true });
		const camera = new OrthographicCamera(-1.05, 1.05, 1.05, -1.05, 0, 1);
		const draw = () => {
			const width = el.clientWidth || 640;
			const height = el.clientHeight || 240;
			renderer.setSize(width, height, false);
			renderer.render(scene, camera);
		};
		draw();
		const observer = new ResizeObserver(draw);
		observer.observe(el);
		return () => {
			observer.disconnect();
			renderer.dispose();
		};
	}, [sun, earth]);

	return (
		<figure className="flex flex-col gap-md text-default">
			<canvas ref={canvas} className="w-full h-[16rem] border border-divider" />
			<figcaption>
				Elevation in degrees. The flat gray line is the horizon, the solid line is the Sun, and the
				dashed line is the Earth.
			</figcaption>
			<table className="border-collapse">
				<thead>
					<tr>
						<th className="py-xs px-sm text-start tabular-nums">Time (UTC)</th>
						<th className="py-xs px-sm text-start tabular-nums">Sun</th>
						<th className="py-xs px-sm text-start tabular-nums">Earth</th>
					</tr>
				</thead>
				<tbody>
					{sun.map((point, i) => (
						<tr key={point.time}>
							<td className="py-xs px-sm text-start tabular-nums">
								{point.time.slice(0, 16).replace("T", " ")}
							</td>
							<td className="py-xs px-sm text-start tabular-nums">{point.elevation.toFixed(1)}°</td>
							<td className="py-xs px-sm text-start tabular-nums">
								{earth[i] ? `${earth[i].elevation.toFixed(1)}°` : "—"}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</figure>
	);
}

function track(values: number[], color: string, { flat = false, dashed = false } = {}) {
	const n = Math.max(values.length, 2);
	const position = new Float32Array(n * 3);
	for (let i = 0; i < n; i++) {
		const value = flat ? 0 : values[Math.min(i, values.length - 1)];
		position[i * 3] = n === 1 ? 0 : (i / (n - 1)) * 2 - 1;
		position[i * 3 + 1] = Math.max(-1, Math.min(1, value / 90));
	}
	const geometry = new BufferGeometry();
	geometry.setAttribute("position", new BufferAttribute(position, 3));
	if (!dashed) return new Line(geometry, new LineBasicMaterial({ color }));
	// Dash lengths are in the chart's units, where the width spans 2.
	return new Line(
		geometry,
		new LineDashedMaterial({ color, dashSize: 0.04, gapSize: 0.03 }),
	).computeLineDistances();
}
