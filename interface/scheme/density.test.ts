import assert from "node:assert/strict";
import { test } from "node:test";
import { readDensity, setDensity } from "./density.ts";

test("defaults to regular", () => {
	localStorage.removeItem("density");
	assert.equal(readDensity(), "regular");
});

test("stores compact and applies it on the document", () => {
	setDensity("compact");
	assert.equal(localStorage.getItem("density"), "compact");
	assert.equal(document.documentElement.dataset.density, "compact");
	assert.equal(readDensity(), "compact");
});

test("regular clears the stored choice", () => {
	setDensity("compact");
	setDensity("regular");
	assert.equal(localStorage.getItem("density"), null);
	assert.equal(document.documentElement.dataset.density, "regular");
	assert.equal(readDensity(), "regular");
});
