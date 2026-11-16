import assert from "node:assert/strict";
import { test } from "node:test";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { setDensity } from "./density.ts";
import { setScheme } from "./index.ts";
import { SchemeSwitch } from "./switch.tsx";

test("checks the current scheme and switches from the menu", async () => {
	setScheme("auto");
	setDensity("regular");
	const container = document.body.appendChild(document.createElement("div"));
	const root = createRoot(container);
	await act(async () => root.render(<SchemeSwitch />));
	const trigger = () => container.querySelector("[aria-haspopup=menu]");
	const checked = () =>
		[...container.querySelectorAll("[aria-checked=true]")].map((node) => node.textContent);
	assert.deepEqual(checked(), ["System", "Regular"]);
	assert.equal(trigger()?.textContent, "S/R");
	assert.match(container.querySelector("[role=menu]")?.textContent ?? "", /Schemes/);
	assert.match(container.querySelector("[role=menu]")?.textContent ?? "", /Density/);
	const schemes = [...container.querySelectorAll<HTMLElement>("[role=menuitemradio]")]
		.map((item) => item.textContent)
		.slice(0, 3);
	assert.deepEqual(schemes, ["Light", "Dark", "System"]);
	const dark = [...container.querySelectorAll<HTMLElement>("[role=menuitemradio]")].find(
		(item) => item.textContent === "Dark",
	);
	await act(async () => dark?.click());
	assert.ok(checked().includes("Dark"));
	assert.equal(trigger()?.textContent, "D/R");
	assert.equal(trigger()?.getAttribute("aria-label"), "Appearance: D/R");
	const compact = [...container.querySelectorAll<HTMLElement>("[role=menuitemradio]")].find(
		(item) => item.textContent === "Compact",
	);
	await act(async () => compact?.click());
	assert.ok(checked().includes("Compact"));
	assert.equal(document.documentElement.dataset.density, "compact");
	assert.equal(trigger()?.textContent, "D/C");
	assert.equal(trigger()?.getAttribute("aria-label"), "Appearance: D/C");
	await act(async () => root.unmount());
	container.remove();
});
