import type { Body, State } from "position";

type Vec = [number, number, number];

const cross = (a: Vec, b: Vec): Vec => [
	a[1] * b[2] - a[2] * b[1],
	a[2] * b[0] - a[0] * b[2],
	a[0] * b[1] - a[1] * b[0],
];
const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const length = (a: Vec) => Math.sqrt(dot(a, a));

// Where a body is `ms` after its state, around its center: the position turned about the orbit's
// axis (r × v) at the real angular rate (|r × v| / |r|²). Close over hours and days, which is
// what the model shows; a new state from Horizons resets it.
export function advance(state: State, ms: number): Vec {
	const r = state.position;
	const h = cross(r, state.velocity);
	const n = length(h);
	if (n === 0) return r;
	const k: Vec = [h[0] / n, h[1] / n, h[2] / n];
	const angle = (n / dot(r, r)) * (ms / 1000);
	const [c, s] = [Math.cos(angle), Math.sin(angle)];
	const kr = cross(k, r);
	const along = dot(k, r) * (1 - c);
	return [0, 1, 2].map((i) => r[i] * c + kr[i] * s + k[i] * along) as Vec;
}

// Heliocentric km at `time` from a set of Horizons states (Earth, Moon, Mars).
export function helio(states: State[], body: Body, time: number): number[] | null {
	if (body === "sun") return [0, 0, 0];
	const ahead = (code: string) => {
		const s = states.find((row) => row.code === code);
		return s ? advance(s, time - Date.parse(s.time)) : null;
	};
	if (body === "moon") {
		const [earth, moon] = [ahead("399"), ahead("301")];
		return earth && moon ? earth.map((v, i) => v + moon[i]) : null;
	}
	return ahead(body === "earth" ? "399" : "499");
}
