import assert from "node:assert/strict";
import { test } from "node:test";
import { imagery } from "./index.ts";

test("Moon imagery centers a 3×3 Trek mosaic on the site", () => {
	const [wac] = imagery("301", 0.674, 23.473) ?? [];
	// Zoom 8: 512 × 256 tiles. 23.473° E is column 289, 0.674° N is row 127.
	assert.match(
		wac.tiles[1][1],
		/LRO_WAC_Mosaic_Global_303ppd_v02\/1\.0\.0\/default\/default028mm\/8\/127\/289\.jpg$/,
	);
	assert.ok(wac.x > 1 / 3 && wac.x < 2 / 3 && wac.y > 1 / 3 && wac.y < 2 / 3);
});

test("a polar site keeps the mosaic inside the grid and the ring on the site", () => {
	const [wac] = imagery("301", -89.45, 222.69) ?? [];
	assert.match(wac.tiles[2][1], /\/8\/255\//);
	assert.ok(wac.y > 2 / 3 && wac.y <= 1);
});

test("Earth imagery is Blue Marble and a GIBS picture of a past day, centered on the site", () => {
	const [marble, modis] = imagery("399", 28.573, 279.351, "2026-06-01") ?? [];
	assert.doesNotMatch(marble.tiles[0][0], /TIME=/);
	assert.equal(modis.date, "2026-06-01");
	assert.equal(modis.latest, false);
	assert.match(modis.tiles[0][0], /TIME=2026-06-01/);
	assert.match(modis.tiles[0][0], /BBOX=27\.573%2C-81\.649/);
	const [, future] = imagery("399", 0, 0, "2999-01-01") ?? [];
	assert.notEqual(future.date, "2999-01-01");
	assert.equal(future.latest, true);
});

test("bodies without a source have no imagery", () => {
	assert.equal(imagery("10", 0, 0), null);
});
