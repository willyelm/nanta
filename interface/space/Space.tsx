import type { Body as Entry } from "body";
import type { Body, Position, Sky, State } from "position";
import { useEffect, useRef } from "react";
import { classNames } from "system";
import {
	AmbientLight,
	BufferAttribute,
	BufferGeometry,
	CircleGeometry,
	DirectionalLight,
	Line,
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
	Vector3,
	WebGLRenderer,
} from "three";
import { advance } from "./orbit";

// What the model shows: the body by Horizons code, a site on it (degrees, east longitude), and
// the other bodies seen from that site over a window, at sample `at`.
export type View = { body?: string; lat?: number; lon?: number; sky?: Sky; at?: number };

let view: View = {};
let apply: ((view: View) => void) | undefined;

// Sets the given parts of the view while the calling component is mounted, and clears them after.
export function useView(part: View) {
	const { body, lat, lon, sky, at } = part;
	useEffect(() => {
		const set = Object.entries({ body, lat, lon, sky, at }).filter(([, v]) => v !== undefined);
		view = { ...view, ...Object.fromEntries(set) };
		apply?.(view);
		return () => {
			view = { ...view };
			for (const [key] of set) delete view[key as keyof View];
			apply?.(view);
		};
	}, [body, lat, lon, sky, at]);
}

// Radii in km, label names, and the body each Horizons center code names.
const radius: Record<Body, number> = { sun: 695_700, earth: 6_371, moon: 1_737.4, mars: 3_389.5 };
const names: Record<Body, string> = { sun: "Sun", earth: "Earth", moon: "Moon", mars: "Mars" };
const codes: Record<string, Body> = { "10": "sun", "301": "moon", "399": "earth", "499": "mars" };
const all = Object.keys(radius) as Body[];

// Space, before a site: the Sun at the center and each body where it is now, from one Horizons
// state each, advanced by the clock. Directions are true and distances from the Sun linear in
// AU (8 units each). Sizes are enlarged so every body can be seen: Earth, Moon, and Mars keep
// their true ratio to each other; the Sun can't (109 Earths). The Moon keeps its true direction
// from the Earth at a set distance, clear of it. Ecliptic x, y, z is scene x, -z, y.
const AU = 149_597_870.7;
const SCALE = 8;
const EARTH = 0.3;
const spaceSize: Record<Body, number> = {
	sun: 1,
	earth: EARTH,
	moon: EARTH * (radius.moon / radius.earth),
	mars: EARTH * (radius.mars / radius.earth),
};
const MOON = 2;
const byCode: Record<string, Body> = { "399": "earth", "301": "moon", "499": "mars" };
const ecliptic = ([x, y, z]: number[], k = 1) => vec(x * k, z * k, -y * k);
let states: State[] = [];

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

// The scene is the site's body frame, the body's radius 1. Directions come from Horizons and are
// exact. Earth, Moon, and Mars are true size against the site's body; the Sun is fixed, since
// true size (400 Moon radii) can't fit. Distance is log10 of the real range, spread wide enough
// that a true-size Earth stands clear of the Moon.
const SUN_SIZE = 6;
const distance = (km: number, base: number) => 1 + 6 * Math.log10(km / base);
const size = (body: Body, base: number) => (body === "sun" ? SUN_SIZE : radius[body] / base);

const toRad = Math.PI / 180;
const vec = (x = 0, y = 0, z = 0) => new Vector3().set(x, y, z);
const plus = (a: Vector3, b: Vector3, k = 1) => vec(a.x + b.x * k, a.y + b.y * k, a.z + b.z * k);

// The site's local frame on the unit sphere: up, north, and east. Body north (z) is scene y.
function frame(lat: number, lon: number) {
	const [la, lo] = [lat * toRad, lon * toRad];
	const body = (x: number, y: number, z: number) => vec(x, z, -y);
	return {
		up: body(Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la)),
		north: body(-Math.sin(la) * Math.cos(lo), -Math.sin(la) * Math.sin(lo), Math.cos(la)),
		east: body(-Math.sin(lo), Math.cos(lo), 0),
	};
}

// A direction from azimuth (from north toward east) and elevation, in a site's frame.
function direction(f: ReturnType<typeof frame>, p: Position) {
	const [az, el] = [p.azimuth * toRad, p.elevation * toRad];
	const d = plus(vec(), f.north, Math.cos(el) * Math.cos(az));
	return plus(plus(d, f.east, Math.cos(el) * Math.sin(az)), f.up, Math.sin(el));
}

