import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { cancelReplace, flushReplace, replaceLater } from "./url.ts";

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
