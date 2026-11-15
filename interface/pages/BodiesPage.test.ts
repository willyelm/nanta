import assert from "node:assert/strict";
import { test } from "node:test";
import { duration } from "./BodiesPage.tsx";

test("formats a solar day as fixed-width days, hours, and minutes", () => {
	assert.equal(duration(2_551_443), "29d 12h 44m");
	assert.equal(duration(86_400), "01d 00h 00m");
	assert.equal(duration(88_775), "01d 00h 40m");
});