// Latitude and longitude lines on the unit sphere, every 15°, as segments for one draw.
function graticule() {
	const points: number[] = [];
	const at = (lat: number, lon: number) => {
		const [la, lo] = [lat * toRad, lon * toRad];
		points.push(Math.cos(la) * Math.cos(lo), Math.sin(la), -Math.cos(la) * Math.sin(lo));
	};
	for (let lon = 0; lon < 360; lon += 15) {
		for (let lat = -90; lat < 90; lat += 3) {
			at(lat, lon);
			at(lat + 3, lon);
		}
	}
	for (let lat = -75; lat <= 75; lat += 15) {
		for (let lon = 0; lon < 360; lon += 3) {
			at(lat, lon);
			at(lat, lon + 3);
		}
	}
	// Each point's brightness, set by shade(); starts fully lit.
	return new BufferGeometry()
		.setAttribute("position", new BufferAttribute(new Float32Array(points), 3))
		.setAttribute("color", new BufferAttribute(new Float32Array(points.length).fill(1), 3));
}

// The sky behind everything: a far sphere, fixed to space (the ecliptic frame), for stars.
const SKY = 200;
const OBLIQUITY = 23.4393 * toRad;

// A star's direction from right ascension and declination (equatorial, degrees), turned onto the
// ecliptic by the tilt of Earth's axis, as a scene point on the sky sphere.
function starAt(ra: number, dec: number) {
	const [a, d] = [ra * toRad, dec * toRad];
	const [x, y, z] = [Math.cos(d) * Math.cos(a), Math.cos(d) * Math.sin(a), Math.sin(d)];
	const ecliptic = [
		x,
		y * Math.cos(OBLIQUITY) + z * Math.sin(OBLIQUITY),
		-y * Math.sin(OBLIQUITY) + z * Math.cos(OBLIQUITY),
	];
	return vec(ecliptic[0] * SKY, ecliptic[2] * SKY, -ecliptic[1] * SKY);
}

// How each body turns (IAU WGCCRE): the pole's right ascension and declination, and the prime
// meridian's angle W = w0 + rate × days since J2000, all in degrees. Close to a degree, which
// is enough to set the stars over a site; librations are left out.
const spin: Record<Exclude<Body, "sun">, [number, number, number, number]> = {
	moon: [269.9949, 66.5392, 38.3213, 13.17635815],
	earth: [0, 90, 190.147, 360.9856235],
	mars: [317.681, 52.887, 176.63, 350.89198226],
};
const J2000 = Date.UTC(2000, 0, 1, 12);

// A star's direction in a body's own frame at `time`, as a scene point on the sky sphere (body
// north is scene y, like the site frame).
function starOver(body: Exclude<Body, "sun">, ra: number, dec: number, time: number) {
	const [a, d] = [ra * toRad, dec * toRad];
	const v = [Math.cos(d) * Math.cos(a), Math.cos(d) * Math.sin(a), Math.sin(d)];
	return toBody(body, v, time).multiplyScalar(SKY);
}

// An ecliptic vector (as the space states give) to the equatorial frame, then to a body's own
// frame at `time`, as a scene vector of the same length.
function eclipticOver(body: Exclude<Body, "sun">, [x, y, z]: number[], time: number) {
	const [c, s] = [Math.cos(OBLIQUITY), Math.sin(OBLIQUITY)];
	return toBody(body, [x, y * c - z * s, y * s + z * c], time);
}

// An equatorial vector in a body's own frame at `time`, as a scene vector (body north is y).
function toBody(body: Exclude<Body, "sun">, v: number[], time: number) {
	const [pa, pd, w0, rate] = spin[body];
	const w = (w0 + rate * ((time - J2000) / 86_400_000)) * toRad;
	let [x, y, z] = v;
	// Rz(90° + pole RA), then Rx(90° − pole Dec), then Rz(W): equatorial to body-fixed.
	const rz = (t: number) => {
		[x, y] = [x * Math.cos(t) + y * Math.sin(t), -x * Math.sin(t) + y * Math.cos(t)];
	};
	rz((90 + pa) * toRad);
	const t = (90 - pd) * toRad;
	[y, z] = [y * Math.cos(t) + z * Math.sin(t), -y * Math.sin(t) + z * Math.cos(t)];
	rz(w);
	return vec(x, z, -y);
}

// A filler of faint stars, the same on every load (a fixed seed), not a catalog.
function filler(count: number) {
	let seed = 7;
	const random = () => {
		seed = (seed * 16807) % 2147483647;
		return seed / 2147483647;
	};
	const points = new Float32Array(count * 3);
	for (let i = 0; i < count; i++) {
		const z = random() * 2 - 1;
		const a = random() * Math.PI * 2;
		const r = Math.sqrt(1 - z * z) * SKY;
		points.set([Math.cos(a) * r, z * SKY, Math.sin(a) * r], i * 3);
	}
	return new BufferGeometry().setAttribute("position", new BufferAttribute(points, 3));
}

