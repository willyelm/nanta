import type { CSSProperties } from "react";

// Where the overlay sits beside its trigger, and how it lines up along that side.
export type Placement = "top" | "bottom" | "left" | "right";
export type Align = "start" | "center" | "end";

const sides: Record<Placement, string> = {
	top: "block-start",
	bottom: "block-end",
	left: "inline-start",
	right: "inline-end",
};

// Spanning toward the far end lines the overlay up with the trigger's near edge.
const spans: Record<Align, (axis: string) => string> = {
	start: (axis) => ` span-${axis}-end`,
	center: () => "",
	end: (axis) => ` span-${axis}-start`,
};

// CSS anchor positioning: the browser places the overlay and flips it when it would overflow.
export function anchorStyle(anchor: string, placement: Placement, align: Align): CSSProperties {
	const vertical = placement === "top" || placement === "bottom";
	return {
		positionAnchor: anchor,
		positionArea: sides[placement] + spans[align](vertical ? "inline" : "block"),
		positionTryFallbacks: vertical ? "flip-block" : "flip-inline",
		inset: "auto",
		margin: "var(--spacing-xs)",
	};
}

export const supportsAnchor = () =>
	typeof CSS !== "undefined" && CSS.supports("position-area", "block-end");

type Box = { top: number; left: number; width: number; height: number };

// The fallback without anchor positioning: fixed coordinates from both boxes, flipped to the
// other side when it doesn't fit, then kept inside the viewport.
export function place(
	trigger: Box,
	overlay: Box,
	placement: Placement,
	align: Align,
	viewport = { width: innerWidth, height: innerHeight },
	gap = 4,
): { top: number; left: number } {
	const line = (start: number, size: number, length: number) =>
		align === "start"
			? start
			: align === "end"
				? start + size - length
				: start + (size - length) / 2;
	const clamp = (value: number, length: number, room: number) =>
		Math.max(0, Math.min(value, room - length));

	if (placement === "top" || placement === "bottom") {
		const below = trigger.top + trigger.height + gap;
		const above = trigger.top - overlay.height - gap;
		const fitsBelow = below + overlay.height <= viewport.height;
		const top =
			placement === "bottom"
				? fitsBelow || above < 0
					? below
					: above
				: above < 0 && fitsBelow
					? below
					: above;
		const left = line(trigger.left, trigger.width, overlay.width);
		return { top, left: clamp(left, overlay.width, viewport.width) };
	}
	const after = trigger.left + trigger.width + gap;
	const before = trigger.left - overlay.width - gap;
	const fitsAfter = after + overlay.width <= viewport.width;
	const left =
		placement === "right"
			? fitsAfter || before < 0
				? after
				: before
			: before < 0 && fitsAfter
				? after
				: before;
	const top = line(trigger.top, trigger.height, overlay.height);
	return { top: clamp(top, overlay.height, viewport.height), left };
}
