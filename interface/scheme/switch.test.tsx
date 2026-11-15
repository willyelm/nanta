import assert from "node:assert/strict";
import { test } from "node:test";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { SchemeSwitch } from "./switch.tsx";

test("marks the pressed choice", async () => {
	const root = createRoot(document.body.appendChild(document.createElement("div")));
	await act(async () => root.render(<SchemeSwitch />));
	const pressed = () => document.querySelector("[aria-pressed=true]")?.textContent;
	assert.equal(pressed(), "Auto");
	const dark = [...document.querySelectorAll("button")].find((b) => b.textContent === "Dark");
	await act(async () => dark?.click());
	assert.equal(pressed(), "Dark");
	act(() => root.unmount());
});
