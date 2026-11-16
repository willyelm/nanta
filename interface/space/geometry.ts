import type { Body, Position } from "position";
import {
	BufferAttribute,
	BufferGeometry,
	Line,
	LineBasicMaterial,
	LineDashedMaterial,
	Matrix4,
	Quaternion,
	Vector3,
} from "three";

// Radii in km, label names, and the body each Horizons center code names.
export const radius: Record<Body, number> = {
	sun: 695_700,
	earth: 6_371,
	moon: 1_737.4,
	mars: 3_389.5,
	mercury: 2_439.7,
};
export const names: Record<Body, string> = {
	sun: "Sun",
	earth: "Earth",
	moon: "Moon",
	mars: "Mars",
	mercury: "Mercury",
};
export const codes: Record<string, Body> = {
	"10": "sun",
	"301": "moon",
	"399": "earth",
	"499": "mars",
	"199": "mercury",
};
export const all = Object.keys(radius) as Body[];

// Space, before a site: the Sun at the center and each body where it is now, from one Horizons
// state each, advanced by the clock. Directions are true and distances from the Sun linear in
// AU (8 units each). Sizes are enlarged so every body can be seen: Earth, Moon, and Mars keep
// their true ratio to each other; the Sun can't (109 Earths). The Moon keeps its true direction
// from the Earth at a set distance, clear of it. Ecliptic x, y, z is scene x, -z, y.
export const AU = 149_597_870.7;
export const SCALE = 8;
export const EARTH = 0.3;
export const spaceSize: Record<Body, number> = {
	sun: 1,
	earth: EARTH,
	moon: EARTH * (radius.moon / radius.earth),
	mars: EARTH * (radius.mars / radius.earth),
	mercury: EARTH * (radius.mercury / radius.earth),
};
export const MOON = 2;
export const byCode: Record<string, Body> = {
	"199": "mercury",
	"399": "earth",
	"301": "moon",
	"499": "mars",
};
export const ecliptic = ([x, y, z]: number[], k = 1) => vec(x * k, z * k, -y * k);

// The scene is the site's body frame, the body's radius 1. Directions come from Horizons and are
// exact. Earth, Moon, and Mars are true size against the site's body; the Sun is fixed, since
// true size (400 Moon radii) can't fit. Distance is log10 of the real range, spread wide enough
// that a true-size Earth stands clear of the Moon.
export const SUN_SIZE = 6;
export const distance = (km: number, base: number) => 1 + 6 * Math.log10(km / base);
export const size = (body: Body, base: number) => (body === "sun" ? SUN_SIZE : radius[body] / base);

export const toRad = Math.PI / 180;
export const vec = (x = 0, y = 0, z = 0) => new Vector3().set(x, y, z);
export const plus = (a: Vector3, b: Vector3, k = 1) =>
	vec(a.x + b.x * k, a.y + b.y * k, a.z + b.z * k);

// Unit sphere in the scene: body north (z) is scene y; east longitude from the x–z plane.
// One conversion for graticule, site frames, and picking so a click lands on the same point.
export function pointOnBody(lat: number, lon: number) {
	const [la, lo] = [lat * toRad, lon * toRad];
	return vec(Math.cos(la) * Math.cos(lo), Math.sin(la), -Math.cos(la) * Math.sin(lo));
}

export function latLon(point: { x: number; y: number; z: number }) {
	const lat = Math.asin(Math.max(-1, Math.min(1, point.y))) / toRad;
	const lon = (Math.atan2(-point.z, point.x) / toRad + 360) % 360;
	return { lat, lon };
}

// The site's local frame on the unit sphere: up, north, and east.
export function frame(lat: number, lon: number) {
	const [la, lo] = [lat * toRad, lon * toRad];
	const body = (x: number, y: number, z: number) => vec(x, z, -y);
	return {
		up: pointOnBody(lat, lon),
		north: body(-Math.sin(la) * Math.cos(lo), -Math.sin(la) * Math.sin(lo), Math.cos(la)),
		east: body(-Math.sin(lo), Math.cos(lo), 0),
	};
}

// A direction from azimuth (from north toward east) and elevation, in a site's frame.
export function direction(f: ReturnType<typeof frame>, p: Position) {
	const [az, el] = [p.azimuth * toRad, p.elevation * toRad];
	const d = plus(vec(), f.north, Math.cos(el) * Math.cos(az));
	return plus(plus(d, f.east, Math.cos(el) * Math.sin(az)), f.up, Math.sin(el));
}

