import assert from "node:assert/strict";
import { test } from "node:test";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { SchemeSwitch } from "./switch.tsx";

test("checks the current scheme and switches from the menu", async () => {
	const container = document.body.appendChild(document.createElement("div"));
	const root = createRoot(container);
	await act(async () => root.render(<SchemeSwitch />));
	const trigger = () => container.querySelector("[aria-haspopup=menu]");
	const checked = () => container.querySelector("[aria-checked=true]")?.textContent;
	assert.equal(checked(), "Auto");
	const dark = [...container.querySelectorAll<HTMLElement>("[role=menuitemradio]")].find(
		(item) => item.textContent === "Dark",
	);
	await act(async () => dark?.click());
	assert.equal(checked(), "Dark");
	assert.equal(trigger()?.getAttribute("aria-label"), "Color scheme: Dark");
	await act(async () => root.unmount());
});
