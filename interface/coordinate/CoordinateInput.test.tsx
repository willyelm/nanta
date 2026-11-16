import assert from "node:assert/strict";
import { test } from "node:test";
import { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { CoordinateInput, parseCoordinates } from "./CoordinateInput.tsx";

async function render(kind: "latitude" | "longitude", start: number) {
	let value = start;
	function Field() {
		const [v, setV] = useState(start);
		value = v;
		return <CoordinateInput label="Point" kind={kind} value={v} onChange={setV} />;
	}
	const container = document.body.appendChild(document.createElement("div"));
	const root = createRoot(container);
	await act(async () => root.render(<Field />));
	const spins = () => [...container.querySelectorAll<HTMLElement>('[role="spinbutton"]')];
	const key = (target: HTMLElement, key: string, shiftKey = false) =>
		act(async () => {
			target.dispatchEvent(new window.KeyboardEvent("keydown", { key, shiftKey, bubbles: true }));
		});
	const text = () => spins().map((s) => s.textContent);
	return { root, spins, key, text, value: () => value };
}

test("shows degrees, thousandths, and the hemisphere", async () => {
	const { root, text } = await render("latitude", -89.45);
	assert.deepEqual(text(), ["89", "450", "S"]);
	await act(async () => root.unmount());
});

test("up steps north by a degree, or ten with Shift, and stops at the pole", async () => {
	const { root, spins, key, value } = await render("latitude", 85.5);
	await key(spins()[0], "ArrowUp");
	assert.equal(value(), 86.5);
	await key(spins()[0], "ArrowUp", true);
	assert.equal(value(), 90);
	await act(async () => root.unmount());
});

test("thousandths step and carry into the degrees", async () => {
	const { root, spins, key, value } = await render("latitude", 1.999);
	await key(spins()[1], "ArrowUp");
	assert.equal(value(), 2);
	await act(async () => root.unmount());
});

test("stepping south crosses the equator into S", async () => {
	const { root, spins, key, text } = await render("latitude", 0.5);
	await key(spins()[0], "ArrowDown");
	assert.deepEqual(text(), ["0", "500", "S"]);
	await act(async () => root.unmount());
});

test("N and S set the hemisphere and keep the size", async () => {
	const { root, spins, key, value } = await render("latitude", 20.191);
	await key(spins()[2], "s");
	assert.equal(value(), -20.191);
	await key(spins()[2], "n");
	assert.equal(value(), 20.191);
	await act(async () => root.unmount());
});

test("longitude goes around past 360° east", async () => {
	const { root, spins, key, value } = await render("longitude", 359.5);
	await key(spins()[0], "ArrowUp");
	assert.equal(value(), 0.5);
	await key(spins()[0], "ArrowDown");
	assert.equal(value(), 359.5);
	await act(async () => root.unmount());
});

test("typing fills a segment, then moves on to the next", async () => {
	const { root, spins, key, value } = await render("longitude", 0);
	spins()[0].focus();
	for (const digit of "279") await key(spins()[0], digit);
	assert.equal(document.activeElement, spins()[1]);
	for (const digit of "351") await key(spins()[1], digit);
	assert.equal(value(), 279.351);
	await act(async () => root.unmount());
});

test("typed latitude keeps its hemisphere and stops at 90°", async () => {
	const { root, spins, key, value } = await render("latitude", -10);
	for (const digit of "95") await key(spins()[0], digit);
	assert.equal(value(), -90);
	await act(async () => root.unmount());
});

test("scrolling over a segment steps it, up for north", async () => {
	const { root, spins, value } = await render("latitude", 10);
	const wheel = (target: HTMLElement, deltaY: number) =>
		act(async () => {
			target.dispatchEvent(
				new window.WheelEvent("wheel", { deltaY, bubbles: true, cancelable: true }),
			);
		});
	await wheel(spins()[0], -50);
	assert.equal(value(), 11);
	await wheel(spins()[1], 50);
	assert.equal(value(), 10.999);
	// A trackpad's small deltas add up to one step per notch.
	for (let n = 0; n < 9; n++) await wheel(spins()[0], -10);
	assert.equal(value(), 11.999);
	await act(async () => root.unmount());
});

test("reads decimal degrees, signed by hemisphere letters", () => {
	assert.deepEqual(
		parseCoordinates("39.48670519709631, -105.0273758299388"),
		[39.48670519709631, -105.0273758299388],
	);
	assert.deepEqual(parseCoordinates("89.45° S 222.3° E"), [-89.45, 222.3]);
	assert.deepEqual(parseCoordinates("12.5 N, 30 W"), [12.5, -30]);
	assert.deepEqual(parseCoordinates("no numbers"), []);
});

const pairs: [number, number][] = [];
let pastedLat = 0;
function PasteField() {
	const [v, setV] = useState(0);
	pastedLat = v;
	return (
		<CoordinateInput
			label="Latitude"
			kind="latitude"
			value={v}
			onChange={setV}
			onPair={(a, b) => pairs.push([a, b])}
		/>
	);
}

test("pasting a pair fills latitude and longitude; one number fills the field", async () => {
	const container = document.body.appendChild(document.createElement("div"));
	const root = createRoot(container);
	await act(async () => root.render(<PasteField />));
	const paste = (text: string) =>
		act(async () => {
			const event = new window.Event("paste", { bubbles: true, cancelable: true });
			Object.assign(event, { clipboardData: { getData: () => text } });
			container.querySelector('[role="spinbutton"]')?.dispatchEvent(event);
		});
	await paste("39.48670519709631, -105.0273758299388");
	assert.deepEqual(pairs, [[39.48670519709631, -105.0273758299388]]);
	await paste("-12.25");
	assert.equal(pastedLat, -12.25);
	await act(async () => root.unmount());
	container.remove();
});
