import { place } from "interface/overlay/position";
import {
	cloneElement,
	type FocusEvent,
	type KeyboardEvent,
	type PointerEvent,
	type ReactElement,
	useRef,
} from "react";

type Trigger = {
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
export function Tooltip({ label, children }: { label: string; children: ReactElement<Trigger> }) {
	const tip = useRef<HTMLSpanElement>(null);
	const props = children.props;

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
					if (event.key === "Escape") hide();
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
