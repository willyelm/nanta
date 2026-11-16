import assert from "node:assert/strict";
import { test } from "node:test";
import type { Position } from "position";
import { diff, text } from "./diff.ts";

const hours = (elevations: number[]): Position[] =>
	elevations.map((elevation, i) => ({
		time: new Date(Date.UTC(2027, 5, 1, i)).toISOString(),
		azimuth: 0,
		elevation,
		range: 1,
	}));

test("equal facts are one line, changed ones a - and + pair with the change", () => {
	const a = { list: ["sunlight" as const], sky: { sun: hours([1, 1, 1, -1]) }, at: 0 };
	const b = { list: ["sunlight" as const], sky: { sun: hours([1, -1, -1, -1]) }, at: 0 };
	const out = text(diff(a, b));
	assert.match(out, /^ {2}Sunlight/m);
	assert.match(out, /^ {2}\+1\.0° /m); // same elevation at the hour in view
	assert.match(out, /^- 1 h above the horizon$/m);
	assert.match(out, /^\+ 3 h above the horizon {2}\+2 h$/m);
});

test("a reading against itself has no - or + lines", () => {
	const side = { list: ["sunlight" as const], sky: { sun: hours([1, -1, 1]) }, at: 1 };
	assert.ok(diff(side, side).every((line) => line.sign === " "));
});
