import assert from "node:assert/strict";
import { test } from "node:test";
import routes from "./index.ts";

// Runs the matching route's handler directly, without installing a global router.
async function fetchJson(path: string) {
	const request = new Request(`http://nanta.test${path}`);
	for (const [method, pattern, handler] of routes) {
		const match = method === "GET" && pattern.exec(request.url);
		if (match) return handler(request, match.pathname.groups);
	}
	throw new Error(`no route for ${path}`);
}

test("lists the bodies", async () => {
	const response = await fetchJson("/api/bodies");
	assert.equal(response.status, 200);
	const list = (await response.json()) as { code: string }[];
	assert.deepEqual(
		list.map((b) => b.code),
		["301", "499", "399"],
	);
});

test("finds one body by code, or 404", async () => {
	const moon = (await (await fetchJson("/api/bodies/301")).json()) as { name: string };
	assert.equal(moon.name, "Moon");
	assert.equal((await fetchJson("/api/bodies/999")).status, 404);
});
