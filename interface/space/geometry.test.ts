import assert from "node:assert/strict";
import { test } from "node:test";
import {
	ecliptic,
	eclipticOver,
	frame,
	latLon,
	orientation,
	plus,
	pointOnBody,
	seen,
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

// Horizons at 2026-11-15 12:00: the Sun from the Moon (ecliptic, km), and its az/el at SCR.
const T = Date.UTC(2026, 10, 15, 12);
const sun = [-89756490.88486744, -117465421.20058, 22046.45861];

test("the Moon's turn puts the Sun where Horizons does at the south pole", () => {
	const v = eclipticOver("moon", sun, T).normalize();
	const f = frame(-89.45, 222.69);
	const az = (Math.atan2(v.dot(f.east), v.dot(f.north)) / toRad + 360) % 360;
	assert.ok(Math.abs(Math.asin(v.dot(f.up)) / toRad - 1.33) < 0.15);
	assert.ok(Math.abs(az - 245.64) < 0.15);
});

test("orientation turns a body-frame direction back onto the scene", () => {
	const v = [0.3, -0.5, 0.81];
	for (const body of ["earth", "moon", "mars"] as const) {
		const back = eclipticOver(body, v, T).applyQuaternion(orientation(body, T));
		assert.ok(back.distanceTo(ecliptic(v)) < 1e-9, body);
	}
});

test("seen sets a body out from the site, so its direction from the site stays true", () => {
	// The Moon low in the east from Earth: near enough that setting it out from Earth's center,
	// at the squashed scene distance, would bend it by degrees as seen from the site.
	const f = frame(28.573, 279.351);
	const toward = plus(f.east, f.up, 0.1).normalize();
	const mesh = seen(f.up, toward, 384_400, 6_371);
	const looking = mesh.sub(f.up).normalize();
	assert.ok(looking.dot(toward) > 1 - 1e-12);
});
