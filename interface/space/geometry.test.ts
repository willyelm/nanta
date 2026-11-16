import assert from "node:assert/strict";
import { test } from "node:test";
import { frame, latLon, pointOnBody } from "./geometry.ts";

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
