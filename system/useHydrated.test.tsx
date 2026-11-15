import assert from "node:assert/strict";
import { test } from "node:test";
import { act } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { useHydrated } from "./useHydrated.ts";

function Probe() {
	return <p>{useHydrated() ? "browser" : "server"}</p>;
}

test("is false on the server and while hydrating, true after", async () => {
	const container = document.body.appendChild(document.createElement("div"));
	container.innerHTML = renderToString(<Probe />);
	assert.equal(container.textContent, "server");
	const errors: unknown[] = [];
	const root = await act(async () =>
		hydrateRoot(container, <Probe />, { onRecoverableError: (error) => errors.push(error) }),
	);
	assert.equal(container.textContent, "browser");
	assert.deepEqual(errors, []);
	await act(async () => root.unmount());
});
