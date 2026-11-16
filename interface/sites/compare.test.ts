import assert from "node:assert/strict";
import { test } from "node:test";
import type { Position } from "position";
import { compare } from "./compare.ts";

const hours = (elevations: number[]): Position[] =>
	elevations.map((elevation, i) => ({
		time: new Date(Date.UTC(2027, 5, 1, i)).toISOString(),
		azimuth: 0,
		elevation,
		range: 1,
	}));

test("each fact shows both readings and the candidate's change from the current", () => {
	const current = { list: ["sunlight" as const], sky: { sun: hours([1, 1, 1, -1]) }, at: 0 };
	const candidate = { list: ["sunlight" as const], sky: { sun: hours([1, -1, -1, -1]) }, at: 0 };
	const [group] = compare(current, candidate);
	assert.equal(group.condition, "Sunlight");
	const above = group.rows.find((row) => row.fact === "Above horizon");
	assert.deepEqual(above, {
		fact: "Above horizon",
		current: "3 h",
		candidate: "1 h",
		change: "−2 h",
		trend: "less",
	});
});

test("a reading against itself has no change", () => {
	const side = { list: ["sunlight" as const], sky: { sun: hours([1, -1, 1]) }, at: 1 };
	for (const row of compare(side, side)[0].rows) {
		assert.equal(row.current, row.candidate);
		assert.equal(row.trend, undefined);
	}
});

test("no change when one side has no next change to subtract", () => {
	const current = { list: ["sunlight" as const], sky: { sun: hours([-1, -1, 1]) }, at: 0 };
	const candidate = { list: ["sunlight" as const], sky: { sun: hours([-1, -1, -1]) }, at: 0 };
	const next = compare(current, candidate)[0].rows.find((row) => row.fact === "Next change");
	assert.equal(next?.candidate, "none");
	assert.equal(next?.change, undefined);
});
