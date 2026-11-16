import assert from "node:assert/strict";
import { test } from "node:test";
import routes, { now } from "./index.ts";

test("lists NOW, then the predefined window", async () => {
	const [, pattern, handler] = routes[0];
	const request = new Request("http://nanta.test/api/windows");
	const match = pattern.exec(request.url);
	assert.ok(match);
	const list = (await (await handler(request, match.pathname.groups)).json()) as { code: string }[];
	assert.deepEqual(
		list.map((w) => w.code),
		["NOW", "JUN27"],
	);
});

test("NOW is today, to the next day", () => {
	assert.deepEqual(now(Date.parse("2026-11-15T18:42:00Z")), {
		code: "NOW",
		label: "Now",
		from: "2026-11-15",
		to: "2026-11-16",
	});
});
