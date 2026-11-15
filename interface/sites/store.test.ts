import assert from "node:assert/strict";
import { test } from "node:test";
import { save, saved } from "./store.ts";

const site = (code: string, body = "301") => ({
	code,
	name: code,
	body,
	sunlight: true,
	earth_visibility: false,
	lat: -89,
	lon: 200,
	radius: 2,
});

test("keeps added sites per body, and a code replaces its old site", () => {
	save(site("PT1"));
	save(site("PT2", "499"));
	save({ ...site("PT1"), lat: -88 });
	assert.deepEqual(
		saved("301").map((s) => [s.code, s.lat]),
		[["PT1", -88]],
	);
	assert.equal(saved("499").length, 1);
});
