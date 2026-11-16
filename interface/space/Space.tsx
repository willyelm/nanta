import type { Body as Entry } from "body";
import type { Body, Position, Sky, State } from "position";
import { useEffect, useRef } from "react";
import { classNames } from "system";
import {
	AmbientLight,
	BufferAttribute,
	type BufferGeometry,
	CircleGeometry,
	CylinderGeometry,
	DirectionalLight,
	type Line,
	LineBasicMaterial,
	LineDashedMaterial,
	LineSegments,
	type Material,
	Mesh,
	MeshBasicMaterial,
	MeshStandardMaterial,
	PerspectiveCamera,
	PointLight,
	Points,
	PointsMaterial,
	Quaternion,
	RingGeometry,
	Scene,
	SphereGeometry,
	type Vector3,
	WebGLRenderer,
} from "three";
import {
	AU,
	all,
	byCode,
	codes,
	direction,
	distance,
	EARTH,
	ecliptic,
	eclipticOver,
	filler,
	frame,
	graticule,
	J2000,
	line,
	MOON,
	names,
	OBLIQUITY,
	plus,
	radius,
	SCALE,
	SKY,
	SUN_SIZE,
	shade,
	size,
	spaceSize,
	spin,
	starAt,
	starOver,
	toBody,
	toRad,
	vec,
} from "./geometry";
import { advance } from "./orbit";
import { store, type View } from "./view";

let states: State[] = [];
let statesFor: ((time?: number) => State[] | undefined) | undefined;
// The camera readout: where the camera sits around what it looks at, as labeled columns.
// The render loop writes the cells directly, so it never re-renders.
const cells: (HTMLElement | null)[] = [];

export function CameraReadout() {
	const cell = (i: number) => (node: HTMLElement | null) => {
		cells[i] = node;
	};
	return (
		<dl aria-label="Camera" className="flex gap-md font-mono tabular-nums">
			{[0, 1, 2, 3].map((column) => (
				<div key={column} className="flex flex-col">
					<dt ref={cell(column * 2)} className="text-caption text-secondary uppercase" />
					<dd ref={cell(column * 2 + 1)} className="text-label text-default text-end" />
				</div>
			))}
		</dl>
	);
}

const degrees = (radians: number) => `${Math.round(radians / toRad)}°`;

