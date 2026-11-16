import assert from "node:assert/strict";
import { test } from "node:test";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { PinCandidate } from "./ConditionsPanel.tsx";
import { saveCandidate } from "./store.ts";

test("compare button follows the current site, not a stuck prior link", async () => {
	localStorage.removeItem("nanta.candidates");
	saveCandidate({ code: "KSC·JUN27", body: "399", site: "KSC", window: "JUN27" });
	const container = document.body.appendChild(document.createElement("div"));
	const root = createRoot(container);
	await act(async () => root.render(<PinCandidate code="399" site="KSC" window="JUN27" />));
	assert.equal(container.querySelector("button")?.getAttribute("aria-pressed"), "true");
	assert.match(container.querySelector("button")?.getAttribute("aria-label") ?? "", /Unpin/);
	await act(async () => root.render(<PinCandidate code="399" site="SCR" window="JUN27" />));
	assert.equal(container.querySelector("button")?.getAttribute("aria-pressed"), "false");
	assert.match(container.querySelector("button")?.getAttribute("aria-label") ?? "", /Pin /);
	await act(async () => root.unmount());
	container.remove();
});
