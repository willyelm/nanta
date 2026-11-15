import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Overlay } from "./Overlay.tsx";

let root: Root | undefined;
afterEach(() => act(() => root?.unmount()));

test("wires the trigger to a popover overlay", async () => {
	const container = document.body.appendChild(document.createElement("div"));
	root = createRoot(container);
	await act(async () =>
		root?.render(
			<Overlay>
				<button type="button">Open</button>
				<div role="dialog">Content</div>
			</Overlay>,
		),
	);
	const button = container.querySelector("button");
	const panel = container.querySelector("[role=dialog]");
	assert.ok(button && panel);
	assert.equal(panel.getAttribute("popover"), "auto");
	assert.equal(button.getAttribute("popovertarget"), panel.id);
	assert.ok(panel.id);
});
