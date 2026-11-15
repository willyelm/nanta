import type { ButtonHTMLAttributes } from "react";
import { classNames } from "system";

export function Button({
	className,
	type = "button",
	...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
	return (
		<button
			{...props}
			type={type}
			className={classNames(
				"font-mono text-body leading-standard text-default",
				"inline-flex items-center justify-center gap-xs",
				"bg-neutral border border-control",
				"min-h-control min-w-control py-sm px-md cursor-pointer",
				"enabled:hover:bg-neutralHover pressed:bg-neutralActive",
				"disabled:opacity-50 disabled:cursor-not-allowed",
				className,
			)}
		/>
	);
}
