import assert from "node:assert/strict";
import { test } from "node:test";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { HorizonChart, summarize } from "./HorizonChart.tsx";

const track = (elevations: number[], azimuth: number) =>
	elevations.map((elevation, i) => ({
		time: new Date(Date.UTC(2027, 5, 1, i)).toISOString(),
		azimuth: azimuth + i * 10,
		elevation,
		range: 1,
	}));

test("draws a path and a pointer per condition, and picks a time", async () => {
	const container = document.body.appendChild(document.createElement("div"));
	const root = createRoot(container);
	const sky = { sun: track([-0.5, 0.2, 1], 0), earth: track([5, 5.2, 5.4], 130) };
	const picked: number[] = [];
	await act(async () =>
		root.render(
			<HorizonChart
				list={["sunlight", "earth_visibility"]}
				sky={sky}
				at={1}
				onPick={(at) => picked.push(at)}
			/>,
		),
	);
	assert.equal(container.querySelectorAll("path").length, 2);
	assert.equal(container.querySelectorAll("line").length, 2);
	assert.equal(
		summarize(["sunlight", "earth_visibility"], sky, 1),
		"Sun 0.2° above the horizon, bearing 10°. Earth 5.2° above, bearing 140°.",
	);
	const svg = container.querySelector("svg") as SVGSVGElement;
	svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: 220, height: 220 }) as DOMRect;
	await act(async () => {
		svg.dispatchEvent(
			new window.PointerEvent("pointerdown", { bubbles: true, clientX: 30, clientY: 80 }),
		);
	});
	assert.equal(picked.length, 1);
	await act(async () => root.unmount());
});
