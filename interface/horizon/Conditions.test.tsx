import assert from "node:assert/strict";
import { test } from "node:test";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { Conditions, duration, summarize, until } from "./Conditions.tsx";

// Hourly samples with the given elevations, from midnight UTC.
const track = (elevations: number[]) =>
	elevations.map((elevation, i) => ({
		time: new Date(Date.UTC(2027, 2, 1, i)).toISOString(),
		azimuth: 0,
		range: 384_400,
		elevation,
	}));

test("duration counts the hours above the horizon", () => {
	assert.equal(duration(track([1, 2, -1, 0, 3])), 2);
	assert.equal(duration(track([1])), 0);
	// Up the whole window: 49 hourly samples are 48 hours, never 49.
	assert.equal(duration(track(Array(49).fill(1))), 48);
});

test("until finds the next rise or set", () => {
	const sun = track([2, 1, -1, -2, 1]);
	assert.deepEqual(until(sun, 0), { up: true, hours: 2 });
	assert.deepEqual(until(sun, 2), { up: false, hours: 2 });
	assert.deepEqual(until(track([1, 1, 1]), 0), { up: true, hours: null });
});

test("groups each condition under a shared summary, with a curve after the detail", async () => {
	const container = document.body.appendChild(document.createElement("div"));
	const root = createRoot(container);
	const sky = { sun: track([2, 1, -1]), earth: track([5, 5.2, 5.4]) };
	await act(async () =>
		root.render(<Conditions list={["sunlight", "earth_visibility"]} sky={sky} at={0} />),
	);
	const section = container.querySelector('[aria-label="Conditions"]');
	assert.ok(section);
	assert.match(section!.textContent ?? "", /Sun 2\.0° above the horizon/);
	assert.equal(section!.querySelectorAll("article").length, 2);
	assert.equal(section!.querySelectorAll("svg").length, 2);
	assert.equal(summarize(["sunlight"], sky, 0), "Sun 2.0° above the horizon, bearing 0°.");
	await act(async () => root.unmount());
	container.remove();
});
