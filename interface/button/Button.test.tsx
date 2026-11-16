import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Button } from "./Button.tsx";

const roots: Root[] = [];

async function render(element: ReactNode) {
	const container = document.body.appendChild(document.createElement("div"));
	const root = createRoot(container);
	roots.push(root);
	await act(async () => root.render(element));
	return container.querySelector("button") as HTMLButtonElement;
}

afterEach(() => {
	act(() => {
		for (const root of roots.splice(0)) root.unmount();
	});
	document.body.replaceChildren();
});

test("is a plain button by default, so it never submits a form", async () => {
	const button = await render(<Button>Save</Button>);
	assert.equal(button.type, "button");
	assert.equal(button.textContent, "Save");
});

test("keeps an explicit type", async () => {
	const button = await render(<Button type="submit">Send</Button>);
	assert.equal(button.type, "submit");
});

test("adds a className after its own classes", async () => {
	const own = (await render(<Button />)).className;
	assert.match(own, /\bborder-control\b/);
	assert.equal((await render(<Button className="wide" />)).className, `${own} wide`);
});

test("passes other props and events through", async () => {
	let clicks = 0;
	const button = await render(
		<Button aria-pressed onClick={() => clicks++}>
			Dark
		</Button>,
	);
	await act(async () => button.click());
	assert.equal(button.getAttribute("aria-pressed"), "true");
	assert.equal(clicks, 1);
});

test("as a link, renders an anchor that looks like the button", async () => {
	const container = document.body.appendChild(document.createElement("div"));
	const root = createRoot(container);
	roots.push(root);
	await act(async () =>
		root.render(
			<Button as="a" href="/301/sites" aria-label="Sites">
				+
			</Button>,
		),
	);
	const link = container.querySelector("a") as HTMLAnchorElement;
	assert.equal(link.getAttribute("href"), "/301/sites");
	assert.equal(container.querySelector("button"), null);
	assert.match(link.className, /\bborder-control\b/);
});
