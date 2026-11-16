import assert from "node:assert/strict";
import { test } from "node:test";
import { bodyLabel, nantaTitle, sitesDetail } from "./title.ts";

test("prefixes the detail with Nanta", () => {
	assert.equal(nantaTitle("Landing path finder"), "Nanta - Landing path finder");
});

test("labels a body by name and Horizons code", () => {
	assert.equal(bodyLabel("301"), "Moon 301");
	assert.equal(bodyLabel("399"), "Earth 399");
	assert.equal(bodyLabel("999"), "999");
});

test("sites detail steps from body to site to site/window", () => {
	assert.equal(sitesDetail("301", "", "TODAY"), "Moon 301");
	assert.equal(sitesDetail("301", "KSC", "TODAY"), "KSC");
	assert.equal(sitesDetail("301", "KSC", "JUN27"), "KSC/JUN27");
});
