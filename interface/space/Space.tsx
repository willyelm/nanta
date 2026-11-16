import { bodies } from "body";
import { readSetting, subscribeSettings } from "interface/scheme/model";
import type { Body, Position, State } from "position";
import { useEffect, useRef } from "react";
import { classNames } from "system";
import {
	AmbientLight,
	type BufferGeometry,
	CanvasTexture,
	CircleGeometry,
	Color,
	CylinderGeometry,
	DirectionalLight,
	type Line,
	LineBasicMaterial,
	LineSegments,
	type Material,
	Mesh,
	MeshBasicMaterial,
	MeshStandardMaterial,
	Object3D,
	PerspectiveCamera,
	PointLight,
	Points,
	PointsMaterial,
	Quaternion,
	RingGeometry,
	Scene,
	SphereGeometry,
	Sprite,
	SpriteMaterial,
	type Vector3,
	WebGLRenderer,
} from "three";
import { read, slot, type XYZ } from "./api";
import {
	AU,
	all,
	codes,
	direction,
	ecliptic,
	eclipticOver,
	filler,
	frame,
	graticule,
	ids,
	latLon,
	line,
	MOON,
	names,
	orientation,
	plus,
	radius,
	SCALE,
	seen,
	shade,
	size,
	spaceSize,
	starAt,
	starOver,
	toRad,
	vec,
} from "./geometry";
import { fetchStars, horizons, type States } from "./load";
import { advance, helio } from "./orbit";
import { setReadout } from "./readout";
import { store, type View } from "./view";

let states: States = {};
let statesFor: ((time?: number) => States | undefined) | undefined;

const deg = (radians: number) => `${Math.round(radians / toRad)}°`;

// The whole solar system from above and a little south, far enough that Mars' orbit (about 12
// units) fits. The camera starts here and stays until a body is placed.
const OVERVIEW = 40;
const overview = () => vec(0, 1, 0.35).normalize().multiplyScalar(OVERVIEW);

// The Sun's radiance, from its body: how many of its radii its light spreads.
const SUN_RADIANCE = bodies.find((b) => b.code === "10")?.radiance ?? 5;

// Paints a star's light: solid to its limb, then its color falling off smoothly to nothing.
// `reach` is the star's radiance: the texture is that many radii out, so the limb is at 1/reach.
// `rim`, when given, rings the limb so the disc holds contrast on a light background.
function radiance(texture: CanvasTexture, core: string, sun: string, reach: number, rim?: string) {
	const canvas = texture.image as HTMLCanvasElement;
	const ctx = canvas.getContext("2d");
	if (!ctx) return;
	const n = canvas.width;
	const c = n / 2;
	const limb = 1 / reach;
	// The color `mix` of the way from core to sun, at alpha `a`.
	const from = new Color(core);
	const to = new Color(sun);
	const rgba = (mix: number, a: number) => {
		const ch = (x: number, y: number) => Math.round((x + (y - x) * mix) * 255);
		return `rgba(${ch(from.r, to.r)},${ch(from.g, to.g)},${ch(from.b, to.b)},${a})`;
	};
	ctx.clearRect(0, 0, n, n);

	// Glow: solid core to the limb, then shading into the sun color as it fades to nothing.
	const glow = ctx.createRadialGradient(c, c, 0, c, c, c);
	glow.addColorStop(0, rgba(0, 1));
	glow.addColorStop(limb, rgba(0, 0.95));
	const STOPS = 16;
	for (let i = 1; i <= STOPS; i++) {
		const t = i / STOPS;
		const fade = (1 - t) ** 3;
		glow.addColorStop(limb + (1 - limb) * t, rgba(Math.sqrt(t), 0.6 * fade));
	}
	ctx.fillStyle = glow;
	ctx.fillRect(0, 0, n, n);
	if (rim) {
		ctx.strokeStyle = rim;
		ctx.lineWidth = c * limb * 0.12;
		ctx.beginPath();
		ctx.arc(c, c, c * limb - ctx.lineWidth / 2, 0, Math.PI * 2);
		ctx.stroke();
	}

	texture.needsUpdate = true;
}

