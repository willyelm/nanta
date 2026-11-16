import assert from "node:assert/strict";
import { test } from "node:test";
import { readSetting, setSetting } from "./model.ts";

test("guides and motion default to on", () => {
	assert.equal(readSetting("guides"), true);
	assert.equal(readSetting("motion"), true);
});

test("motion follows the system's reduced motion until chosen", (t) => {
	t.mock.method(window, "matchMedia", (media: string) => ({ media, matches: true }));
	assert.equal(readSetting("motion"), false);
	setSetting("motion", true);
	assert.equal(readSetting("motion"), true);
});

test("stores a choice and applies it on the document", () => {
	setSetting("guides", false);
	assert.equal(localStorage.getItem("guides"), "off");
	assert.equal(document.documentElement.dataset.guides, "off");
	assert.equal(readSetting("guides"), false);
	setSetting("guides", true);
	assert.equal(document.documentElement.dataset.guides, "on");
	assert.equal(readSetting("guides"), true);
});
