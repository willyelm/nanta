import assert from "node:assert/strict";
import { test } from "node:test";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { Tooltip } from "./Tooltip.tsx";

test("shows on pointer enter, hides on leave and Escape, and stays out of the accessible name", async () => {
	const container = document.body.appendChild(document.createElement("div"));
	const root = createRoot(container);
	await act(async () =>
		root.render(
			<Tooltip label="Add a site">
				<button type="button" aria-label="Add a site">
					+
				</button>
			</Tooltip>,
		),
	);
	const button = container.querySelector("button") as HTMLButtonElement;
	const tip = container.querySelector("[popover]") as HTMLElement;
	assert.equal(tip.getAttribute("aria-hidden"), "true");
	assert.equal(tip.textContent, "Add a site");

	await act(async () =>
		button.dispatchEvent(new window.PointerEvent("pointerover", { bubbles: true })),
	);
	assert.equal(tip.style.display, "block");
	await act(async () =>
		button.dispatchEvent(new window.PointerEvent("pointerout", { bubbles: true })),
	);
	assert.equal(tip.style.display, "");

	await act(async () =>
		button.dispatchEvent(new window.PointerEvent("pointerover", { bubbles: true })),
	);
	await act(async () =>
		button.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true })),
	);
	assert.equal(tip.style.display, "");
	await act(async () => root.unmount());
});