// Lights a body's grid from `toward` (the Sun's direction from the body): each point by the cosine
// between its surface direction and the Sun, with a floor so the night side stays faintly drawn.
function shade(grid: BufferGeometry, toward: Vector3) {
	const position = grid.getAttribute("position").array;
	const color = grid.getAttribute("color");
	for (let i = 0; i < position.length; i += 3) {
		const light = position[i] * toward.x + position[i + 1] * toward.y + position[i + 2] * toward.z;
		const k = Math.max(0.12, light);
		color.array[i] = color.array[i + 1] = color.array[i + 2] = k;
	}
	color.needsUpdate = true;
}

// A line through `points`, or two points updated in place.
function line(color: string, dashed = false, points?: Vector3[]) {
	const array = points
		? new Float32Array(points.flatMap((p) => [p.x, p.y, p.z]))
		: new Float32Array(6);
	const geometry = new BufferGeometry().setAttribute("position", new BufferAttribute(array, 3));
	const material = dashed
		? new LineDashedMaterial({ color, dashSize: 0.08, gapSize: 0.06 })
		: new LineBasicMaterial({ color });
	return new Line(geometry, material);
}

// The one scene of the app, behind every page, built once. Without a site it is space now: the
// Sun, and the bodies where they are, moving with the clock. With a site, the body is at the
// center with the site on it, and the other bodies where Horizons puts them from that site.
// A selection moves the camera. Drawn on demand.
export function Space() {
	const canvas = useRef<HTMLCanvasElement>(null);
	const labels = useRef<Partial<Record<Body, HTMLSpanElement | null>>>({});
	const status = useRef<HTMLParagraphElement>(null);

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
		const sight = { sun: line(color("sun")), earth: line(color("earth"), true) };
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

		const space = (next: View) => {
			for (const star of named) star.mesh.position.copy(starAt(star.ra, star.dec));
			Object.assign(axes, {
				site: false,
				north: vec(1, 0, 0),
				east: vec(0, 0, -1),
				up: vec(0, 1, 0),
			});
			const now = Date.now();
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
			if (next.body !== last.body || last.lat !== undefined) {
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

		apply = (next) => {
			if (next.lat === undefined || next.lon === undefined) return space(next);
			for (const ring of Object.values(rings)) if (ring) ring.visible = false;
			const home = codes[next.body ?? "301"] ?? "moon";
			// The stars over this body at the slider's time, or now before a window is chosen.
			const sample = Object.values(next.sky ?? {})[0]?.[next.at ?? 0];
			const when = sample ? Date.parse(sample.time) : Date.now();
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

			// Sight lines from the site to the Sun and the Earth.
			for (const body of ["sun", "earth"] as const) {
				const target = meshes[body].position;
				const shown = hasSite && body !== home && meshes[body].visible;
				sight[body].visible = shown;
				if (!shown) continue;
				const attribute = sight[body].geometry.getAttribute("position");
				attribute.array.set([site.x, site.y, site.z, target.x, target.y, target.z]);
				attribute.needsUpdate = true;
				if (body === "earth") sight[body].computeLineDistances();
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
		const down = (event: PointerEvent) => {
			easing = false;
			dragging = { x: event.clientX, y: event.clientY };
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
		const up = () => {
			dragging = null;
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
		apply(view);

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
				apply?.(view);
			})
			.catch((error: unknown) => {
				console.error("[space] stars", error);
				say("Couldn't load the reference stars.");
			});

		// One Horizons state per body for the current hour, in turn, each placed as it arrives;
		// the clock advances them after that. The status line says what's happening.
		const say = (text: string) => {
			if (status.current) status.current.textContent = text;
		};
		(async () => {
			const hour = `${new Date().toISOString().slice(0, 13)}:00`;
			for (const code of ["399", "301", "499"]) {
				say(`Loading Horizons state: ${names[byCode[code]]} (${code})…`);
				const response = await fetch(`/api/space?time=${hour}&body=${code}`).catch(() => null);
				if (stopped) return;
				if (!response?.ok) {
					say(`Couldn't load ${names[byCode[code]]}.`);
					return;
				}
				states = [...states, (await response.json()) as State];
				say(`Rendering ${names[byCode[code]]}…`);
				apply?.(view);
			}
			say("");
		})();
		const clock = setInterval(() => apply?.(view), 60_000);

		return () => {
			stopped = true;
			for (const { label } of named) label.remove();
			clearInterval(clock);
			apply = undefined;
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
