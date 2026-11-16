import assert from "node:assert/strict";
import { test } from "node:test";
import { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { DateRangeInput, parseDates } from "./DateRangeInput.tsx";

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

test("a finished start sets the end to start plus 31 days", async () => {
	const { root, spins, key } = await render(<Range from="2027-06-01" to="2027-06-03" />);
	await key(spins()[2], "ArrowUp");
	assert.equal(spins()[2].textContent, "02");
	assert.equal(spins()[3].textContent, "2027");
	assert.equal(spins()[4].textContent, "07");
	assert.equal(spins()[5].textContent, "03");
	await act(async () => root.unmount());
});

test("the end cannot step past start plus 31 days", async () => {
	const { root, spins, key } = await render(<Range from="2027-06-01" to="2027-07-02" />);
	await key(spins()[5], "ArrowUp");
	assert.equal(spins()[3].textContent, "2027");
	assert.equal(spins()[4].textContent, "07");
	assert.equal(spins()[5].textContent, "02");
	await act(async () => root.unmount());
});

test("the end cannot step before start plus 1 day", async () => {
	const { root, spins, key } = await render(<Range from="2027-06-01" to="2027-06-02" />);
	await key(spins()[5], "ArrowDown");
	assert.equal(spins()[3].textContent, "2027");
	assert.equal(spins()[4].textContent, "06");
	assert.equal(spins()[5].textContent, "02");
	await act(async () => root.unmount());
});

test("reads ISO dates from pasted text", () => {
	assert.deepEqual(parseDates("2026-11-16 to 2026/12/1"), ["2026-11-16", "2026-12-01"]);
	assert.deepEqual(parseDates("no dates"), []);
});

const pasteInto = (target: HTMLElement, text: string) =>
	act(async () => {
		const event = new window.Event("paste", { bubbles: true, cancelable: true });
		Object.assign(event, { clipboardData: { getData: () => text } });
		target.dispatchEvent(event);
	});
const shown = (spins: HTMLElement[]) => spins.map((spin) => spin.textContent).join(" ");

test("pasting two dates fills the window, the end kept within 31 days", async () => {
	const { root, spins } = await render(<Range />);
	await pasteInto(spins()[0], "2026-11-16, 2026-11-20");
	assert.equal(shown(spins()), "2026 11 16 2026 11 20");
	await pasteInto(spins()[0], "2026-11-16 2027-03-01");
	assert.equal(shown(spins()), "2026 11 16 2026 12 17");
	await act(async () => root.unmount());
});

test("pasting one date fills only that date", async () => {
	const { root, spins } = await render(<Range from="2026-11-16" to="2026-11-20" />);
	await pasteInto(spins()[3], "2026-11-25");
	assert.equal(shown(spins()), "2026 11 16 2026 11 25");
	await act(async () => root.unmount());
});
