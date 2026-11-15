import type { HTMLAttributes, KeyboardEvent, MouseEvent } from "react";
import { classNames } from "system";

// role="menuitem": click, Enter, or Space runs onAction, then closes the menu, which returns focus
// to the trigger. Disabled items stay in place but are skipped. With `checked`, it's one choice of
// a set: role="menuitemradio" and aria-checked.
export function MenuItem({
	onAction,
	disabled = false,
	checked,
	className,
	...props
}: { onAction?: () => void; disabled?: boolean; checked?: boolean } & Omit<
	HTMLAttributes<HTMLDivElement>,
	"onClick"
>) {
	const activate = (event: MouseEvent<HTMLDivElement> | KeyboardEvent<HTMLDivElement>) => {
		if (disabled) return;
		onAction?.();
		event.currentTarget.closest<HTMLElement>("[popover]")?.hidePopover?.();
	};

	return (
		<div
			{...props}
			role={checked === undefined ? "menuitem" : "menuitemradio"}
			aria-checked={checked}
			tabIndex={-1}
			aria-disabled={disabled || undefined}
			onClick={activate}
			onKeyDown={(event) => {
				props.onKeyDown?.(event);
				if (event.key !== "Enter" && event.key !== " ") return;
				event.preventDefault();
				activate(event);
			}}
			className={classNames(
				"flex items-center gap-sm min-h-control px-md cursor-pointer",
				"hover:bg-neutralHover focus:bg-neutralHover pressed:bg-neutralActive",
				"aria-checked:bg-neutralActive",
				"aria-disabled:opacity-50 aria-disabled:cursor-not-allowed",
				className,
			)}
		/>
	);
}
