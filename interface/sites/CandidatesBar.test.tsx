import assert from "node:assert/strict";
import { test } from "node:test";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { CandidatesBar, CandidatesStrip, candidateLabel } from "./CandidatesBar.tsx";
import { removeCandidate, saveCandidate, savedCandidates } from "./store.ts";

test("candidate labels join body/site and window", () => {
	assert.equal(
		candidateLabel({ code: "KSC·TODAY", body: "399", site: "KSC", window: "TODAY" }),
		"399/KSC TODAY",
	);
	assert.equal(
		candidateLabel({ code: "KSC·JUN27", body: "399", site: "KSC", window: "JUN27" }),
		"399/KSC JUN27",
	);
});

test("candidates strip shows body/site over window, with a remove control", async () => {
	localStorage.removeItem("nanta.candidates");
	history.replaceState(null, "", "/399/sites/KSC?window=TODAY&az=40&el=25&d=12.5");
	const container = document.body.appendChild(document.createElement("div"));
	const root = createRoot(container);
	const items = [
		{ code: "KSC·TODAY", body: "399", site: "KSC", window: "TODAY" },
		{ code: "SCR·JUN27", body: "301", site: "SCR", window: "JUN27" },
	];
	let removed = "";
	await act(async () =>
		root.render(
			<CandidatesStrip
				items={items}
				current="SCR·JUN27"
				onRemove={(code) => {
					removed = code;
				}}
			/>,
		),
	);
	const links = [...container.querySelectorAll("a")];
	assert.equal(links.length, 2);
	assert.equal(links[0]?.textContent, "399/KSCTODAY");
	assert.equal(links[1]?.textContent, "301/SCRJUN27");
	assert.equal(links[1]?.getAttribute("aria-current"), "true");
	assert.equal(links[1]?.getAttribute("href"), "/301/sites/SCR?window=JUN27&az=40&el=25&d=12.5");
	const remove = container.querySelector<HTMLButtonElement>('[aria-label="Unpin 399/KSC TODAY"]');
	assert.ok(remove);
	assert.match(remove?.className ?? "", /\bmin-h-utility\b/);
	assert.match(remove?.className ?? "", /\bopacity-0\b/);
	assert.match(remove?.className ?? "", /\bgroup-hover:opacity-100\b/);
	saveCandidate(items[0]);
	await act(async () => remove?.click());
	assert.equal(removed, "KSC·TODAY");
	assert.equal(
		savedCandidates().some((candidate) => candidate.code === "KSC·TODAY"),
		false,
	);
	await act(async () => root.unmount());
	container.remove();
});

test("candidates bar stays hidden until something is saved", async () => {
	localStorage.removeItem("nanta.candidates");
	const container = document.body.appendChild(document.createElement("div"));
	const root = createRoot(container);
	await act(async () => root.render(<CandidatesBar />));
	assert.equal(container.querySelector("[aria-label=Candidates]"), null);
	saveCandidate({ code: "KSC·JUN27", body: "399", site: "KSC", window: "JUN27" });
	await act(async () => root.render(<CandidatesBar />));
	assert.ok(container.querySelector("[aria-label=Candidates]"));
	assert.equal(container.querySelector("a")?.textContent, "399/KSCJUN27");
	removeCandidate("KSC·JUN27");
	await act(async () => root.unmount());
	container.remove();
});
