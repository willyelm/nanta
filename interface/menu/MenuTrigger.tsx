import { type Align, Overlay, type Placement } from "interface/overlay";
import {
	Children,
	cloneElement,
	isValidElement,
	type KeyboardEvent,
	type ReactElement,
	type ReactNode,
} from "react";
import { focusItem } from "./focus";

type TriggerProps = { onKeyDown?: (event: KeyboardEvent<HTMLElement>) => void };

// A menu button (APG): the trigger opens its Menu. Enter, Space, and Down open on the first
// item; Up opens on the last. Opening by click also focuses the first item.
export function MenuTrigger({
	children,
	placement = "bottom",
	align = "start",
}: {
	children: ReactNode;
	placement?: Placement;
	align?: Align;
}) {
	const [trigger, menu] = Children.toArray(children).filter(
		isValidElement,
	) as ReactElement<TriggerProps>[];
	if (!trigger || !menu) throw new Error("MenuTrigger takes a trigger and a Menu");

	const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
		trigger.props.onKeyDown?.(event);
		const which = { ArrowDown: "first", ArrowUp: "last" }[event.key] as "first" | "last";
		if (!which) return;
		const target = document.getElementById(event.currentTarget.getAttribute("popovertarget") ?? "");
		if (!target) return;
		event.preventDefault();
		target.showPopover?.();
		focusItem(target, which);
	};

	return (
		<Overlay placement={placement} align={align}>
			{cloneElement(trigger, { "aria-haspopup": "menu", onKeyDown } as TriggerProps)}
			{menu}
		</Overlay>
	);
}
