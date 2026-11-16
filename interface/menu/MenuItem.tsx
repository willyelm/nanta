import type { HTMLAttributes, KeyboardEvent, MouseEvent } from "react";
import { classNames } from "system";

// role="menuitem": click, Enter, or Space runs onAction, then closes the menu, which returns focus
// to the trigger. Disabled items stay in place but are skipped. With `checked`, it's one choice of
// a set: role="menuitemradio" and aria-checked; with `toggle` too, a setting on its own that
// flips: role="menuitemcheckbox".
export function MenuItem({
	onAction,
	disabled = false,
	checked,
	toggle = false,
	className,
	...props
}: { onAction?: () => void; disabled?: boolean; checked?: boolean; toggle?: boolean } & Omit<
	HTMLAttributes<HTMLDivElement>,
	"onClick"
>) {
	const activate = (event: MouseEvent<HTMLDivElement> | KeyboardEvent<HTMLDivElement>) => {
		if (disabled) return;
		onAction?.();
		event.currentTarget.closest<HTMLElement>("[popover]")?.hidePopover?.();
	};

	const checkedRole = toggle ? "menuitemcheckbox" : "menuitemradio";
	return (
		// The role is always a menu item, one of three, which the linter can't follow.
		// biome-ignore lint/a11y/noStaticElementInteractions: role is menuitem, menuitemradio, or menuitemcheckbox
		// biome-ignore lint/a11y/useAriaPropsSupportedByRole: aria-checked is set only on the radio and checkbox roles
		<div
			{...props}
			role={checked === undefined ? "menuitem" : checkedRole}
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
				"hover:bg-neutralHover/80 focus:bg-neutralHover/80 pressed:bg-neutralActive/80",
				!toggle && "aria-checked:bg-neutralActive/80",
				"aria-disabled:opacity-50 aria-disabled:cursor-not-allowed",
				className,
			)}
		/>
	);
}
