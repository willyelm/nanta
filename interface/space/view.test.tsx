import assert from "node:assert/strict";
import { test } from "node:test";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { store, useView } from "./view.ts";

function Probe(props: { at?: number; caption?: string; lat?: number }) {
	useView(props);
	return null;
}

test("merges view updates without clearing between ticks", async () => {
	const container = document.body.appendChild(document.createElement("div"));
	const root = createRoot(container);
	const applied: { at?: number; caption?: string; lat?: number }[] = [];
	store.view = {};
	store.apply = (view) => {
		applied.push({ at: view.at, caption: view.caption, lat: view.lat });
	};

	await act(async () => {
		root.render(<Probe lat={-89} at={0} caption="first" />);
	});
	await act(async () => {
		root.render(<Probe lat={-89} at={1} caption="second" />);
	});

	assert.deepEqual(applied, [
		{ at: 0, caption: "first", lat: -89 },
		{ at: 1, caption: "second", lat: -89 },
	]);
	assert.equal(
		applied.some((view) => view.at === undefined),
		false,
	);

	await act(async () => root.unmount());
	assert.deepEqual(store.view, {});
	store.apply = undefined;
});
