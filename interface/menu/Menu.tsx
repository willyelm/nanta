import type { HTMLAttributes, KeyboardEvent, ToggleEvent } from "react";
import { classNames } from "system";
import { focusItem, items } from "./focus";

// role="menu" (APG): Up and Down move with wrap, Home and End jump, a character jumps to the next
// item that starts with it, Tab closes and moves on. Escape closes and returns focus to the
// trigger, by the popover. MenuTrigger makes it the popover; it focuses an item when it opens.
export function Menu({
	label,
	className,
	onKeyDown,
	onToggle,
	...props
}: { label: string } & HTMLAttributes<HTMLDivElement>) {
	const keyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		onKeyDown?.(event);
		const menu = event.currentTarget;
		const list = items(menu);
		const index = list.indexOf(document.activeElement as HTMLElement);
		const move = (which: "first" | "last" | number) => {
			event.preventDefault();
			focusItem(menu, which);
		};
		if (event.key === "ArrowDown") move(index + 1);
		else if (event.key === "ArrowUp") move(index < 0 ? "last" : index - 1);
		else if (event.key === "Home") move("first");
		else if (event.key === "End") move("last");
		else if (event.key === "Tab") menu.hidePopover?.();
		else if (event.key.length === 1 && /\S/.test(event.key) && !event.metaKey && !event.ctrlKey) {
			const key = event.key.toLowerCase();
			const after = [...list.slice(index + 1), ...list.slice(0, index + 1)];
			const next = after.find((item) => item.textContent?.trim().toLowerCase().startsWith(key));
			if (next) move(list.indexOf(next));
		}
	};

	const toggle = (event: ToggleEvent<HTMLDivElement>) => {
		onToggle?.(event);
		const menu = event.currentTarget;
		if (event.newState === "open" && !menu.contains(document.activeElement))
			focusItem(menu, "first");
	};

	return (
		<div
			{...props}
			role="menu"
			aria-label={label}
			onKeyDown={keyDown}
			onToggle={toggle}
			className={classNames(
				"hidden open:flex flex-col min-w-[12rem] p-xs bg-neutral text-default border border-divider",
				className,
			)}
		/>
	);
}
