import assert from "node:assert/strict";
import { test } from "node:test";
import {
	ecliptic,
	eclipticOver,
	frame,
	latLon,
	orientation,
	pointOnBody,
	toRad,
} from "./geometry.ts";

test("pointOnBody and latLon round-trip on the unit sphere", () => {
	for (const [lat, lon] of [
		[0, 0],
		[90, 0],
		[-90, 40],
		[45, 90],
		[-12.345, 200.5],
		[0, 359.9],
	] as const) {
		const at = pointOnBody(lat, lon);
		assert.ok(Math.abs(at.length() - 1) < 1e-9);
		const back = latLon(at);
		assert.ok(Math.abs(back.lat - lat) < 1e-6, `lat ${lat} → ${back.lat}`);
		if (Math.abs(lat) < 90 - 1e-6) {
			const dlon = ((back.lon - lon + 540) % 360) - 180;
			assert.ok(Math.abs(dlon) < 1e-6, `lon ${lon} → ${back.lon}`);
		}
	}
});

test("frame.up is the same point as pointOnBody", () => {
	const [lat, lon] = [-89.5, 231.7];
	const up = frame(lat, lon).up;
	const at = pointOnBody(lat, lon);
	assert.ok(up.distanceTo(at) < 1e-9);
	const back = latLon(up);
	assert.ok(Math.abs(back.lat - lat) < 1e-6);
	assert.ok(Math.abs(back.lon - lon) < 1e-6);
});

// Horizons at 2026-11-15 12:00: ecliptic states (km) and site az/el, recorded once.
const T = Date.UTC(2026, 10, 15, 12);
const earth = [89549249.27306563, 117811795.2375797, -7658.286009125412];
const moon = [207241.6118188258, -346374.0367692618, -14388.1726143257];
const mars = [-71432655.40297876, 229815600.2605127, 6567610.547017351];
const sky = (home: "moon" | "mars", from: number[], lat: number, lon: number) => {
	const v = eclipticOver(home, from, T).normalize();
	const f = frame(lat, lon);
	const az = (Math.atan2(v.dot(f.east), v.dot(f.north)) / toRad + 360) % 360;
	return { az, el: Math.asin(v.dot(f.up)) / toRad };
};
const near = (got: { az: number; el: number }, az: number, el: number, tolerance: number) => {
	assert.ok(Math.abs(got.el - el) < tolerance, `el ${got.el} vs ${el}`);
	assert.ok(Math.abs(((got.az - az + 540) % 360) - 180) < tolerance, `az ${got.az} vs ${az}`);
};

test("the Moon's turn puts the Sun where Horizons does, at the south pole too", () => {
	const sun = [0, 1, 2].map((i) => -(earth[i] + moon[i]));
	near(sky("moon", sun, -89.45, 222.69), 245.64, 1.33, 0.05); // SCR
	near(sky("moon", sun, -69.373, 32.319), 77.42, 6.34, 0.05); // CY3
	near(sky("moon", sun, 0.674, 23.473), 91.62, 5.11, 0.05); // APL11
});

test("Mars' turn puts the Sun where Horizons does", () => {
	near(
		sky(
			"mars",
			mars.map((x) => -x),
			18.445,
			77.451,
		),
		76.43,
		-10.46,
		0.35,
	); // JZR
});

test("orientation turns a body-frame direction back onto the ecliptic scene", () => {
	const v = [0.3, -0.5, 0.81];
	for (const body of ["earth", "moon", "mars"] as const) {
		const back = eclipticOver(body, v, T).applyQuaternion(orientation(body, T));
		assert.ok(back.distanceTo(ecliptic(v)) < 1e-9, body);
	}
});
