import assert from "node:assert/strict";
import { test } from "node:test";
import type { State } from "position";
import { advance, helio } from "./orbit.ts";

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

const row = (code: string, position: [number, number, number]): State => ({
	code,
	center: "10",
	time: "2026-01-01T00:00:00Z",
	position,
	velocity: [0, 0, 0],
});

test("helio is the origin for the Sun and sums Earth with the Moon", () => {
	const t = Date.parse("2026-01-01T00:00:00Z");
	const states = [row("399", [10, 0, 0]), row("301", [1, 0, 0]), row("499", [20, 0, 0])];
	assert.deepEqual(helio(states, "sun", t), [0, 0, 0]);
	assert.deepEqual(helio(states, "moon", t), [11, 0, 0]);
	assert.deepEqual(helio(states, "earth", t), [10, 0, 0]);
	assert.deepEqual(helio(states, "mars", t), [20, 0, 0]);
});
