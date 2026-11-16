import assert from "node:assert/strict";
import { test } from "node:test";
import { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { Slider } from "./Slider.tsx";

function Harness({
	onChangeStart,
	onChangeEnd,
}: {
	onChangeStart?: () => void;
	onChangeEnd?: () => void;
}) {
	const [value, setValue] = useState(2);
	return (
		<Slider
			id="test-time"
			label="Time"
			min={0}
			max={10}
			value={value}
			valueText={`hour ${value}`}
			onChange={setValue}
			onChangeStart={onChangeStart}
			onChangeEnd={onChangeEnd}
		/>
	);
}

async function render(element: React.ReactElement) {
	const container = document.body.appendChild(document.createElement("div"));
	const root = createRoot(container);
	await act(async () => root.render(element));
	const slider = () => {
		const node = container.querySelector<HTMLElement>('[role="slider"]');
		assert.ok(node);
		return node;
	};
	const key = (key: string) =>
		act(async () => {
			const node = slider();
			node.focus();
			node.dispatchEvent(new window.KeyboardEvent("keydown", { key, bubbles: true }));
		});
	return {
		root,
		container,
		slider,
		key,
		async unmount() {
			await act(async () => root.unmount());
			container.remove();
		},
	};
}

test("exposes APG slider semantics on the thumb", async () => {
	const { slider, container, unmount } = await render(<Harness />);
	const node = slider();
	assert.equal(node.tabIndex, 0);
	assert.equal(node.getAttribute("aria-valuemin"), "0");
	assert.equal(node.getAttribute("aria-valuemax"), "10");
	assert.equal(node.getAttribute("aria-valuenow"), "2");
	assert.equal(node.getAttribute("aria-valuetext"), "hour 2");
	assert.equal(node.getAttribute("aria-orientation"), "horizontal");
	assert.equal(container.querySelectorAll('[role="slider"]').length, 1);
	await unmount();
});

test("arrows, Home, and End move the value while focused", async () => {
	const { slider, key, unmount } = await render(<Harness />);
	await key("ArrowRight");
	assert.equal(slider().getAttribute("aria-valuenow"), "3");
	await key("ArrowLeft");
	assert.equal(slider().getAttribute("aria-valuenow"), "2");
	await key("Home");
	assert.equal(slider().getAttribute("aria-valuenow"), "0");
	await key("End");
	assert.equal(slider().getAttribute("aria-valuenow"), "10");
	await unmount();
});

test("keys start a change session once; blur ends it so arrows keep working", async () => {
	const starts: number[] = [];
	const ends: number[] = [];
	const { slider, key, unmount } = await render(
		<Harness onChangeStart={() => starts.push(1)} onChangeEnd={() => ends.push(1)} />,
	);
	await key("ArrowRight");
	await key("ArrowRight");
	await key("ArrowRight");
	assert.equal(slider().getAttribute("aria-valuenow"), "5");
	assert.deepEqual(starts, [1]);
	assert.deepEqual(ends, []);
	await act(async () => {
		slider().blur();
	});
	assert.deepEqual(ends, [1]);
	await unmount();
});
