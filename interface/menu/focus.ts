// The enabled items of a menu, and moving focus among them.
export const items = (menu: Element) =>
	[...menu.querySelectorAll<HTMLElement>('[role^="menuitem"]')].filter(
		(item) => item.getAttribute("aria-disabled") !== "true",
	);

export function focusItem(menu: Element, which: "first" | "last" | number) {
	const list = items(menu);
	if (list.length === 0) return;
	const index =
		which === "first"
			? 0
			: which === "last"
				? list.length - 1
				: (which + list.length) % list.length;
	list[index].focus();
}