// The one scene of the app, behind every page, built once. Without a site it is space now: the
// Sun, and the bodies where they are, moving with the clock. With a site, the body is at the
// center with the site on it, and the other bodies where Horizons puts them from that site.
// A selection moves the camera. Drawn on demand.
export function Space() {
	const canvas = useRef<HTMLCanvasElement>(null);
	const labels = useRef<Partial<Record<Body, HTMLSpanElement | null>>>({});
	const status = useRef<HTMLParagraphElement>(null);
	const caption = useRef<HTMLParagraphElement>(null);

	useEffect(() => {
		const el = canvas.current;
		if (!el) return;
		const style = getComputedStyle(el);
		const color = (name: string) => style.getPropertyValue(`--chart-color-${name}`).trim();
		const gray = color("horizon");
		const paint = (name: Body) => style.getPropertyValue(`--body-color-${name}`).trim();

		const scene = new Scene();
		// Sunlight from the Sun's true direction, strong, with little ambient: the day side is
		// bright, the night side dark, and the terminator between them plain.
		const sunlight = new DirectionalLight("#ffffff", 3.5);
		// In space the light is the Sun itself, so each body is lit from where the Sun is.
		const sunpoint = new PointLight("#ffffff", 3.5, 0, 0);
		scene.add(new AmbientLight("#ffffff", 0.04), sunlight, sunpoint);

		// Every body as a globe: latitude and longitude lines every 15°, over a smooth lit surface
		// that hides the far side and shades by the Sun's angle. The Sun glows unlit. Only the
		// site's body and those with data show.
		const grids = {} as Record<Body, BufferGeometry>;
		const ball = new SphereGeometry(0.995, 64, 32);
		const meshes = {} as Record<Body, Mesh>;
		const paints: [Body, Material, Material][] = [];
		for (const body of all) {
			const color = paint(body);
			const surface =
				body === "sun"
					? new MeshBasicMaterial({ color, transparent: true, opacity: 0.35 })
					: new MeshStandardMaterial({ color, transparent: true, opacity: 0.7 });
			const lines = new LineBasicMaterial({ color, vertexColors: true });
			grids[body] = graticule();
			meshes[body] = new Mesh(ball, surface);
			meshes[body].add(new LineSegments(grids[body], lines));
			paints.push([body, surface, lines]);
			scene.add(meshes[body]);
		}

		// The site: its horizon as a disc on the surface, outlined, and the sight lines from it.
		const horizon = new Mesh(
			new CircleGeometry(0.12, 48),
			new MeshBasicMaterial({ color: gray, transparent: true, opacity: 0.5 }),
		);
		const outline = new Mesh(
			new RingGeometry(0.14, 0.17, 48),
			new MeshBasicMaterial({ color: color("select") }),
		);
		// Sunlight as a beam, wide at the Sun and narrowing onto the site; the Earth link as dashes,
		// like pulses. Solid while the body is above the site's horizon, faint once the ground is
		// in the way. Shapes, not lines, since WebGL draws lines a pixel wide.
		// The beam is light: a bright pale-gold core inside a faint amber glow, both narrowing from
		// the Sun onto the site.
		const core = new Mesh(
			new CylinderGeometry(0.002, 0.014, 1, 24, 1, true),
			new MeshBasicMaterial({
				color: style.getPropertyValue("--body-color-sunlight").trim(),
				transparent: true,
				opacity: 1,
			}),
		);
		const glow = new Mesh(
			new CylinderGeometry(0.008, 0.06, 1, 24, 1, true),
			new MeshBasicMaterial({ color: paint("sun"), transparent: true, opacity: 0.22 }),
		);
		const beam = new Scene();
		beam.add(core, glow);
		const DASHES = 28;
		const pulse = new MeshBasicMaterial({ color: color("earth"), transparent: true, opacity: 0.9 });
		const dash = new CylinderGeometry(0.003, 0.003, 1, 8);
		const link = new Scene();
		const dashes = Array.from({ length: DASHES }, () => {
			const mesh = new Mesh(dash, pulse);
			link.add(mesh);
			return mesh;
		});
		const sight = { sun: beam, earth: link };
		// The selected body, before a site: the same outline, around the body, facing the camera.
		const ring = new Mesh(new RingGeometry(1.12, 1.18, 96), outline.material);
		scene.add(horizon, outline, ring, sight.sun, sight.earth);

		// Stars: a faint filler, and the named reference stars from /api/bodies, sized by brightness
		// and labeled. Their directions are true in space; at a site the frame is the body's own, so
		// only the filler shows there.
		const starColor = () => getComputedStyle(el).getPropertyValue("--body-color-moon").trim();
		const faint = new PointsMaterial({ color: starColor(), size: 1, sizeAttenuation: false });
		const bright = new MeshBasicMaterial({ color: starColor() });
		scene.add(new Points(filler(3000), faint));
		const named: { mesh: Mesh; label: HTMLSpanElement; ra: number; dec: number }[] = [];

		const renderer = new WebGLRenderer({ canvas: el, antialias: true, alpha: true });
		renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
		const camera = new PerspectiveCamera(45, 1, 0.01, 500);
		// The closest the camera may zoom to its target, set by what it looks at.
		let nearest = 0.05;
		camera.position.set(0, 1.5, 5);
		// Free rotation in every direction: a drag adds spin around the camera's own axes, and the
		// spin fades each frame, so it glides to a stop. The wheel zooms the same way.
		const target = vec();
		const spin = { x: 0, y: 0, zoom: 0 };
		const turn = new Quaternion();
		const offset = vec();
		const side = vec();
		let dragging: { x: number; y: number } | null = null;

		// The camera eases to a goal when the selection changes, up included; a drag stops it.
		const goal = {
			position: camera.position.clone(),
			target: target.clone(),
			up: vec(0, 1, 0),
		};
		const point = vec();
		let easing = false;
		let frameId = 0;
		const render = () => {
			frameId = 0;
			easing &&=
				camera.position.distanceTo(goal.position) > 0.001 ||
				target.distanceTo(goal.target) > 0.001 ||
				camera.up.distanceTo(goal.up) > 0.001;
			if (easing) {
				camera.position.lerp(goal.position, 0.12);
				target.lerp(goal.target, 0.12);
				camera.up.lerp(goal.up, 0.12).normalize();
			}
			// Turn around the target: left-right about the camera's up, up-down about its side.
			const spinning = Math.abs(spin.x) + Math.abs(spin.y) + Math.abs(spin.zoom) > 1e-5;
			if (spinning) {
				offset.copy(camera.position).sub(target);
				side.crossVectors(camera.up, offset).normalize();
				offset.applyQuaternion(turn.setFromAxisAngle(camera.up, spin.x));
				turn.setFromAxisAngle(side, spin.y);
				offset.applyQuaternion(turn);
				camera.up.applyQuaternion(turn).normalize();
				const length = Math.min(Math.max(offset.length() * Math.exp(spin.zoom), nearest), 80);
				offset.normalize().multiplyScalar(length);
				camera.position.copy(target).add(offset);
				spin.x *= 0.88;
				spin.y *= 0.88;
				spin.zoom *= 0.8;
			}
			camera.lookAt(target);
			// The readout: the camera's azimuth and elevation around the site, in the site's frame, or
			// its ecliptic longitude and latitude in space; then the distance, in body radii or AU.
			if (cells[0]) {
				offset.copy(camera.position).sub(target);
				const distance = offset.length();
				const [a, b, c] = [offset.dot(axes.north), offset.dot(axes.east), offset.dot(axes.up)];
				const around = Math.atan2(b, a);
				const height = Math.asin(Math.max(-1, Math.min(1, c / (distance || 1))));
				// The frame names what the angles are measured against: the body's surface at the site,
				// which turns with the body, or the ecliptic, fixed in space.
				const texts = [
					"Frame",
					axes.site ? "Body" : "Space",
					axes.site ? "Azimuth" : "Longitude",
					degrees((around + 2 * Math.PI) % (2 * Math.PI)),
					axes.site ? "Elevation" : "Latitude",
					degrees(height),
					"Distance",
					axes.site ? `${distance.toFixed(2)} R` : `${(distance / SCALE).toFixed(2)} AU`,
				];
				texts.forEach((text, i) => {
					const node = cells[i];
					if (node && node.textContent !== text) node.textContent = text;
				});
			}
			ring.quaternion.copy(camera.quaternion);
			renderer.render(scene, camera);
			// Labels follow their bodies on screen, by transform, so no layout.
			const [width, height] = [el.clientWidth, el.clientHeight];
			for (const body of all) {
				const label = labels.current[body];
				const mesh = meshes[body];
				if (!label) continue;
				const p = mesh.position;
				point.set(p.x, p.y + mesh.scale.y * 1.3, p.z).project(camera);
				label.hidden = !mesh.visible || point.z > 1;
				label.style.transform = `translate(${((point.x + 1) / 2) * width}px, ${((1 - point.y) / 2) * height}px) translate(-50%, -100%)`;
			}
			for (const { mesh, label } of named) {
				point.copy(mesh.position).project(camera);
				label.hidden = !mesh.visible || point.z > 1;
				label.style.transform = `translate(${((point.x + 1) / 2) * width}px, ${((1 - point.y) / 2) * height}px) translate(-50%, -150%)`;
			}
			if (easing || spinning) draw();
			else if (touched && !dragging) {
				touched = false;
				save();
			}
		};
		const draw = () => {
			frameId ||= requestAnimationFrame(render);
		};
		const resize = () => {
			const [width, height] = [el.clientWidth || 640, el.clientHeight || 480];
			renderer.setSize(width, height, false);
			camera.aspect = width / height;
			camera.updateProjectionMatrix();
			draw();
		};

		let last: View = {};
		// Orbit rings for Earth and Mars at their current distance, and the Moon's around the Earth.
		const orbit = (r: number) =>
			line(
				gray,
				false,
				Array.from({ length: 129 }, (_, i) => {
					const a = (i / 128) * Math.PI * 2;
					return vec(Math.cos(a) * r, 0, Math.sin(a) * r);
				}),
			);
		const rings: Partial<Record<Body, Line>> = {};

		// The frame the readout measures in: the site's (north, east, up), or the ecliptic in space.
		// The camera the user set, kept in the URL as ?camera=azimuth,elevation,distance (degrees,
		// scene units) in the current frame, and restored on load. While it holds, automatic camera
		// moves for the same selection leave it alone; a new selection releases it.
		const saved = new URLSearchParams(location.search).get("camera")?.split(",").map(Number);
		let restore = saved?.length === 3 && saved.every(Number.isFinite) ? saved : null;
		let held = false;
		let touched = false;
		const place = ([az, el, distance]: number[]) => {
			const [a, e] = [az * toRad, el * toRad];
			const d = plus(
				plus(
					plus(vec(), axes.north, Math.cos(e) * Math.cos(a)),
					axes.east,
					Math.cos(e) * Math.sin(a),
				),
				axes.up,
				Math.sin(e),
			);
			goal.position.copy(plus(goal.target, d, distance));
			goal.up.copy(axes.up);
			camera.position.copy(goal.position);
			camera.up.copy(goal.up);
			target.copy(goal.target);
			easing = false;
			held = true;
			restore = null;
		};
		const save = () => {
			offset.copy(camera.position).sub(target);
			const distance = offset.length();
			const az = Math.atan2(offset.dot(axes.east), offset.dot(axes.north)) / toRad;
			const el =
				Math.asin(Math.max(-1, Math.min(1, offset.dot(axes.up) / (distance || 1)))) / toRad;
			const url = new URL(location.href);
			url.searchParams.set(
				"camera",
				[((az + 360) % 360).toFixed(1), el.toFixed(1), distance.toFixed(3)].join(","),
			);
			history.replaceState(history.state, "", url);
		};

		const axes = {
			site: false,
			north: vec(1, 0, 0),
			east: vec(0, 0, -1),
			up: vec(0, 1, 0),
		};

		// Where a body is around the Sun at `time`, in km on the ecliptic, from the space states.
		const helio = (body: Body, time: number): number[] | null => {
			if (body === "sun") return [0, 0, 0];
			const state = (code: string) => states.find((s) => s.code === code);
			const ahead = (code: string) => {
				const s = state(code);
				return s ? advance(s, time - Date.parse(s.time)) : null;
			};
			if (body === "moon") {
				const [earth, moon] = [ahead("399"), ahead("301")];
				return earth && moon ? earth.map((v, i) => v + moon[i]) : null;
			}
			return ahead(body === "earth" ? "399" : "499");
		};

		// Shades every visible body's grid from the Sun at `sun` (scene position).
		const light = (sun: Vector3) => {
			for (const body of all) {
				if (body === "sun" || !meshes[body].visible) continue;
				shade(grids[body], plus(sun, meshes[body].position, -1).normalize());
			}
		};

		// The body the camera last aimed at with its real position, and where it was last frame.
		let aimed: string | undefined;
		const followed = vec();

		const space = (next: View) => {
			for (const star of named) star.mesh.position.copy(starAt(star.ra, star.dec));
			Object.assign(axes, {
				site: false,
				north: vec(1, 0, 0),
				east: vec(0, 0, -1),
				up: vec(0, 1, 0),
			});
			const now = next.time ?? Date.now();
			// The Sun always; each other body once its state has arrived.
			for (const body of all) meshes[body].visible = body === "sun";
			meshes.sun.position.set(0, 0, 0);
			meshes.sun.scale.set(spaceSize.sun, spaceSize.sun, spaceSize.sun);
			sunlight.visible = false;
			sunpoint.visible = true;
			horizon.visible = outline.visible = sight.sun.visible = sight.earth.visible = false;
			for (const s of states) {
				const body = byCode[s.code];
				const p = advance(s, now - Date.parse(s.time));
				const mesh = meshes[body];
				if (s.center === "10") {
					mesh.position.copy(ecliptic(p, SCALE / AU));
					const r = Math.hypot(...p) * (SCALE / AU);
					if (!rings[body]) {
						rings[body] = orbit(r);
						scene.add(rings[body]);
					}
				} else {
					mesh.position.copy(plus(meshes.earth.position, ecliptic(p).normalize(), MOON));
				}
				mesh.scale.set(spaceSize[body], spaceSize[body], spaceSize[body]);
				mesh.visible = true;
			}
			for (const ring of Object.values(rings)) if (ring) ring.visible = true;
			// The selected body gets the ring and the camera.
			const selected = next.body ? codes[next.body] : undefined;
			ring.visible = !!selected && meshes[selected].visible;
			if (selected) {
				const k = spaceSize[selected];
				ring.position.copy(meshes[selected].position);
				ring.scale.set(k, k, k);
			}
			// Follow the selected body as time moves it: shift the camera and its target by the same
			// step, so the angle and zoom stay and the body stays framed.
			const placed = !!selected && (selected === "sun" || meshes[selected].visible);
			if (placed && selected && aimed === next.body && next.body === last.body) {
				const step = plus(meshes[selected].position, followed, -1);
				if (step.length() > 1e-9) {
					camera.position.copy(plus(camera.position, step));
					target.copy(plus(target, step));
					goal.position.copy(plus(goal.position, step));
					goal.target.copy(plus(goal.target, step));
				}
			}
			if (selected) followed.copy(meshes[selected].position);
			// Aim when the selection changes, and again once the selected body has its real position
			// (on first load the URL picks it before its Horizons state has arrived).
			if (next.body !== last.body || last.lat !== undefined || (placed && aimed !== next.body)) {
				aimed = placed ? next.body : undefined;
				const at = selected ? meshes[selected].position : vec();
				// Close enough to fill the view with the body, or the inner orbits with none.
				// Far enough back that perspective doesn't swell a small body next to a large one.
				const away = selected ? Math.max(spaceSize[selected] * 8, 2.5) : 32;
				nearest = selected ? spaceSize[selected] * 1.5 : 1.5;
				held = false;
				goal.target.copy(at);
				goal.position.copy(plus(at, vec(0, 0.6, 1).normalize(), away));
				goal.up.set(0, 1, 0);
				easing = true;
				if (restore) place(restore);
			}
			light(vec());
			last = next;
			draw();
		};

		store.apply = (next) => {
			if (caption.current) caption.current.textContent = next.caption ?? "";
			states = statesFor?.(next.time) ?? states;
			if (next.lat === undefined || next.lon === undefined) return space(next);
			for (const ring of Object.values(rings)) if (ring) ring.visible = false;
			const home = codes[next.body ?? "301"] ?? "moon";
			// The stars over this body at the slider's time, or now before a window is chosen.
			const sample = Object.values(next.sky ?? {})[0]?.[next.at ?? 0];
			const when = sample ? Date.parse(sample.time) : (next.time ?? Date.now());
			if (home !== "sun") {
				for (const star of named) star.mesh.position.copy(starOver(home, star.ra, star.dec, when));
			}
			const base = radius[home];
			for (const body of all) meshes[body].visible = body === home;
			meshes[home].position.set(0, 0, 0);
			meshes[home].scale.set(1, 1, 1);

			const hasSite = next.lat !== undefined && next.lon !== undefined;
			const f = frame(next.lat ?? 0, next.lon ?? 0);
			Object.assign(axes, { site: true, ...f });
			const site = f.up;
			horizon.visible = outline.visible = hasSite;
			ring.visible = !hasSite && next.body !== undefined;
			if (hasSite) {
				// A fixed marker for reference: Horizons answers for the point, not an area.
				for (const mesh of [horizon, outline]) {
					mesh.position.copy(plus(vec(), site, 1.002));
					mesh.lookAt(plus(vec(), site, 2));
				}
			}

			// The other bodies along their true directions from the site, at sample `at`.
			const at = next.at ?? 0;
			sunlight.visible = true;
			sunpoint.visible = false;
			nearest = 0.05;
			sunlight.position.set(10, 0, 0);
			for (const [body, positions] of Object.entries(next.sky ?? {}) as [Body, Position[]][]) {
				const p = positions[Math.min(at, positions.length - 1)];
				if (!p || !hasSite || body === home) continue;
				const mesh = meshes[body];
				const s = size(body, base);
				mesh.visible = true;
				mesh.position.copy(plus(site, direction(f, p), distance(p.range, base)));
				mesh.scale.set(s, s, s);
				if (body === "sun") sunlight.position.copy(mesh.position);
			}

			// The bodies without a window's samples yet: placed from the space states (where each one
			// is around the Sun at `when`), turned into this body's frame by its rotation model.
			// Close for reference; a window's Horizons samples take over with exact directions.
			if (hasSite && home !== "sun" && states.length) {
				const around = (b: Body) => helio(b, when);
				const center = around(home);
				for (const body of all) {
					if (body === home || meshes[body].visible) continue;
					const from = around(body);
					if (!from || !center) continue;
					const toward = eclipticOver(
						home,
						[0, 1, 2].map((i) => from[i] - center[i]),
						when,
					);
					const km = toward.length();
					const s = size(body, base);
					const mesh = meshes[body];
					mesh.visible = true;
					mesh.position.copy(toward.normalize().multiplyScalar(distance(km, base)));
					mesh.scale.set(s, s, s);
					if (body === "sun") sunlight.position.copy(mesh.position);
				}
			}

			// The beam to the Sun and the link to the Earth, bright above the horizon, faint below.
			const along = vec(0, 1, 0);
			for (const body of ["sun", "earth"] as const) {
				const target = meshes[body].position;
				const shown = hasSite && body !== home && meshes[body].visible;
				sight[body].visible = shown;
				if (!shown) continue;
				const toward = plus(target, site, -1);
				const length = toward.length();
				const direction = toward.clone().normalize();
				const up = direction.dot(f.up) > 0;
				if (body === "sun") {
					// The cylinder runs along y; turn it onto the ray, centered between site and Sun.
					beam.position.copy(plus(site, toward, 0.5));
					beam.quaternion.setFromUnitVectors(along, direction.clone().multiplyScalar(-1));
					beam.scale.set(1, length, 1);
					core.material.opacity = up ? 1 : 0.15;
					glow.material.opacity = up ? 0.22 : 0.04;
				} else {
					const step = length / DASHES;
					dashes.forEach((mesh, i) => {
						mesh.position.copy(plus(site, direction, step * (i + 0.5)));
						mesh.quaternion.setFromUnitVectors(along, direction);
						mesh.scale.set(1, step * 0.55, 1);
					});
					pulse.opacity = up ? 0.9 : 0.15;
				}
			}

			// At a site the camera stands just above it with the site's zenith as up, so the sky is
			// above wherever the site is. It stands low behind the site and looks across its horizon:
			// north until the window's data arrives, then toward the Earth's bearing (or the Sun's).
			// Only the bearing counts, so a body high overhead never tips the camera into the ground.
			const moved = next.body !== last.body || next.lat !== last.lat || next.lon !== last.lon;
			if (moved) held = false;
			if (moved || (!held && next.sky && next.sky !== last.sky)) {
				const body = (["earth", "sun"] as Body[]).find((b) => b !== home && meshes[b].visible);
				const toward = body ? plus(meshes[body].position, site, -1) : f.north;
				// Flatten onto the horizon: drop the part along up. Straight overhead keeps north.
				const flat = plus(toward, f.up, -toward.dot(f.up));
				const look = flat.length() > 1e-6 ? flat.normalize() : f.north;
				goal.target.copy(plus(site, f.up, 0.08));
				goal.position.copy(plus(plus(site, f.up, 0.25), look, -1.2));
				goal.up.copy(f.up);
				easing = true;
				if (restore) place(restore);
			}
			light(sunlight.position);
			last = next;
			draw();
		};

		// A drag stops any ease; its movement becomes spin.
		let pressed = { x: 0, y: 0 };
		const down = (event: PointerEvent) => {
			easing = false;
			dragging = { x: event.clientX, y: event.clientY };
			pressed = dragging;
			el.setPointerCapture(event.pointerId);
		};
		const move = (event: PointerEvent) => {
			if (!dragging) return;
			spin.x -= (event.clientX - dragging.x) * 0.004;
			spin.y -= (event.clientY - dragging.y) * 0.004;
			touched = held = true;
			dragging = { x: event.clientX, y: event.clientY };
			draw();
		};
		// A click (not a drag) on the body, while a site is being placed, picks that point: the ray
		// from the camera meets the unit sphere, and its direction is the latitude and longitude.
		const up = (event: PointerEvent) => {
			dragging = null;
			const pick = store.view.onPick;
			if (!pick || store.view.lat === undefined) return;
			if (Math.hypot(event.clientX - pressed.x, event.clientY - pressed.y) > 4) return;
			const box = el.getBoundingClientRect();
			const ndc = vec(
				((event.clientX - box.left) / box.width) * 2 - 1,
				-((event.clientY - box.top) / box.height) * 2 + 1,
				0.5,
			);
			const ray = ndc.unproject(camera).sub(camera.position).normalize();
			const b = camera.position.dot(ray);
			const c = camera.position.dot(camera.position) - 1;
			if (b * b - c < 0) return;
			const t = -b - Math.sqrt(b * b - c);
			const p = plus(camera.position, ray, t);
			const lat = Math.asin(Math.max(-1, Math.min(1, p.y))) / toRad;
			const lon = (Math.atan2(-p.z, p.x) / toRad + 360) % 360;
			pick(lat, lon);
		};
		const wheel = (event: WheelEvent) => {
			event.preventDefault();
			easing = false;
			spin.zoom += event.deltaY * 0.0015;
			touched = held = true;
			draw();
		};
		el.addEventListener("pointerdown", down);
		el.addEventListener("pointermove", move);
		el.addEventListener("pointerup", up);
		el.addEventListener("pointercancel", up);
		el.addEventListener("wheel", wheel, { passive: false });
		// The scheme changes the body colors: repaint the materials, nothing else.
		const scheme = new MutationObserver(() => {
			const now = getComputedStyle(el);
			for (const [body, surface, lines] of paints) {
				const color = now.getPropertyValue(`--body-color-${body}`).trim();
				surface.color.set(color);
				lines.color.set(color);
			}
			faint.color.set(starColor());
			bright.color.set(starColor());
			draw();
		});
		scheme.observe(document.documentElement, { attributeFilter: ["data-scheme"] });
		const observer = new ResizeObserver(resize);
		observer.observe(el);
		resize();
		store.apply(store.view);

		let stopped = false;

		// The reference stars, once.
		fetch("/api/bodies")
			.then((response) => (response.ok ? (response.json() as Promise<Entry[]>) : []))
			.then((list) => {
				if (stopped) return;
				for (const star of list) {
					const { ra, dec, magnitude } = star;
					if (ra === undefined || dec === undefined || magnitude === undefined) continue;
					const size = Math.max(0.25, 0.9 - magnitude * 0.25);
					const mesh = new Mesh(new SphereGeometry(size, 8, 6), bright);
					mesh.position.copy(starAt(ra, dec));
					const label = document.createElement("span");
					label.textContent = star.name;
					label.setAttribute("aria-hidden", "true");
					label.className =
						"absolute top-0 left-0 pointer-events-none font-mono text-caption text-default";
					el.parentElement?.append(label);
					named.push({ mesh, label, ra, dec });
					scene.add(mesh);
				}
				store.apply?.(store.view);
			})
			.catch((error: unknown) => {
				console.error("[space] stars", error);
				say("Couldn't load the reference stars.");
			});

		// One Horizons state per body for a UTC day (its 00:00), in turn, each placed as it arrives,
		// then advanced to the exact moment: close over a day. The day is today, or the chosen
		// time's, so a slider moving through a window loads each day once, not each hour.
		const say = (text: string) => {
			if (status.current) status.current.textContent = text;
		};
		const loaded = new Map<string, State[]>();
		let queue = Promise.resolve();
		const hourOf = (time: number) => `${new Date(time).toISOString().slice(0, 10)}T00:00`;
		const load = (hour: string) => {
			if (loaded.has(hour)) return;
			loaded.set(hour, []);
			queue = queue.then(async () => {
				for (const code of ["399", "301", "499"]) {
					say(
						`Loading Horizons state for ${hour.replace("T", " ")}: ${names[byCode[code]]} (${code})…`,
					);
					const response = await fetch(`/api/space?time=${hour}&body=${code}`).catch(() => null);
					if (stopped) return;
					if (!response?.ok) {
						say(`Couldn't load ${names[byCode[code]]}.`);
						return;
					}
					loaded.set(hour, [...(loaded.get(hour) ?? []), (await response.json()) as State]);
					say(`Rendering ${names[byCode[code]]}…`);
					store.apply?.(store.view);
				}
				say("");
			});
		};
		// The states for the view's moment once its day has fully loaded. Until then the bodies stay
		// where they are, rather than jump to another day's positions and back.
		statesFor = (time) => {
			const day = hourOf(time ?? Date.now());
			load(day);
			const exact = loaded.get(day) ?? [];
			return exact.length === 3 ? exact : undefined;
		};
		store.apply?.(store.view);
		const clock = setInterval(() => store.apply?.(store.view), 60_000);

		return () => {
			stopped = true;
			statesFor = undefined;
			for (const { label } of named) label.remove();
			clearInterval(clock);
			store.apply = undefined;
			cancelAnimationFrame(frameId);
			observer.disconnect();
			scheme.disconnect();
			el.removeEventListener("pointerdown", down);
			el.removeEventListener("pointermove", move);
			el.removeEventListener("pointerup", up);
			el.removeEventListener("pointercancel", up);
			el.removeEventListener("wheel", wheel);
			renderer.dispose();
		};
	}, []);

	return (
		<div className="fixed inset-0 -z-10 overflow-hidden">
			<canvas
				ref={canvas}
				role="img"
				aria-label="Space now: the Sun, Earth, Moon, and Mars where they are. At a site, the sky from it."
				className="absolute inset-0 size-full touch-none cursor-grab active:cursor-grabbing"
			/>
			{/* What the model shows, in words, under the header: the view's own summary. */}
			<p
				ref={caption}
				className="absolute inset-x-0 top-[4.5rem] text-center font-mono text-label text-default tabular-nums pointer-events-none"
			/>
			<p
				ref={status}
				role="status"
				className="absolute bottom-0 left-0 m-md font-mono text-label text-secondary pointer-events-none"
			/>
			{all.map((body) => (
				<span
					key={body}
					ref={(node) => {
						labels.current[body] = node;
					}}
					hidden
					aria-hidden="true"
					// Stars, the Sun included, are reference only and can't be selected: grayed labels.
					className={classNames(
						"absolute top-0 left-0 pointer-events-none font-mono",
						body === "sun" ? "text-caption text-default" : "text-label text-default",
					)}
				>
					{names[body]}
				</span>
			))}
		</div>
	);
}
