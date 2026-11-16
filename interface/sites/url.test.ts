import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { cancelReplace, flushReplace, keepHref, replaceLater } from "./url.ts";

const calls: string[] = [];

afterEach(() => {
	calls.length = 0;
	cancelReplace();
	Reflect.deleteProperty(globalThis, "navigation");
	Reflect.deleteProperty(window, "navigation");
});

test("replaceLater coalesces hrefs and flushReplace sends the last one", () => {
	const nav = {
		navigate(url: string) {
			calls.push(url);
		},
	};
	Object.defineProperty(window, "navigation", { configurable: true, value: nav });
	Object.defineProperty(globalThis, "navigation", { configurable: true, value: nav });

	replaceLater("/a?time=1", 20);
	replaceLater("/a?time=2", 20);
	replaceLater("/a?time=3", 20);
	assert.deepEqual(calls, []);
	flushReplace();
	assert.deepEqual(calls, ["/a?time=3"]);
});

test("cancelReplace drops a pending write", () => {
	const nav = {
		navigate(url: string) {
			calls.push(url);
		},
	};
	Object.defineProperty(window, "navigation", { configurable: true, value: nav });
	Object.defineProperty(globalThis, "navigation", { configurable: true, value: nav });

	replaceLater("/a?time=1", 50);
	cancelReplace();
	flushReplace();
	assert.deepEqual(calls, []);
});

test("keepHref carries camera pose when switching a candidate window", () => {
	const live = new URLSearchParams("window=TODAY&time=2027-06-01T06:00&az=12&el=30&d=20");
	const href = keepHref("/301/sites/SCR", { window: "JUN27", time: null }, live);
	assert.equal(href, "/301/sites/SCR?window=JUN27&az=12&el=30&d=20");
});

test("keepHref keeps the expanded reading across moves, and drops it on request", () => {
	const live = new URLSearchParams("window=JUN27&reading=full");
	assert.equal(keepHref("/301/sites/CY3", {}, live), "/301/sites/CY3?window=JUN27&reading=full");
	assert.equal(keepHref("/301/sites/CY3", { reading: null }, live), "/301/sites/CY3?window=JUN27");
});
