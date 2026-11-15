import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Skeleton } from "./Skeleton.tsx";

let root: Root | undefined;
afterEach(() => act(() => root?.unmount()));

const render = async (element: React.ReactElement) => {
	const container = document.body.appendChild(document.createElement("div"));
	root = createRoot(container);
	await act(async () => root?.render(element));
	return container.firstElementChild as HTMLElement;
};

test("renders a hidden, shimmering placeholder of the given size", async () => {
	const node = await render(<Skeleton width="60%" height={44} />);
	assert.equal(node.getAttribute("aria-hidden"), "true");
	assert.equal(node.style.width, "60%");
	assert.equal(node.style.height, "44px");
	assert.match(node.className, /\bshimmer\b/);
});

test("turns the shimmer off", async () => {
	const node = await render(<Skeleton shimmer={false} />);
	assert.doesNotMatch(node.className, /\bshimmer\b/);
});
