import assert from "node:assert/strict";
import { test } from "node:test";
import { advance } from "./orbit.ts";

// A circular orbit of radius 1 in the xy plane, one radian per second.
const state = {
	code: "x",
	center: "10",
	time: "2026-01-01T00:00:00Z",
	position: [1, 0, 0] as [number, number, number],
	velocity: [0, 1, 0] as [number, number, number],
};

test("turns the position about the orbit's axis at its angular rate", () => {
	const [x, y, z] = advance(state, (Math.PI / 2) * 1000);
	assert.ok(Math.abs(x) < 1e-9 && Math.abs(y - 1) < 1e-9 && Math.abs(z) < 1e-9);
});

test("keeps the distance from the center", () => {
	const p = advance(state, 1234);
	assert.ok(Math.abs(Math.hypot(...p) - 1) < 1e-9);
});
