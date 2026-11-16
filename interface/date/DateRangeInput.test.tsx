import assert from "node:assert/strict";
import { test } from "node:test";
import { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { DateRangeInput } from "./DateRangeInput.tsx";

function Range({ from = "", to = "" }: { from?: string; to?: string }) {
	const [start, setStart] = useState(from);
	const [end, setEnd] = useState(to);
	return (
		<DateRangeInput
			label="Window"
			start={start}
			end={end}
			onStartChange={setStart}
			onEndChange={setEnd}
		/>
	);
}

async function render(element: React.ReactElement) {
	const container = document.body.appendChild(document.createElement("div"));
	const root = createRoot(container);
	await act(async () => root.render(element));
	const spins = () => [...container.querySelectorAll<HTMLElement>('[role="spinbutton"]')];
	const key = (target: HTMLElement, key: string) =>
		act(async () => {
			target.dispatchEvent(new window.KeyboardEvent("keydown", { key, bubbles: true }));
		});
	return { root, spins, key };
}

test("up on an empty year fills in this year, without stepping", async () => {
	const { root, spins, key } = await render(<Range />);
	await key(spins()[0], "ArrowUp");
	assert.equal(spins()[0].textContent, String(new Date().getUTCFullYear()));
	await act(async () => root.unmount());
});

test("right from the start's day moves to the end's year, left comes back", async () => {
	const { root, spins, key } = await render(<Range from="2027-06-01" to="2027-06-03" />);
	spins()[2].focus();
	await key(spins()[2], "ArrowRight");
	assert.equal(document.activeElement, spins()[3]);
	await key(spins()[3], "ArrowLeft");
	assert.equal(document.activeElement, spins()[2]);
	await act(async () => root.unmount());
});

test("keeps the day real for its month", async () => {
	const { root, spins, key } = await render(<Range from="2027-01-31" to="2027-02-01" />);
	await key(spins()[1], "ArrowUp");
	assert.equal(spins()[1].textContent, "02");
	assert.equal(spins()[2].textContent, "28");
	await act(async () => root.unmount());
});
