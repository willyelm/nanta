import {
	Children,
	type CSSProperties,
	cloneElement,
	isValidElement,
	type ReactElement,
	type ReactNode,
	type ToggleEvent,
	useId,
} from "react";
import { useHydrated } from "system";
import { type Align, anchorStyle, type Placement, place, supportsAnchor } from "./position";

type Props = { style?: CSSProperties; onToggle?: (event: ToggleEvent<HTMLElement>) => void };

// A trigger and the overlay it opens, on the Popover API: the browser handles open and close,
// Escape, clicking outside, focus return, and the trigger's aria-expanded. The overlay keeps its
// own role (dialog, menu, listbox) from the markup you pass.
//
//   <Overlay placement="bottom" align="start">
//     <Button>Open</Button>
//     <div>…</div>
//   </Overlay>
export function Overlay({
	children,
	placement = "bottom",
	align = "start",
}: {
	children: ReactNode;
	placement?: Placement;
	align?: Align;
}) {
	// useId differs between the server tree (<html>) and the hydrated one (<body>), so the link
	// and the position are browser-only. Nothing opens before hydration anyway.
	const generated = useId();
	const id = useHydrated() ? generated : undefined;
	const anchor = `--${generated.replace(/[^\w-]/g, "")}`;
	const [trigger, overlay] = Children.toArray(children).filter(
		isValidElement,
	) as ReactElement<Props>[];
	if (!trigger || !overlay) throw new Error("Overlay takes a trigger and an overlay");

	// Without anchor positioning, place the overlay from both boxes each time it opens.
	const onToggle = (event: ToggleEvent<HTMLElement>) => {
		overlay.props.onToggle?.(event);
		if (event.newState !== "open" || supportsAnchor()) return;
		const element = event.currentTarget;
		const source = id && document.querySelector(`[popovertarget="${CSS.escape(id)}"]`);
		if (!source) return;
		const { top, left } = place(
			source.getBoundingClientRect(),
			element.getBoundingClientRect(),
			placement,
			align,
		);
		Object.assign(element.style, {
			position: "fixed",
			margin: "0",
			top: `${top}px`,
			left: `${left}px`,
		});
	};

	return (
		<>
			{cloneElement(trigger, {
				popoverTarget: id,
				style: id ? { ...trigger.props.style, anchorName: anchor } : trigger.props.style,
			} as Props)}
			{cloneElement(overlay, {
				id,
				popover: "auto",
				style: id
					? { ...anchorStyle(anchor, placement, align), ...overlay.props.style }
					: overlay.props.style,
				onToggle,
			} as Props)}
		</>
	);
}
