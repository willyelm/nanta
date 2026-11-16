import assert from "node:assert/strict";
import { test } from "node:test";
import { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { Toggle, ToggleGroup } from "./Toggle.tsx";

function Single() {
	const [value, setValue] = useState("a");
	return (
		<ToggleGroup label="Pick" value={value} onChange={(next) => setValue(next as string)}>
			<Toggle value="a">A</Toggle>
			<Toggle value="b">B</Toggle>
		</ToggleGroup>
	);
}

function Many() {
	const [value, setValue] = useState<string[]>(["a"]);
	return (
		<ToggleGroup
			multiple
			label="Pick"
			value={value}
			onChange={(next) => setValue(next as string[])}
		>
			<Toggle value="a">A</Toggle>
			<Toggle value="b">B</Toggle>
		</ToggleGroup>
	);
}

test("single: radios, one on at a time", async () => {
	const container = document.body.appendChild(document.createElement("div"));
	const root = createRoot(container);
	await act(async () => root.render(<Single />));
	const inputs = container.querySelectorAll("input");
	assert.equal(inputs.length, 2);
	assert.equal(inputs[0].type, "radio");
	assert.equal(inputs[0].checked, true);
	assert.equal(inputs[1].checked, false);
	await act(async () => {
		inputs[1].click();
	});
	assert.equal(inputs[0].checked, false);
	assert.equal(inputs[1].checked, true);
	await act(async () => root.unmount());
});

test("multiple: checkboxes, any set", async () => {
	const container = document.body.appendChild(document.createElement("div"));
	const root = createRoot(container);
	await act(async () => root.render(<Many />));
	const inputs = container.querySelectorAll("input");
	assert.equal(inputs[0].type, "checkbox");
	assert.equal(inputs[0].checked, true);
	assert.equal(inputs[1].checked, false);
	await act(async () => {
		inputs[1].click();
	});
	assert.equal(inputs[0].checked, true);
	assert.equal(inputs[1].checked, true);
	await act(async () => {
		inputs[0].click();
	});
	assert.equal(inputs[0].checked, false);
	assert.equal(inputs[1].checked, true);
	await act(async () => root.unmount());
});