export function Space() {
	const canvas = useRef<HTMLCanvasElement>(null);
	const labels = useRef<Partial<Record<Body, HTMLSpanElement | null>>>({});
	const status = useRef<HTMLParagraphElement>(null);
	const caption = useRef<HTMLParagraphElement>(null);
	const marker = useRef<HTMLSpanElement>(null);
	const markerCode = useRef<HTMLSpanElement>(null);

	useEffect(() => {
		const el = canvas.current;
		if (!el) return;
		const style = getComputedStyle(el);
		const color = (name: string) => style.getPropertyValue(`--chart-color-${name}`).trim();
		const paint = (name: Body) => style.getPropertyValue(`--body-color-${name}`).trim();
		const gray = color("horizon");

		const scene = new Scene();
		const sunlight = new DirectionalLight("#ffffff", 3.5);
		const sunpoint = new PointLight("#ffffff", 3.5, 0, 0);
		scene.add(new AmbientLight("#ffffff", 0.04), sunlight, sunpoint);

		// Guides (orbits, grids, star names) and motion, from the menu (scheme/model.ts).
		let guides = readSetting("guides");
		let motion = readSetting("motion");
		const grids = {} as Record<Body, BufferGeometry>;
		const gridLines: Object3D[] = [];
		const axisLines: Object3D[] = [];
		const poles: { mesh: Object3D; label: HTMLSpanElement }[] = [];
		// A small label over the canvas, pinned to a point each frame.
		const tag = (text: string) => {
			const label = Object.assign(document.createElement("span"), {
				textContent: text,
				hidden: true,
				className: "absolute top-0 left-0 pointer-events-none font-mono text-caption text-default",
			});
			label.setAttribute("aria-hidden", "true");
			el.parentElement?.append(label);
			return label;
		};
		// North, east, south, and west on the ground around a site.
		const cardinals = ["N", "E", "S", "W"].map((text) => ({ label: tag(text), at: vec() }));
		const ball = new SphereGeometry(0.995, 64, 32);
		// Planets and moons are lit spheres; the Sun is only its light (the corona below).
		const meshes = {} as Record<Body, Object3D>;
		const paints: [Body, Material, Material][] = [];
		meshes.sun = new Object3D();
		scene.add(meshes.sun);
		for (const body of all) {
			if (body === "sun") continue;
			const c = paint(body);
			const surface = new MeshStandardMaterial({ color: c, transparent: true, opacity: 0.7 });
			const lines = new LineBasicMaterial({ color: c, vertexColors: true });
			grids[body] = graticule();
			meshes[body] = new Mesh(ball, surface);
			const gridLine = new LineSegments(grids[body], lines);
			gridLine.visible = guides;
			gridLines.push(gridLine);
			meshes[body].add(gridLine);
			// The spin axis through the poles, a little past the surface, with N at the north end.
			const axis = line(c, false, [vec(0, -1.35, 0), vec(0, 1.35, 0)]);
			axis.visible = guides;
			axisLines.push(axis);
			meshes[body].add(axis);
			poles.push({ mesh: meshes[body], label: tag("N") });
			paints.push([body, surface, lines]);
			scene.add(meshes[body]);
		}

		// A child of the Sun, so it follows the Sun's place and size; it always faces the camera.
		const shine = new CanvasTexture(
			Object.assign(document.createElement("canvas"), { width: 512, height: 512 }),
		);
		// The Sun from the scheme: its core, its glow, and on light space a ring at the limb.
		const sunShine = (now: CSSStyleDeclaration) => {
			const token = (name: string) => now.getPropertyValue(`--${name}`).trim();
			const light = document.documentElement.dataset.scheme !== "dark";
			radiance(
				shine,
				token("body-color-suncore"),
				token("body-color-sun"),
				SUN_RADIANCE,
				light ? token("chart-color-sun") : undefined,
			);
		};
		sunShine(style);
		const corona = new Sprite(
			new SpriteMaterial({ map: shine, transparent: true, depthWrite: false }),
		);
		corona.scale.setScalar(SUN_RADIANCE * 2);
		meshes.sun.add(corona);

		const goals = {} as Record<Body, Vector3>;
		for (const body of all) goals[body] = meshes[body].position.clone();
		let sliding = false;
		// Each frame closes this share of the gap; with motion off, all of it.
		const ease = () => (motion ? 0.12 : 1);
		let siteSight: (() => void) | null = null;
		// Where the site's marks stand: the site itself, or the point under the camera while it
		// travels between sites, so the marker, compass, and sight lines ride along.
		const here = vec(0, 1, 0);
		const placeSite = () => {
			const ground = plus(vec(), here, 1.002);
			for (const mesh of [horizon, outline]) {
				mesh.position.copy(ground);
				mesh.lookAt(plus(vec(), here, 2));
			}
			[axes.north, axes.east, plus(vec(), axes.north, -1), plus(vec(), axes.east, -1)].forEach(
				(way, i) => {
					cardinals[i].at.copy(plus(ground, way, 0.22));
				},
			);
			siteSight?.();
		};

		const basic = (c: string, opacity?: number) =>
			new MeshBasicMaterial(
				opacity == null ? { color: c } : { color: c, transparent: true, opacity },
			);
		const horizon = new Mesh(new CircleGeometry(0.12, 48), basic(gray, 0.5));
		const outline = new Mesh(new RingGeometry(0.14, 0.17, 48), basic(color("select")));
		const core = new Mesh(
			new CylinderGeometry(0.002, 0.014, 1, 24, 1, true),
			basic(style.getPropertyValue("--body-color-sunlight").trim(), 1),
		);
		const glow = new Mesh(
			new CylinderGeometry(0.008, 0.06, 1, 24, 1, true),
			basic(paint("sun"), 0.22),
		);
		const beam = new Scene();
		beam.add(core, glow);
		const DASHES = 28;
		const pulse = basic(color("earth"), 0.9);
		const dash = new CylinderGeometry(0.003, 0.003, 1, 8);
		const link = new Scene();
		const dashes = Array.from({ length: DASHES }, () => new Mesh(dash, pulse));
		for (const mesh of dashes) link.add(mesh);
		const sight = { sun: beam, earth: link };
		const ring = new Mesh(new RingGeometry(1.12, 1.18, 96), outline.material);
		scene.add(horizon, outline, ring, sight.sun, sight.earth);

		const starColor = () => getComputedStyle(el).getPropertyValue("--body-color-moon").trim();
		const faint = new PointsMaterial({ color: starColor(), size: 1, sizeAttenuation: false });
		// Named stars are discs of light facing the camera, each spreading as far as its radiance.
		scene.add(new Points(filler(3000), faint));
		const glows: { texture: CanvasTexture; material: SpriteMaterial; reach: number }[] = [];
		const named: { mesh: Object3D; label: HTMLSpanElement; ra: number; dec: number }[] = [];

		const renderer = new WebGLRenderer({ canvas: el, antialias: true, alpha: true });
		renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
		const camera = new PerspectiveCamera(45, 1, 0.01, 500);
		let nearest = 0.05;
		// Start on the overview, so the first frame is already the solar system from above.
		camera.position.copy(overview());
		const target = vec();
		const spin = { x: 0, y: 0, zoom: 0 };
		const turn = new Quaternion();
		const offset = vec();
		const side = vec();
		let dragging: { x: number; y: number } | null = null;
		const goal = { position: camera.position.clone(), target: target.clone(), up: vec(0, 1, 0) };
		const point = vec();
		const north = vec();
		let easing = false;
		let frameId = 0;
		let held = false;
		let touched = false;
		const followed = vec();
		const along = vec(0, 1, 0);
		let aimed: string | undefined;
		const axes = { site: false, north: vec(1, 0, 0), east: vec(0, 0, -1), up: vec(0, 1, 0) };
		// A unit direction at azimuth and elevation (degrees) in the current axes.
		const toward = (az: number, elv: number) => {
			const [a, e] = [az * toRad, elv * toRad];
			const flat = plus(
				plus(vec(), axes.north, Math.cos(e) * Math.cos(a)),
				axes.east,
				Math.cos(e) * Math.sin(a),
			);
			return plus(flat, axes.up, Math.sin(e));
		};
		// Set while the camera moves between sites: the angle it keeps on the way, and the trip
		// over the surface, timed so it starts and ends gently.
		let travel: {
			angle: [number, number, number];
			from: Vector3;
			axis: Vector3;
			arc: number;
			elapsed: number;
			at: number;
			ms: number;
		} | null = null;
		// The one move on opening a site from the URL: from where the camera was to the saved
		// view, timed like travel.
		let fly: {
			position: Vector3;
			target: Vector3;
			up: Vector3;
			elapsed: number;
			at: number;
			ms: number;
		} | null = null;
		// Time into a move, at most 25 ms per frame, so a stalled frame (loading, a busy page)
		// slows the move instead of skipping it.
		const tick = (move: { elapsed: number; at: number }) => {
			const now = performance.now();
			move.elapsed += move.at ? Math.min(now - move.at, 25) : 0;
			move.at = now;
			return move.elapsed;
		};
		const partial = new Quaternion();
		const smooth = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

		const draw = () => {
			frameId ||= requestAnimationFrame(render);
		};
		const render = () => {
			frameId = 0;
			if (travel) {
				// Between sites: the target slides over the surface, the frame follows it, and the
				// camera keeps its angle, so the readout holds still and the path is an arc.
				const t = travel.ms ? Math.min(1, tick(travel) / travel.ms) : 1;
				partial.setFromAxisAngle(travel.axis, travel.arc * smooth(t));
				target.copy(travel.from).applyQuaternion(partial).setLength(goal.target.length());
				const { lat, lon } = latLon(point.copy(target).normalize());
				Object.assign(axes, frame(lat, lon));
				const [az, elv, dist] = travel.angle;
				camera.position.copy(plus(target, toward(az, elv), dist));
				camera.up.copy(axes.up);
				here.copy(point);
				if (t >= 1) {
					target.copy(goal.target);
					here.copy(goal.target).normalize();
					travel = null;
				}
				placeSite();
			}
			easing &&=
				camera.position.distanceTo(goal.position) > 0.001 ||
				target.distanceTo(goal.target) > 0.001 ||
				camera.up.distanceTo(goal.up) > 0.001;
			if (fly) {
				const t = fly.ms ? Math.min(1, tick(fly) / fly.ms) : 1;
				const k = smooth(t);
				camera.position.copy(fly.position).lerp(goal.position, k);
				target.copy(fly.target).lerp(goal.target, k);
				camera.up.copy(fly.up).lerp(goal.up, k).normalize();
				if (t >= 1) fly = null;
				easing = !!fly;
			}
			if (easing && !travel && !fly) {
				camera.position.lerp(goal.position, ease());
				target.lerp(goal.target, ease());
				camera.up.lerp(goal.up, ease()).normalize();
			}
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
				// Drifts to a stop; with motion off, stops at once.
				spin.x *= motion ? 0.88 : 0;
				spin.y *= motion ? 0.88 : 0;
				spin.zoom *= motion ? 0.8 : 0;
			}
			camera.lookAt(target);
			offset.copy(camera.position).sub(target);
			const d = offset.length();
			const [a, b, c] = [offset.dot(axes.north), offset.dot(axes.east), offset.dot(axes.up)];
			setReadout([
				// What the camera looks at and turns around: the site, else the body, else space itself.
				"Target",
				(axes.site && store.view.site) || store.view.body || focused || "Space",
				axes.site ? "Azimuth" : "Longitude",
				deg((Math.atan2(b, a) + 2 * Math.PI) % (2 * Math.PI)),
				axes.site ? "Elevation" : "Latitude",
				deg(Math.asin(Math.max(-1, Math.min(1, c / (d || 1))))),
				"Distance",
				axes.site ? `${d.toFixed(2)} R` : `${(d / SCALE).toFixed(2)} AU`,
			]);
			ring.quaternion.copy(camera.quaternion);
			renderer.render(scene, camera);
			const [width, height] = [el.clientWidth, el.clientHeight];
			const pin = (
				mesh: Object3D,
				label: HTMLElement | null | undefined,
				lift: number,
				dy: string,
			) => {
				if (!label) return;
				point.set(mesh.position.x, mesh.position.y + lift, mesh.position.z).project(camera);
				label.hidden = !mesh.visible || point.z > 1;
				label.style.transform = `translate(${((point.x + 1) / 2) * width}px, ${((1 - point.y) / 2) * height}px) ${dy}`;
			};
			for (const body of all)
				pin(
					meshes[body],
					labels.current[body],
					meshes[body].scale.y * 1.3,
					"translate(-50%, -100%)",
				);
			for (const star of named) pin(star.mesh, star.label, 0, "translate(-50%, -150%)");
			// A point in space to a label; hidden when off, behind the camera, or facing away.
			const pinAt = (at: Vector3, label: HTMLElement, shown: boolean) => {
				point.copy(at).project(camera);
				label.hidden = !shown || point.z > 1;
				label.style.transform = `translate(${((point.x + 1) / 2) * width}px, ${((1 - point.y) / 2) * height}px) translate(-50%, -50%)`;
			};
			for (const { mesh, label } of poles)
				pinAt(
					north
						.set(0, 1.5, 0)
						.applyQuaternion(mesh.quaternion)
						.multiplyScalar(mesh.scale.y)
						.add(mesh.position),
					label,
					guides && mesh.visible && !axes.site,
				);
			for (const { label, at } of cardinals) pinAt(at, label, guides && axes.site);
			// The site's marker: its tip on the site, hidden when the site faces away.
			pin(horizon, marker.current, 0, "translate(-50%, -100%)");
			if (marker.current && offset.copy(camera.position).sub(horizon.position).dot(axes.up) < 0)
				marker.current.hidden = true;
			if (sliding) {
				sliding = false;
				for (const body of all) {
					const mesh = meshes[body];
					if (!mesh.visible) continue;
					if (mesh.position.distanceTo(goals[body]) > 0.001) {
						mesh.position.lerp(goals[body], ease());
						sliding = true;
					}
				}
				siteSight?.();
				const following = store.view.body ?? focused;
				const selected = following ? codes[following] : undefined;
				if (selected && meshes[selected].visible && !axes.site) {
					const step = plus(meshes[selected].position, followed, -1);
					if (step.length() > 1e-9) {
						camera.position.copy(plus(camera.position, step));
						target.copy(plus(target, step));
						goal.position.copy(plus(goal.position, step));
						goal.target.copy(plus(goal.target, step));
					}
					followed.copy(meshes[selected].position);
					ring.position.copy(meshes[selected].position);
				}
			}
			if (travel || fly || easing || spinning || sliding) draw();
			else if (touched && !dragging) {
				touched = false;
				save();
			}
		};

		const space = {
			put(body: Body, to: XYZ) {
				read(to, goals[body]);
				meshes[body].position.copy(goals[body]);
			},
			move(body: Body, to: XYZ) {
				read(to, goals[body]);
				sliding = true;
				draw();
			},
			scale(body: Body, s: number) {
				meshes[body].scale.set(s, s, s);
			},
			show(body: Body, on: boolean) {
				meshes[body].visible = on;
			},
		};
		slot.current = space;
		// Bodies placed in this update. A body already showing eases to its new place (a new
		// window or time glides); only one appearing, or a new frame, snaps.
		const placed = new Set<Body>();
		const hideUnplaced = () => {
			for (const body of all) if (!placed.has(body)) space.show(body, false);
		};
		const go = (body: Body, to: Vector3, s: number, snap: boolean) => {
			const first = !meshes[body].visible;
			placed.add(body);
			space.show(body, true);
			space.scale(body, s);
			(first || snap ? space.put : space.move)(body, to);
		};

		const resize = () => {
			const [width, height] = [el.clientWidth || 640, el.clientHeight || 480];
			renderer.setSize(width, height, false);
			camera.aspect = width / height;
			camera.updateProjectionMatrix();
			draw();
		};

		let last: View = {};
		// The first view since the page loaded: with a camera in the URL (a reload or a shared
		// link), one move to it. A site's view needs only the site, so it starts at once.
		let opened = false;
		// The body the camera turns around in space, by Horizons code; none for the overview.
		let focused: string | undefined;
		// The view saved in the URL, on the first view since the page loaded: one move from where
		// the camera is to it, around `at`.
		const restore = (at: Vector3, [az, elv, dist]: [number, number, number], near: number) => {
			opened = true;
			held = true;
			nearest = near;
			goal.target.copy(at);
			pose(az, elv, dist);
			fly = {
				position: camera.position.clone(),
				target: target.clone(),
				up: camera.up.clone(),
				elapsed: 0,
				at: 0,
				ms: motion ? 1400 : 0,
			};
		};
		// The page is space itself, not a body or site the view hasn't reached yet.
		const home = () => location.pathname === "/";
		const rings: Partial<Record<Body, Line>> = {};
		let showRings = true;
		// At a site, the ecliptic: where the Sun and planets travel across the sky, a circle far
		// enough out that the site's offset from the center doesn't bend it.
		let eclipticRing: Line | null = null;
		const orbit = (r: number) =>
			line(
				gray,
				false,
				Array.from({ length: 129 }, (_, i) => {
					const a = (i / 128) * Math.PI * 2;
					return vec(Math.cos(a) * r, 0, Math.sin(a) * r);
				}),
			);
		// Site camera in the URL: az, el, d (degrees, degrees, body radii).
		const SITE_DISTANCE = 20;
		const SITE_ELEVATION = 30;
		const readCamera = (): [number, number, number] | null => {
			const q = new URLSearchParams(location.search);
			const parts = [
				q.get("az") ?? q.get("azimuth"),
				q.get("el") ?? q.get("elevation"),
				q.get("d") ?? q.get("distance"),
			].map((value) => (value == null || value === "" ? Number.NaN : Number(value)));
			if (parts.every(Number.isFinite)) return parts as [number, number, number];
			// Older links used camera=az,el,d.
			const legacy = q.get("camera")?.split(",").map(Number);
			return legacy?.length === 3 && legacy.every(Number.isFinite)
				? (legacy as [number, number, number])
				: null;
		};
		const writeCamera = (az: number, elv: number, dist: number) => {
			const url = new URL(location.href);
			url.searchParams.set("az", ((az + 360) % 360).toFixed(1));
			url.searchParams.set("el", elv.toFixed(1));
			url.searchParams.set("d", dist.toFixed(3));
			for (const key of ["camera", "azimuth", "elevation", "distance"])
				url.searchParams.delete(key);
			// On the home page the camera may turn around a pointed-at body; keep which one.
			if (home() && focused) url.searchParams.set("at", focused);
			else url.searchParams.delete("at");
			history.replaceState(history.state, "", url);
		};
		// Spherical offset from goal.target in the current axes; eases unless snap is set.
		const pose = (az: number, elv: number, dist: number, snap = false) => {
			goal.position.copy(plus(goal.target, toward(az, elv), dist));
			goal.up.copy(axes.up);
			if (snap) {
				camera.position.copy(goal.position);
				camera.up.copy(goal.up);
				target.copy(goal.target);
				easing = false;
			} else {
				easing = true;
			}
		};
		// The camera's azimuth, elevation, and distance around its target, in the current axes.
		const angle = (): [number, number, number] => {
			offset.copy(camera.position).sub(target);
			const dist = offset.length();
			const az = Math.atan2(offset.dot(axes.east), offset.dot(axes.north)) / toRad;
			const elv = Math.asin(Math.max(-1, Math.min(1, offset.dot(axes.up) / (dist || 1)))) / toRad;
			return [az, elv, dist];
		};
		const save = () => writeCamera(...angle());
		const light = (sun: Vector3) => {
			for (const body of all) {
				if (body !== "sun" && meshes[body].visible)
					shade(
						grids[body],
						plus(sun, meshes[body].position, -1)
							.normalize()
							.applyQuaternion(meshes[body].quaternion.clone().invert()),
					);
			}
		};
		const aim = (look: Vector3, from: Vector3, up: Vector3, near: number) => {
			nearest = near;
			held = false;
			goal.target.copy(look);
			goal.position.copy(from);
			goal.up.copy(up);
			easing = true;
		};

		store.apply = (next) => {
			// Read before the axes move to a new site, so switching sites keeps the same view.
			const was = axes.site ? angle() : null;
			if (caption.current) caption.current.textContent = next.caption ?? "";
			if (markerCode.current) markerCode.current.textContent = next.site ?? "";
			states = statesFor?.(next.time) ?? states;
			const atSite = next.lat !== undefined && next.lon !== undefined;
			// Bodies jump only into a new frame: entering or leaving a site, or another body. A new
			// site on the same body, a window, or a time glides with the camera.
			const snap = atSite !== !!axes.site || next.body !== last.body;
			placed.clear();
			showRings = !atSite;
			for (const item of Object.values(rings)) if (item) item.visible = showRings && guides;
			horizon.visible = outline.visible = atSite;
			// From the ground, the axis would cut through the sky; there the compass points instead.
			for (const axis of axisLines) axis.visible = guides && !atSite;
			if (eclipticRing) eclipticRing.visible = guides && atSite;
			sight.sun.visible = sight.earth.visible = false;
			siteSight = null;

			if (!atSite) {
				Object.assign(axes, {
					site: false,
					north: vec(1, 0, 0),
					east: vec(0, 0, -1),
					up: vec(0, 1, 0),
				});
				for (const star of named) star.mesh.position.copy(starAt(star.ra, star.dec));
				go("sun", vec(), spaceSize.sun, true);
				sunlight.visible = false;
				sunpoint.visible = true;
				const now = next.time ?? Date.now();
				for (const body of all) meshes[body].quaternion.copy(orientation(body, now));
				// In `all`'s order, so the Earth is placed before the Moon beside it.
				for (const body of all) {
					const s = states[ids[body]];
					if (!s) continue;
					const p = advance(s, now - Date.parse(s.time));
					if (s.center === "10") {
						const r = Math.hypot(...p) * (SCALE / AU);
						if (!rings[body]) {
							rings[body] = orbit(r);
							rings[body].visible = guides;
							scene.add(rings[body]);
						}
						go(body, ecliptic(p, SCALE / AU), spaceSize[body], snap);
					} else {
						go(body, plus(goals.earth, ecliptic(p).normalize(), MOON), spaceSize[body], snap);
					}
				}
				hideUnplaced();
				light(vec());
			} else {
				const home = codes[next.body ?? "301"] ?? "moon";
				const sample = Object.values(next.sky ?? {})[0]?.[next.at ?? 0];
				const when = sample ? Date.parse(sample.time) : (next.time ?? Date.now());
				if (eclipticRing) {
					scene.remove(eclipticRing);
					eclipticRing.geometry.dispose();
				}
				eclipticRing =
					home === "sun"
						? null
						: line(
								gray,
								false,
								Array.from({ length: 181 }, (_, i) => {
									const a = (i / 180) * Math.PI * 2;
									return eclipticOver(home, [Math.cos(a), Math.sin(a), 0], when).setLength(40);
								}),
							);
				if (eclipticRing) {
					eclipticRing.visible = guides;
					scene.add(eclipticRing);
				}
				if (home !== "sun") {
					for (const star of named)
						star.mesh.position.copy(starOver(home, star.ra, star.dec, when));
				}
				const base = radius[home];
				// The scene is the home body's frame: it sits unturned, the others turned relative to it.
				const homeTurn = orientation(home, when).invert();
				for (const body of all)
					meshes[body].quaternion.copy(homeTurn.clone().multiply(orientation(body, when)));
				const f = frame(next.lat!, next.lon!);
				Object.assign(axes, { site: true, ...f });
				const site = f.up;
				go(home, vec(), 1, true);
				// Marker sits on the sphere at the exact lat/lon (same conversion as picking).
				here.copy(site);
				placeSite();
				sunlight.visible = true;
				sunpoint.visible = false;
				const placing = next.onPick != null;
				const i = next.at ?? 0;
				const place = (body: Body, toward: Vector3, km: number) =>
					go(body, seen(site, toward, km, base), size(body, base), snap);
				// Sky az/el belong to one fixed site. While placing/editing, lat/lon are a draft, so
				// keep Sun/Earth on the body-centered helio frame and only move the marker + sights.
				if (!placing) {
					for (const [body, positions] of Object.entries(next.sky ?? {}) as [Body, Position[]][]) {
						const p = positions[Math.min(i, positions.length - 1)];
						if (p && body !== home) place(body, direction(f, p), p.range);
					}
				}
				// The rest from the space states: the direction from the body's center, set out from the site.
				const center = home !== "sun" && helio(states, home, when);
				for (const body of all) {
					const from = !placed.has(body) && helio(states, body, when);
					if (home === "sun" || !center || !from || body === home) continue;
					const toward = eclipticOver(
						home,
						[0, 1, 2].map((axis) => from[axis] - center[axis]),
						when,
					);
					place(body, toward, toward.length());
				}
				hideUnplaced();
				// Sight lines: explicit Look for flags (SiteForm), else which bodies the sky loaded.
				const skyBodies = next.sky ?? {};
				const look = {
					sun: next.sunlight ?? (next.sky ? "sun" in skyBodies : true),
					earth: next.earth_visibility ?? (next.sky ? "earth" in skyBodies : true),
				};
				siteSight = () => {
					for (const body of ["sun", "earth"] as const) {
						const shown = body !== home && meshes[body].visible && look[body];
						sight[body].visible = shown;
						if (!shown) continue;
						const toward = plus(meshes[body].position, here, -1);
						const length = toward.length();
						const dir = toward.clone().normalize();
						const up = dir.dot(here) > 0;
						if (body === "sun") {
							beam.position.copy(plus(here, toward, 0.5));
							beam.quaternion.setFromUnitVectors(along, dir.clone().multiplyScalar(-1));
							beam.scale.set(1, length, 1);
							core.material.opacity = up ? 1 : 0.15;
							glow.material.opacity = up ? 0.22 : 0.04;
							sunlight.position.copy(meshes.sun.position);
						} else {
							const step = length / DASHES;
							dashes.forEach((mesh, n) => {
								mesh.position.copy(plus(here, dir, step * (n + 0.5)));
								mesh.quaternion.setFromUnitVectors(along, dir);
								mesh.scale.set(1, step * 0.55, 1);
							});
							pulse.opacity = up ? 0.9 : 0.15;
						}
					}
					light(sunlight.position);
				};
				siteSight();
			}

			const selected = next.body ? codes[next.body] : undefined;
			ring.visible = !atSite && !!selected && !!meshes[selected]?.visible;
			if (ring.visible && selected) {
				ring.scale.set(spaceSize[selected], spaceSize[selected], spaceSize[selected]);
				ring.position.copy(meshes[selected].position);
				followed.copy(meshes[selected].position);
			}

			const moved = next.body !== last.body || next.lat !== last.lat || next.lon !== last.lon;
			const picking = next.onPick != null;
			// While placing a site, keep the camera still so the marker stays under the click.
			if (picking) held = true;
			else if (moved) held = false;
			const restoring = atSite && !opened && readCamera() != null;
			if (!atSite) {
				// On the home page, a body the camera was turned around before a reload: `at` in the URL.
				const pin = !next.body && home() ? new URLSearchParams(location.search).get("at") : null;
				const focus = selected ?? (pin ? codes[pin] : undefined);
				const placed = !!focus && (focus === "sun" || meshes[focus].visible);
				const saved = !opened && readCamera();
				if (moved || (placed && aimed !== (next.body ?? pin)) || (saved && home())) {
					// The chosen body once Horizons has placed it; until then, or with none, the
					// whole solar system from afar.
					aimed = placed ? (next.body ?? pin ?? undefined) : undefined;
					if (placed && focus) {
						const at = goals[focus];
						const away = Math.max(spaceSize[focus] * 8, 2.5);
						focused = next.body ?? pin ?? undefined;
						if (saved) restore(at, saved, spaceSize[focus] * 1.5);
						else if (next.body)
							aim(
								at,
								plus(at, vec(0, 0.6, 1).normalize(), away),
								vec(0, 1, 0),
								spaceSize[focus] * 1.5,
							);
						else {
							focused = undefined;
							aim(vec(), overview(), vec(0, 1, 0), 1.5);
						}
					} else if (saved && home() && !pin) {
						focused = undefined;
						restore(vec(), saved, 1.5);
					} else if (!(saved && pin)) {
						focused = undefined;
						aim(vec(), overview(), vec(0, 1, 0), 1.5);
					}
				}
			} else if (
				restoring ||
				(!picking && (moved || (!held && next.sky && next.sky !== last.sky))) ||
				(picking && moved && last.lat === undefined && last.lon === undefined)
			) {
				// Reading: ease to the site. Placing: aim only on the first entry into site mode.
				const home = codes[next.body ?? "301"] ?? "moon";
				const body = (["earth", "sun"] as Body[]).find((b) => b !== home && meshes[b].visible);
				const site = axes.up;
				const toward = body ? plus(goals[body], site, -1) : axes.north;
				const flat = plus(toward, site, -toward.dot(site));
				const look = flat.length() > 1e-6 ? flat.normalize() : axes.north;
				const lookAt = plus(site, site, 0.08);
				nearest = 0.05;
				goal.target.copy(lookAt);
				const saved = restoring ? readCamera() : (was ?? readCamera());
				const az = saved
					? saved[0]
					: (Math.atan2(-look.dot(axes.east), -look.dot(axes.north)) / toRad + 360) % 360;
				const elv = saved ? saved[1] : SITE_ELEVATION;
				const dist = saved ? saved[2] : SITE_DISTANCE;
				if (restoring && saved) restore(lookAt, saved, nearest);
				else pose(az, elv, dist);
				// From one site to another: travel over the surface at the same angle.
				if (was && moved && !restoring) {
					const from = target.clone().normalize();
					const to = goal.target.clone().normalize();
					// About 0.6 s to a neighbor, up to 1.6 s across the globe; none with motion off.
					const arc = Math.acos(Math.max(-1, Math.min(1, from.dot(to))));
					const axis = vec().crossVectors(from, to);
					travel = {
						angle: was,
						from,
						// Turning about the axis between the two sites draws the arc over the surface.
						axis: axis.length() > 1e-9 ? axis.normalize() : axes.north.clone(),
						arc,
						elapsed: 0,
						at: 0,
						ms: motion ? Math.min(1600, 600 + arc * 320) : 0,
					};
				}
				if (!saved) writeCamera(az, elv, dist);
				held = picking || Boolean(saved) || Boolean(body);
			}

			last = next;
			draw();
		};

		let pressed = { x: 0, y: 0 };
		const down = (event: PointerEvent) => {
			easing = false;
			dragging = pressed = { x: event.clientX, y: event.clientY };
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
		const up = (event: PointerEvent) => {
			dragging = null;
			const pick = store.view.onPick;
			if (!pick || store.view.lat === undefined) return;
			if (Math.hypot(event.clientX - pressed.x, event.clientY - pressed.y) > 4) return;
			// Ray vs unit sphere at the origin (the site's body). Near intersection in front of the camera.
			const box = el.getBoundingClientRect();
			const ndc = vec(
				((event.clientX - box.left) / box.width) * 2 - 1,
				-((event.clientY - box.top) / box.height) * 2 + 1,
				0.5,
			);
			const ray = ndc.unproject(camera).sub(camera.position).normalize();
			const b = camera.position.dot(ray);
			const disc = b * b - camera.position.dot(camera.position) + 1;
			if (disc < 0) return;
			const t = -b - Math.sqrt(disc);
			if (t < 0) return;
			const at = plus(camera.position, ray, t);
			const { lat, lon } = latLon(at);
			held = true;
			easing = false;
			pick(lat, lon);
		};
		const wheel = (event: WheelEvent) => {
			event.preventDefault();
			easing = false;
			spin.zoom += event.deltaY * 0.0015;
			touched = held = true;
			draw();
		};
		const pointers = [
			["pointerdown", down],
			["pointermove", move],
			["pointerup", up],
			["pointercancel", up],
		] as const;
		for (const [type, fn] of pointers) el.addEventListener(type, fn);
		el.addEventListener("wheel", wheel, { passive: false });

		const scheme = new MutationObserver(() => {
			const now = getComputedStyle(el);
			for (const [body, surface, lines] of paints) {
				const c = now.getPropertyValue(`--body-color-${body}`).trim();
				surface.color.set(c);
				lines.color.set(c);
			}
			faint.color.set(starColor());
			for (const glow of glows) radiance(glow.texture, starColor(), starColor(), glow.reach);
			sunShine(now);
			core.material.color.set(now.getPropertyValue("--body-color-sunlight").trim());
			draw();
		});
		scheme.observe(document.documentElement, { attributeFilter: ["data-scheme"] });
		const observer = new ResizeObserver(resize);
		observer.observe(el);
		resize();
		store.apply(store.view);

		let stopped = false;
		const say = (text: string) => {
			if (status.current) status.current.textContent = text;
		};

		fetchStars()
			.then((list) => {
				if (stopped) return;
				for (const star of list) {
					const texture = new CanvasTexture(
						Object.assign(document.createElement("canvas"), { width: 64, height: 64 }),
					);
					radiance(texture, starColor(), starColor(), star.radiance);
					const material = new SpriteMaterial({
						map: texture,
						transparent: true,
						depthWrite: false,
					});
					glows.push({ texture, material, reach: star.radiance });
					const mesh = new Sprite(material);
					const disc = Math.max(0.25, 0.9 - star.magnitude * 0.25);
					mesh.scale.setScalar(disc * star.radiance * 2);
					mesh.position.copy(starAt(star.ra, star.dec));
					const label = Object.assign(document.createElement("span"), {
						textContent: star.name,
						className:
							"absolute top-0 left-0 pointer-events-none font-mono text-caption text-default",
					});
					label.setAttribute("aria-hidden", "true");
					label.dataset.guide = "";
					el.parentElement?.append(label);
					named.push({ mesh, label, ra: star.ra, dec: star.dec });
					scene.add(mesh);
				}
				store.apply?.(store.view);
			})
			.catch((error: unknown) => {
				console.error("[space] stars", error);
				say("Couldn't load the reference stars.");
			});

		const loader = horizons(say, () => store.apply?.(store.view));
		statesFor = loader.statesFor;

		store.apply?.(store.view);
		const unsubscribe = subscribeSettings(() => {
			guides = readSetting("guides");
			motion = readSetting("motion");
			for (const gridLine of gridLines) gridLine.visible = guides;
			for (const axis of axisLines) axis.visible = guides && !axes.site;
			if (eclipticRing) eclipticRing.visible = guides && axes.site;
			for (const item of Object.values(rings)) if (item) item.visible = showRings && guides;
			draw();
		});
		const clock = setInterval(() => store.apply?.(store.view), 60_000);

		return () => {
			stopped = true;
			loader.stop();
			statesFor = undefined;
			slot.current = null;
			for (const { label } of named) label.remove();
			for (const { label } of [...poles, ...cardinals]) label.remove();
			clearInterval(clock);
			unsubscribe();
			store.apply = undefined;
			cancelAnimationFrame(frameId);
			observer.disconnect();
			scheme.disconnect();
			for (const [type, fn] of pointers) el.removeEventListener(type, fn);
			el.removeEventListener("wheel", wheel);
			shine.dispose();
			for (const glow of glows) {
				glow.texture.dispose();
				glow.material.dispose();
			}
			corona.material.dispose();
			renderer.dispose();
		};
	}, []);

	return (
		<div className="fixed inset-0 -z-10 overflow-hidden bg-space">
			<canvas
				ref={canvas}
				role="img"
				aria-label="Space now: the Sun, Earth, Moon, Mars, and Mercury where they are. At a site, the sky from it."
				className="absolute inset-0 size-full touch-none cursor-grab active:cursor-grabbing"
			/>
			<p
				ref={caption}
				className="absolute inset-x-0 top-[4.5rem] text-center font-mono text-label text-default tabular-nums pointer-events-none"
			/>
			<p
				ref={status}
				role="status"
				className="absolute bottom-0 left-0 m-md font-mono text-label text-secondary pointer-events-none"
			/>
			<span
				ref={marker}
				hidden
				aria-hidden="true"
				className="absolute top-0 left-0 pointer-events-none flex flex-col items-center font-mono text-label text-default"
			>
				<span ref={markerCode} />
				{/* A cursor-like triangle, its tip on the site. */}
				<svg viewBox="0 0 12 10" className="w-sm h-sm" aria-hidden="true">
					<path d="M0 0H12L6 10Z" fill="currentColor" />
				</svg>
			</span>
			{all.map((body) => (
				<span
					key={body}
					ref={(node) => {
						labels.current[body] = node;
					}}
					hidden
					aria-hidden="true"
					className={classNames(
						"absolute top-0 left-0 pointer-events-none font-mono text-default",
						body === "sun" ? "text-caption" : "text-label",
					)}
				>
					{names[body]}
				</span>
			))}
		</div>
	);
}