// Latitude and longitude lines on the unit sphere, every 15°, as segments for one draw.
export function graticule() {
	const points: number[] = [];
	const at = (lat: number, lon: number) => {
		const p = pointOnBody(lat, lon);
		points.push(p.x, p.y, p.z);
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
export const SKY = 200;
export const OBLIQUITY = 23.4393 * toRad;

// A star's direction from right ascension and declination (equatorial, degrees), turned onto the
// ecliptic by the tilt of Earth's axis, as a scene point on the sky sphere.
export function starAt(ra: number, dec: number) {
	const [a, d] = [ra * toRad, dec * toRad];
	const [x, y, z] = [Math.cos(d) * Math.cos(a), Math.cos(d) * Math.sin(a), Math.sin(d)];
	const ecliptic = [
		x,
		y * Math.cos(OBLIQUITY) + z * Math.sin(OBLIQUITY),
		-y * Math.sin(OBLIQUITY) + z * Math.cos(OBLIQUITY),
	];
	return vec(ecliptic[0] * SKY, ecliptic[2] * SKY, -ecliptic[1] * SKY);
}

// How each body turns (IAU): pole right ascension and declination, and the prime meridian W, in
// degrees, at `d` days since J2000. The Moon keeps its main wobble term (E1): without it the pole
// is off by up to 1.5°, which at the south pole is the whole Sun. Within 0.3° of Horizons.
export function spin(body: Exclude<Body, "sun">, d: number): [number, number, number] {
	if (body === "earth") return [0, 90, 190.147 + 360.9856235 * d];
	if (body === "mars") return [317.681, 52.887, 176.63 + 350.89198226 * d];
	if (body === "mercury") return [281.0097, 61.4143, 329.5469 + 6.1385025 * d];
	const e = (125.045 - 0.0529921 * d) * toRad;
	return [
		269.9949 - 3.8787 * Math.sin(e),
		66.5392 + 1.5419 * Math.cos(e),
		38.3213 + 13.17635815 * d + 3.561 * Math.sin(e),
	];
}
export const J2000 = Date.UTC(2000, 0, 1, 12);

// A star's direction in a body's own frame at `time`, as a scene point on the sky sphere (body
// north is scene y, like the site frame).
export function starOver(body: Exclude<Body, "sun">, ra: number, dec: number, time: number) {
	const [a, d] = [ra * toRad, dec * toRad];
	const v = [Math.cos(d) * Math.cos(a), Math.cos(d) * Math.sin(a), Math.sin(d)];
	return toBody(body, v, time).multiplyScalar(SKY);
}

// An ecliptic vector (as the space states give) to the equatorial frame, then to a body's own
// frame at `time`, as a scene vector of the same length.
export function eclipticOver(body: Exclude<Body, "sun">, [x, y, z]: number[], time: number) {
	const [c, s] = [Math.cos(OBLIQUITY), Math.sin(OBLIQUITY)];
	return toBody(body, [x, y * c - z * s, y * s + z * c], time);
}

// An equatorial vector in a body's own frame at `time`, as a scene vector (body north is y).
export function toBody(body: Exclude<Body, "sun">, v: number[], time: number) {
	const [pa, pd, meridian] = spin(body, (time - J2000) / 86_400_000);
	const w = (meridian % 360) * toRad;
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

// How a body sits in space at `time`: the turn from its own frame to the scene, so its grid,
// poles, and day line are true. The scene's axes are ecliptic x, z, and -y.
export function orientation(body: Body, time: number) {
	if (body === "sun") return new Quaternion();
	const [x, y, z] = [
		[1, 0, 0],
		[0, 0, 1],
		[0, -1, 0],
	].map((v) => eclipticOver(body, v, time));
	return new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(x, y, z)).invert();
}

// A filler of faint stars, the same on every load (a fixed seed), not a catalog.
export function filler(count: number) {
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
export function shade(grid: BufferGeometry, toward: Vector3) {
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
export function line(color: string, dashed = false, points?: Vector3[]) {
	const array = points
		? new Float32Array(points.flatMap((p) => [p.x, p.y, p.z]))
		: new Float32Array(6);
	const geometry = new BufferGeometry().setAttribute("position", new BufferAttribute(array, 3));
	const material = dashed
		? new LineDashedMaterial({ color, dashSize: 0.08, gapSize: 0.06 })
		: new LineBasicMaterial({ color });
	return new Line(geometry, material);
}
