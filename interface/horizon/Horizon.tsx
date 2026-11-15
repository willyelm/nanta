import type { Position } from "position";
import { useEffect, useRef } from "react";
import {
	BufferAttribute,
	BufferGeometry,
	Line,
	LineBasicMaterial,
	OrthographicCamera,
	Scene,
	WebGLRenderer,
} from "three";
import styles from "./Horizon.module.css";

// Elevation over the window. 0 is the horizon. Sun and Earth are separate lines.
export function Horizon({ sun, earth }: { sun: Position[]; earth: Position[] }) {
	const canvas = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const el = canvas.current;
		if (!el) return;
		const color = getComputedStyle(el).color;
		const muted = getComputedStyle(el).borderTopColor;
		const renderer = new WebGLRenderer({ canvas: el, antialias: true, alpha: true });
		const scene = new Scene();
		const camera = new OrthographicCamera(-1.05, 1.05, 1.05, -1.05, 0, 1);
		scene.add(
			track(
				sun.map((p) => p.elevation),
				color,
			),
		);
		scene.add(
			track(
				earth.map((p) => p.elevation),
				muted,
			),
		);
		scene.add(track([0, 0], muted, true));
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
		<figure className={styles.Horizon}>
			<canvas ref={canvas} />
			<figcaption>
				Elevation in degrees. The flat line is the horizon. Bright line is the Sun, dim line is the
				Earth.
			</figcaption>
			<table>
				<thead>
					<tr>
						<th>Time (UTC)</th>
						<th>Sun</th>
						<th>Earth</th>
					</tr>
				</thead>
				<tbody>
					{sun.map((point, i) => (
						<tr key={point.time}>
							<td>{point.time.slice(0, 16).replace("T", " ")}</td>
							<td>{point.elevation.toFixed(1)}°</td>
							<td>{earth[i] ? `${earth[i].elevation.toFixed(1)}°` : "—"}</td>
						</tr>
					))}
				</tbody>
			</table>
		</figure>
	);
}

function track(values: number[], color: string, flat = false) {
	const n = Math.max(values.length, 2);
	const position = new Float32Array(n * 3);
	for (let i = 0; i < n; i++) {
		const value = flat ? 0 : values[Math.min(i, values.length - 1)];
		position[i * 3] = n === 1 ? 0 : (i / (n - 1)) * 2 - 1;
		position[i * 3 + 1] = Math.max(-1, Math.min(1, value / 90));
	}
	const geometry = new BufferGeometry();
	geometry.setAttribute("position", new BufferAttribute(position, 3));
	return new Line(geometry, new LineBasicMaterial({ color }));
}
