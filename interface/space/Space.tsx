import type { Body, Position, State } from "position";
import { useEffect, useRef } from "react";
import { classNames } from "system";
import {
	AmbientLight,
	type BufferGeometry,
	CircleGeometry,
	CylinderGeometry,
	DirectionalLight,
	type Line,
	LineBasicMaterial,
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
import { read, slot, type XYZ } from "./api";
import {
	AU,
	all,
	codes,
	direction,
	distance,
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

		const grids = {} as Record<Body, BufferGeometry>;
		const ball = new SphereGeometry(0.995, 64, 32);
		const meshes = {} as Record<Body, Mesh>;
		const paints: [Body, Material, Material][] = [];
		for (const body of all) {
			const c = paint(body);
			const surface =
				body === "sun"
					? new MeshBasicMaterial({ color: c, transparent: true, opacity: 0.35 })
					: new MeshStandardMaterial({ color: c, transparent: true, opacity: 0.7 });
			const lines = new LineBasicMaterial({ color: c, vertexColors: true });
			grids[body] = graticule();
			meshes[body] = new Mesh(ball, surface);
			meshes[body].add(new LineSegments(grids[body], lines));
			paints.push([body, surface, lines]);
			scene.add(meshes[body]);
		}

		const goals = {} as Record<Body, Vector3>;
		for (const body of all) goals[body] = meshes[body].position.clone();
		let sliding = false;
		const EASE = 0.12;
		let siteSight: (() => void) | null = null;

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
		const bright = new MeshBasicMaterial({ color: starColor() });
		scene.add(new Points(filler(3000), faint));
		const named: { mesh: Mesh; label: HTMLSpanElement; ra: number; dec: number }[] = [];

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
		// Set while the camera moves between sites: the angle it keeps on the way.
		let travel: [number, number, number] | null = null;

		const draw = () => {
			frameId ||= requestAnimationFrame(render);
		};
		const render = () => {
			frameId = 0;
			if (travel) {
				// Between sites: the target slides over the surface, the frame follows it, and the
				// camera keeps its angle, so the readout holds still and the path is an arc.
				const height = goal.target.length();
				target.lerp(goal.target, 0.12).setLength(height);
				const { lat, lon } = latLon(point.copy(target).normalize());
				Object.assign(axes, frame(lat, lon));
				camera.position.copy(plus(target, toward(travel[0], travel[1]), travel[2]));
				camera.up.copy(axes.up);
				if (target.distanceTo(goal.target) < 0.001) travel = null;
			}
			easing &&=
				camera.position.distanceTo(goal.position) > 0.001 ||
				target.distanceTo(goal.target) > 0.001 ||
				camera.up.distanceTo(goal.up) > 0.001;
			if (easing && !travel) {
				camera.position.lerp(goal.position, 0.12);
				target.lerp(goal.target, 0.12);
				camera.up.lerp(goal.up, 0.12).normalize();
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
				spin.x *= 0.88;
				spin.y *= 0.88;
				spin.zoom *= 0.8;
			}
			camera.lookAt(target);
			offset.copy(camera.position).sub(target);
			const d = offset.length();
			const [a, b, c] = [offset.dot(axes.north), offset.dot(axes.east), offset.dot(axes.up)];
			setReadout([
				// What the camera looks at and turns around: the site, else the body, else space itself.
				"Target",
				(axes.site && store.view.site) || store.view.body || "Space",
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
			const pin = (mesh: Mesh, label: HTMLElement | null | undefined, lift: number, dy: string) => {
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
						mesh.position.lerp(goals[body], EASE);
						sliding = true;
					}
				}
				siteSight?.();
				const selected = store.view.body ? codes[store.view.body] : undefined;
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
			if (travel || easing || spinning || sliding) draw();
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
		const rings: Partial<Record<Body, Line>> = {};
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
			for (const item of Object.values(rings)) if (item) item.visible = !atSite;
			horizon.visible = outline.visible = atSite;
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
				for (const mesh of [horizon, outline]) {
					mesh.position.copy(plus(vec(), site, 1.002));
					mesh.lookAt(plus(vec(), site, 2));
				}
				sunlight.visible = true;
				sunpoint.visible = false;
				const placing = next.onPick != null;
				const i = next.at ?? 0;
				// A body `km` away along `toward`, from `origin`, at the scene's distance and size.
				const place = (body: Body, origin: Vector3, toward: Vector3, km: number) =>
					go(body, plus(origin, toward.normalize(), distance(km, base)), size(body, base), snap);
				// Sky az/el belong to one fixed site. While placing/editing, lat/lon are a draft, so
				// keep Sun/Earth on the body-centered helio frame and only move the marker + sights.
				if (!placing) {
					for (const [body, positions] of Object.entries(next.sky ?? {}) as [Body, Position[]][]) {
						const p = positions[Math.min(i, positions.length - 1)];
						if (p && body !== home) place(body, site, direction(f, p), p.range);
					}
				}
				// The rest from the space states, around the body's center.
				const center = home !== "sun" && helio(states, home, when);
				for (const body of all) {
					const from = !placed.has(body) && helio(states, body, when);
					if (home === "sun" || !center || !from || body === home) continue;
					const toward = eclipticOver(
						home,
						[0, 1, 2].map((axis) => from[axis] - center[axis]),
						when,
					);
					place(body, vec(), toward, toward.length());
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
						const toward = plus(meshes[body].position, site, -1);
						const length = toward.length();
						const dir = toward.clone().normalize();
						const up = dir.dot(f.up) > 0;
						if (body === "sun") {
							beam.position.copy(plus(site, toward, 0.5));
							beam.quaternion.setFromUnitVectors(along, dir.clone().multiplyScalar(-1));
							beam.scale.set(1, length, 1);
							core.material.opacity = up ? 1 : 0.15;
							glow.material.opacity = up ? 0.22 : 0.04;
							sunlight.position.copy(meshes.sun.position);
						} else {
							const step = length / DASHES;
							dashes.forEach((mesh, n) => {
								mesh.position.copy(plus(site, dir, step * (n + 0.5)));
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
			if (!atSite) {
				const placed = !!selected && (selected === "sun" || meshes[selected].visible);
				if (moved || (placed && aimed !== next.body)) {
					// The chosen body once Horizons has placed it; until then, or with none, the
					// whole solar system from afar.
					aimed = placed ? next.body : undefined;
					if (placed && selected) {
						const at = goals[selected];
						const away = Math.max(spaceSize[selected] * 8, 2.5);
						aim(
							at,
							plus(at, vec(0, 0.6, 1).normalize(), away),
							vec(0, 1, 0),
							spaceSize[selected] * 1.5,
						);
					} else aim(vec(), overview(), vec(0, 1, 0), 1.5);
				}
			} else if (
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
				const saved = was ?? readCamera();
				const az = saved
					? saved[0]
					: (Math.atan2(-look.dot(axes.east), -look.dot(axes.north)) / toRad + 360) % 360;
				const elv = saved ? saved[1] : SITE_ELEVATION;
				const dist = saved ? saved[2] : SITE_DISTANCE;
				pose(az, elv, dist);
				// From one site to another: travel over the surface at the same angle.
				if (was && moved) travel = was;
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
			bright.color.set(starColor());
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
					const mesh = new Mesh(
						new SphereGeometry(Math.max(0.25, 0.9 - star.magnitude * 0.25), 8, 6),
						bright,
					);
					mesh.position.copy(starAt(star.ra, star.dec));
					const label = Object.assign(document.createElement("span"), {
						textContent: star.name,
						className:
							"absolute top-0 left-0 pointer-events-none font-mono text-caption text-default",
					});
					label.setAttribute("aria-hidden", "true");
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
		const clock = setInterval(() => store.apply?.(store.view), 60_000);

		return () => {
			stopped = true;
			loader.stop();
			statesFor = undefined;
			slot.current = null;
			for (const { label } of named) label.remove();
			clearInterval(clock);
			store.apply = undefined;
			cancelAnimationFrame(frameId);
			observer.disconnect();
			scheme.disconnect();
			for (const [type, fn] of pointers) el.removeEventListener(type, fn);
			el.removeEventListener("wheel", wheel);
			renderer.dispose();
		};
	}, []);

	return (
		<div className="fixed inset-0 -z-10 overflow-hidden">
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
