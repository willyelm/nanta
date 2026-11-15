import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from "react";
import { classNames } from "system";

type Props =
	| ({ as?: "button" } & ButtonHTMLAttributes<HTMLButtonElement>)
	| ({ as: "a" } & AnchorHTMLAttributes<HTMLAnchorElement>);

const look = (className?: string, extra?: string) =>
	classNames(
		"font-mono text-body leading-standard text-default no-underline",
		"inline-flex items-center justify-center gap-xs",
		"bg-neutral border border-control",
		"min-h-control min-w-control py-sm px-md cursor-pointer",
		"pressed:bg-neutralActive",
		extra,
		className,
	);

// A button, or with as="a" a link that looks like one: an action that goes somewhere stays a
// link, so the router navigates it on the client and the browser can open it in a new tab.
export function Button(props: Props) {
	if (props.as === "a") {
		const { as: _, className, ...rest } = props;
		return <a {...rest} className={look(className, "hover:bg-neutralHover")} />;
	}
	const { as: _, className, type = "button", ...rest } = props;
	return (
		<button
			{...rest}
			type={type}
			className={look(
				className,
				"enabled:hover:bg-neutralHover disabled:opacity-50 disabled:cursor-not-allowed",
			)}
		/>
	);
}
