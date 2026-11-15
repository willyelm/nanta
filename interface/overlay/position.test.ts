import assert from "node:assert/strict";
import { test } from "node:test";
import { anchorStyle, place } from "./position.tsx";

test("maps placement and align to a position area that flips on overflow", () => {
	assert.equal(anchorStyle("--a", "bottom", "start").positionArea, "block-end span-inline-end");
	assert.equal(anchorStyle("--a", "bottom", "center").positionArea, "block-end");
	assert.equal(anchorStyle("--a", "top", "end").positionArea, "block-start span-inline-start");
	assert.equal(anchorStyle("--a", "right", "start").positionArea, "inline-end span-block-end");
	assert.equal(anchorStyle("--a", "bottom", "start").positionTryFallbacks, "flip-block");
	assert.equal(anchorStyle("--a", "left", "start").positionTryFallbacks, "flip-inline");
	assert.equal(anchorStyle("--a", "bottom", "start").positionAnchor, "--a");
});

const viewport = { width: 800, height: 600 };
const trigger = { top: 100, left: 100, width: 80, height: 40 };
const overlay = { top: 0, left: 0, width: 200, height: 120 };

test("places below and lines up by align", () => {
	assert.deepEqual(place(trigger, overlay, "bottom", "start", viewport), { top: 144, left: 100 });
	assert.deepEqual(place(trigger, overlay, "bottom", "end", viewport), { top: 144, left: 0 });
	assert.deepEqual(place(trigger, overlay, "bottom", "center", viewport), { top: 144, left: 40 });
});

test("flips to the other side when it doesn't fit", () => {
	const low = { ...trigger, top: 520 };
	assert.equal(place(low, overlay, "bottom", "start", viewport).top, 520 - 120 - 4);
	const high = { ...trigger, top: 20 };
	assert.equal(place(high, overlay, "top", "start", viewport).top, 20 + 40 + 4);
});

test("stays inside the viewport", () => {
	const right = { ...trigger, left: 760 };
	assert.equal(place(right, overlay, "bottom", "start", viewport).left, 800 - 200);
});
