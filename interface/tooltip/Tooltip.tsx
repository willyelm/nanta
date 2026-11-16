import { place } from "interface/overlay/position";
import {
	cloneElement,
	type FocusEvent,
	type KeyboardEvent,
	type PointerEvent,
	type ReactElement,
	type ReactNode,
	useRef,
} from "react";

type Trigger = {
	onPointerDown?: (event: PointerEvent<HTMLElement>) => void;
	onPointerEnter?: (event: PointerEvent<HTMLElement>) => void;
	onPointerLeave?: (event: PointerEvent<HTMLElement>) => void;
	onFocus?: (event: FocusEvent<HTMLElement>) => void;
	onBlur?: (event: FocusEvent<HTMLElement>) => void;
	onKeyDown?: (event: KeyboardEvent<HTMLElement>) => void;
};

// A label for an icon-only control, shown on hover and on keyboard focus, hidden on leave, blur,
// or Escape (WCAG 1.4.13). It sits in the top layer (popover="manual"), so no panel's scroll or
// overflow clips it, placed under its control. The control keeps its own aria-label; the tooltip
// repeats it for the eye only, so it's hidden from screen readers.
//
//   <Tooltip label="Add a site"><Button as="a" aria-label="Add a site">…</Button></Tooltip>
//
// Props a wrapper adds to the Tooltip (a MenuTrigger's popoverTarget, aria-haspopup, onKeyDown)
// pass on to the control, so a Tooltip can sit inside one. Pressing, or a key that opens a menu,
// hides the label so it never covers what opens below.
const OPENS = new Set(["Escape", "Enter", " ", "ArrowDown", "ArrowUp"]);

export function Tooltip({
	label,
	children,
	...passed
}: {
	label: ReactNode;
	children: ReactElement<Trigger>;
} & Trigger &
	Record<string, unknown>) {
	const tip = useRef<HTMLSpanElement>(null);
	const own = children.props;
	// Both the control's handlers and any the wrapper passed run.
	const props: Trigger = Object.fromEntries(
		(
			[
				"onPointerDown",
				"onPointerEnter",
				"onPointerLeave",
				"onFocus",
				"onBlur",
				"onKeyDown",
			] as const
		).map((name) => [
			name,
			(event: never) => {
				(own[name] as ((e: never) => void) | undefined)?.(event);
				(passed[name] as ((e: never) => void) | undefined)?.(event);
			},
		]),
	);

	const show = (target: HTMLElement) => {
		const element = tip.current;
		if (!element) return;
		element.showPopover?.();
		const { top, left } = place(
			target.getBoundingClientRect(),
			element.getBoundingClientRect(),
			"bottom",
			"center",
		);
		Object.assign(element.style, { top: `${top}px`, left: `${left}px` });
	};
	const hide = () => tip.current?.hidePopover?.();

	return (
		<>
			{cloneElement(children, {
				...passed,
				style: { ...(own as { style?: object }).style, ...(passed.style as object | undefined) },
				onPointerDown: (event: PointerEvent<HTMLElement>) => {
					props.onPointerDown?.(event);
					hide();
				},
				onPointerEnter: (event: PointerEvent<HTMLElement>) => {
					props.onPointerEnter?.(event);
					show(event.currentTarget);
				},
				onPointerLeave: (event: PointerEvent<HTMLElement>) => {
					props.onPointerLeave?.(event);
					hide();
				},
				onFocus: (event: FocusEvent<HTMLElement>) => {
					props.onFocus?.(event);
					if (event.currentTarget.matches(":focus-visible")) show(event.currentTarget);
				},
				onBlur: (event: FocusEvent<HTMLElement>) => {
					props.onBlur?.(event);
					hide();
				},
				onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
					props.onKeyDown?.(event);
					if (OPENS.has(event.key)) hide();
				},
			} as Trigger)}
			<span
				ref={tip}
				popover="manual"
				aria-hidden="true"
				className="fixed m-0 inset-auto px-sm py-xs text-caption text-default bg-neutral border border-divider pointer-events-none whitespace-nowrap"
			>
				{label}
			</span>
		</>
	);
}
