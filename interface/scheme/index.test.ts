import assert from "node:assert/strict";
import { test } from "node:test";
import { readScheme, setScheme } from "./index.ts";

test("defaults to auto", () => {
	assert.equal(readScheme(), "auto");
});

test("stores light and dark and applies them", () => {
	setScheme("dark");
	assert.equal(localStorage.getItem("scheme"), "dark");
	assert.equal(document.documentElement.dataset.scheme, "dark");
	assert.equal(readScheme(), "dark");
});

test("auto clears the choice and follows the system", (t) => {
	t.mock.method(window, "matchMedia", () => ({ matches: true }));
	setScheme("light");
	setScheme("auto");
	assert.equal(localStorage.getItem("scheme"), null);
	assert.equal(document.documentElement.dataset.scheme, "dark");
	assert.equal(readScheme(), "auto");
});
