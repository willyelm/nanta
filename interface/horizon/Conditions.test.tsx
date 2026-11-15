import assert from "node:assert/strict";
import { test } from "node:test";
import { duration, until } from "./Conditions.tsx";

// Hourly samples with the given elevations, from midnight UTC.
const samples = (elevations: number[]) =>
	elevations.map((elevation, i) => ({
		time: new Date(Date.UTC(2027, 2, 1, i)).toISOString(),
		azimuth: 0,
		range: 384_400,
		elevation,
	}));

test("duration counts the hours above the horizon", () => {
	assert.equal(duration(samples([1, 2, -1, 0, 3])), 3);
	assert.equal(duration(samples([1])), 0);
});

test("until finds the next rise or set", () => {
	const sun = samples([2, 1, -1, -2, 1]);
	assert.deepEqual(until(sun, 0), { up: true, hours: 2 });
	assert.deepEqual(until(sun, 2), { up: false, hours: 2 });
	assert.deepEqual(until(samples([1, 1, 1]), 0), { up: true, hours: null });
});
