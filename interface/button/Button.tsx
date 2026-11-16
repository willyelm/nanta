import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from "react";
import { classNames } from "system";

// accent: the action a panel leads to, filled with the text color and lettered in the page color,
// so it holds the same contrast. Cochineal is only ever a ring, so the focus ring shows on it.
// compact: 24px (utility), the WCAG 2.5.8 minimum; default control stays the 44px target.
// neutral: the panel's see-through fill and blur, so a button over the scene reads like a panel.
type Variant = { variant?: "neutral" | "accent"; size?: "compact" };
type Props =
	| ({ as?: "button" } & Variant & ButtonHTMLAttributes<HTMLButtonElement>)
	| ({ as: "a" } & Variant & AnchorHTMLAttributes<HTMLAnchorElement>);

const look = (
	variant: Variant["variant"],
	size: Variant["size"],
	className?: string,
	extra?: string,
) =>
	classNames(
		"font-mono text-body leading-standard no-underline",
		"inline-flex items-center justify-center gap-xs",
		"border",
		variant === "accent"
			? "bg-accent text-onAccent border-transparent pressed:bg-accent/70"
			: "bg-neutral/80 backdrop-blur-panel text-default border-control pressed:bg-neutralActive/80",
		size === "compact"
			? "min-h-utility min-w-utility p-0"
			: "min-h-control min-w-control py-sm px-md",
		"cursor-pointer",
		extra,
		className,
	);

// A button, or with as="a" a link that looks like one: an action that goes somewhere stays a
// link, so the router navigates it on the client and the browser can open it in a new tab.
export function Button(props: Props) {
	if (props.as === "a") {
		const { as: _, variant, size, className, ...rest } = props;
		const hover = variant === "accent" ? "hover:bg-accent/85" : "hover:bg-neutralHover/80";
		return <a {...rest} className={look(variant, size, className, hover)} />;
	}
	const { as: _, variant, size, className, type = "button", ...rest } = props;
	return (
		<button
			{...rest}
			type={type}
			className={look(
				variant,
				size,
				className,
				classNames(
					variant === "accent" ? "enabled:hover:bg-accent/85" : "enabled:hover:bg-neutralHover/80",
					"disabled:opacity-50 disabled:cursor-not-allowed",
				),
			)}
		/>
	);
}
