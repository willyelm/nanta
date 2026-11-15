import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Menu, MenuItem, MenuTrigger } from "./index.tsx";

let root: Root;
let ran: string[];

beforeEach(async () => {
	ran = [];
	root = createRoot(document.body.appendChild(document.createElement("div")));
	await act(async () =>
		root.render(
			<MenuTrigger>
				<button type="button">Edit</button>
				<Menu label="Edit">
					<MenuItem onAction={() => ran.push("copy")}>Copy</MenuItem>
					<MenuItem onAction={() => ran.push("cut")}>Cut</MenuItem>
					<MenuItem disabled onAction={() => ran.push("delete")}>
						Delete
					</MenuItem>
					<MenuItem onAction={() => ran.push("paste")}>Paste</MenuItem>
				</Menu>
			</MenuTrigger>,
		),
	);
});

afterEach(() => act(() => root.unmount()));

const trigger = () => document.querySelector("button") as HTMLButtonElement;
const focused = () => document.activeElement?.textContent;
const item = (name: string) =>
	[...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find(
		(node) => node.textContent === name,
	) as HTMLElement;

async function press(key: string, target = document.activeElement as HTMLElement) {
	await act(async () => {
		target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
	});
}

test("the trigger is a menu button for a labelled menu", () => {
	const menu = document.querySelector('[role="menu"]') as HTMLElement;
	assert.equal(trigger().getAttribute("aria-haspopup"), "menu");
	assert.equal(trigger().getAttribute("popovertarget"), menu.id);
	assert.equal(menu.getAttribute("aria-label"), "Edit");
	assert.equal(item("Copy").tabIndex, -1);
});

test("Down and Up on the trigger open on the first and last item", async () => {
	await press("ArrowDown", trigger());
	assert.equal(focused(), "Copy");
	await press("ArrowUp", trigger());
	assert.equal(focused(), "Paste");
});

test("arrows wrap, Home and End jump, and disabled items are skipped", async () => {
	await press("ArrowDown", trigger());
	await press("ArrowDown");
	assert.equal(focused(), "Cut");
	await press("ArrowDown");
	assert.equal(focused(), "Paste");
	await press("ArrowDown");
	assert.equal(focused(), "Copy");
	await press("ArrowUp");
	assert.equal(focused(), "Paste");
	await press("Home");
	assert.equal(focused(), "Copy");
	await press("End");
	assert.equal(focused(), "Paste");
});

test("a character jumps to the next item that starts with it", async () => {
	await press("ArrowDown", trigger());
	await press("p");
	assert.equal(focused(), "Paste");
	await press("c");
	assert.equal(focused(), "Copy");
	await press("c");
	assert.equal(focused(), "Cut");
});

test("Enter, Space, and click run the item; disabled items don't", async () => {
	await press("ArrowDown", trigger());
	await press("Enter");
	await press(" ", item("Cut"));
	await act(async () => item("Paste").click());
	await act(async () => item("Delete").click());
	assert.deepEqual(ran, ["copy", "cut", "paste"]);
});

test("opening any other way, like a click, focuses the first item", async () => {
	const menu = document.querySelector<HTMLElement>('[role="menu"]');
	await act(async () => menu?.showPopover());
	assert.equal(focused(), "Copy");
});

test("Tab closes the menu", async () => {
	const menu = document.querySelector<HTMLElement>('[role="menu"]');
	await press("ArrowDown", trigger());
	assert.equal(menu?.style.display, "block");
	await press("Tab");
	assert.equal(menu?.style.display, "");
});
