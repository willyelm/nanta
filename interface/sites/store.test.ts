import assert from "node:assert/strict";
import { test } from "node:test";
import {
	candidateCode,
	removeCandidate,
	removeWindow,
	save,
	saveCandidate,
	saved,
	savedCandidates,
	savedWindows,
	saveWindow,
} from "./store.ts";

const site = (code: string, body = "301") => ({
	code,
	name: code,
	body,
	sunlight: true,
	earth_visibility: false,
	lat: -89,
	lon: 200,
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

test("keeps added windows, and a code replaces its old window", () => {
	saveWindow({ code: "W1", label: "W1", from: "2027-01-01", to: "2027-01-02" });
	saveWindow({ code: "W1", label: "W1", from: "2027-01-05", to: "2027-01-06" });
	assert.deepEqual(
		savedWindows().map((w) => [w.code, w.from]),
		[["W1", "2027-01-05"]],
	);
});

test("saves a site and a window as a candidate, and removes it", () => {
	const code = candidateCode("SCR", "JUN27");
	saveCandidate({ code, body: "301", site: "SCR", window: "JUN27" });
	assert.deepEqual(
		savedCandidates().map((c) => c.code),
		["SCR·JUN27"],
	);
	removeCandidate(code);
	assert.equal(savedCandidates().length, 0);
});

test("removes a window you added", () => {
	saveWindow({ code: "W2", label: "W2", from: "2027-02-01", to: "2027-02-02" });
	removeWindow("W2");
	assert.equal(
		savedWindows().some((w) => w.code === "W2"),
		false,
	);
});
